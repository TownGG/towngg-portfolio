/**
 * Publish a local Bethesda Playwright storage-state JSON and immediately
 * trigger exactly one CC sync via repository_dispatch.
 *
 * Usage:
 *   npm run cc:secret:publish
 *   node scripts/update-bethesda-secret-and-sync.mjs /path/to/storage.json
 *
 * Never prints a cookie, session token, or the storage JSON to the console.
 * Updating a Secret via the GitHub website cannot trigger an Actions event.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'TownGG/towngg-portfolio';
const SECRET = 'BETHESDA_STORAGE_STATE';
const EVENT = 'bethesda-storage-state-updated';
const filePath = path.resolve(process.argv[2] || '.auth/bethesda-storage.json');
const gh = process.platform === 'win32' ? 'gh.exe' : 'gh';

function runGh(args, input) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(gh, args, { stdio: ['pipe', 'inherit', 'inherit'] });
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    processHandle.on('error', (error) =>
      finish(new Error('GitHub CLI is unavailable. Install gh and run gh auth login. ' + error.message)));
    processHandle.on('close', (code) =>
      finish(code === 0 ? null : new Error('gh command exited with code ' + code)));
    // The secret is transmitted through stdin, never as a command-line flag.
    processHandle.stdin.on('error', (error) => finish(error));
    processHandle.stdin.end(input ?? '');
  });
}

async function main() {
  const secretBytes = await readFile(filePath);
  let json;
  try {
    json = JSON.parse(secretBytes.toString('utf8'));
  } catch {
    throw new Error('Bethesda storage state must be valid JSON. Upload aborted.');
  }
  const cookies = Array.isArray(json?.cookies) ? json.cookies : [];
  const names = new Set(cookies.map((cookie) => cookie?.name));
  if (!names.has('bnet-session') || !names.has('attunement:refresh.prod')) {
    throw new Error('Required Bethesda login cookies are missing. Upload aborted.');
  }
  console.log('[CC_SECRET] Uploading Bethesda storage state to GitHub Secret (contents hidden).');
  await runGh(['secret', 'set', SECRET, '--repo', REPO], secretBytes);
  console.log('[CC_SECRET] Secret updated successfully. Dispatching CC sync.');
  try {
    await runGh(['api', '--method', 'POST', `repos/${REPO}/dispatches`,
      '-f', `event_type=${EVENT}`]);
  } catch (error) {
    console.error('[CC_SECRET] Secret was updated, but triggering CC sync failed.');
    console.error('[CC_SECRET] You can manually trigger: gh workflow run sync-creations.yml --repo ' +
      REPO + ' --ref main');
    throw error;
  }
  console.log('[CC_SECRET] CC sync queued. Existing half-hour runs remain active.');
  console.log(`[CC_SECRET] https://github.com/${REPO}/actions/workflows/sync-creations.yml`);
}

main().catch((error) => {
  console.error('[CC_SECRET] ' + error.message);
  process.exitCode = 1;
});
