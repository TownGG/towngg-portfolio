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
  const links = (item.links || []).map((link) => `{ label: ${jsString(link.label)}, url: ${jsString(link.url)} }`).join(', ');
  return `{ title: ${jsString(item.title)}, group: ${jsString(item.group)}, category: ${jsString(item.category)}, image: ${jsString(item.image)}, alt: ${jsString(item.alt)}, description: ${jsString(item.description)}, tags: [${(item.tags || []).map(jsString).join(', ')}], price: ${jsString(item.price ?? '0')}, isPaid: ${item.isPaid === true}, views: ${jsString(item.views)}, bookmarks: ${jsString(item.bookmarks)}, likes: ${jsString(item.likes)}, downloads: ${jsString(item.downloads)}, plays: ${jsString(item.plays)}, libraryAdds: ${jsString(item.libraryAdds)}, updatedAt: ${jsString(item.updatedAt)}, source: ${jsString(item.source)}, links: [${links}] }`;
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

function findCreationObjectRangeById(source, creationId) {
  const range = findCreationsArrayRange(source);
  if (!range || !creationId) return null;
  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  const objectPattern = /\{\s*title\s*:/g;
  let match;

  while ((match = objectPattern.exec(segment))) {
    const objectStart = range.openIndex + 1 + match.index;
    const objectEnd = findMatchingBrace(source, objectStart);
    if (objectEnd < 0 || objectEnd > range.closeIndex) continue;
    const objectText = source.slice(objectStart, objectEnd + 1).toLowerCase();
    if (objectText.includes('/details/' + String(creationId).toLowerCase())) {
      return { objectStart, objectEnd };
    }
  }
  return null;
}

function replaceCreationObjectById(source, creationId, item) {
  const range = findCreationObjectRangeById(source, creationId);
  if (!range) return source;
  return source.slice(0, range.objectStart) + renderCreationObject(item) + source.slice(range.objectEnd + 1);
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

async function extractCreationsFromAuthorPage(page) {
  return page.evaluate((expectedAuthor) => {
    const expected = String(expectedAuthor || '').trim().toLowerCase();
    const results = new Map();

    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const exactAuthorMatch = (value) => {
      const normalized = normalizeText(value).toLowerCase();
      return normalized === expected
        || normalized === 'by ' + expected
        || normalized === 'author: ' + expected
        || normalized === 'creator: ' + expected;
    };
    const parsePrice = (value) => {
      const numbers = normalizeText(value).replace(/,/g, '').match(/\b([1-9][0-9]{1,4})\b/g) || [];
      return numbers.map(Number).find((number) => Number.isFinite(number) && number >= 10) || 0;
    };

    const authorSignalsIn = (node) => {
      const authorNodes = [
        ...node.querySelectorAll(
          '[data-author],[data-creator],[class*="author" i],[class*="creator" i],' +
          'a[href*="author_displayname="],a[href*="/author/"]'
        )
      ];
      if (authorNodes.some((item) => exactAuthorMatch(
        item.innerText || item.textContent || item.getAttribute('data-author') || item.getAttribute('data-creator')
      ))) return true;

      return String(node.innerText || node.textContent || '')
        .split(/\r?\n/)
        .map(normalizeText)
        .filter(Boolean)
        .some(exactAuthorMatch);
    };

    const findCardRoot = (anchor) => {
      let node = anchor;
      let matchedRoot = null;
      for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
        const detailLinks = node.querySelectorAll('a[href*="/starfield/details/"]').length;
        const text = normalizeText(node.innerText || node.textContent);
        if (detailLinks > 3 || text.length > 1800) break;
        if (authorSignalsIn(node)) matchedRoot = node;
      }
      return matchedRoot;
    };

    const pricingFromCard = (card) => {
      const candidates = [];
      const add = (value, source, priority) => {
        const price = parsePrice(value);
        if (price > 0) candidates.push({ price, source, priority });
      };

      for (const node of [...card.querySelectorAll('[data-price],[data-cost],[data-credits],[data-credit-price]')]) {
        for (const attribute of ['data-price', 'data-cost', 'data-credits', 'data-credit-price']) {
          add(node.getAttribute(attribute), 'card-attribute:' + attribute, 1);
        }
        add(node.innerText || node.textContent, 'card-price-attribute-text', 1);
      }

      for (const node of [...card.querySelectorAll(
        '[class*="price" i],[class*="credit" i],[class*="currency" i],' +
        '[aria-label*="price" i],[aria-label*="credit" i],[title*="price" i],[title*="credit" i]'
      )]) {
        const container = node.closest('button,[role="button"],li,div') || node;
        const marker = [
          node.className?.baseVal || node.className,
          node.getAttribute?.('aria-label'),
          node.getAttribute?.('title'),
          node.getAttribute?.('data-testid'),
          node.outerHTML?.slice(0, 800)
        ].filter(Boolean).join(' ');
        if (/(price|credit|currency|cost)/i.test(marker)) {
          add(container.innerText || container.textContent, 'card-semantic-price', 2);
        }
      }

      for (const icon of [...card.querySelectorAll('img,svg,use')]) {
        const marker = [
          icon.getAttribute?.('alt'),
          icon.getAttribute?.('title'),
          icon.getAttribute?.('aria-label'),
          icon.getAttribute?.('src'),
          icon.getAttribute?.('href'),
          icon.getAttribute?.('xlink:href'),
          icon.className?.baseVal || icon.className,
          icon.outerHTML?.slice(0, 800)
        ].filter(Boolean).join(' ');
        if (!/(creation.?credits?|credits?|currency|wallet|coin|cc[_-]?icon)/i.test(marker)) continue;

        let container = icon.parentElement;
        for (let depth = 0; container && depth < 5; depth += 1, container = container.parentElement) {
          if (!card.contains(container)) break;
          add(container.innerText || container.textContent, 'card-credits-icon', 2);
        }
      }

      candidates.sort((a, b) => a.priority - b.priority);
      const match = candidates[0];
      const cardText = normalizeText(card.innerText || card.textContent);
      const explicitFree = /(^|\s)free(\s|$)|免费/i.test(cardText);
      return match
        ? { price: match.price, isPaid: true, pricingSource: match.source, pricingState: 'paid' }
        : { price: 0, isPaid: false, pricingSource: explicitFree ? 'card-explicit-free' : 'card-no-price', pricingState: explicitFree ? 'free-explicit' : 'free-no-price' };
    };

    for (const anchor of [...document.querySelectorAll('a[href*="/starfield/details/"]')]) {
      const rect = anchor.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2) continue;
      const card = findCardRoot(anchor);
      if (!card) continue;

      const href = anchor.href || anchor.getAttribute('href') || '';
      let url = '';
      try {
        const parsed = new URL(href, window.location.href);
        parsed.search = '';
        parsed.hash = '';
        url = parsed.toString();
      } catch {
        continue;
      }

      const pricing = pricingFromCard(card);
      const current = results.get(url);
      if (!current || pricing.isPaid || !current.isPaid) {
        results.set(url, { url, ...pricing });
      }
    }

    return [...results.values()];
  }, 'TownGG');
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

async function discoverCreations(page) {
  await page.goto(CREATIONS_HOME, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(1800);

  const allItems = new Map();
  const seenPageSignatures = new Set();

  for (let pageIndex = 1; pageIndex <= MAX_AUTHOR_PAGES; pageIndex += 1) {
    await scrollAuthorPage(page);
    const pageItems = await extractCreationsFromAuthorPage(page);
    const signature = pageItems.map((item) => creationIdFromUrl(item.url)).filter(Boolean).join('|');

    for (const item of pageItems) {
      const id = creationIdFromUrl(item.url);
      if (!id) continue;
      const current = allItems.get(id);
      if (!current || item.isPaid || !current.isPaid) allItems.set(id, item);
    }

    const paidCount = pageItems.filter((item) => item.isPaid).length;
    console.log(`Author page ${pageIndex}: ${pageItems.length} TownGG cards found, ${paidCount} paid, ${allItems.size} total unique.`);

    if (!pageItems.length || seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);

    const clickedNext = await clickNextAuthorPage(page);
    if (!clickedNext) break;
    await page.waitForTimeout(1800);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  }

  const items = [...allItems.values()];
  if (!items.length) {
    await savePageDebug(page, 'discover-author-page-0-links', {
      reason: 'no_author_cards_found',
      authorUrl: CREATIONS_HOME,
      currentUrl: page.url()
    });
  }

  return items;
}

async function verifyCreationAuthor(page, url, expectedAuthor = 'TownGG') {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(900);

  return page.evaluate((expected) => {
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const target = expected.toLowerCase();
    const exactExpected = (value) => {
      const normalized = normalizeText(value).toLowerCase();
      return normalized === target
        || normalized === 'by ' + target
        || normalized === 'author: ' + target
        || normalized === 'creator: ' + target;
    };

    const titleNode = [...document.querySelectorAll('h1,[data-testid="creation-title"]')]
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 20 && rect.height > 8
          && !/^(featured|recommended|more creations?)$/i.test(normalizeText(node.innerText || node.textContent));
      });
    if (!titleNode) return { ok: false, reason: 'creation-title-not-found', author: '' };

    let root = titleNode.parentElement || titleNode;
    let candidate = titleNode.parentElement;
    for (let depth = 0; candidate && depth < 6; depth += 1, candidate = candidate.parentElement) {
      const text = normalizeText(candidate.innerText || candidate.textContent);
      const detailLinks = candidate.querySelectorAll('a[href*="/starfield/details/"]').length;
      if (text.length > 6500 || detailLinks > 2) break;
      root = candidate;
    }

    const authorNodes = [
      ...root.querySelectorAll(
        '[data-author],[data-creator],[class*="author" i],[class*="creator" i],' +
        'a[href*="author_displayname="],a[href*="/author/"]'
      )
    ];
    const signals = authorNodes
      .map((node) => normalizeText(
        node.innerText || node.textContent || node.getAttribute('data-author') || node.getAttribute('data-creator')
      ))
      .filter(Boolean)
      .filter((value) => value.length <= 120);

    const lines = String(root.innerText || root.textContent || '')
      .split(/\r?\n/)
      .map(normalizeText)
      .filter(Boolean)
      .filter((value) => value.length <= 120);
    const allSignals = [...new Set([...signals, ...lines])];

    if (allSignals.some(exactExpected)) return { ok: true, reason: 'author-match', author: expected };
    const explicitAuthor = allSignals.find((value) => /^(by|author:|creator:)/i.test(value)) || '';
    return {
      ok: false,
      reason: explicitAuthor ? 'author-mismatch' : 'author-not-confirmed',
      author: explicitAuthor
    };
  }, expectedAuthor);
}

