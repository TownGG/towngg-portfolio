/* TownGG Portfolio v2.05
   Cloudflare Worker backend for the hidden Admin System.

   Required Cloudflare Worker environment variables:
   - GITHUB_TOKEN: fine-grained GitHub token with Contents read/write access to TownGG/towngg-portfolio
   - ADMIN_UPLOAD_SECRET: admin key used by /admin-upload.html
   - GITHUB_OWNER: TownGG
   - GITHUB_REPO: towngg-portfolio
   - GITHUB_BRANCH: main

   Optional Community Ops variables:
   - OPENAI_API_KEY: enables AI reply drafting
   - OPENAI_MODEL: optional model override for reply drafting
   - REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN, REDDIT_USER_AGENT: enables Reddit one-click replies
   - NEXUS_GRAPHQL_TOKEN: enables Nexus GraphQL comment replies when commentThreadId is known
 */

const DEFAULT_OWNER = "TownGG";
const DEFAULT_REPO = "towngg-portfolio";
const DEFAULT_BRANCH = "main";
const IMAGE_DIR = "assets/images/gallery-all-compressed";
const FEATURED_IMAGE_DIR = "assets/images/gallery-featured-compressed";
const CONCEPT_DATA_PATH = "assets/data/gallery-concept-art.json";
const SCREENSHOT_DATA_PATH = "assets/data/gallery-screenshots.json";
const SITE_DATA_PATH = "assets/js/site-data.js";
const VERSION_DATA_PATH = "assets/data/site-version.json";
const COMMUNITY_DATA_PATH = "assets/data/admin-community-messages.json";
const MAX_FILES = 20;
const MAX_BASE64_CHARS = 16 * 1024 * 1024;
const VALID_TYPES = ["concept", "screenshots", "featured"];
const VALID_COMMUNITY_PLATFORMS = ["reddit", "nexus"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const isAuthCheck = url.pathname.endsWith("/api/admin/auth-check");
    const isGalleryUpload = url.pathname.endsWith("/api/admin/gallery-upload");
    const isGalleryList = url.pathname.endsWith("/api/admin/gallery-list");
    const isGalleryDelete = url.pathname.endsWith("/api/admin/gallery-delete");
    const isCommunityList = url.pathname.endsWith("/api/admin/community-list");
    const isCommunitySave = url.pathname.endsWith("/api/admin/community-save");
    const isCommunityDelete = url.pathname.endsWith("/api/admin/community-delete");
    const isCommunityDraft = url.pathname.endsWith("/api/admin/community-draft");
    const isCommunityRedditReply = url.pathname.endsWith("/api/admin/community-reddit-reply");
    const isCommunityNexusReply = url.pathname.endsWith("/api/admin/community-nexus-reply");
    const isCommunityRoute = isCommunityList || isCommunitySave || isCommunityDelete || isCommunityDraft || isCommunityRedditReply || isCommunityNexusReply;

    if (request.method !== "POST" || (!isAuthCheck && !isGalleryUpload && !isGalleryList && !isGalleryDelete && !isCommunityRoute)) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    try {
      assertEnv(env);
      authorize(request, env);

      if (isAuthCheck) {
        return jsonResponse({ success: true, authenticated: true });
      }

      const config = getConfig(env);

      if (isGalleryList) {
        const result = await listGalleryImages(config);
        return jsonResponse({ success: true, ...result });
      }

      if (isCommunityList) {
        const result = await listCommunityMessages(config);
        return jsonResponse({ success: true, ...result });
      }

      const payload = await request.json();

      if (isCommunitySave) {
        const result = await saveCommunityMessage(config, payload);
        return jsonResponse({ success: true, ...result });
      }

      if (isCommunityDelete) {
        const result = await deleteCommunityMessage(config, payload);
        return jsonResponse({ success: true, ...result });
      }

      if (isCommunityDraft) {
        const result = await draftCommunityReply(config, env, payload);
        return jsonResponse({ success: true, ...result });
      }

      if (isCommunityRedditReply) {
        const result = await sendRedditReply(config, env, payload);
        return jsonResponse({ success: true, ...result });
      }

      if (isCommunityNexusReply) {
        const result = await sendNexusReply(config, env, payload);
        return jsonResponse({ success: true, ...result });
      }

      if (isGalleryDelete) {
        validateDeletePayload(payload);
        const result = await deleteGalleryImage(config, payload);
        return jsonResponse({ success: true, ...result });
      }

      validatePayload(payload);
      const result = await commitGalleryUpload(config, payload);

      return jsonResponse({ success: true, ...result });
    } catch (error) {
      return jsonResponse({ success: false, error: error.message || "Request failed" }, error.status || 500);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function assertEnv(env) {
  const required = ["GITHUB_TOKEN", "ADMIN_UPLOAD_SECRET"];
  for (const key of required) {
    if (!env[key]) {
      const error = new Error(`Missing Worker environment variable: ${key}`);
      error.status = 500;
      throw error;
    }
  }
}

function authorize(request, env) {
  const received = request.headers.get("X-Admin-Key") || "";
  if (!received || received !== env.ADMIN_UPLOAD_SECRET) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
}

function getConfig(env) {
  return {
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER || DEFAULT_OWNER,
    repo: env.GITHUB_REPO || DEFAULT_REPO,
    branch: env.GITHUB_BRANCH || DEFAULT_BRANCH
  };
}

function dataPathForType(type) {
  if (type === "concept") return CONCEPT_DATA_PATH;
  if (type === "screenshots") return SCREENSHOT_DATA_PATH;
  return "";
}

function imageDirForType(type) {
  return type === "featured" ? FEATURED_IMAGE_DIR : IMAGE_DIR;
}

function displayType(type) {
  if (type === "featured") return "Homepage Featured";
  return type === "concept" ? "Concept Art" : "In-Game Screenshots";
}

function validateType(type, message = "Invalid type") {
  if (!VALID_TYPES.includes(type)) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Invalid request payload");
    error.status = 400;
    throw error;
  }

  validateType(payload.type, "Invalid upload type");

  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    const error = new Error("No files provided");
    error.status = 400;
    throw error;
  }

  if (payload.files.length > MAX_FILES) {
    const error = new Error(`Too many files. Max ${MAX_FILES} files per upload.`);
    error.status = 400;
    throw error;
  }

  for (const file of payload.files) {
    if (!file || typeof file !== "object") {
      const error = new Error("Invalid file entry");
      error.status = 400;
      throw error;
    }

    if (!isSafeJpegName(file.filename)) {
      const error = new Error(`Invalid filename: ${file.filename}`);
      error.status = 400;
      throw error;
    }

    if (file.mime !== "image/jpeg") {
      const error = new Error(`Unsupported output mime type: ${file.mime}`);
      error.status = 400;
      throw error;
    }

    if (!file.base64 || typeof file.base64 !== "string") {
      const error = new Error(`Missing base64 data for ${file.filename}`);
      error.status = 400;
      throw error;
    }

    if (file.base64.length > MAX_BASE64_CHARS) {
      const error = new Error(`File too large: ${file.filename}`);
      error.status = 400;
      throw error;
    }
  }
}

