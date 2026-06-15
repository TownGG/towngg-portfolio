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

function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value));
}

function statsSummary(stats) {
  const ordered = ['views', 'bookmarks', 'likes', 'downloads', 'plays', 'libraryAdds'];
  return ordered.map((key) => `${key}=${stats[key] || '-'}`).join(', ');
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
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

  if (await fileExists(STORAGE_PATH)) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      storageState: STORAGE_PATH,
      viewport: { width: 1440, height: 1000 }
    });
    context.__browser = browser;
    return context;
  }

  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1440, height: 1000 }
  });
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

async function clickVisibleText(page, pattern) {
  const locator = page.getByText(pattern).last();
  await locator.click({ timeout: 2500 }).catch(() => {});
}

async function selectNativeOption(page, optionPattern) {
  return page.evaluate((pattern) => {
    const optionRegex = new RegExp(pattern, 'i');
    let changed = false;
    document.querySelectorAll('select').forEach((select) => {
      const option = [...select.options].find((item) => optionRegex.test(item.textContent || ''));
      if (!option) return;
      select.value = option.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      changed = true;
    });
    return changed;
  }, optionPattern.source);
}

async function openDropdownByPattern(page, triggerPattern) {
  return page.evaluate((pattern) => {
    const triggerRegex = new RegExp(pattern, 'i');
    const candidates = [...document.querySelectorAll('button,[role="button"],[aria-haspopup="listbox"],[aria-haspopup="menu"]')]
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2) return false;
        const text = `${item.innerText || ''} ${item.getAttribute('aria-label') || ''}`;
        return triggerRegex.test(text);
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const target = candidates[0];
    if (!target) return false;
    target.click();
    return true;
  }, triggerPattern.source);
}

async function selectStatsOption(page, triggerPattern, optionPattern) {
  const nativeChanged = await selectNativeOption(page, optionPattern).catch(() => false);
  if (nativeChanged) {
    await page.waitForTimeout(600);
    return;
  }

  const opened = await openDropdownByPattern(page, triggerPattern).catch(() => false);
  if (!opened) return;
  await page.waitForTimeout(350);
  await clickVisibleText(page, optionPattern);
  await page.waitForTimeout(700);
}

async function selectStatsFilters(page) {
  await selectStatsOption(page, /time\s*range|last\s*day|last\s*7|last\s*30|all\s*time|时间/i, /^(all\s*time|所有时间|全部时间)$/i);
  await selectStatsOption(page, /platform|any|all\s*platforms|xbox|playstation|computer|pc|平台/i, /^(any|all\s*platforms|所有平台|全部平台)$/i);
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);
}

function findMetricNumber(text, labels) {
  const lines = String(text || '')
    .replace(/\u00a0/g, ' ')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labelPattern = new RegExp(`^(${labels.map(escapeRegExp).join('|')})$`, 'i');
  const inlinePattern = new RegExp(`^(${labels.map(escapeRegExp).join('|')})\\s*:?\\s*([0-9][0-9,.]*)$`, 'i');

  for (let index = 0; index < lines.length; index += 1) {
    const inline = lines[index].match(inlinePattern);
    if (inline) return parseNumberValue(inline[2]);

    if (!labelPattern.test(lines[index])) continue;
    for (let valueIndex = index + 1; valueIndex < Math.min(lines.length, index + 5); valueIndex += 1) {
      if (/^[0-9][0-9,.]*$/.test(lines[valueIndex])) return parseNumberValue(lines[valueIndex]);
    }
  }

  const normalized = lines.join(' ');
  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b[^0-9]{0,60}([0-9][0-9,.]*)`, 'i');
    const match = normalized.match(pattern);
    if (match) return parseNumberValue(match[1]);
  }

  return 0;
}

function parseStatsText(text) {
  const metrics = {
    views: ['Views', 'View', '查看'],
    plays: ['Plays', 'Play', '游玩数', '播放数'],
    bookmarks: ['Bookmarks', 'Bookmark', '书签数', '书签'],
    downloads: ['Downloads', 'Download', '下载'],
    libraryAdds: ['Library Adds', 'Library Add', '库添加数', '加入库', '加入收藏库']
  };

  const parsed = {};
  for (const [key, labels] of Object.entries(metrics)) {
    parsed[key] = formatNumberValue(findMetricNumber(text, labels));
  }
  return compactStats(parsed);
}

function statsScore(stats) {
  return ['views', 'plays', 'bookmarks', 'downloads', 'libraryAdds']
    .reduce((score, key) => score + (stats[key] ? 1 : 0), 0);
}

async function hoverStatsChart(page) {
  const boxes = await page.locator('svg, canvas').evaluateAll((nodes) => nodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height
      };
    })
    .filter((rect) => rect.width > 180 && rect.height > 100 && rect.y > 0)
    .sort((a, b) => b.area - a.area)
    .slice(0, 3)
  ).catch(() => []);

  const samples = [];
  boxes.forEach((box) => {
    [0.08, 0.18, 0.32, 0.5, 0.72, 0.9].forEach((xFactor) => {
      [0.25, 0.48, 0.72].forEach((yFactor) => {
        samples.push({ x: box.x + box.width * xFactor, y: box.y + box.height * yFactor });
      });
    });
  });

  let bestStats = {};
  for (const point of samples) {
    await page.mouse.move(point.x, point.y).catch(() => {});
    await page.waitForTimeout(140);
    const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
    const stats = parseStatsText(text);
    if (statsScore(stats) > statsScore(bestStats)) bestStats = stats;
    if (stats.views && stats.plays && stats.bookmarks && stats.downloads && stats.libraryAdds) return stats;
  }

  return bestStats;
}

async function scrapeStatsAllTime(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  await openStatsTab(page);
  await selectStatsFilters(page);

  const directText = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  let bestStats = parseStatsText(directText);

  const hoveredStats = await hoverStatsChart(page);
  if (statsScore(hoveredStats) > statsScore(bestStats)) bestStats = hoveredStats;

  return compactStats(bestStats);
}

async function syncStatsAllTime() {
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

    process.stdout.write(`Stats All Time ${creation.title}... `);
    try {
      const statsAllTime = await scrapeStatsAllTime(page, url);
      if (!Object.keys(statsAllTime).length) {
        failed += 1;
        console.log('no Stats All Time values found');
        continue;
      }

      const merged = {
        ...creation,
        ...statsAllTime,
        source: 'Stats All Time'
      };
      nextSource = replaceCreationObject(nextSource, creation.title, renderCreationObject(merged));
      success += 1;
      console.log(statsSummary(statsAllTime));
    } catch (error) {
      failed += 1;
      console.log(`kept existing data (${error.message})`);
    }
  }

  await closeContext(context);

  if (success > 0) {
    await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  }

  console.log(`Bethesda Creations Stats All Time sync complete: ${success} updated, ${failed} kept, ${skipped} skipped.`);
}

syncStatsAllTime().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
