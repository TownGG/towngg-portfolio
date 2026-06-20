/* Message Board Moderation Add-on for workers/admin-upload-worker.js

   Add these two POST routes to the existing Admin Worker:
   - /api/admin/message-board-list
   - /api/admin/message-board-delete

   Required token permission:
   - GITHUB_TOKEN must have GitHub Discussions read/write access for TownGG/towngg-portfolio.

   Integration notes:
   1. In fetch(), add:
      const isMessageBoardList = url.pathname.endsWith("/api/admin/message-board-list");
      const isMessageBoardDelete = url.pathname.endsWith("/api/admin/message-board-delete");
      const isMessageBoardRoute = isMessageBoardList || isMessageBoardDelete;
   2. Include isMessageBoardRoute in the allowed route check.
   3. Before other payload-based routes:
      if (isMessageBoardList) return jsonResponse({ success: true, ...(await listMessageBoardComments(config, env)) });
   4. After payload is parsed:
      if (isMessageBoardDelete) return jsonResponse({ success: true, ...(await deleteMessageBoardComment(config, env, payload)) });
   5. Paste the functions below anywhere below getConfig().
*/

const MESSAGE_BOARD_DISCUSSION_TERM = "/message-board.html";
const MESSAGE_BOARD_DISCUSSION_TITLE_RE = /message[-\s]?board/i;

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

async function deleteMessageBoardComment(config, env, payload) {
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