function validateDeletePayload(payload) {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Invalid delete payload");
    error.status = 400;
    throw error;
  }

  validateType(payload.type, "Invalid delete type");

  const imagePath = normalizeImagePath(payload.image);
  if (!isManagedImagePath(imagePath)) {
    const error = new Error("Image path is not managed by the gallery uploader.");
    error.status = 400;
    throw error;
  }
}

function isSafeJpegName(name) {
  return /^[a-z0-9][a-z0-9_-]*\.jpg$/.test(String(name || ""));
}

function normalizeImagePath(image) {
  return String(image || "").trim().replace(/^\.\//, "");
}

function isManagedImagePath(path) {
  const isKnownDir = path.startsWith(`${IMAGE_DIR}/`) || path.startsWith(`${FEATURED_IMAGE_DIR}/`);
  return isKnownDir && /^[a-z0-9_\-/]+\.(jpg|jpeg|png|webp)$/i.test(path);
}

function imageFilename(path) {
  return String(path || "").split("/").pop() || path;
}

async function listGalleryImages(config) {
  const concept = await readJsonFile(config, CONCEPT_DATA_PATH, config.branch, []);
  const screenshots = await readJsonFile(config, SCREENSHOT_DATA_PATH, config.branch, []);
  const siteDataText = await readTextFile(config, SITE_DATA_PATH, config.branch, "");
  const featured = extractFeaturedArtworks(siteDataText);

  return {
    images: [
      ...normalizeGalleryEntries(featured, "featured"),
      ...normalizeGalleryEntries(concept, "concept"),
      ...normalizeGalleryEntries(screenshots, "screenshots")
    ],
    counts: {
      featured: featured.length,
      concept: concept.length,
      screenshots: screenshots.length,
      total: featured.length + concept.length + screenshots.length
    }
  };
}

function normalizeGalleryEntries(entries, type) {
  return (Array.isArray(entries) ? entries : []).map((entry, index) => {
    const image = String(entry.image || "");
    const path = normalizeImagePath(image);
    return {
      id: `${type}-${index}-${imageFilename(path)}`,
      type,
      typeLabel: displayType(type),
      image,
      path,
      filename: imageFilename(path),
      alt: String(entry.alt || "")
    };
  });
}

async function listCommunityMessages(config) {
  const messages = await readJsonFileSafe(config, COMMUNITY_DATA_PATH, config.branch, []);
  return { messages: normalizeCommunityMessages(messages) };
}

async function saveCommunityMessage(config, payload) {
  validateCommunityPayload(payload);
  const current = await readJsonFileSafe(config, COMMUNITY_DATA_PATH, config.branch, []);
  const messages = normalizeCommunityMessages(current);
  const now = new Date().toISOString();
  const id = String(payload.id || "").trim() || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = messages.find((item) => item.id === id);
  const message = normalizeCommunityMessage({
    ...(existing || {}),
    ...payload,
    id,
    platform: payload.platform,
    originalContent: payload.originalContent,
    replyStatus: payload.replyStatus || existing?.replyStatus || (payload.replyDraft ? "drafted" : "new"),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
  const next = [message, ...messages.filter((item) => item.id !== id)];
  await commitJsonFile(config, COMMUNITY_DATA_PATH, next, existing ? `Update community message ${id}` : `Add community message ${id}`);
  return { message, messages: normalizeCommunityMessages(next) };
}

async function deleteCommunityMessage(config, payload) {
  const id = String(payload?.id || "").trim();
  if (!id) {
    const error = new Error("Message id is required.");
    error.status = 400;
    throw error;
  }
  const current = await readJsonFileSafe(config, COMMUNITY_DATA_PATH, config.branch, []);
  const messages = normalizeCommunityMessages(current);
  const next = messages.filter((item) => item.id !== id);
  if (next.length === messages.length) {
    const error = new Error("Community message not found.");
    error.status = 404;
    throw error;
  }
  await commitJsonFile(config, COMMUNITY_DATA_PATH, next, `Delete community message ${id}`);
  return { deleted: id, messages: normalizeCommunityMessages(next) };
}

async function draftCommunityReply(config, env, payload) {
  const id = String(payload?.id || "").trim();
  const message = await findCommunityMessage(config, id);
  const generated = await generateCommunityDraft(env, message);
  const patch = {
    translatedContent: generated.translation,
    aiSummary: generated.summary,
    sentiment: generated.sentiment,
    category: generated.category,
    replyDraft: generated.reply,
    replyStatus: "drafted"
  };
  return updateCommunityMessage(config, id, patch, `Draft community reply ${id}`);
}

async function sendRedditReply(config, env, payload) {
  const id = String(payload?.id || "").trim();
  const message = await findCommunityMessage(config, id);
  if (message.platform !== "reddit") {
    const error = new Error("This message is not a Reddit message.");
    error.status = 400;
    throw error;
  }
  const text = String(payload?.text || message.replyDraft || "").trim();
  if (!text) {
    const error = new Error("Reply text is required.");
    error.status = 400;
    throw error;
  }
  const thingId = normalizeRedditThingId(message.externalMessageId || inferRedditThingId(message.sourceUrl));
  if (!thingId) {
    const error = new Error("Reddit comment ID is required. Use a full thing ID such as t1_xxxxx.");
    error.status = 400;
    throw error;
  }
  const result = await redditComment(env, thingId, text);
  return updateCommunityMessage(config, id, {
    replyDraft: text,
    replyStatus: "sent",
    repliedAt: new Date().toISOString(),
    platformReplyId: result?.id || result?.name || "",
    platformReplyUrl: result?.url || ""
  }, `Send Reddit reply ${id}`);
}

async function sendNexusReply(config, env, payload) {
  const id = String(payload?.id || "").trim();
  const message = await findCommunityMessage(config, id);
  if (message.platform !== "nexus") {
    const error = new Error("This message is not a Nexus message.");
    error.status = 400;
    throw error;
  }
  const text = String(payload?.text || message.replyDraft || "").trim();
  if (!text) {
    const error = new Error("Reply text is required.");
    error.status = 400;
    throw error;
  }
  if (!message.commentThreadId) {
    const error = new Error("Nexus commentThreadId is required for API replies. Use copy-and-open fallback for now.");
    error.status = 400;
    throw error;
  }
  const result = await nexusCreateComment(env, message.commentThreadId, text, message.externalMessageId || null);
  return updateCommunityMessage(config, id, {
    replyDraft: text,
    replyStatus: "sent",
    repliedAt: new Date().toISOString(),
    platformReplyId: result?.comment?.id || ""
  }, `Send Nexus reply ${id}`);
}

async function findCommunityMessage(config, id) {
  if (!id) {
    const error = new Error("Message id is required.");
    error.status = 400;
    throw error;
  }
  const current = await readJsonFileSafe(config, COMMUNITY_DATA_PATH, config.branch, []);
  const message = normalizeCommunityMessages(current).find((item) => item.id === id);
  if (!message) {
    const error = new Error("Community message not found.");
    error.status = 404;
    throw error;
  }
  return message;
}

async function updateCommunityMessage(config, id, patch, commitMessage) {
  const current = await readJsonFileSafe(config, COMMUNITY_DATA_PATH, config.branch, []);
  const messages = normalizeCommunityMessages(current);
  const index = messages.findIndex((item) => item.id === id);
  if (index === -1) {
    const error = new Error("Community message not found.");
    error.status = 404;
    throw error;
  }
  const updated = normalizeCommunityMessage({ ...messages[index], ...patch, updatedAt: new Date().toISOString() });
  const next = [...messages];
  next[index] = updated;
  await commitJsonFile(config, COMMUNITY_DATA_PATH, next, commitMessage || `Update community message ${id}`);
  return { message: updated, messages: normalizeCommunityMessages(next) };
}

function validateCommunityPayload(payload) {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Invalid community message payload.");
    error.status = 400;
    throw error;
  }
  const platform = String(payload.platform || "").trim();
  if (!VALID_COMMUNITY_PLATFORMS.includes(platform)) {
    const error = new Error("Invalid community platform. Use reddit or nexus.");
    error.status = 400;
    throw error;
  }
  if (!String(payload.originalContent || "").trim()) {
    const error = new Error("Original content is required.");
    error.status = 400;
    throw error;
  }
}

function normalizeCommunityMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map(normalizeCommunityMessage)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function normalizeCommunityMessage(message) {
  const platform = VALID_COMMUNITY_PLATFORMS.includes(message.platform) ? message.platform : "reddit";
  const now = new Date().toISOString();
  return {
    id: String(message.id || `msg_${Date.now()}`),
    platform,
    modName: String(message.modName || "").trim(),
    authorName: String(message.authorName || "").trim(),
    sourceUrl: String(message.sourceUrl || "").trim(),
    externalMessageId: platform === "reddit" ? normalizeRedditThingId(message.externalMessageId || inferRedditThingId(message.sourceUrl)) : String(message.externalMessageId || "").trim(),
    commentThreadId: String(message.commentThreadId || "").trim(),
    originalContent: String(message.originalContent || "").trim(),
    translatedContent: String(message.translatedContent || "").trim(),
    aiSummary: String(message.aiSummary || "").trim(),
    sentiment: String(message.sentiment || detectSentiment(message.originalContent || "")),
    category: String(message.category || detectCategory(message.originalContent || "")),
    replyDraft: String(message.replyDraft || "").trim(),
    replyStatus: String(message.replyStatus || "new"),
    repliedAt: String(message.repliedAt || ""),
    platformReplyId: String(message.platformReplyId || ""),
    platformReplyUrl: String(message.platformReplyUrl || ""),
    createdAt: String(message.createdAt || now),
    updatedAt: String(message.updatedAt || message.createdAt || now)
  };
}

async function generateCommunityDraft(env, message) {
  const fallback = fallbackDraft(message);
  if (!env.OPENAI_API_KEY) return fallback;

  try {
    const system = "You are a friendly Starfield mod author assistant for TownGG Mod Studio. Draft safe, natural English replies. Never promise exact dates or guaranteed features. Keep replies concise.";
    const user = [
      `Platform: ${message.platform}`,
      `Mod: ${message.modName || "Unknown"}`,
      `Author: ${message.authorName || "Unknown"}`,
      `Original message: ${message.originalContent}`,
      "Return JSON with keys: translation, summary, sentiment, category, reply. Categories: praise, bug_report, feature_request, install_question, ai_criticism, lore_discussion, general."
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.55
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || `OpenAI API failed with HTTP ${response.status}.`);
    const raw = data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    return {
      translation: String(parsed.translation || fallback.translation || ""),
      summary: String(parsed.summary || fallback.summary || ""),
      sentiment: String(parsed.sentiment || fallback.sentiment || "neutral"),
      category: String(parsed.category || fallback.category || "general"),
      reply: String(parsed.reply || fallback.reply || "")
    };
  } catch (error) {
    return {
      ...fallback,
      summary: `${fallback.summary}\n\nAI API fallback used: ${error.message}`
    };
  }
}

function fallbackDraft(message) {
  const category = detectCategory(message.originalContent);
  const sentiment = detectSentiment(message.originalContent);
  const modName = message.modName || "the mod";
  let reply = "Thanks for the feedback! I really appreciate you checking it out. I’ll keep this in mind while improving future versions.";

  if (category === "praise") {
    reply = `Thank you! I really appreciate it. I’m glad you’re enjoying ${modName}, and feedback like this helps a lot.`;
  } else if (category === "feature_request") {
    reply = "That’s a good suggestion. I can’t promise it for a specific update, but it could definitely be a good direction for a future variant or patch.";
  } else if (category === "bug_report") {
    reply = "Thanks for reporting this. Could you share a bit more detail about your platform, load order, and what happened in-game? That would help me narrow it down.";
  } else if (category === "install_question") {
    reply = "Thanks for asking. Please make sure the mod is enabled in your load order and that any required main file is installed. If it still doesn’t work, let me know your platform and install method.";
  } else if (category === "ai_criticism") {
    reply = "I understand the concern. The final in-game assets are not just raw AI output — I do additional editing, material work, integration, and in-game testing to make sure they function properly as Starfield mods.";
  } else if (category === "lore_discussion") {
    reply = "I love seeing people connect with the lore side of this. Cassilia and the Unity / Starborn direction are definitely something I want to keep exploring.";
  }

  return {
    translation: "Fallback translation not available. Add OPENAI_API_KEY to enable full Chinese translation.",
    summary: `Detected as ${category}. Suggested safe reply generated without making hard promises.`,
    sentiment,
    category,
    reply
  };
}

function detectCategory(text) {
  const value = String(text || "").toLowerCase();
  if (/bug|broken|crash|error|not work|doesn't work|purple|missing/.test(value)) return "bug_report";
  if (/install|load order|where|how do i|can't find|craft|location/.test(value)) return "install_question";
  if (/ai|generated|stolen|asset|lazy/.test(value)) return "ai_criticism";
  if (/lore|story|cassilia|starborn|unity|background/.test(value)) return "lore_discussion";
  if (/could you|would love|wish|add|smaller|bigger|version|variant|finisher/.test(value)) return "feature_request";
  if (/great|awesome|beautiful|cool|love|brilliant|amazing|nice/.test(value)) return "praise";
  return "general";
}

function detectSentiment(text) {
  const value = String(text || "").toLowerCase();
  if (/broken|bad|hate|trash|stolen|lazy|doesn't work|not work/.test(value)) return "negative";
  if (/ai|generated|controvers|stolen/.test(value)) return "controversial";
  if (/great|awesome|beautiful|cool|love|brilliant|amazing|nice/.test(value)) return "positive";
  return "neutral";
}

function normalizeRedditThingId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^t[13]_[a-z0-9]+$/i.test(text)) return text.toLowerCase();
  if (/^[a-z0-9]{5,12}$/i.test(text)) return `t1_${text.toLowerCase()}`;
  return text;
}

function inferRedditThingId(sourceUrl) {
  const text = String(sourceUrl || "");
  const match = text.match(/\/comments\/[^/]+\/[^/]*\/([a-z0-9]+)/i);
  return match ? `t1_${match[1].toLowerCase()}` : "";
}

async function redditComment(env, thingId, text) {
  const required = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_REFRESH_TOKEN"];
  for (const key of required) {
    if (!env[key]) {
      const error = new Error(`Missing Reddit environment variable: ${key}`);
      error.status = 501;
      throw error;
    }
  }

  const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.REDDIT_USER_AGENT || "TownGGCommunityOps/1.0"
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.REDDIT_REFRESH_TOKEN })
  });
  const tokenData = await tokenResponse.json().catch(() => null);
  if (!tokenResponse.ok || !tokenData?.access_token) {
    const error = new Error(tokenData?.message || `Reddit OAuth failed with HTTP ${tokenResponse.status}.`);
    error.status = tokenResponse.status || 500;
    throw error;
  }

  const replyResponse = await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.REDDIT_USER_AGENT || "TownGGCommunityOps/1.0"
    },
    body: new URLSearchParams({ api_type: "json", thing_id: thingId, text })
  });
  const replyData = await replyResponse.json().catch(() => null);
  const redditErrors = replyData?.json?.errors || [];
  if (!replyResponse.ok || redditErrors.length) {
    const detail = redditErrors.length ? redditErrors.map((item) => item.join(": ")).join("; ") : replyData?.message;
    const error = new Error(detail || `Reddit reply failed with HTTP ${replyResponse.status}.`);
    error.status = replyResponse.status || 500;
    throw error;
  }
  return replyData?.json?.data || replyData || {};
}

