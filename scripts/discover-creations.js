import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { savePageDebug } from './cc-debug.js';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const AUTH_DIR = path.join(ROOT, '.auth');
const STORAGE_PATH = path.join(AUTH_DIR, 'bethesda-storage.json');
const CREATIONS_HOME = 'https://creations.bethesda.net/en/starfield/all?author_displayname=TownGG';
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);
const HEADLESS = !process.argv.includes('--headed') && process.env.HEADLESS !== 'false';
const MAX_AUTHOR_PAGES = Number(process.env.CC_MAX_AUTHOR_PAGES || 20);

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

function creationIdFromUrl(url) {
  const match = String(url || '').match(/\/details\/([^/]+)/i);
  return match?.[1]?.toLowerCase() || '';
}

function titleFromUrl(url) {
  const slug = String(url || '').split('/').filter(Boolean).at(-1) || 'Bethesda Creation';
  const decoded = decodeURIComponent(slug).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!decoded || /^details$/i.test(decoded) || /^[0-9a-f-]{20,}$/i.test(decoded)) return 'Bethesda Creation';
  return decoded;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function renderCreationObject(item) {
  const links = item.links.map((link) => `{ label: ${jsString(link.label)}, url: ${jsString(link.url)} }`).join(', ');
  return `{ title: ${jsString(item.title)}, group: ${jsString(item.group)}, category: ${jsString(item.category)}, image: ${jsString(item.image)}, alt: ${jsString(item.alt)}, description: ${jsString(item.description)}, tags: [${item.tags.map(jsString).join(', ')}], views: ${jsString(item.views)}, bookmarks: ${jsString(item.bookmarks)}, likes: ${jsString(item.likes)}, downloads: ${jsString(item.downloads)}, plays: ${jsString(item.plays)}, libraryAdds: ${jsString(item.libraryAdds)}, updatedAt: ${jsString(item.updatedAt)}, source: ${jsString(item.source)}, links: [${links}] }`;
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

function insertCreations(source, newItems) {
  if (!newItems.length) return source;
  const range = findCreationsArrayRange(source);
  if (!range) throw new Error('Could not locate siteData.creations array.');

  const rendered = newItems.map((item) => `    ${renderCreationObject(item)}`).join(',\n');
  const beforeClose = source.slice(0, range.closeIndex).trimEnd();
  const afterClose = source.slice(range.closeIndex);
  const needsComma = !beforeClose.endsWith('[') && !beforeClose.endsWith(',');
  const separator = needsComma ? ',\n' : '\n';
  return `${beforeClose}${separator}${rendered}\n${afterClose}`;
}

async function openContext() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  if (await fileExists(STORAGE_PATH)) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      storageState: STORAGE_PATH,
      viewport: { width: 1366, height: 900 }
    });
    context.__browser = browser;
    return context;
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.__browser = browser;
  return context;
}

async function closeContext(context) {
  const browser = context.__browser;
  await context.close();
  if (browser) await browser.close();
}

async function scrollAuthorPage(page) {
  let previousHeight = 0;
  for (let index = 0; index < 14; index += 1) {
    const height = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(650);
    if (height && height === previousHeight) break;
    previousHeight = height;
  }
}

async function extractCreationLinksFromPage(page) {
  return page.evaluate(() => {
    const seen = new Set();
    return [...document.querySelectorAll('a[href*="/starfield/details/"]')]
      .map((anchor) => {
        const href = anchor.href || anchor.getAttribute('href') || '';
        try {
          const url = new URL(href, window.location.href);
          url.search = '';
          url.hash = '';
          return url.toString();
        } catch {
          return '';
        }
      })
      .filter((url) => url && !seen.has(url) && seen.add(url));
  });
}

async function clickNextAuthorPage(page) {
  const clickedByRole = await page.getByRole('button', { name: /^(next|next page|下一页|下一頁)$/i }).click({ timeout: 1500 }).then(() => true).catch(() => false)
    || await page.getByRole('link', { name: /^(next|next page|下一页|下一頁)$/i }).click({ timeout: 1500 }).then(() => true).catch(() => false);
  if (clickedByRole) return true;

  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('button, a')];
    const next = candidates.find((element) => {
      const label = [
        element.innerText,
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title')
      ].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
      const normalized = label.replace(/\s+/g, ' ').trim();
      const disabled = element.disabled
        || element.getAttribute('aria-disabled') === 'true'
        || element.classList.contains('disabled')
        || element.classList.contains('is-disabled');
      if (disabled) return false;
      return /(^|\b)(next|next page|下一页|下一頁)(\b|$)/i.test(normalized)
        || normalized === '›'
        || normalized === '>'
        || normalized === '»';
    });

    if (!next) return false;
    next.scrollIntoView({ block: 'center', inline: 'center' });
    next.click();
    return true;
  }).catch(() => false);
}

async function discoverCreationLinks(page) {
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1800);

  const allLinks = new Map();
  const seenPageSignatures = new Set();

  for (let pageIndex = 1; pageIndex <= MAX_AUTHOR_PAGES; pageIndex += 1) {
    await scrollAuthorPage(page);
    const pageLinks = await extractCreationLinksFromPage(page);
    const signature = pageLinks.map((url) => creationIdFromUrl(url)).filter(Boolean).join('|');

    for (const url of pageLinks) {
      const id = creationIdFromUrl(url);
      if (id && !allLinks.has(id)) allLinks.set(id, url);
    }

    console.log(`Author page ${pageIndex}: ${pageLinks.length} links found, ${allLinks.size} total unique.`);

    if (!pageLinks.length || seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);

    const clickedNext = await clickNextAuthorPage(page);
    if (!clickedNext) break;

    await page.waitForTimeout(1800);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  }

  const links = [...allLinks.values()];
  if (!links.length) {
    await savePageDebug(page, 'discover-author-page-0-links', {
      reason: 'no_author_links_found',
      authorUrl: CREATIONS_HOME,
      currentUrl: page.url()
    });
  }

  return links;
}

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const existingIds = new Set(
    creations
      .flatMap((creation) => creation.links || [])
      .map((link) => creationIdFromUrl(link.url))
      .filter(Boolean)
  );

  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();
  const links = await discoverCreationLinks(page);
  await closeContext(context);

  const discovered = [];
  const seenNewIds = new Set();
  for (const url of links) {
    const id = creationIdFromUrl(url);
    if (!id || existingIds.has(id) || seenNewIds.has(id)) continue;
    seenNewIds.add(id);
    const title = titleFromUrl(url);
    discovered.push({
      title,
      group: 'Uncategorized',
      category: 'Uncategorized',
      image: '',
      alt: `${title} Bethesda Creations cover`,
      description: 'Automatically discovered from Bethesda Creations.',
      tags: ['Bethesda Creations', 'Auto Discovered'],
      views: '0',
      bookmarks: '0',
      likes: '0',
      downloads: '0',
      plays: '0',
      libraryAdds: '0',
      updatedAt: '',
      source: 'Auto Discovered',
      links: [{ label: 'Bethesda Creations', url }]
    });
  }

  if (!discovered.length) {
    console.log(`Bethesda Creations discovery complete: ${links.length} links found, no new Creations.`);
    return;
  }

  const nextSource = insertCreations(source, discovered);
  await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  console.log(`Bethesda Creations discovery complete: ${links.length} links found, ${discovered.length} new Creations added.`);
  discovered.forEach((item) => console.log(`Added: ${item.title}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