async function main() {
  const source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const creations = Array.isArray(siteData.creations) ? siteData.creations : [];
  const existingById = new Map(
    creations
      .map((creation) => {
        const id = (creation.links || []).map((link) => creationIdFromUrl(link.url)).find(Boolean);
        return id ? [id, creation] : null;
      })
      .filter(Boolean)
  );

  const context = await openContext();
  const page = context.pages()[0] || await context.newPage();
  const listedItems = await discoverCreations(page);

  let nextSource = source;
  let pricingUpdates = 0;
  const discovered = [];
  const seenNewIds = new Set();

  for (const listed of listedItems) {
    const url = listed.url;
    const id = creationIdFromUrl(url);
    if (!id || seenNewIds.has(id)) continue;

    const existing = existingById.get(id);
    if (existing) {
      const confirmedPaid = listed.isPaid === true;
      const confirmedFree = listed.pricingState === 'free-explicit';
      const shouldUpdate = confirmedPaid || confirmedFree || existing.isPaid !== true;

      if (shouldUpdate) {
        const nextPrice = confirmedPaid ? String(listed.price) : '0';
        const nextPaid = confirmedPaid;
        const paidChanged = (existing.isPaid === true) !== nextPaid;
        if (String(existing.price ?? '0') !== nextPrice || paidChanged) {
          const merged = { ...existing, price: nextPrice, isPaid: nextPaid };
          nextSource = replaceCreationObjectById(nextSource, id, merged);
          pricingUpdates += 1;
          console.log(`Pricing updated from author card: ${existing.title} -> ${nextPaid ? nextPrice + ' CC' : 'Free'} (${listed.pricingSource}).`);
        }
      } else {
        console.log(`Pricing preserved: ${existing.title} remains ${existing.price || '?'} CC because the author card price was not confirmed.`);
      }
      continue;
    }

    seenNewIds.add(id);
    const authorCheck = await verifyCreationAuthor(page, url).catch((error) => ({
      ok: false,
      reason: 'author-check-error:' + error.message,
      author: ''
    }));
    if (!authorCheck.ok) {
      console.log('Skipped non-TownGG or unverified Creation: ' + url + ' (' + authorCheck.reason + (authorCheck.author ? ', ' + authorCheck.author : '') + ')');
      continue;
    }

    const title = titleFromUrl(url);
    discovered.push({
      title,
      group: 'Uncategorized',
      category: 'Uncategorized',
      image: '',
      alt: `${title} Bethesda Creations cover`,
      description: 'Automatically discovered from Bethesda Creations.',
      tags: ['Bethesda Creations', 'Auto Discovered'],
      price: String(listed.price || 0),
      isPaid: listed.isPaid === true,
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

  await closeContext(context);
  nextSource = insertCreations(nextSource, discovered);

  if (nextSource === source) {
    console.log(`Bethesda Creations discovery complete: ${listedItems.length} TownGG cards found, no data changes.`);
    return;
  }

  await fs.writeFile(SITE_DATA_PATH, nextSource, 'utf8');
  console.log(`Bethesda Creations discovery complete: ${listedItems.length} TownGG cards found, ${pricingUpdates} pricing updates, ${discovered.length} new Creations added.`);
  discovered.forEach((item) => console.log(`Added: ${item.title} (${item.isPaid ? item.price + ' CC' : 'Free'})`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
