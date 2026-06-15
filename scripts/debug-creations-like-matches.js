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
const SLOW_MS = Number(process.env.CC_SLOW_MS || 1200);
const LIKE_THRESHOLD = Number(process.env.CC_LIKE_DEBUG_THRESHOLD || 100);

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData;
}

function parseNumberValue(value) {
  const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url || '';
}

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
    const context = await browser.newContext({ storageState: STORAGE_PATH, viewport: { width: 1366, height: 900 } });
    context.__browser = browser;
    return context;
  }

  return chromium.launchPersistentContext(PROFILE_DIR, { headless: HEADLESS, viewport: { width: 1366, height: 900 } });
}

async function closeContext(context) {
  const browser = context.__browser;
  await context.close();
  if (browser) await browser.close();
}

async function openStatsTab(page) {
  await page.getByRole('tab', { name: /stats/i }).click({ timeout: 8000 }).catch(async () => {
    await page.getByText(/^(stats|统计)$/i).click({ timeout: 5000 }).catch(() => {});
  });
  await page.waitForTimeout(700);
}

async function forceSelectAllTime(page) {
  await page.getByText(/^Daily$/i).click({ timeout: 3500 }).catch(() => {});
  await page.waitForTimeout(350);
  await page.getByText(/^All time$/i).click({ timeout: 3500 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function selectPlatformAny(page) {
  await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('button,[role="button"]')]
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2) return false;
        const text = String(item.innerText || item.textContent || '').trim();
        return /^(any|all platforms|所有平台|全部平台)$/i.test(text);
      })
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    candidates[0]?.click();
  }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(900);
}

function findLikeMatches(text) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const labels = ['likes', 'like', '喜欢'];
  const matches = [];

  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b[^0-9]{0,80}([0-9][0-9,.]*)`, 'gi');
    for (const match of normalized.matchAll(pattern)) {
      const value = parseNumberValue(match[1]);
      const start = Math.max(0, match.index - 90);
      const end = Math.min(normalized.length, match.index + match[0].length + 90);
      matches.push({
        label,
        raw: match[1],
        value,
        snippet: normalized.slice(start, end)
      });
    }
  }

  return matches;
}

async function debugCreation(page, creation) {
  const url = getCreationUrl(creation);
  if (!url) return;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);
  await openStatsTab(page);
  await forceSelectAllTime(page);
  await selectPlatformAny(page);

  const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  const matches = findLikeMatches(text);
  const sum = matches.reduce((total, item) => total + item.value, 0);

  console.log('');
  console.log(`[LIKE DEBUG] ${creation.title}`);
  console.log(`[LIKE DEBUG] storedLikes=${creation.likes || '-'}, downloads=${creation.downloads || '-'}, plays=${creation.plays || '-'}, bookmarks=${creation.bookmarks || '-'}, libraryAdds=${creation.libraryAdds || '-'}`);
  console.log(`[LIKE DEBUG] url=${url}`);
  console.log(`[LIKE DEBUG] matchCount=${matches.length}, matchedSum=${sum}`);

  if (!matches.length) {
    console.log('[LIKE DEBUG] no like/likes matches found in current STATS body text.');
    return;
  }

  matches.forEach((item, index) => {
    console.log(`[LIKE DEBUG] #${index + 1} label=${item.label}, raw=${item.raw}, value=${item.value}`);
    console.log(`[LIKE DEBUG] #${index + 1} snippet=${item.snippet}`);
  });
}

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const suspects = creations.filter((item) => parseNumberValue(item.likes) > LIKE_THRESHOLD && getCreationUrl(item));

  console.log(`[LIKE DEBUG] threshold=${LIKE_THRESHOLD}, suspects=${suspects.length}`);
  suspects.forEach((item, index) => {
    console.log(`[LIKE DEBUG] suspect ${index + 1}: ${item.title} / likes=${item.likes} / downloads=${item.downloads || '-'} / plays=${item.plays || '-'}`);
  });

  if (!suspects.length) return;

  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();
  try {
    for (const creation of suspects) {
      await debugCreation(page, creation);
    }
  } finally {
    await closeContext(context);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