async function nexusCreateComment(env, commentThreadId, body, replyToId) {
  const token = env.NEXUS_GRAPHQL_TOKEN || env.NEXUS_API_TOKEN || "";
  if (!token) {
    const error = new Error("Missing NEXUS_GRAPHQL_TOKEN. Use copy-and-open fallback until Nexus API access is configured.");
    error.status = 501;
    throw error;
  }

  const response = await fetch(env.NEXUS_GRAPHQL_ENDPOINT || "https://api.nexusmods.com/v2/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "TownGGCommunityOps/1.0"
    },
    body: JSON.stringify({
      query: `mutation createComment($commentThreadId: ID!, $body: String!, $replyToId: ID) { createComment(commentThreadId: $commentThreadId, body: $body, replyToId: $replyToId) { comment { id body createdAt } } }`,
      variables: { commentThreadId: String(commentThreadId), body, replyToId: replyToId ? String(replyToId) : null }
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.errors?.length) {
    const detail = data?.errors?.map((item) => item.message).join("; ");
    const error = new Error(detail || `Nexus GraphQL reply failed with HTTP ${response.status}.`);
    error.status = response.status || 500;
    throw error;
  }
  return data?.data?.createComment || {};
}

async function commitGalleryUpload(config, payload) {
  if (payload.type === "featured") {
    return commitFeaturedUpload(config, payload);
  }

  const dataPath = dataPathForType(payload.type);
  const imageDir = imageDirForType(payload.type);
  const uploaded = [];
  const treeItems = [];

  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const latestGalleryData = await readJsonFile(config, dataPath, config.branch, []);
  const latestVersionData = await readJsonFile(config, VERSION_DATA_PATH, config.branch, {});

  for (const file of payload.files) {
    const uniqueName = await makeUniqueFilename(config, file.filename, config.branch, imageDir);
    const imagePath = `${imageDir}/${uniqueName}`;
    const imageBlob = await github(config, "/git/blobs", {
      method: "POST",
      body: {
        content: file.base64,
        encoding: "base64"
      }
    });

    treeItems.push({ path: imagePath, mode: "100644", type: "blob", sha: imageBlob.sha });
    uploaded.push({ path: imagePath, image: `./${imagePath}`, alt: normalizeAlt(file.alt, payload.type) });
  }

  const newEntries = uploaded.map((item) => ({ image: item.image, alt: item.alt }));
  const updatedGalleryData = [...newEntries, ...latestGalleryData];
  const updatedVersionData = nextVersionData(latestVersionData);

  const galleryBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedGalleryData, null, 2) + "\n", encoding: "utf-8" }
  });

  const versionBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedVersionData, null, 2) + "\n", encoding: "utf-8" }
  });

  treeItems.push({ path: dataPath, mode: "100644", type: "blob", sha: galleryBlob.sha });
  treeItems.push({ path: VERSION_DATA_PATH, mode: "100644", type: "blob", sha: versionBlob.sha });

  const commit = await createCommitFromTree(config, baseTreeSha, treeItems, parentSha, payload.type === "concept" ? "Add concept art uploads" : "Add in-game screenshot uploads");

  return {
    commitSha: commit.sha,
    version: updatedVersionData.version,
    updatedDataFile: dataPath,
    uploaded
  };
}

