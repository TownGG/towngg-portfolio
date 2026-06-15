import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { savePageDebug } from './cc-debug.js';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const STORAGE_PATH = path.join(ROOT, '.auth/bethesda-storage.json');
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const TARGET_TITLE = process.env.CC_DEBUG_TITLE || 'CASSILIA 39 s POWER FIST';

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData;
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
}

async function scrollPage(page) {
  for (let index = 0; index < 8; index += 1) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const contextOptions = {
    viewport: { width: 1366, height: 900 }
  };

  if (await fileExists(STORAGE_PATH)) {
    contextOptions.storageState = STORAGE_PATH;
    console.log('Cloud debug: Bethesda storage state loaded.');
  } else {
    console.log('Cloud debug: no Bethesda storage state found.');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS }).catch((error) => {
    console.log(`Cloud debug author goto failed: ${error.message}`);
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1800);
  await scrollPage(page);

  const authorLinkCount = await page.locator('a[href*="/starfield/details/"]').count().catch(() => 0);
  console.log(`Cloud debug: author page detail link count = ${authorLinkCount}`);
  await savePageDebug(page, 'cloud-author-page', {
    reason: 'manual_cloud_debug_capture',
    authorLinkCount,
    authorUrl: CREATIONS_HOME
  });

  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const target = creations.find((creation) => creation.title === TARGET_TITLE && getCreationUrl(creation))
    || creations.find((creation) => getCreationUrl(creation));

  if (target) {
    const targetUrl = getCreationUrl(target);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS }).catch((error) => {
      console.log(`Cloud debug detail goto failed: ${error.message}`);
    });
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1800);
    await savePageDebug(page, `cloud-detail-${target.title}`, {
      reason: 'manual_cloud_debug_capture',
      targetTitle: target.title,
      targetUrl
    });
  } else {
    console.log('Cloud debug: no Bethesda Creation URL found in site-data.js.');
  }

  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
