import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const STORAGE_PATH = path.join(ROOT, '.auth/bethesda-storage.json');
const HEADLESS = process.env.HEADLESS !== 'false';
const SLOW_MS = Number(process.env.CC_SLOW_MS || 900);
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);

const numberFormat = new Intl.NumberFormat('en-US');
const statKeys = ['views', 'bookmarks', 'likes', 'downloads', 'plays', 'libraryAdds'];
const labelMap = {
  views: ['views', 'view'],
  bookmarks: ['bookmarks', 'bookmark'],
  likes: ['likes', 'like'],
  downloads: ['downloads', 'download'],
  plays: ['plays', 'play'],
  libraryAdds: ['library adds', 'library add', 'added to library', 'library']
};

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseStat(text, key) {
  const labels = labelMap[key] || [key];
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');

  for (const label of labels) {
    const escaped = escapeRegExp(label);
    const afterLabel = new RegExp(`${escaped}\\s*[:\\-]?\\s*([0-9][0-9,.]*)`, 'i').exec(normalized);
    if (afterLabel) return afterLabel[1];

    const beforeLabel = new RegExp(`([0-9][0-9,.]*)\\s*${escaped}`, 'i').exec(normalized);
    if (beforeLabel) return beforeLabel[1];
  }

  return null;
}

function normalizeNumber(value) {
  if (!value) return null;
  const number = Number(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(number)) return null;
  return numberFormat.format(Math.round(number));
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
}

function replaceCreationObject(source, title, nextObjectText) {
  const titlePattern = new RegExp(`\\{\\s*title:\\s*${JSON.stringify(title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const match = titlePattern.exec(source);
  if (!match) return source;

  let index = match.index;
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(0, match.index) + nextObjectText + source.slice(index + 1);
      }
    }
  }

  return source;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function renderCreationObject(item) {
  const ordered = [];
  const push = (key, value) => {
    if (value === undefined) return;
    ordered.push([key, value]);
  };

  push('title', item.title);
  push('group', item.group);
  push('category', item.category);
  push('image', item.image);
  push('alt', item.alt);
  push('description', item.description);
  push('tags', item.tags);
  for (const key of statKeys) push(key, item[key]);
  push('updatedAt', item.updatedAt);
  push('source', item.source);
  push('links', item.links);

  const parts = ordered.map(([key, value]) => {
    if (Array.isArray(value)) {
      if (key === 'tags') return `${key}: [${value.map(jsString).join(', ')}]`;
      if (key === 'links') {
        const links = value.map((link) => `{ label: ${jsString(link.label)}, url: ${jsString(link.url)} }`).join(', ');
        return `${key}: [${links}]`;
      }
    }
    return `${key}: ${jsString(value)}`;
  });

  return `{ ${parts.join(', ')} }`;
}

async function storageStateExists() {
  try {
    await fs.access(STORAGE_PATH);
    return true;
  } catch {
    return false;
  }
}

async function scrapeCreation(page, creation) {
  const url = getCreationUrl(creation);
  if (!url) return { ok: false, error: 'missing_url' };

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS });
  const stats = {};
  for (const key of statKeys) {
    const value = normalizeNumber(parseStat(text, key));
    if (value) stats[key] = value;
  }

  if (!Object.keys(stats).length) {
    return { ok: false, error: 'no_stats_found' };
  }

  return { ok: true, stats };
}

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];

  const hasStorage = await storageStateExists();
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext(hasStorage ? { storageState: STORAGE_PATH } : {});
  const page = await context.newPage();

  let nextSource = source;
  let success = 0;
  let failed = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const creation of creations) {
    const url = getCreationUrl(creation);
    if (!url) continue;

    process.stdout.write(`Syncing ${creation.title}... `);
    try {
      const result = await scrapeCreation(page, creation);
      if (!result.ok) {
        failed += 1;
        console.log(`kept old data (${result.error})`);
        continue;
      }

      const merged = {
        ...creation,
        ...result.stats,
        updatedAt: today,
        source: 'Browser Capture'
      };
      nextSource = replaceCreationObject(nextSource, creation.title, renderCreationObject(merged));
      success += 1;
      console.log('updated');
    } catch (error) {
      failed += 1;
      console.log(`kept old data (${error.message})`);
    }
  }

  await browser.close();

  if (success > 0) {
    await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  }

  console.log(`Bethesda Creations sync complete: ${success} updated, ${failed} kept from previous data.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