async function commitFeaturedUpload(config, payload) {
  const uploaded = [];
  const treeItems = [];
  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const latestSiteDataText = await readTextFile(config, SITE_DATA_PATH, config.branch, "");
  const latestFeatured = extractFeaturedArtworks(latestSiteDataText);
  const latestVersionData = await readJsonFile(config, VERSION_DATA_PATH, config.branch, {});

  for (const file of payload.files) {
    const uniqueName = await makeUniqueFilename(config, file.filename, config.branch, FEATURED_IMAGE_DIR);
    const imagePath = `${FEATURED_IMAGE_DIR}/${uniqueName}`;
    const imageBlob = await github(config, "/git/blobs", {
      method: "POST",
      body: { content: file.base64, encoding: "base64" }
    });

    treeItems.push({ path: imagePath, mode: "100644", type: "blob", sha: imageBlob.sha });
    uploaded.push({ path: imagePath, image: `./${imagePath}`, alt: normalizeAlt(file.alt, payload.type) });
  }

  const updatedFeatured = [...uploaded.map(({ image, alt }) => ({ image, alt })), ...latestFeatured];
  const updatedSiteDataText = replaceFeaturedArtworks(latestSiteDataText, updatedFeatured);
  const updatedVersionData = nextVersionData(latestVersionData);

  const siteDataBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: updatedSiteDataText, encoding: "utf-8" }
  });

  const versionBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedVersionData, null, 2) + "\n", encoding: "utf-8" }
  });

  treeItems.push({ path: SITE_DATA_PATH, mode: "100644", type: "blob", sha: siteDataBlob.sha });
  treeItems.push({ path: VERSION_DATA_PATH, mode: "100644", type: "blob", sha: versionBlob.sha });

  const commit = await createCommitFromTree(config, baseTreeSha, treeItems, parentSha, "Add homepage featured image uploads");

  return {
    commitSha: commit.sha,
    version: updatedVersionData.version,
    updatedDataFile: SITE_DATA_PATH,
    uploaded
  };
}

