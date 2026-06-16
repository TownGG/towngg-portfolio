import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const AUTH_DIR = path.join(ROOT, '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'bethesda-profile');
const STORAGE_PATH = path.join(AUTH_DIR, 'bethesda-storage.json');
const HEADED_MODE = process.argv.includes('--headed');
const HEADLESS = !HEADED_MODE && process.env.HEADLESS !== 'false';
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';

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
    const downloadsLabel = /\bdownloads?\b|下载/i.test(bodyText);
    const libraryHint = /\blibrary\b|library\s*adds|加入库|收藏库/i.test(bodyText);

    let status = 'unknown';
    if (signOutVisible || accountHint) status = 'logged-in-likely';
    if (signInVisible && !signOutVisible && !accountHint) status = 'logged-out-likely';

    return { status, signInVisible, signOutVisible, accountHint, downloadsLabel, libraryHint };
  });
}

const context = await openContext();
const page = context.pages()[0] || await context.newPage();
try {
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1200);
  const signals = await readAuthSignals(page);
  console.log(`[AUTH_STATUS] status=${signals.status}, signInVisible=${yn(signals.signInVisible)}, signOutVisible=${yn(signals.signOutVisible)}, accountHint=${yn(signals.accountHint)}, downloadsLabel=${yn(signals.downloadsLabel)}, libraryHint=${yn(signals.libraryHint)}, url=${page.url()}`);
} finally {
  await closeContext(context);
}
