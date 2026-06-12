/* TownGG Portfolio v2.04
   Cloudflare Worker backend for the hidden Gallery Upload System.

   Required Cloudflare Worker environment variables:
   - GITHUB_TOKEN: fine-grained GitHub token with Contents read/write access to TownGG/towngg-portfolio
   - ADMIN_UPLOAD_SECRET: admin key used by /admin-upload.html
   - GITHUB_OWNER: TownGG
   - GITHUB_REPO: towngg-portfolio
   - GITHUB_BRANCH: main
*/

const DEFAULT_OWNER = "TownGG";
const DEFAULT_REPO = "towngg-portfolio";
const DEFAULT_BRANCH = "main";
const IMAGE_DIR = "assets/images/gallery-all-compressed";
const CONCEPT_DATA_PATH = "assets/data/gallery-concept-art.json";
const SCREENSHOT_DATA_PATH = "assets/data/gallery-screenshots.json";
const VERSION_DATA_PATH = "assets/data/site-version.json";
const MAX_FILES = 20;
const MAX_BASE64_CHARS = 16 * 1024 * 1024;

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
    if (request.method !== "POST" || !url.pathname.endsWith("/api/admin/gallery-upload")) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    try {
      assertEnv(env);
      authorize(request, env);

      const payload = await request.json();
      validatePayload(payload);

      const config = getConfig(env);
      const result = await commitGalleryUpload(config, payload);

      return jsonResponse({ success: true, ...result });
    } catch (error) {
      return jsonResponse({ success: false, error: error.message || "Upload failed" }, error.status || 500);
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

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Invalid request payload");
    error.status = 400;
    throw error;
  }

  if (!["concept", "screenshots"].includes(payload.type)) {
    const error = new Error("Invalid upload type");
    error.status = 400;
    throw error;
  }

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

function isSafeJpegName(name) {
  return /^[a-z0-9][a-z0-9_-]*\.jpg$/.test(String(name || ""));
}

async function commitGalleryUpload(config, payload) {
  const dataPath = payload.type === "concept" ? CONCEPT_DATA_PATH : SCREENSHOT_DATA_PATH;
  const uploaded = [];
  const treeItems = [];

  const ref = await github(config, `/git/ref/heads/${config.branch}`);
  const parentSha = ref.object.sha;
  const parentCommit = await github(config, `/git/commits/${parentSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const latestGalleryData = await readJsonFile(config, dataPath, config.branch, []);
  const latestVersionData = await readJsonFile(config, VERSION_DATA_PATH, config.branch, {});

  for (const file of payload.files) {
    const uniqueName = await makeUniqueFilename(config, file.filename, config.branch);
    const imagePath = `${IMAGE_DIR}/${uniqueName}`;
    const imageBlob = await github(config, "/git/blobs", {
      method: "POST",
      body: {
        content: file.base64,
        encoding: "base64"
      }
    });

    treeItems.push({
      path: imagePath,
      mode: "100644",
      type: "blob",
      sha: imageBlob.sha
    });

    uploaded.push({
      path: imagePath,
      image: `./${imagePath}`,
      alt: normalizeAlt(file.alt, payload.type)
    });
  }

  const newEntries = uploaded.map((item) => ({
    image: item.image,
    alt: item.alt
  }));

  const updatedGalleryData = [...newEntries, ...latestGalleryData];
  const updatedVersionData = nextVersionData(latestVersionData);

  const galleryBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: {
      content: JSON.stringify(updatedGalleryData, null, 2) + "\n",
      encoding: "utf-8"
    }
  });

  const versionBlob = await github(config, "/git/blobs", {
    method: "POST",
    body: {
      content: JSON.stringify(updatedVersionData, null, 2) + "\n",
      encoding: "utf-8"
    }
  });

  treeItems.push({ path: dataPath, mode: "100644", type: "blob", sha: galleryBlob.sha });
  treeItems.push({ path: VERSION_DATA_PATH, mode: "100644", type: "blob", sha: versionBlob.sha });

  const tree = await github(config, "/git/trees", {
    method: "POST",
    body: {
      base_tree: baseTreeSha,
      tree: treeItems
    }
  });

  const commit = await github(config, "/git/commits", {
    method: "POST",
    body: {
      message: payload.type === "concept" ? "Add concept art uploads" : "Add in-game screenshot uploads",
      tree: tree.sha,
      parents: [parentSha]
    }
  });

  await github(config, `/git/refs/heads/${config.branch}`, {
    method: "PATCH",
    body: {
      sha: commit.sha,
      force: false
    }
  });

  return {
    commitSha: commit.sha,
    version: updatedVersionData.version,
    updatedDataFile: dataPath,
    uploaded
  };
}

function normalizeAlt(alt, type) {
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

async function makeUniqueFilename(config, filename, branch) {
  const dotIndex = filename.lastIndexOf(".");
  const base = filename.slice(0, dotIndex);
  const ext = filename.slice(dotIndex);
  let candidate = filename;
  let counter = 1;

  while (await fileExists(config, `${IMAGE_DIR}/${candidate}`, branch)) {
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
  const file = await github(config, `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`);
  if (!file || !file.content) return fallback;
  const decoded = decodeBase64Utf8(file.content.replace(/\n/g, ""));
  return JSON.parse(decoded);
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
