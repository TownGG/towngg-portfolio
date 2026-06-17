import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PREFIX = '[COOKIE_AUTO_REFRESH]';
const ROOT = process.cwd();
const AUTH_DIR = path.join(ROOT, '.auth');
const STORAGE_PATH = path.join(AUTH_DIR, 'bethesda-storage.json');
const BACKUP_PATH = path.join(AUTH_DIR, 'bethesda-storage.backup-before-refresh.json');
const LOGIN_URL = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';
const SECRET_NAME = 'BETHESDA_STORAGE_STATE';
const REPO = 'TownGG/towngg-portfolio';
const IMPORTANT_COOKIES = ['bnet-session', 'attunement:refresh.prod'];

const argSet = new Set(process.argv.slice(2));
const flags = {
  dryRun: argSet.has('--dry-run'),
  skipUpload: argSet.has('--skip-upload'),
  force: argSet.has('--force'),
  yes: argSet.has('--yes')
};

const thresholdHoursRaw = Number(process.env.CC_COOKIE_REFRESH_HOURS || 1);
const thresholdHours = Number.isFinite(thresholdHoursRaw) && thresholdHoursRaw >= 0 ? thresholdHoursRaw : 1;
const thresholdSeconds = thresholdHours * 60 * 60;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readStorage() {
  if (!(await fileExists(STORAGE_PATH))) {
    return { storage: null, readable: false, reason: 'storage file not found' };
  }

  try {
    const storage = JSON.parse(await fs.readFile(STORAGE_PATH, 'utf8'));
    return { storage, readable: true, reason: '' };
  } catch {
    return { storage: null, readable: false, reason: 'storage file is invalid JSON' };
  }
}

function padBase64Url(value) {
  const raw = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=');
}

function jwtExpires(cookieValue) {
  try {
    const payload = String(cookieValue || '').split('.')[1];
    if (!payload) return null;
    const parsed = JSON.parse(Buffer.from(padBase64Url(payload), 'base64').toString('utf8'));
    const exp = Number(parsed.exp);
    return Number.isFinite(exp) && exp > 0 ? exp : null;
  } catch {
    return null;
  }
}

function cookieExpires(cookie) {
  const expires = Number(cookie?.expires);
  return Number.isFinite(expires) && expires > 0 ? expires : null;
}

function expiryForCookie(cookie) {
  if (!cookie) return { expires: null, source: '-' };
  const expires = cookieExpires(cookie);
  if (expires) return { expires, source: 'cookie-expires' };

  if (cookie.name === 'attunement:refresh.prod') {
    const jwtExp = jwtExpires(cookie.value);
    if (jwtExp) return { expires: jwtExp, source: 'jwt-exp' };
  }

  return { expires: null, source: 'session-or-unknown' };
}

