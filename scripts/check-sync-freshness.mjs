/**
 * Skip native backup schedules when an external dispatch recently succeeded.
 * The manual and Secret-update triggers always execute as requested.
 */
import fs from 'node:fs';
const file = process.argv[2];
const event = process.env.SYNC_EVENT_NAME || '';
const MAX_AGE_MS = 20 * 60 * 1000;
if (!file) throw new Error('Missing sync snapshot filename');
let shouldRun = true;
if (event === 'schedule') {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const time = Date.parse(data.updatedAt || '');
    const age = Date.now() - time;
    if (Number.isFinite(time) && age >= 0 && age < MAX_AGE_MS) {
      shouldRun = false;
      console.log('[sync-freshness] Fresh published data (' +
        Math.round(age / 60000) + ' minutes old), skip duplicate run.');
    } else {
      console.log('[sync-freshness] Snapshot stale; scheduled fallback will run.');
    }
  } catch (e) {
    console.log('[sync-freshness] Snapshot unavailable; fallback will run: ' + e.message);
  }
} else {
  console.log('[sync-freshness] Direct event ' + (event || 'local') +
    ': not subject to freshness skip.');
}
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
    'should_run=' + (shouldRun ? 'true' : 'false') + '\n');
}
console.log('[sync-freshness] should_run=' + shouldRun);
