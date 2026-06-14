import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const STORAGE_PATH = path.join(ROOT, '.auth/bethesda-storage.json');
const PROFILE_DIR = path.join(ROOT, '.auth/bethesda-profile');
const HEADED_MODE = process.argv.includes('--headed');
const HEADLESS = !HEADED_MODE;
const TARGET_TITLE = process.env.CC_DEBUG_TITLE || 'Cassilias Old Constellation Uniform';

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
}

function normalizeLines(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function printBlock(title, value) {
  console.log(`\n========== ${title} ==========`);
  console.log(value || '(empty)');
}

function printLines(title, lines, max = 160) {
  printBlock(title, lines.slice(0, max).map((line, index) => `${String(index).padStart(3, '0')}: ${line}`).join('\n'));
}

async function openContext() {
  if (await fileExists(STORAGE_PATH)) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      storageState: STORAGE_PATH,
      viewport: { width: 1600, height: 1100 }
    });
    context.__browser = browser;
    return context;
  }

  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1600, height: 1100 }
  });
}

async function closeContext(context) {
  const browser = context.__browser;
  await context.close();
  if (browser) await browser.close();
}

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const target = creations.find((creation) => creation.title === TARGET_TITLE) || creations.find((creation) => getCreationUrl(creation));

  if (!target) {
    throw new Error('No Bethesda Creations URL found in site-data.js');
  }

  const url = getCreationUrl(target);
  console.log(`Target: ${target.title}`);
  console.log(`URL: ${url}`);

  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const initialText = await page.locator('body').innerText({ timeout: 60000 });
  const initialLines = normalizeLines(initialText);
  printLines('BODY TEXT BEFORE DETAILS', initialLines);

  const ugcText = await page.evaluate(() => {
    const root = document.querySelector('#ugc-content') || document.body;
    return root.innerText || root.textContent || '';
  });
  printLines('UGC CONTENT TEXT BEFORE DETAILS', normalizeLines(ugcText));

  const allPlatformsMatches = normalizeLines(ugcText).filter((line) => /all platforms|所有平台|by towngg|^[0-9][0-9,.]*$/i.test(line));
  printLines('TOP MATCH CANDIDATES', allPlatformsMatches, 80);

  await page.getByRole('tab', { name: /details/i }).click({ timeout: 5000 }).catch(async () => {
    await page.getByText(/^(details|详情)$/i).click({ timeout: 5000 }).catch(() => {});
  });
  await page.waitForTimeout(1500);

  const detailsText = await page.locator('body').innerText({ timeout: 60000 });
  const detailsLines = normalizeLines(detailsText);
  printLines('BODY TEXT AFTER DETAILS', detailsLines, 220);

  const platformKeywords = /(Xbox|Playstation|PlayStation|Computer|PC|电脑|计算机|LIKES|DOWNLOADS|喜欢|下载|BOOKMARKS|VIEWS|PLAYS|SUBSCRIBES|书签|查看|播放数|订阅数|^[0-9][0-9,.]*$)/i;
  printLines('PLATFORM MATCH CANDIDATES', detailsLines.filter((line) => platformKeywords.test(line)), 220);

  await closeContext(context);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
