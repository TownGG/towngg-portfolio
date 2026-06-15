import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const AUTH_DIR = path.join(ROOT, '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'bethesda-profile');
const STORAGE_PATH = path.join(AUTH_DIR, 'bethesda-storage.json');
const LOGIN_MODE = process.argv.includes('--login');
const HEADED_MODE = process.argv.includes('--headed');
const HEADLESS = !LOGIN_MODE && !HEADED_MODE && process.env.HEADLESS !== 'false';
const SLOW_MS = Number(process.env.CC_SLOW_MS || 1200);
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';

const numberFormat = new Intl.NumberFormat('en-US');
const statKeys = ['views', 'bookmarks', 'likes', 'downloads', 'plays', 'libraryAdds'];

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseNumberValue(value) {
  const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\/$/, '');
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url || '';
}

function stableCreationKeyFromUrl(url) {
  const raw = String(url || '');
  const uuid = raw.match(/\/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  return uuid ? uuid.toLowerCase() : normalize(raw.split('?')[0].split('#')[0]);
}

function stableCreationKey(creation) {
  return creation?.creationKey
    || creation?.creation_key
    || creation?.creationId
    || creation?.contentId
    || creation?.content_id
    || stableCreationKeyFromUrl(getCreationUrl(creation))
    || normalize(creation?.title);
}

function shouldSyncCreation(creation) {
  return Boolean(getCreationUrl(creation));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

function replaceCreationObjectByKey(source, creation, nextObjectText) {
  const range = findCreationsArrayRange(source);
  if (!range) return source;

  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  const targetKey = stableCreationKey(creation);
  const objectPattern = /\{\s*title\s*:/g;
  let match;

  while ((match = objectPattern.exec(segment))) {
    const objectStart = range.openIndex + 1 + match.index;
    const objectEnd = findMatchingBrace(source, objectStart);
    if (objectEnd < 0 || objectEnd > range.closeIndex) continue;

    const objectText = source.slice(objectStart, objectEnd + 1);
    let candidate = null;
    try {
      const context = { value: null };
      vm.createContext(context);
      vm.runInContext(`value = (${objectText});`, context);
      candidate = context.value;
    } catch {
      candidate = null;
    }

    if (!candidate || stableCreationKey(candidate) !== targetKey) continue;
    return source.slice(0, objectStart) + nextObjectText + source.slice(objectEnd + 1);
  }

  return source;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function renderCreationObject(item) {
  const ordered = [];
  const push = (key, value) => {
    if (value !== undefined) ordered.push([key, value]);
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
  await fs.mkdir(AUTH_DIR, { recursive: true });

  if (!LOGIN_MODE && await fileExists(STORAGE_PATH)) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      storageState: STORAGE_PATH,
      viewport: { width: 1366, height: 900 }
    });
    context.__browser = browser;
    return context;
  }

  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1366, height: 900 }
  });
}

async function closeContext(context) {
  const browser = context.__browser;
  await context.close();
  if (browser) await browser.close();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanTitle(value) {
  return decodeHtmlEntities(value)
    .replace(/\s+\|\s*Bethesda.*$/i, '')
    .replace(/\s+-\s*Bethesda.*$/i, '')
    .replace(/\b39\s+s\b/gi, "'s")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromUrl(url) {
  const slug = String(url || '').split('/').filter(Boolean).at(-1) || '';
  if (!slug || /^[0-9a-f-]{20,}$/i.test(slug) || /^details$/i.test(slug)) return '';
  try {
    return cleanTitle(decodeURIComponent(slug).replace(/[_-]+/g, ' '));
  } catch {
    return cleanTitle(slug.replace(/[_-]+/g, ' '));
  }
}

async function scrapeTitle(page, fallbackTitle, urlTitle) {
  const pageTitle = await page.evaluate((fallback) => {
    const clean = (value) => String(value || '')
      .replace(/\s+\|\s*Bethesda.*$/i, '')
      .replace(/\s+-\s*Bethesda.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    const titleSelectors = [
      'h1',
      '[data-testid="creation-title"]',
      '[class*="title" i]',
      '[class*="Title" i]'
    ];

    const visibleTexts = titleSelectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 20 && rect.height > 8;
        })
        .map((node) => node.innerText || node.textContent || '')
    );

    const candidates = [
      ...visibleTexts,
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      document.title,
      fallback
    ].map(clean).filter(Boolean);

    return candidates.find((item) => !/^bethesda creations?$/i.test(item) && !/^(stats|details|overview)$/i.test(item)) || fallback;
  }, fallbackTitle).catch(() => fallbackTitle);

  const cleanedPageTitle = cleanTitle(pageTitle);
  const cleanedUrlTitle = cleanTitle(urlTitle);
  const cleanedFallback = cleanTitle(fallbackTitle);

  if (cleanedPageTitle && cleanedPageTitle !== cleanedFallback) return cleanedPageTitle;
  if (cleanedUrlTitle && cleanedUrlTitle !== cleanedFallback) return cleanedUrlTitle;
  return cleanedPageTitle || cleanedUrlTitle || cleanedFallback;
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

async function scrapeCoverImage(page) {
  return page.evaluate(() => {
    const candidates = [...document.images]
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        const alt = img.alt || '';
        const width = Math.max(img.naturalWidth || 0, rect.width || 0);
        const height = Math.max(img.naturalHeight || 0, rect.height || 0);
        const ratio = width / Math.max(1, height);
        const isVisible = rect.width > 20 && rect.height > 20 && rect.bottom > 40 && rect.top < window.innerHeight;
        return { src, alt, width, height, ratio, rectTop: rect.top, rectLeft: rect.left, area: width * height, isVisible };
      })
      .filter((item) => item.src && item.isVisible)
      .filter((item) => item.width >= 80 && item.height >= 80)
      .filter((item) => item.ratio >= 0.75 && item.ratio <= 2.25)
      .filter((item) => item.area <= 450000)
      .filter((item) => !/avatar|logo|icon|favicon|spinner|placeholder|banner|hero|background/i.test(`${item.src} ${item.alt}`))
      .sort((a, b) => {
        const aHeroPenalty = a.ratio > 2 || a.width > 800 ? 10000 : 0;
        const bHeroPenalty = b.ratio > 2 || b.width > 800 ? 10000 : 0;
        const aScore = Math.abs(a.rectTop - 260) + Math.abs(a.rectLeft - 80) + aHeroPenalty;
        const bScore = Math.abs(b.rectTop - 260) + Math.abs(b.rectLeft - 80) + bHeroPenalty;
        return aScore - bScore;
      });

    return candidates[0]?.src || null;
  });
}