async function deleteGalleryImage(config, payload) {
  if (payload.type === "featured") {
    return deleteFeaturedImage(config, payload);
  }

  const type = payload.type;
  const dataPath = dataPathForType(type);
  const imagePath = normalizeImagePath(payload.image);
  const imageRef = imagePath.startsWith("./") ? imagePath : `./${imagePath}`;

  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const latestGalleryData = await readJsonFile(config, dataPath, config.branch, []);
  const latestVersionData = await readJsonFile(config, VERSION_DATA_PATH, config.branch, {});
  const beforeCount = latestGalleryData.length;
  const updatedGalleryData = latestGalleryData.filter((entry) => normalizeImagePath(entry.image) !== imagePath);

  if (updatedGalleryData.length === beforeCount) {
    const error = new Error("Gallery record was not found.");
    error.status = 404;
    throw error;
  }

  const galleryBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedGalleryData, null, 2) + "\n", encoding: "utf-8" }
  });

  const updatedVersionData = nextVersionData(latestVersionData);
  const versionBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedVersionData, null, 2) + "\n", encoding: "utf-8" }
  });

  const commit = await createCommitFromTree(config, baseTreeSha, [
    { path: imagePath, mode: "100644", type: "blob", sha: null },
    { path: dataPath, mode: "100644", type: "blob", sha: galleryBlob.sha },
    { path: VERSION_DATA_PATH, mode: "100644", type: "blob", sha: versionBlob.sha }
  ], parentSha, type === "concept" ? `Delete concept art ${imageFilename(imagePath)}` : `Delete screenshot ${imageFilename(imagePath)}`);

  return {
    commitSha: commit.sha,
    version: updatedVersionData.version,
    deleted: { type, image: imageRef, path: imagePath },
    updatedDataFile: dataPath
  };
}

