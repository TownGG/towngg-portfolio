import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const STORAGE_PATH = path.join(ROOT, '.auth/bethesda-storage.json');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/creations-debug');
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const TARGET_TITLE = process.env.CC_DEBUG_TITLE || process.argv.find((arg) => arg.startsWith('--title='))?.slice('--title='.length) || 'cassilia training dummy';
const HEADLESS = !process.argv.includes('--headed');

const numberFormat = new Intl.NumberFormat('en-US');

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseNumberValue(value) {
  return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isEmptyMetricValue(value) {
  return /^[-–—]+$|^n\/?a$/i.test(String(value || '').trim());
}

function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value));
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

function collectImmediateMatches(text, labels) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const matches = [];
  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b\\s*:?\\s*(---|[-–—]|n\\/?a|[0-9][0-9,.]*)`, 'gi');
    for (const match of normalized.matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      const value = isEmptyMetricValue(raw) ? 0 : parseNumberValue(raw);
      const start = Math.max(0, match.index - 110);
      const end = Math.min(normalized.length, match.index + match[0].length + 110);
      matches.push({ label, raw, value, snippet: normalized.slice(start, end) });
    }
  }
  return matches;
}

function collectBroadMatches(text, labels) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const matches = [];
  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b[^0-9]{0,80}([0-9][0-9,.]*)`, 'gi');
    for (const match of normalized.matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      const value = parseNumberValue(raw);
      const start = Math.max(0, match.index - 110);
      const end = Math.min(normalized.length, match.index + match[0].length + 110);
      matches.push({ label, raw, value, snippet: normalized.slice(start, end) });
    }
  }
  return matches;
}

function formatMatches(metric, mode, matches) {
  const total = matches.reduce((sum, item) => sum + item.value, 0);
  console.log(`[TRAINING_DUMMY_DEBUG] metric=${metric}, parser=${mode}, matchCount=${matches.length}, total=${total}, formatted=${matches.length ? numberFormat.format(Math.round(total)) : '-'}`);
  matches.slice(0, 12).forEach((item, index) => {
    console.log(`[TRAINING_DUMMY_DEBUG] ${metric} #${index + 1}: label=${item.label}, raw=${item.raw}, value=${item.value}`);
    console.log(`[TRAINING_DUMMY_DEBUG] ${metric} #${index + 1} snippet=${item.snippet}`);
  });
  if (matches.length > 12) {
    console.log(`[TRAINING_DUMMY_DEBUG] ${metric}: ${matches.length - 12} more matches hidden`);
  }
}

function aggregateImmediateLabeledNumbers(text, labels) {
  const matches = collectImmediateMatches(text, labels);
  if (!matches.length) return null;
  return numberFormat.format(Math.round(matches.reduce((sum, item) => sum + item.value, 0)));
}

function aggregateLabeledNumbers(text, labels) {
  const matches = collectBroadMatches(text, labels);
  const total = matches.reduce((sum, item) => sum + item.value, 0);
  return total > 0 ? numberFormat.format(Math.round(total)) : null;
}

function parsePlatformStats(text) {
  return {
    likes: aggregateImmediateLabeledNumbers(text, ['likes', 'like', '喜欢']),
    downloads: aggregateLabeledNumbers(text, ['downloads', 'download', '下载']),
    bookmarks: aggregateLabeledNumbers(text, ['bookmarks', 'bookmark', '书签']),
    views: aggregateLabeledNumbers(text, ['views', 'view', '查看']),
    plays: aggregateLabeledNumbers(text, ['plays', 'play', '播放数']),
    libraryAdds: aggregateLabeledNumbers(text, ['subscribes', 'subscribe', 'subscriptions', 'library adds', 'library add', '订阅数'])
  };
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

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const target = creations.find((creation) => normalize(creation.title).includes(normalize(TARGET_TITLE)) && getCreationUrl(creation));

  if (!target) {
    console.log(`[TRAINING_DUMMY_DEBUG] target not found: ${TARGET_TITLE}`);
    return;
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    storageState: STORAGE_PATH,
    viewport: { width: 1366, height: 900 }
  });
  const page = await context.newPage();

  const url = getCreationUrl(target);
  console.log(`[TRAINING_DUMMY_DEBUG] target=${target.title}`);
  console.log(`[TRAINING_DUMMY_DEBUG] url=${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1800);
  await openStatsTab(page);
  await forceSelectAllTime(page);
  await selectPlatformAny(page);

  const activeText = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"], [aria-selected="true"]')]
    .map((node) => String(node.innerText || node.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 80));
  console.log(`[TRAINING_DUMMY_DEBUG] visible controls=${JSON.stringify(activeText)}`);

  const bodyText = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  const stats = compactStats(parsePlatformStats(bodyText));
  console.log(`[TRAINING_DUMMY_DEBUG] parsedStats=${JSON.stringify(stats)}`);
  console.log(`[TRAINING_DUMMY_DEBUG] bodyTextLength=${bodyText.length}`);

  const metricDefs = [
    ['likes', 'immediate', ['likes', 'like', '喜欢']],
    ['downloads', 'broad', ['downloads', 'download', '下载']],
    ['bookmarks', 'broad', ['bookmarks', 'bookmark', '书签']],
    ['views', 'broad', ['views', 'view', '查看']],
    ['plays', 'broad', ['plays', 'play', '播放数']],
    ['libraryAdds', 'broad', ['subscribes', 'subscribe', 'subscriptions', 'library adds', 'library add', '订阅数']]
  ];

  for (const [metric, mode, labels] of metricDefs) {
    const matches = mode === 'immediate'
      ? collectImmediateMatches(bodyText, labels)
      : collectBroadMatches(bodyText, labels);
    formatMatches(metric, mode, matches);
  }

  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.writeFile(path.join(ARTIFACT_DIR, 'training-dummy-stats-body.txt'), bodyText, 'utf8');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'training-dummy-stats-page.png'), fullPage: true }).catch(() => {});

  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