function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value));
}

function aggregateLabeledNumbers(text, labels) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  let total = 0;

  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b[^0-9]{0,80}([0-9][0-9,.]*)`, 'gi');
    for (const match of normalized.matchAll(pattern)) {
      total += parseNumberValue(match[1]);
    }
  }

  return total > 0 ? numberFormat.format(Math.round(total)) : null;
}

function parsePlatformStats(text) {
  return {
    likes: aggregateLabeledNumbers(text, ['likes', 'like', '喜欢']),
    downloads: aggregateLabeledNumbers(text, ['downloads', 'download', '下载']),
    bookmarks: aggregateLabeledNumbers(text, ['bookmarks', 'bookmark', '书签']),
    views: aggregateLabeledNumbers(text, ['views', 'view', '查看']),
    plays: aggregateLabeledNumbers(text, ['plays', 'play', '播放数']),
    libraryAdds: aggregateLabeledNumbers(text, ['subscribes', 'subscribe', 'subscriptions', 'library adds', 'library add', '订阅数'])
  };
}

async function openDetailsTab(page) {
  await page.getByRole('tab', { name: /details/i }).click({ timeout: 5000 }).catch(async () => {
    await page.getByText(/^(details|详情)$/i).click({ timeout: 5000 }).catch(() => {});
  });
  await page.waitForTimeout(500);
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

async function scrapeAllTimeEngagementStats(page) {
  await openStatsTab(page);
  await forceSelectAllTime(page);
  await selectPlatformAny(page);
  const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  const stats = compactStats(parsePlatformStats(text));
  return { ok: Boolean(Object.keys(stats).length), stats, timeRange: 'all-time-or-fallback' };
}

function statsLine(stats, coverImage, title, oldTitle) {
  return `title=${title && title !== oldTitle ? `${oldTitle} -> ${title}` : title || oldTitle}, likes=${stats.likes || '-'}, downloads=${stats.downloads || '-'}, cover=${coverImage ? 'yes' : 'no'}, views=${stats.views || '-'}, plays=${stats.plays || '-'}, bookmarks=${stats.bookmarks || '-'}, libraryAdds=${stats.libraryAdds || '-'}`;
}

async function scrapeCreation(page, creation) {
  const url = getCreationUrl(creation);
  if (!url) return { ok: false, error: 'missing_url' };

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  const finalUrl = page.url() || url;
  const title = await scrapeTitle(page, creation.title, titleFromUrl(finalUrl) || titleFromUrl(url));
  const coverImage = normalizeImageUrl(await scrapeCoverImage(page), url);
  const allTime = await scrapeAllTimeEngagementStats(page);
  let fallbackStats = {};
  if (!allTime.ok) {
    await openDetailsTab(page);
    const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
    fallbackStats = compactStats(parsePlatformStats(text));
  }

  const stats = {
    ...fallbackStats,
    ...(allTime.ok ? allTime.stats : {})
  };

  if (!Object.keys(stats).length && !coverImage && title === creation.title) {
    return { ok: false, error: 'no_stats_cover_or_title_found' };
  }

  return { ok: true, title, stats, coverImage };
}

async function login() {
  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded' });
  console.log('Login mode: finish Bethesda login in the opened browser.');
  console.log('When your account is visible, return here and press Enter. A storage state file will be saved under .auth/bethesda-storage.json.');

  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once('data', resolve));
  await fs.mkdir(AUTH_DIR, { recursive: true });
  await context.storageState({ path: STORAGE_PATH });
  await closeContext(context);
  console.log('Bethesda storage state saved. Now run: npm run cc:sync:headed');
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
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const creation of creations) {
    if (!shouldSyncCreation(creation)) {
      skipped += 1;
      continue;
    }

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
        title: result.title || creation.title,
        alt: creation.alt ? String(creation.alt).replace(creation.title, result.title || creation.title) : creation.alt,
        ...result.stats,
        ...(result.coverImage ? { image: result.coverImage } : {}),
        updatedAt: today,
        source: 'Browser Capture'
      };
      nextSource = replaceCreationObjectByKey(nextSource, creation, renderCreationObject(merged));
      success += 1;
      console.log(statsLine(result.stats, result.coverImage, result.title, creation.title));
    } catch (error) {
      failed += 1;
      console.log(`kept old data (${error.message})`);
    }
  }

  await closeContext(context);

  if (success > 0) {
    await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  }

  console.log(`Bethesda Creations sync complete: ${success} updated, ${failed} kept, ${skipped} skipped.`);
}

if (LOGIN_MODE) login();
else sync();