async function deleteFeaturedImage(config, payload) {
  const imagePath = normalizeImagePath(payload.image);
  const imageRef = imagePath.startsWith("./") ? imagePath : `./${imagePath}`;

  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const latestSiteDataText = await readTextFile(config, SITE_DATA_PATH, config.branch, "");
  const latestFeatured = extractFeaturedArtworks(latestSiteDataText);
  const latestVersionData = await readJsonFile(config, VERSION_DATA_PATH, config.branch, {});
  const beforeCount = latestFeatured.length;
  const updatedFeatured = latestFeatured.filter((entry) => normalizeImagePath(entry.image) !== imagePath);

  if (updatedFeatured.length === beforeCount) {
    const error = new Error("Featured image record was not found.");
    error.status = 404;
    throw error;
  }

  const updatedSiteDataText = replaceFeaturedArtworks(latestSiteDataText, updatedFeatured);
  const updatedVersionData = nextVersionData(latestVersionData);

  const siteDataBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: updatedSiteDataText, encoding: "utf-8" }
  });

  const versionBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(updatedVersionData, null, 2) + "\n", encoding: "utf-8" }
  });

  const commit = await createCommitFromTree(config, baseTreeSha, [
    { path: imagePath, mode: "100644", type: "blob", sha: null },
    { path: SITE_DATA_PATH, mode: "100644", type: "blob", sha: siteDataBlob.sha },
    { path: VERSION_DATA_PATH, mode: "100644", type: "blob", sha: versionBlob.sha }
  ], parentSha, `Delete homepage featured image ${imageFilename(imagePath)}`);

  return {
    commitSha: commit.sha,
    version: updatedVersionData.version,
    deleted: { type: "featured", image: imageRef, path: imagePath },
    updatedDataFile: SITE_DATA_PATH
  };
}

