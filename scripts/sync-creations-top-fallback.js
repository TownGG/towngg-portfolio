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
const numberFormat = new Intl.NumberFormat('en-US');

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

function shouldSyncCreation(creation) {
  return Boolean(getCreationUrl(creation));
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
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

function replaceCreationFields(source, title, fields) {
  const range = findCreationsArrayRange(source);
  if (!range) return source;

  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  const objectPattern = /\{\s*title\s*:/g;
  let match;

  while ((match = objectPattern.exec(segment))) {
    const objectStart = range.openIndex + 1 + match.index;
    const objectEnd = findMatchingBrace(source, objectStart);
    if (objectEnd < 0 || objectEnd > range.closeIndex) continue;

    let objectText = source.slice(objectStart, objectEnd + 1);
    let candidate = null;
    try {
      const context = { value: null };
      vm.createContext(context);
      vm.runInContext(`value = (${objectText});`, context);
      candidate = context.value;
    } catch {
      candidate = null;
    }

    if (!candidate || candidate.title !== title) continue;

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const replacement = `${key}: ${JSON.stringify(String(value))}`;
      const fieldPattern = new RegExp(`${key}\\s*:\\s*"(?:\\\\.|[^"\\\\])*"`);
      if (fieldPattern.test(objectText)) {
        objectText = objectText.replace(fieldPattern, replacement);
        continue;
      }
      const insertBefore = objectText.match(/,\s*updatedAt\s*:/) || objectText.match(/,\s*source\s*:/) || objectText.match(/,\s*links\s*:/);
      if (insertBefore?.index !== undefined) {
        objectText = `${objectText.slice(0, insertBefore.index)}, ${replacement}${objectText.slice(insertBefore.index)}`;
      } else {
        objectText = objectText.replace(/\s*}$/, `, ${replacement} }`);
      }
    }

    return source.slice(0, objectStart) + objectText + source.slice(objectEnd + 1);
  }

  return source;
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

function normalizeImageUrl(value, pageUrl) {
  if (!value) return null;
  try {
    const raw = String(value).trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
    const url = new URL(raw, pageUrl).toString();
    if (!/^https?:\/\//i.test(url)) return null;
    if (/favicon|avatar|logo|icon|spinner|placeholder/i.test(url)) return null;
    return url;
  } catch {
    return null;
  }
}

async function scrapeTopFallback(page, pageUrl) {
  return page.evaluate(() => {
    const parseNumber = (value) => {
      const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
      return Number.isFinite(number) && number > 0 ? Math.round(number).toLocaleString('en-US') : null;
    };

    const normalizeUrl = (value) => {
      try {
        const raw = String(value || '').trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
        const url = new URL(raw, document.baseURI).toString();
        if (!/^https?:\/\//i.test(url)) return null;
        if (/favicon|avatar|logo|icon|spinner|placeholder/i.test(url)) return null;
        return url;
      } catch {
        return null;
      }
    };

    const text = (document.body.innerText || document.body.textContent || '').replace(/\u00a0/g, ' ');
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const markerIndex = lines.findIndex((line) => /^(all platforms|所有平台)$/i.test(line));
    const searchStart = markerIndex >= 0 ? markerIndex : Math.max(0, lines.findIndex((line) => /by\s*towngg/i.test(line)));
    const windowLines = lines.slice(Math.max(0, searchStart), searchStart + 14);
    const numbers = windowLines.filter((line) => /^[0-9][0-9,.]*$/.test(line)).map(parseNumber).filter(Boolean);
    const likes = numbers[0] || null;
    const downloads = numbers[1] || null;

    const imageCandidates = [];
    const pushImage = (url, score) => {
      const normalized = normalizeUrl(url);
      if (normalized) imageCandidates.push({ url: normalized, score });
    };

    document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"],link[rel="image_src"]').forEach((node) => {
      pushImage(node.getAttribute('content') || node.getAttribute('href'), 5000);
    });

    [...document.images].forEach((img) => {
      const rect = img.getBoundingClientRect();
      const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
      const width = Math.max(img.naturalWidth || 0, rect.width || 0);
      const height = Math.max(img.naturalHeight || 0, rect.height || 0);
      const area = width * height;
      const ratio = width / Math.max(1, height);
      if (width < 60 || height < 60) return;
      if (ratio < 0.45 || ratio > 3.2) return;
      const positionScore = 4000 - Math.abs(rect.left - 80) - Math.abs(rect.top - 150);
      const sizeScore = Math.min(2500, area / 80);
      pushImage(src, positionScore + sizeScore);
    });

    [...document.querySelectorAll('*')].slice(0, 900).forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) return;
      const background = getComputedStyle(node).backgroundImage || '';
      const match = background.match(/url\(["']?([^"')]+)["']?\)/i);
      if (!match) return;
      const score = 2500 - Math.abs(rect.left - 80) - Math.abs(rect.top - 150) + Math.min(1600, (rect.width * rect.height) / 120);
      pushImage(match[1], score);
    });

    imageCandidates.sort((a, b) => b.score - a.score);
    return { likes, downloads, coverImage: imageCandidates[0]?.url || null };
  }).then((result) => ({
    likes: result.likes || null,
    downloads: result.downloads || null,
    coverImage: normalizeImageUrl(result.coverImage, pageUrl)
  }));
}

async function syncTopFallback() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();

  let nextSource = source;
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const creation of creations) {
    const url = getCreationUrl(creation);
    if (!shouldSyncCreation(creation)) {
      skipped += 1;
      continue;
    }

    process.stdout.write(`Top detail stats ${creation.title}... `);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
      await page.waitForTimeout(SLOW_MS);
      const result = await scrapeTopFallback(page, url);
      const fields = {
        ...(result.likes ? { likes: result.likes } : {}),
        ...(result.downloads ? { downloads: result.downloads } : {}),
        ...(result.coverImage ? { image: result.coverImage } : {})
      };
      if (!Object.keys(fields).length) {
        failed += 1;
        console.log('no top likes, downloads or cover found');
        continue;
      }
      nextSource = replaceCreationFields(nextSource, creation.title, fields);
      success += 1;
      console.log(`likes=${result.likes || '-'}, downloads=${result.downloads || '-'}, cover=${result.coverImage ? 'yes' : 'no'}`);
    } catch (error) {
      failed += 1;
      console.log(`kept existing data (${error.message})`);
    }
  }

  await closeContext(context);
  if (success > 0) await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  console.log(`Bethesda Creations top detail stats sync complete: ${success} updated, ${failed} kept, ${skipped} skipped.`);
}

syncTopFallback().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
