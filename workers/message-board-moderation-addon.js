/* TownGG Portfolio - Standalone Message Board Moderation Worker

   Deploy this file as a separate Cloudflare Worker if you do not want to merge it into workers/admin-upload-worker.js.

   Bind the Worker to these exact routes:
   - /api/admin/message-board-list
   - /api/admin/message-board-delete

   Required environment variables:
   - GITHUB_TOKEN: GitHub token with Discussions read/write access to TownGG/towngg-portfolio
   - ADMIN_UPLOAD_SECRET: the same admin key used by admin-upload.html

   Optional environment variables:
   - GITHUB_OWNER: default TownGG
   - GITHUB_REPO: default towngg-portfolio
   - MESSAGE_BOARD_DISCUSSION_NUMBER: recommended; the GitHub Discussion number used by the message board
*/

const DEFAULT_OWNER = "TownGG";
const DEFAULT_REPO = "towngg-portfolio";
const MESSAGE_BOARD_DISCUSSION_TERM = "/message-board.html";
const MESSAGE_BOARD_DISCUSSION_TITLE_RE = /message[-\s]?board/i;

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
    const isList = url.pathname.endsWith("/api/admin/message-board-list");
    const isDelete = url.pathname.endsWith("/api/admin/message-board-delete");

    if (request.method !== "POST" || (!isList && !isDelete)) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    try {
      assertEnv(env);
      authorize(request, env);
      const config = getConfig(env);

      if (isList) {
        const result = await listMessageBoardComments(config, env);
        return jsonResponse({ success: true, ...result });
      }

      const payload = await request.json().catch(() => ({}));
      const result = await deleteMessageBoardComment(config, payload);
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
    repo: env.GITHUB_REPO || DEFAULT_REPO
  };
}

async function githubGraphQL(config, query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "TownGG-Message-Board-Moderation"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.errors?.length) {
    const detail = data?.errors?.map((item) => item.message).join("; ");
    const error = new Error(detail || `GitHub GraphQL failed with HTTP ${response.status}.`);
    error.status = response.status || 500;
    throw error;
  }
  return data.data;
}

async function resolveMessageBoardDiscussion(config, env) {
  const configuredNumber = Number(env.MESSAGE_BOARD_DISCUSSION_NUMBER || 0);
  if (configuredNumber > 0) {
    const data = await githubGraphQL(config, `
      query MessageBoardDiscussionByNumber($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          discussion(number: $number) { id number title url }
        }
      }
    `, { owner: config.owner, repo: config.repo, number: configuredNumber });
    const discussion = data?.repository?.discussion;
    if (discussion) return discussion;
  }

  const data = await githubGraphQL(config, `
    query MessageBoardDiscussions($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 30, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes { id number title url }
        }
      }
    }
  `, { owner: config.owner, repo: config.repo });

  const discussions = data?.repository?.discussions?.nodes || [];
  const found = discussions.find((item) =>
    MESSAGE_BOARD_DISCUSSION_TITLE_RE.test(item.title || "") ||
    String(item.title || "").includes(MESSAGE_BOARD_DISCUSSION_TERM) ||
    String(item.url || "").includes("message-board")
  );

  if (!found) {
    const error = new Error("Message Board discussion was not found. Set MESSAGE_BOARD_DISCUSSION_NUMBER in the Worker environment for an exact match.");
    error.status = 404;
    throw error;
  }

  return found;
}

function flattenDiscussionComment(comment, parentId = "") {
  const base = {
    id: comment.id,
    parentId,
    author: comment.author?.login || "Unknown",
    bodyText: String(comment.bodyText || "").trim(),
    createdAt: comment.createdAt || "",
    updatedAt: comment.updatedAt || "",
    url: comment.url || ""
  };
  const replies = comment.replies?.nodes || [];
  return [base, ...replies.flatMap((reply) => flattenDiscussionComment(reply, comment.id))];
}

async function listMessageBoardComments(config, env) {
  const discussion = await resolveMessageBoardDiscussion(config, env);
  const data = await githubGraphQL(config, `
    query MessageBoardComments($id: ID!) {
      node(id: $id) {
        ... on Discussion {
          id
          number
          title
          url
          comments(first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
            nodes {
              id
              bodyText
              createdAt
              updatedAt
              url
              author { login }
              replies(first: 25) {
                nodes {
                  id
                  bodyText
                  createdAt
                  updatedAt
                  url
                  author { login }
                  replies(first: 10) {
                    nodes {
                      id
                      bodyText
                      createdAt
                      updatedAt
                      url
                      author { login }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { id: discussion.id });

  const node = data?.node;
  const comments = (node?.comments?.nodes || []).flatMap((comment) => flattenDiscussionComment(comment));
  return {
    discussion: {
      id: node?.id || discussion.id,
      number: node?.number || discussion.number,
      title: node?.title || discussion.title,
      url: node?.url || discussion.url
    },
    comments
  };
}

async function deleteMessageBoardComment(config, payload) {
  const id = String(payload?.id || "").trim();
  if (!id) {
    const error = new Error("Comment id is required.");
    error.status = 400;
    throw error;
  }

  await githubGraphQL(config, `
    mutation DeleteMessageBoardComment($id: ID!) {
      deleteDiscussionComment(input: { id: $id }) {
        clientMutationId
      }
    }
  `, { id });

  return { deleted: id };
}
