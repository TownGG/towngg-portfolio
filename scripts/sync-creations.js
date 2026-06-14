import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const PROFILE_DIR = path.join(ROOT, '.auth/bethesda-profile');
const LOGIN_MODE = process.argv.includes('--login');
const HEADED_MODE = process.argv.includes('--headed');
const HEADLESS = !LOGIN_MODE && !HEADED_MODE && process.env.HEADLESS !== 'false';
const SLOW_MS = Number(process.env.CC_SLOW_MS || 1200);
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';

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

function normalizeImageUrl(value, pageUrl) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
  try {
    const url = new URL(raw, pageUrl).toString();
    if (!/^https?:\/\//i.test(url)) return null;
    if (/favicon|avatar|logo|icon|spinner|placeholder/i.test(url)) return null;
    return url;
  } catch {
    return null;
  }
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
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

    if (char === '{' || char === '[') depth += 1;
    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findCreationsArrayRange(source) {
  const match = /creations\s*:\s*\[/.exec(source);
  if (!match) return null;
  const openIndex = source.indexOf('[', match.index);
  const closeIndex = findMatchingBrace(source, openIndex);
  if (openIndex < 0 || closeIndex < 0) return null;
  return { openIndex, closeIndex };
}

function replaceCreationObject(source, title, nextObjectText) {
  const range = findCreationsArrayRange(source);
  if (!range) return source;

  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  const escapedTitle = JSON.stringify(title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titlePattern = new RegExp(`\\{\\s*title:\\s*${escapedTitle}`);
  const match = titlePattern.exec(segment);
  if (!match) return source;

  const objectStart = range.openIndex + 1 + match.index;
  const objectEnd = findMatchingBrace(source, objectStart);
  if (objectEnd < 0 || objectEnd > range.closeIndex) return source;

  return source.slice(0, objectStart) + nextObjectText + source.slice(objectEnd + 1);
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

async function openContext() {
  await fs.mkdir(PROFILE_DIR, { recursive: true });
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1366, height: 900 }
  });
}

async function scrapeCoverImage(page) {
  return page.evaluate(() => {
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image"]'
    ];

    for (const selector of metaSelectors) {
      const content = document.querySelector(selector)?.getAttribute('content');
      if (content) return content;
    }

    const candidates = [...document.images]
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        const alt = img.alt || '';
        return {
          src,
          alt,
          width: Math.max(img.naturalWidth || 0, rect.width || 0),
          height: Math.max(img.naturalHeight || 0, rect.height || 0),
          area: Math.max(img.naturalWidth || 0, rect.width || 0) * Math.max(img.naturalHeight || 0, rect.height || 0)
        };
      })
      .filter((item) => item.src && item.width >= 220 && item.height >= 120)
      .filter((item) => !/avatar|logo|icon|favicon|spinner|placeholder/i.test(`${item.src} ${item.alt}`))
      .sort((a, b) => b.area - a.area);

    return candidates[0]?.src || null;
  });
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

  const coverImage = normalizeImageUrl(await scrapeCoverImage(page), url);

  if (!Object.keys(stats).length && !coverImage) {
    return { ok: false, error: 'no_stats_or_cover_found' };
  }

  return { ok: true, stats, coverImage };
}

async function login() {
  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded' });
  console.log('Login mode: finish Bethesda login in the opened browser.');
  console.log('When your account is visible, return here and press Enter. The persistent profile will be saved under .auth/bethesda-profile.');

  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once('data', resolve));
  await context.close();
  console.log('Bethesda login profile saved. Now run: npm run cc:sync:headed');
}

async function sync() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];

  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();

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
        ...(result.coverImage ? { image: result.coverImage } : {}),
        updatedAt: today,
        source: 'Browser Capture'
      };
      nextSource = replaceCreationObject(nextSource, creation.title, renderCreationObject(merged));
      success += 1;
      console.log(result.coverImage ? 'updated stats + cover' : 'updated stats');
    } catch (error) {
      failed += 1;
      console.log(`kept old data (${error.message})`);
    }
  }

  await context.close();

  if (success > 0) {
    await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  }

  console.log(`Bethesda Creations sync complete: ${success} updated, ${failed} kept from previous data.`);
}

if (LOGIN_MODE) {
  login().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  sync().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
