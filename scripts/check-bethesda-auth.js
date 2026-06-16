import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const AUTH_DIR = path.join(ROOT, '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'bethesda-profile');
const STORAGE_PATH = path.join(AUTH_DIR, 'bethesda-storage.json');
const HEADED_MODE = process.argv.includes('--headed');
const HEADLESS = !HEADED_MODE && process.env.HEADLESS !== 'false';
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const COOKIE_WARNING_HOURS = Number(process.env.CC_COOKIE_WARNING_HOURS || 6);
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';
const TRACKED_COOKIES = ['bnet-session', 'bnet-username', 'attunement:refresh.prod'];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function openContext() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  if (await fileExists(STORAGE_PATH)) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({ storageState: STORAGE_PATH, viewport: { width: 1440, height: 1000 } });
    context.__browser = browser;
    return context;
  }
  return chromium.launchPersistentContext(PROFILE_DIR, { headless: HEADLESS, viewport: { width: 1440, height: 1000 } });
}

async function closeContext(context) {
  const browser = context.__browser;
  await context.close();
  if (browser) await browser.close();
}

function yn(value) {
  return value ? 'yes' : 'no';
}

function padBase64Url(value) {
  const raw = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=');
}

function jwtExpires(cookieValue) {
  try {
    const payload = String(cookieValue || '').split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(padBase64Url(payload), 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    const exp = Number(parsed.exp);
    return Number.isFinite(exp) && exp > 0 ? exp : null;
  } catch {
    return null;
  }
}

function formatShanghaiTime(epochSeconds) {
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

function remainingLabel(epochSeconds) {
  if (!epochSeconds) return 'unknown';
  const remainingSeconds = Math.floor(epochSeconds - Date.now() / 1000);
  if (remainingSeconds <= 0) return 'expired';
  const totalMinutes = Math.floor(remainingSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

async function cookieExpiryInfos() {
  if (!(await fileExists(STORAGE_PATH))) return [];
  try {
    const storage = JSON.parse(await fs.readFile(STORAGE_PATH, 'utf8'));
    const cookies = Array.isArray(storage.cookies) ? storage.cookies : [];
    return TRACKED_COOKIES.map((name) => {
      const cookie = cookies.find((item) => item.name === name);
      if (!cookie) return { name, found: false, expires: null, source: '-' };
      const cookieExpires = Number(cookie.expires);
      const jwtExp = jwtExpires(cookie.value);
      const expires = cookieExpires > 0 ? cookieExpires : jwtExp;
      const source = cookieExpires > 0 ? 'cookie-expires' : (jwtExp ? 'jwt-exp' : 'session-or-unknown');
      const remainingSeconds = expires ? Math.floor(expires - Date.now() / 1000) : null;
      return { name, found: true, expires, source, remainingSeconds };
    });
  } catch {
    return [];
  }
}

function printCookieExpiry(infos) {
  if (!infos.length) {
    console.log('[AUTH_COOKIE] skipped: no bethesda-storage.json or cookies could be read.');
    return;
  }

  const expiring = infos.filter((item) => item.found && item.expires);
  infos.forEach((item) => {
    console.log(`[AUTH_COOKIE] name=${item.name}, found=${yn(item.found)}, source=${item.source || '-'}, expiresAt=${formatShanghaiTime(item.expires)}, remaining=${remainingLabel(item.expires)}`);
  });

  if (!expiring.length) {
    console.log('[AUTH_COOKIE_SUMMARY] nearest=unknown, remaining=unknown, warning=yes');
    console.log('[AUTH_COOKIE_WARNING] No readable auth cookie expiry found. Please verify Bethesda login state.');
    return;
  }

  expiring.sort((a, b) => a.expires - b.expires);
  const nearest = expiring[0];
  const warningSeconds = COOKIE_WARNING_HOURS * 60 * 60;
  const expired = nearest.remainingSeconds !== null && nearest.remainingSeconds <= 0;
  const soon = nearest.remainingSeconds !== null && nearest.remainingSeconds > 0 && nearest.remainingSeconds <= warningSeconds;
  console.log(`[AUTH_COOKIE_SUMMARY] nearest=${nearest.name}, expiresAt=${formatShanghaiTime(nearest.expires)}, remaining=${remainingLabel(nearest.expires)}, warning=${yn(expired || soon)}, warningThreshold=${COOKIE_WARNING_HOURS}h`);
  if (expired) {
    console.log(`[AUTH_COOKIE_WARNING] ${nearest.name} has expired. Refresh BETHESDA_STORAGE_STATE before syncing.`);
  } else if (soon) {
    console.log(`[AUTH_COOKIE_WARNING] ${nearest.name} will expire in ${remainingLabel(nearest.expires)}. Refresh BETHESDA_STORAGE_STATE soon.`);
  }
}

function cookieAuthHealth(infos) {
  if (!infos.length) return { ok: false, reason: 'no_cookie_info' };
  const readable = infos.filter((item) => item.found && item.expires);
  if (!readable.length) return { ok: false, reason: 'no_readable_cookie_expiry' };

  const expired = readable.find((item) => item.remainingSeconds !== null && item.remainingSeconds <= 0);
  if (expired) return { ok: false, reason: `${expired.name}_expired` };

  return { ok: true, reason: 'cookies_not_expired' };
}

async function firstCreationUrl() {
  try {
    const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'site-data.js' });
    const creations = Array.isArray(context.window.siteData?.creations) ? context.window.siteData.creations : [];
    return creations.find((item) => item?.links?.some((link) => /creations\.bethesda\.net/i.test(link.url)))
      ?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url || '';
  } catch {
    return '';
  }
}

async function readAuthSignals(page) {
  return page.evaluate(() => {
    const isVisible = (node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const clickableTexts = [...document.querySelectorAll('a,button,[role="button"],[role="menuitem"]')]
      .filter(isVisible)
      .map((node) => String(node.innerText || node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const bodyText = String(document.body.innerText || document.body.textContent || '').replace(/\s+/g, ' ');
    const signInVisible = clickableTexts.some((text) => /^(sign\s*in|log\s*in|登录|登入)$/i.test(text));
    const signOutVisible = clickableTexts.some((text) => /^(sign\s*out|log\s*out|退出|登出)$/i.test(text));
    const accountHint = clickableTexts.some((text) => /(account|profile|settings|my\s*mods|我的|账户|账号|个人资料)/i.test(text));
    const allPlatformsLabel = /all\s*platforms|所有平台/i.test(bodyText);
    const downloadsLabel = /\bdownloads?\b|下载/i.test(bodyText);
    const libraryHint = /\blibrary\b|library\s*adds|加入库|收藏库/i.test(bodyText);

    let status = 'unknown';
    if (signOutVisible || accountHint || (!signInVisible && downloadsLabel && allPlatformsLabel)) status = 'logged-in-likely';
    if (signInVisible && !signOutVisible && !accountHint && !downloadsLabel) status = 'logged-out-likely';

    return { status, signInVisible, signOutVisible, accountHint, allPlatformsLabel, downloadsLabel, libraryHint };
  });
}

function authLine(prefix, signals, url) {
  return `[${prefix}] status=${signals.status}, signInVisible=${yn(signals.signInVisible)}, signOutVisible=${yn(signals.signOutVisible)}, accountHint=${yn(signals.accountHint)}, allPlatformsLabel=${yn(signals.allPlatformsLabel)}, downloadsLabel=${yn(signals.downloadsLabel)}, libraryHint=${yn(signals.libraryHint)}, url=${url}`;
}

const cookieInfos = await cookieExpiryInfos();
printCookieExpiry(cookieInfos);
const cookieHealth = cookieAuthHealth(cookieInfos);
console.log(`[AUTH_COOKIE_FINAL] valid=${yn(cookieHealth.ok)}, reason=${cookieHealth.reason}`);

const context = await openContext();
const page = context.pages()[0] || await context.newPage();
let homeSignals = null;
let detailSignals = null;
try {
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1200);
  homeSignals = await readAuthSignals(page);
  console.log(authLine('AUTH_STATUS_HOME', homeSignals, page.url()));

  const detailUrl = await firstCreationUrl();
  if (detailUrl) {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1200);
    detailSignals = await readAuthSignals(page);
    console.log(authLine('AUTH_STATUS_DETAIL', detailSignals, page.url()));
  } else {
    console.log('[AUTH_STATUS_DETAIL] skipped: no Bethesda Creation detail URL found in site-data.js');
  }

  const pageConfirmed = homeSignals?.status === 'logged-in-likely' || detailSignals?.status === 'logged-in-likely';
  const confirmed = cookieHealth.ok && pageConfirmed;
  console.log(`[AUTH_STATUS_FINAL] confirmed=${yn(confirmed)}`);
  if (!confirmed) {
    if (!cookieHealth.ok) console.error(`[AUTH_STATUS_FINAL] Cookie validation failed: ${cookieHealth.reason}. Stop sync before opening data capture.`);
    else console.error('[AUTH_STATUS_FINAL] Bethesda login is not confirmed. Stop sync to avoid writing public/partial stats.');
    process.exitCode = 1;
  }
} finally {
  await closeContext(context);
}
