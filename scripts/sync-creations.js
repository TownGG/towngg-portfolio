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

function formatNumberValue(value) {
  return value > 0 ? numberFormat.format(Math.round(value)) : null;
}

function findValueAfterLabel(lines, labels) {
  const labelPattern = new RegExp(`^(${labels.map(escapeRegExp).join('|')})$`, 'i');
  for (let index = 0; index < lines.length; index += 1) {
    if (!labelPattern.test(lines[index])) continue;
    for (let valueIndex = index + 1; valueIndex < Math.min(lines.length, index + 5); valueIndex += 1) {
      if (/^[0-9][0-9,.]*$/.test(lines[valueIndex])) return parseNumberValue(lines[valueIndex]);
    }
  }
  return 0;
}

function parsePlatformSections(text) {
  const lines = String(text || '').replace(/\u00a0/g, ' ').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const platformRegex = /^(Xbox|Playstation|PlayStation|Computer|PC|电脑|计算机)$/i;
  const totals = { likes: 0, downloads: 0, bookmarks: 0, views: 0, plays: 0, libraryAdds: 0 };
  let foundPlatforms = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!platformRegex.test(lines[index])) continue;
    foundPlatforms += 1;
    const section = [];
    for (let sectionIndex = index + 1; sectionIndex < lines.length; sectionIndex += 1) {
      if (platformRegex.test(lines[sectionIndex])) break;
      if (/^(VERSION|DETAILS|LAST UPDATE|CREATED ON|INSTALLATION SIZE|版本|详情|最新更新|创建日|安装大小|适用于)$/i.test(lines[sectionIndex])) break;
      section.push(lines[sectionIndex]);
    }

    totals.likes += findValueAfterLabel(section, ['LIKES', 'LIKE', '喜欢']);
    totals.downloads += findValueAfterLabel(section, ['DOWNLOADS', 'DOWNLOAD', '下载']);
    totals.bookmarks += findValueAfterLabel(section, ['BOOKMARKS', 'BOOKMARK', '书签']);
    totals.views += findValueAfterLabel(section, ['VIEWS', 'VIEW', '查看']);
    totals.plays += findValueAfterLabel(section, ['PLAYS', 'PLAY', '播放数']);
    totals.libraryAdds += findValueAfterLabel(section, ['SUBSCRIBES', 'SUBSCRIBE', 'SUBSCRIPTIONS', '订阅数']);
  }

  if (!foundPlatforms) return {};
  return Object.fromEntries(
    Object.entries(totals)
      .map(([key, value]) => [key, formatNumberValue(value)])
      .filter(([, value]) => value)
  );
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
  const sectionStats = parsePlatformSections(text);
  if (Object.keys(sectionStats).length) return sectionStats;

  return {
    likes: aggregateLabeledNumbers(text, ['likes', 'like', '喜欢']),
    downloads: aggregateLabeledNumbers(text, ['downloads', 'download', '下载']),
    bookmarks: aggregateLabeledNumbers(text, ['bookmarks', 'bookmark', '书签']),
    views: aggregateLabeledNumbers(text, ['views', 'view', '查看']),
    plays: aggregateLabeledNumbers(text, ['plays', 'play', '播放数']),
    libraryAdds: aggregateLabeledNumbers(text, ['subscribes', 'subscribe', 'subscriptions', 'library adds', 'library add', '订阅数'])
  };
}

function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value));
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

function shouldSyncCreation(creation) {
  return Boolean(
    getCreationUrl(creation) &&
    creation.group &&
    creation.category &&
    creation.description &&
    Array.isArray(creation.tags) &&
    creation.tags.length > 0
  );
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

async function scrapeAllPlatformsStats(page) {
  return page.evaluate(() => {
    const parseNumber = (value) => {
      const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
      return Number.isFinite(number) && number > 0 ? Math.round(number).toLocaleString('en-US') : null;
    };

    const root = document.querySelector('#ugc-content') || document.body;
    const text = (root.innerText || root.textContent || '').replace(/\u00a0/g, ' ').trim();
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const labelIndex = lines.findIndex((line) => /^(ALL PLATFORMS|所有平台)$/i.test(line));

    if (labelIndex > 0) {
      const numbersBefore = [];
      for (let index = labelIndex - 1; index >= 0 && numbersBefore.length < 2; index -= 1) {
        if (/^[0-9][0-9,.]*$/.test(lines[index])) numbersBefore.push(lines[index]);
      }
      if (numbersBefore.length >= 2) {
        return {
          likes: parseNumber(numbersBefore[1]),
          downloads: parseNumber(numbersBefore[0])
        };
      }
    }

    const inlineMatch = /by\s+TownGG\s+([0-9][0-9,.]*)\s+([0-9][0-9,.]*)\s+(?:ALL PLATFORMS|所有平台)/i.exec(text.replace(/\s+/g, ' '));
    if (inlineMatch) {
      return {
        likes: parseNumber(inlineMatch[1]),
        downloads: parseNumber(inlineMatch[2])
      };
    }

    return {};
  });
}

async function openDetailsTab(page) {
  await page.getByRole('tab', { name: /details/i }).click({ timeout: 5000 }).catch(async () => {
    await page.getByText(/^(details|详情)$/i).click({ timeout: 5000 }).catch(() => {});
  });
  await page.waitForTimeout(500);
}

async function scrapeCreation(page, creation) {
  const url = getCreationUrl(creation);
  if (!url) return { ok: false, error: 'missing_url' };

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  const coverImage = normalizeImageUrl(await scrapeCoverImage(page), url);
  const allPlatformsStats = compactStats(await scrapeAllPlatformsStats(page));

  await openDetailsTab(page);
  const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS });
  const platformStats = compactStats(parsePlatformStats(text));
  const stats = { ...platformStats, ...allPlatformsStats };

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
        ...result.stats,
        ...(result.coverImage ? { image: result.coverImage } : {}),
        updatedAt: today,
        source: 'Browser Capture'
      };
      nextSource = replaceCreationObject(nextSource, creation.title, renderCreationObject(merged));
      success += 1;
      console.log(result.stats?.downloads ? 'updated all-platform totals + cover' : 'updated available stats + cover');
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