function extractFeaturedArtworks(siteDataText) {
  const match = String(siteDataText || "").match(/featuredArtworks:\s*\[([\s\S]*?)\]\s*,\s*artworks:/);
  if (!match) return [];
  const block = match[1];
  const entries = [];
  const itemPattern = /\{\s*image:\s*(["'])(.*?)\1\s*,\s*alt:\s*(["'])(.*?)\3\s*\}/g;
  let item;
  while ((item = itemPattern.exec(block))) {
    entries.push({ image: item[2], alt: item[4] });
  }
  return entries;
}

function replaceFeaturedArtworks(siteDataText, entries) {
  const formatted = JSON.stringify(entries, null, 4)
    .replace(/"image"/g, "image")
    .replace(/"alt"/g, "alt")
    .split("\n")
    .map((line, index) => index === 0 ? line : `  ${line}`)
    .join("\n");

  const replacement = `featuredArtworks: ${formatted},\n  artworks:`;
  const updated = String(siteDataText || "").replace(/featuredArtworks:\s*\[[\s\S]*?\]\s*,\s*artworks:/, replacement);
  if (updated === siteDataText) {
    const error = new Error("Unable to update featuredArtworks in site-data.js.");
    error.status = 500;
    throw error;
  }
  return updated;
}

async function createCommitFromTree(config, baseTreeSha, treeItems, parentSha, message) {
  const tree = await github(config, "/git/trees", {
    method: "POST",
    body: { base_tree: baseTreeSha, tree: treeItems }
  });

  const commit = await github(config, "/git/commits", {
    method: "POST",
    body: { message, tree: tree.sha, parents: [parentSha] }
  });

  await github(config, `/git/refs/heads/${config.branch}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false }
  });

  return commit;
}

async function commitJsonFile(config, path, data, message) {
  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;
  const blob = await github(config, "/git/blobs", {
    method: "POST",
    body: { content: JSON.stringify(data, null, 2) + "\n", encoding: "utf-8" }
  });
  const commit = await createCommitFromTree(config, baseTreeSha, [
    { path, mode: "100644", type: "blob", sha: blob.sha }
  ], parentSha, message);
  return commit;
}

function normalizeAlt(alt, type) {
  if (type === "featured") return String(alt || "TownGG homepage featured artwork").trim().slice(0, 180) || "TownGG homepage featured artwork";
  const fallback = type === "concept" ? "TownGG concept artwork" : "TownGG in-game screenshot";
  return String(alt || fallback).trim().slice(0, 180) || fallback;
}

function nextVersionData(current) {
  const currentVersion = String(current.version || "v2.04.01-preview");
  const match = currentVersion.match(/^v(\d+)\.(\d+)\.(\d+)(.*)$/);
  let nextVersion = "v2.04.02-preview";

  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]) + 1;
    const suffix = match[4] || "-preview";
    nextVersion = `v${major}.${String(minor).padStart(2, "0")}.${String(patch).padStart(2, "0")}${suffix}`;
  }

  return {
    version: nextVersion,
    label: `${nextVersion.replace("-preview", " Preview")}`,
    status: "preview",
    updatedAt: new Date().toISOString()
  };
}

async function makeUniqueFilename(config, filename, branch, imageDir = IMAGE_DIR) {
  const dotIndex = filename.lastIndexOf(".");
  const base = filename.slice(0, dotIndex);
  const ext = filename.slice(dotIndex);
  let candidate = filename;
  let counter = 1;

  while (await fileExists(config, `${imageDir}/${candidate}`, branch)) {
    counter += 1;
    candidate = `${base}_${String(counter).padStart(2, "0")}${ext}`;
  }

  return candidate;
}

async function fileExists(config, path, branch) {
  const url = `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`;
  try {
    await github(config, url);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function readJsonFile(config, path, branch, fallback) {
  const text = await readTextFile(config, path, branch, "");
  if (!text) return fallback;
  return JSON.parse(text);
}

async function readJsonFileSafe(config, path, branch, fallback) {
  try {
    return await readJsonFile(config, path, branch, fallback);
  } catch (error) {
    if (error.status === 404) return fallback;
    throw error;
  }
}

async function readTextFile(config, path, branch, fallback) {
  const file = await github(config, `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`);
  if (!file || !file.content) return fallback;
  return decodeBase64Utf8(file.content.replace(/\n/g, ""));
}

async function github(config, path, options = {}) {
  const method = options.method || "GET";
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "TownGG-Portfolio-Admin-Uploader",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API error: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function encodeURIComponentPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function decodeBase64Utf8(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
