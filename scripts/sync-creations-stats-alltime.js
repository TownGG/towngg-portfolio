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
const PAID_ONLY = process.argv.includes('--paid-only');
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
  const ordered = ['views', 'bookmarks', 'plays', 'libraryAdds'];
  return ordered.map((key) => `${key}=${stats[key] || '-'}`).join(', ');
}

function getCreationUrl(creation) {
  return creation?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url;
}

function isPaidCreation(creation) {
  return creation?.isPaid === true || parseNumberValue(creation?.price) > 0;
}

function shouldSyncCreation(creation) {
  if (!getCreationUrl(creation)) return false;
  return !PAID_ONLY || isPaidCreation(creation);
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
  push('price', item.price);
  push('isPaid', item.isPaid);
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
    if (key === 'isPaid') return key + ': ' + (value === true);
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
    const candidates = [...document.querySelectorAll('button,[role="button"],[role="combobox"],[aria-haspopup="listbox"],[aria-haspopup="menu"],[class*="MuiSelect-select"],[class*="Select-select"],[class*="select"],[class*="dropdown"]')]
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2) return false;
        const text = `${item.innerText || ''} ${item.textContent || ''} ${item.getAttribute('aria-label') || ''}`;
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

async function selectPlatformAny(page) {
  const clicked = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('button,[role="button"]')]
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.width <= 2 || rect.height <= 2) return false;
        const text = String(item.innerText || item.textContent || '').trim();
        return /^(any|all platforms|所有平台|全部平台)$/i.test(text);
      })
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    const target = candidates[0];
    if (!target) return false;
    target.click();
    return true;
  }).catch(() => false);

  if (!clicked) {
    await page.getByRole('button', { name: /^(any|all platforms)$/i }).click({ timeout: 2500 }).catch(() => {});
  }

  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(900);
}

async function selectStatsFilters(page) {
  await selectStatsOption(page, /time\s*range|last\s*day|last\s*7|last\s*30|all\s*time|时间/i, /^(all\s*time|所有时间|全部时间)$/i);
  await selectStatsOption(page, /platform|any|all\s*platforms|xbox|playstation|computer|pc|平台/i, /^(any|all\s*platforms|所有平台|全部平台)$/i);
  await selectPlatformAny(page);
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
    libraryAdds: ['Library Adds', 'Library Add', '库添加数', '加入库', '加入收藏库']
  };

  const parsed = {};
  for (const [key, labels] of Object.entries(metrics)) {
    parsed[key] = formatNumberValue(findMetricNumber(text, labels));
  }
  return compactStats(parsed);
}

function parseLatestTooltipText(text) {
  const normalized = String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const read = (labels) => {
    for (const label of labels) {
      const pattern = new RegExp(escapeRegExp(label) + '\\s*[:：]?\\s*([0-9][0-9,.]*)', 'i');
      const match = normalized.match(pattern);
      if (match) return formatNumberValue(parseNumberValue(match[1]));
    }
    return null;
  };

  const stats = compactStats({
    views: read(['Views', 'View', '查看']),
    plays: read(['Plays', 'Play', '游玩数', '播放数']),
    bookmarks: read(['Bookmarks', 'Bookmark', '书签数', '书签']),
    libraryAdds: read(['Library Adds', 'Library Add', '库添加数', '加入库', '加入收藏库'])
  });

  const required = ['views', 'plays'];
  if (!required.every((key) => stats[key])) return {};
  return stats;
}

async function readVisibleStatsTooltip(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    };

    const selectors = [
      '[role="tooltip"]',
      '[class*="tooltip" i]',
      '[id*="tooltip" i]',
      'svg g',
      'svg foreignObject',
      'div'
    ];

    const seen = new Set();
    const candidates = [];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        if (seen.has(node) || !visible(node)) continue;
        seen.add(node);
        const text = String(node.textContent || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length < 12 || text.length > 900) continue;

        const labels = [
          /\bViews?\b/i,
          /\bPlays?\b/i,
          /\bBookmarks?\b/i,
          /\bLibrary Adds?\b/i,
          /\bDownloads?\b/i
        ];
        const score = labels.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
        if (score < 2 || !/\bViews?\b/i.test(text) || !/\bPlays?\b/i.test(text)) continue;

        const rect = node.getBoundingClientRect();
        candidates.push({
          text,
          score,
          area: Math.max(1, rect.width * rect.height)
        });
      }
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.area !== b.area) return a.area - b.area;
      return a.text.length - b.text.length;
    });
    return candidates[0]?.text || '';
  }).catch(() => '');
}

function statNumeric(stats, key) {
  return parseNumberValue(stats[key]);
}

function statsScore(stats) {
  return ['views', 'plays', 'bookmarks', 'libraryAdds']
    .reduce((score, key) => score + (stats[key] ? 1 : 0), 0);
}

function statsRank(stats) {
  const completeness = statsScore(stats);
  const magnitude = statNumeric(stats, 'plays') * 1000
    + statNumeric(stats, 'libraryAdds') * 100
    + statNumeric(stats, 'bookmarks') * 10
    + statNumeric(stats, 'views');
  return completeness * 1000000000000000 + magnitude;
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
    .filter((rect) => rect.width > 500 && rect.height > 180 && rect.y > 0)
    .sort((a, b) => b.area - a.area)
    .slice(0, 2)
  ).catch(() => []);

  let bestStats = {};
  let bestText = '';

  // The Bethesda paid analytics chart is cumulative. The final/current values
  // are in the tooltip at the far-right edge, so only probe the latest edge.
  for (const box of boxes) {
    for (const xFactor of [0.997, 0.992, 0.985, 0.975, 0.96]) {
      for (const yFactor of [0.5, 0.35, 0.68]) {
        await page.mouse.move(
          box.x + box.width * xFactor,
          box.y + box.height * yFactor
        ).catch(() => {});
        await page.waitForTimeout(180);

        const tooltipText = await readVisibleStatsTooltip(page);
        const stats = parseLatestTooltipText(tooltipText);
        if (!stats.views || !stats.plays) continue;

        // Prefer the right-edge sample with the greatest cumulative Views.
        if (statNumeric(stats, 'views') > statNumeric(bestStats, 'views')) {
          bestStats = stats;
          bestText = tooltipText;
        }
      }
    }
  }

  if (bestText) console.log('[PAID_TOOLTIP_LATEST] ' + bestText);
  return compactStats(bestStats);
}

async function scrapeStatsAllTime(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  await openStatsTab(page);
  await selectStatsFilters(page);

  if (PAID_ONLY) {
    return compactStats(await hoverStatsChart(page));
  }

  const directText = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  const bestStats = parseStatsText(directText);
  const hoveredStats = await hoverStatsChart(page);
  for (const key of ['views', 'plays', 'bookmarks', 'libraryAdds']) {
    if (statNumeric(hoveredStats, key) > statNumeric(bestStats, key)) bestStats[key] = hoveredStats[key];
  }
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
        source: PAID_ONLY ? 'Paid Stats All Time' : 'Stats All Time'
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
