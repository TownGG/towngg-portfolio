/**
 * Check both data sync workflows every half hour. If a workflow has not
 * triggered in 35 minutes, dispatch a single run (unless running/queued).
 * Keep the existing scheduler and authentication mechanisms untouched.
 */
import { appendFileSync } from 'node:fs';

const targets = [
  ['sync-creations.yml', 'Bethesda CC'],
  ['update-nexus-data.yml', 'Nexus Mods']
];
const repo = String(process.env.GITHUB_REPOSITORY || '');
const token = String(process.env.GITHUB_TOKEN || '');
const dryRun = String(process.env.WATCHDOG_DRY_RUN || '').toLowerCase() === 'true';
const maxAgeMs = 35 * 60 * 1000;
const active = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const results = [];
if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repo) || !token) {
  throw new Error('GitHub repo or short-lived GITHUB_TOKEN is missing');
}

async function github(endpoint, method = 'GET', body) {
  const res = await fetch('https://api.github.com/repos/' + repo + '/' + endpoint, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!res.ok) {
    const error = (await res.text()).slice(0, 300);
    throw new Error('GitHub API HTTP ' + res.status + ': ' + error);
  }
  return res.status === 204 ? null : res.json();
}

function checkRecent(runs, now = Date.now()) {
  if (runs.some(run => active.has(run.status))) return 'active';
  const recent = runs.some(run =>
    [run.created_at, run.run_started_at].some(value => {
      const time = Date.parse(value || '');
      return Number.isFinite(time) && now >= time && now - time < maxAgeMs;
    })
  );
  return recent ? 'recent' : 'missing';
}

async function checkOne(file, name) {
  const apiPath = 'actions/workflows/' + file;
  const data = await github(apiPath + '/runs?per_page=30');
  const status = checkRecent(Array.isArray(data.workflow_runs) ? data.workflow_runs : []);
  if (status !== 'missing') {
    console.log('[WATCHDOG] ' + name + ': ' + status + ', skipping duplicate dispatch');
    results.push([name, status]);
    return;
  }
  if (dryRun) {
    console.log('[WATCHDOG] ' + name + ': no trigger in 35 minutes (dry run)');
    results.push([name, 'missing; dry run']);
    return;
  }
  console.log('[WATCHDOG] ' + name + ': missed trigger; requesting workflow_dispatch');
  await github(apiPath + '/dispatches', 'POST', { ref: 'main' });
  console.log('[WATCHDOG] ' + name + ': dispatch accepted');
  results.push([name, 'recovery dispatched']);
}

let failures = 0;
for (const [file, name] of targets) {
  try {
    await checkOne(file, name);
  } catch (error) {
    failures += 1;
    console.error('[WATCHDOG] ' + name + ': ' + String(error.message || error));
    results.push([name, 'ERROR']);
  }
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## CC / Nexus 30-minute trigger check\n\n' +
    '| Workflow | Result |\n| --- | --- |\n' +
    results.map(([name, status]) => '| ' + name + ' | ' + status + ' |').join('\n') + '\n');
}
if (failures > 0) process.exitCode = 1;
