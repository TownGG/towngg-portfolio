const DEFAULT_OWNER = 'TownGG';
const DEFAULT_REPO = 'towngg-portfolio';
const DEFAULT_WORKFLOW_ID = 'sync-creations.yml';
const DEFAULT_REF = 'main';

async function githubRequest(env, path, options = {}) {
  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const token = env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN secret.');
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'towngg-creations-sync-worker',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function hasActiveWorkflowRun(env) {
  const workflowId = env.GITHUB_WORKFLOW_ID || DEFAULT_WORKFLOW_ID;
  const queued = await githubRequest(env, `/actions/workflows/${workflowId}/runs?status=queued&per_page=1`);
  if ((queued?.total_count || 0) > 0) return true;

  const inProgress = await githubRequest(env, `/actions/workflows/${workflowId}/runs?status=in_progress&per_page=1`);
  return (inProgress?.total_count || 0) > 0;
}

async function triggerCreationsSync(env) {
  const workflowId = env.GITHUB_WORKFLOW_ID || DEFAULT_WORKFLOW_ID;
  const ref = env.GITHUB_REF || DEFAULT_REF;

  if (env.SKIP_WHEN_ACTIVE !== 'false' && await hasActiveWorkflowRun(env)) {
    return {
      ok: true,
      skipped: true,
      reason: 'workflow_already_queued_or_running',
      workflowId,
      ref
    };
  }

  await githubRequest(env, `/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ref })
  });

  return {
    ok: true,
    skipped: false,
    workflowId,
    ref,
    triggeredAt: new Date().toISOString()
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerCreationsSync(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'towngg-creations-sync-worker' });
    }

    if (url.pathname !== '/trigger') {
      return json({ ok: true, usage: 'POST /trigger or configure Cron Triggers' });
    }

    if (env.TRIGGER_KEY) {
      const key = request.headers.get('x-trigger-key') || url.searchParams.get('key');
      if (key !== env.TRIGGER_KEY) {
        return json({ ok: false, error: 'Forbidden' }, 403);
      }
    }

    try {
      return json(await triggerCreationsSync(env));
    } catch (error) {
      return json({ ok: false, error: error.message }, 500);
    }
  }
};