function formatRemaining(seconds) {
  if (!Number.isFinite(seconds)) return 'unknown';
  if (seconds <= 0) return 'expired';
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatExpiry(epochSeconds) {
  if (!epochSeconds) return '-';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date(epochSeconds * 1000)).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} UTC+8`;
}

function inspectStorage(readResult) {
  const now = Date.now() / 1000;
  const infos = IMPORTANT_COOKIES.map((name) => {
    const cookies = Array.isArray(readResult.storage?.cookies) ? readResult.storage.cookies : [];
    const cookie = cookies.find((item) => item.name === name);
    const { expires, source } = expiryForCookie(cookie);
    const remainingSeconds = expires ? Math.floor(expires - now) : null;
    return { name, found: Boolean(cookie), expires, source, remainingSeconds };
  });

  const reasons = [];
  if (!readResult.readable) {
    reasons.push(`${readResult.reason}. Refresh is required.`);
  }

  for (const item of infos) {
    if (!item.found) {
      reasons.push(`${item.name} missing`);
      continue;
    }
    if (!item.expires) {
      reasons.push(`${item.name} has no readable expiry`);
      continue;
    }
    if (item.remainingSeconds <= 0) {
      reasons.push(`${item.name} expired`);
      continue;
    }
    if (item.name === 'bnet-session' && item.remainingSeconds <= thresholdSeconds) {
      reasons.push(`${item.name} remaining time is <= ${thresholdHours}h`);
    }
  }

  return { infos, refreshNeeded: flags.force || reasons.length > 0, reasons };
}

function printInspection(inspection) {
  console.log(`${PREFIX} Refresh threshold: ${thresholdHours}h`);
  if (flags.force) console.log(`${PREFIX} --force enabled: refresh will run even if cookies are still valid.`);

  for (const item of inspection.infos) {
    console.log(`${PREFIX} ${item.name}: found=${item.found ? 'yes' : 'no'}, source=${item.source}, expiresAt=${formatExpiry(item.expires)}, remaining=${formatRemaining(item.remainingSeconds)}`);
  }

  if (inspection.reasons.length) {
    for (const reason of inspection.reasons) console.log(`${PREFIX} Refresh reason: ${reason}`);
  } else if (!flags.force) {
    console.log(`${PREFIX} Existing Bethesda storage is still fresh enough. No refresh needed.`);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: options.stdio || 'inherit',
      shell: Boolean(options.shell)
    });
    child.on('error', () => resolve(127));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function runGhCommand(args, options = {}) {
  return runCommand('gh', args, {
    ...options,
    shell: process.platform === 'win32'
  });
}

async function backupStorage(readResult) {
  if (!readResult.readable) {
    console.log(`${PREFIX} No readable storage backup was created.`);
    return false;
  }

  await fs.mkdir(AUTH_DIR, { recursive: true });
  await fs.copyFile(STORAGE_PATH, BACKUP_PATH);
  console.log(`${PREFIX} Backup saved: .auth/bethesda-storage.backup-before-refresh.json`);
  return true;
}

async function restoreBackup() {
  if (!(await fileExists(BACKUP_PATH))) {
    console.log(`${PREFIX} No backup storage exists to restore.`);
    return false;
  }

  await fs.copyFile(BACKUP_PATH, STORAGE_PATH);
  console.log(`${PREFIX} Restored local Bethesda storage from backup.`);
  return true;
}

async function refreshStorage(readResult) {
  await fs.mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  let context;
  try {
    const contextOptions = { viewport: { width: 1440, height: 1000 } };
    if (readResult.readable && existsSync(STORAGE_PATH)) contextOptions.storageState = STORAGE_PATH;
    context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log(`${PREFIX} A headed browser is open. Complete Bethesda login/2FA there.`);
    console.log(`${PREFIX} Do not paste passwords or 2FA codes into this terminal.`);
    const rl = readline.createInterface({ input, output });
    await rl.question(`${PREFIX} Press Enter here after the Bethesda page is logged in: `);
    rl.close();

    await context.storageState({ path: STORAGE_PATH });
    console.log(`${PREFIX} Saved refreshed storage to .auth/bethesda-storage.json`);
  } finally {
    if (context) await context.close();
    await browser.close();
  }
}

async function validateStorage() {
  console.log(`${PREFIX} Validating Bethesda storage with scripts/check-bethesda-auth.js --headed`);
  return runCommand(process.execPath, ['scripts/check-bethesda-auth.js', '--headed']);
}

async function ensureGhReady() {
  const code = await runGhCommand(['auth', 'status'], { stdio: 'ignore' });
  if (code !== 0) {
    console.error(`${PREFIX} GitHub CLI is not installed or not authenticated. Run gh auth login first.`);
    return false;
  }
  return true;
}

async function uploadSecret() {
  if (!(await ensureGhReady())) return 1;
  console.log(`${PREFIX} Uploading refreshed storage to GitHub Secret ${SECRET_NAME}.`);
  return runGhCommand(['secret', 'set', SECRET_NAME, '--repo', REPO, '--body-file', STORAGE_PATH]);
}

async function confirmUpload() {
  if (flags.yes) return true;
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${PREFIX} Upload new storage to GitHub Secret ${SECRET_NAME}? Type YES to continue: `);
  rl.close();
  return answer === 'YES';
}

async function rollbackSecret() {
  const restored = await restoreBackup();
  if (!restored) return;

  if (await ensureGhReady()) {
    const uploadCode = await runGhCommand(['secret', 'set', SECRET_NAME, '--repo', REPO, '--body-file', STORAGE_PATH]);
    if (uploadCode === 0) {
      console.log(`${PREFIX} Rolled back GitHub Secret ${SECRET_NAME} to the backup storage.`);
    } else {
      console.error(`${PREFIX} Local backup restored, but GitHub Secret rollback upload failed.`);
    }
  }
}

const readResult = await readStorage();
const inspection = inspectStorage(readResult);
printInspection(inspection);

if (!inspection.refreshNeeded) process.exit(0);

if (flags.dryRun) {
  console.log(`${PREFIX} Dry run only. Refresh is needed, but no browser, file write, or secret upload was performed.`);
  process.exit(0);
}

await backupStorage(readResult);
await refreshStorage(readResult);

const validationCode = await validateStorage();
if (validationCode !== 0) {
  console.error(`${PREFIX} Refreshed storage failed validation. Restoring backup and stopping before secret upload.`);
  await restoreBackup();
  process.exit(1);
}

if (flags.skipUpload) {
  console.log(`${PREFIX} Refreshed local storage is valid. Secret upload skipped by --skip-upload.`);
  process.exit(0);
}

if (!(await confirmUpload())) {
  console.log(`${PREFIX} Secret upload cancelled. Local refreshed storage remains in .auth/bethesda-storage.json.`);
  process.exit(0);
}

const uploadCode = await uploadSecret();
if (uploadCode !== 0) {
  console.error(`${PREFIX} Secret upload failed. Restoring previous local storage when possible.`);
  await restoreBackup();
  process.exit(1);
}

const postUploadValidationCode = await validateStorage();
if (postUploadValidationCode !== 0) {
  console.error(`${PREFIX} Post-upload validation failed. Rolling local storage and GitHub Secret back to backup when possible.`);
  await rollbackSecret();
  process.exit(1);
}

console.log(`${PREFIX} Success. Local storage validated and GitHub Secret ${SECRET_NAME} is updated.`);
