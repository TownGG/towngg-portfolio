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
const LIKE_DEBUG_THRESHOLD = Number(process.env.CC_LIKE_DEBUG_THRESHOLD || 100);

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

function isRemovedStatus(status) {
  return status === 404 || status === 410;
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
    if (key === 'isPaid') return `${key}: ${value === true}`;
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
    const isGeneric = (value) => /^(bethesda creations?|featured|recommended|more creations?|stats|details|overview)$/i.test(clean(value));

    const visible = (node) => {
      const rect = node?.getBoundingClientRect?.();
      return Boolean(rect && rect.width > 20 && rect.height > 8);
    };

    const primaryHeadings = [
      ...document.querySelectorAll('h1,[data-testid="creation-title"]')
    ]
      .filter(visible)
      .map((node) => clean(node.innerText || node.textContent))
      .filter((value) => value && !isGeneric(value));

    const candidates = [
      ...primaryHeadings,
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      fallback
    ].map(clean).filter((value) => value && !isGeneric(value));

    return candidates[0] || fallback;
  }, fallbackTitle).catch(() => fallbackTitle);

  const isGeneric = (value) => /^(bethesda creations?|featured|recommended|more creations?|stats|details|overview)$/i.test(cleanTitle(value));
  const cleanedPageTitle = cleanTitle(pageTitle);
  const cleanedUrlTitle = cleanTitle(urlTitle);
  const cleanedFallback = cleanTitle(fallbackTitle);

  if (cleanedPageTitle && !isGeneric(cleanedPageTitle) && cleanedPageTitle !== cleanedFallback) return cleanedPageTitle;
  if (cleanedUrlTitle && !isGeneric(cleanedUrlTitle) && cleanedUrlTitle !== cleanedFallback) return cleanedUrlTitle;
  return (!isGeneric(cleanedPageTitle) && cleanedPageTitle) || (!isGeneric(cleanedUrlTitle) && cleanedUrlTitle) || cleanedFallback;
}

function normalizeImageUrl(value, pageUrl)function normalizeImageUrl(value, pageUrl) {
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

async function scrapePricing(page) {
  return page.evaluate(() => {
    const isVisible = (node) => {
      const rect = node?.getBoundingClientRect?.();
      const style = node ? window.getComputedStyle(node) : null;
      return Boolean(rect && rect.width > 1 && rect.height > 1 && style?.display !== 'none' && style?.visibility !== 'hidden');
    };
    const isGenericHeading = (value) => /^(bethesda creations?|featured|recommended|more creations?|stats|details|overview)$/i.test(
      String(value || '').replace(/\s+/g, ' ').trim()
    );
    const titleNode = [...document.querySelectorAll('h1,[data-testid="creation-title"]')]
      .find((node) => isVisible(node) && !isGenericHeading(node.innerText || node.textContent));

    if (!titleNode) {
      return { ok: false, price: null, isPaid: null, source: 'creation-title-not-found' };
    }

    const titleRect = titleNode.getBoundingClientRect();
    let primaryRoot = titleNode.parentElement || titleNode;
    let candidate = titleNode.parentElement;
    for (let depth = 0; candidate && depth < 6; depth += 1, candidate = candidate.parentElement) {
      const text = String(candidate.innerText || candidate.textContent || '').replace(/\s+/g, ' ').trim();
      const detailLinks = candidate.querySelectorAll('a[href*="/starfield/details/"]').length;
      if (text.length > 6500 || detailLinks > 2) break;
      primaryRoot = candidate;
    }

    const isPrimaryNode = (node) => {
      if (!node || !primaryRoot.contains(node) || !isVisible(node)) return false;
      if (node.closest('[class*="featured" i],[class*="recommend" i],[class*="related" i]')) return false;
      const rect = node.getBoundingClientRect();
      return rect.bottom >= titleRect.top - 160 && rect.top <= titleRect.bottom + 560;
    };
    const parsePrice = (value) => {
      const matches = String(value || '').replace(/,/g, '').match(/\b([1-9][0-9]{1,4})\b/g) || [];
      return matches.map(Number).find((number) => Number.isFinite(number) && number > 0) || 0;
    };
    const candidates = [];
    const addCandidate = (value, source, priority) => {
      const price = parsePrice(value);
      if (price > 0) candidates.push({ price, source, priority });
    };

    const priceAttributes = ['data-price', 'data-cost', 'data-credits', 'data-credit-price'];
    for (const node of [...primaryRoot.querySelectorAll('[data-price],[data-cost],[data-credits],[data-credit-price]')]) {
      if (!isPrimaryNode(node)) continue;
      for (const attribute of priceAttributes) {
        addCandidate(node.getAttribute(attribute), 'attribute:' + attribute, 1);
      }
      addCandidate(node.innerText || node.textContent, 'price-attribute-text', 1);
    }

    const semanticNodes = [
      ...primaryRoot.querySelectorAll(
        '[class*="price" i],[class*="credit" i],[class*="currency" i],' +
        '[aria-label*="price" i],[aria-label*="credit" i],[title*="price" i],[title*="credit" i]'
      )
    ];
    for (const node of semanticNodes) {
      if (!isPrimaryNode(node)) continue;
      const container = node.closest('button,a,[role="button"],li,div') || node;
      const marker = [
        node.className?.baseVal || node.className,
        node.getAttribute?.('aria-label'),
        node.getAttribute?.('title'),
        node.getAttribute?.('data-testid'),
        node.outerHTML?.slice(0, 800)
      ].filter(Boolean).join(' ');
      if (!/(price|credit|currency|purchase|buy|cost)/i.test(marker)) continue;
      addCandidate(container.innerText || container.textContent, 'semantic-price-element', 2);
    }

    for (const node of [...primaryRoot.querySelectorAll('button,a,[role="button"]')]) {
      if (!isPrimaryNode(node)) continue;
      const text = String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      const marker = [
        text,
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.className?.baseVal || node.className,
        node.outerHTML?.slice(0, 1200)
      ].filter(Boolean).join(' ');
      if (!/(creation\s*credits?|credits?|\bcc\b|currency|purchase|buy|price)/i.test(marker)) continue;
      addCandidate(text, 'purchase-action', 3);
    }

    const primaryText = String(primaryRoot.innerText || primaryRoot.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ');
    const labeledPatterns = [
      /(?:price|cost)\s*:?\s*([1-9][0-9]{1,4})\s*(?:cc|credits?|creation credits?)/i,
      /([1-9][0-9]{1,4})\s*(?:cc|credits?|creation credits?)/i,
      /(?:cc|credits?|creation credits?)\s*:?\s*([1-9][0-9]{1,4})/i
    ];
    for (const pattern of labeledPatterns) {
      const match = primaryText.match(pattern);
      if (match) addCandidate(match[1], 'labeled-primary-text', 4);
    }

    candidates.sort((a, b) => a.priority - b.priority);
    const match = candidates[0];
    if (match) {
      return { ok: true, price: match.price, isPaid: true, source: match.source };
    }

    const hasCreationPage = /\/starfield\/details\//i.test(window.location.pathname)
      && primaryText.length > 40;
    return hasCreationPage
      ? { ok: true, price: 0, isPaid: false, source: 'no-primary-price-element' }
      : { ok: false, price: null, isPaid: null, source: 'page-not-ready' };
  });
}

async function scrapeCoverImage(page)async function scrapeCoverImage(page) {
  return page.evaluate(() => {
    const metaImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (metaImage && !/avatar|logo|icon|favicon|spinner|placeholder/i.test(metaImage)) return metaImage;

    const isVisible = (node) => {
      const rect = node?.getBoundingClientRect?.();
      return Boolean(rect && rect.width > 20 && rect.height > 20);
    };
    const titleNode = [...document.querySelectorAll('h1,[data-testid="creation-title"]')]
      .find((node) => isVisible(node) && !/^(featured|recommended|more creations?)$/i.test(
        String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim()
      ));
    if (!titleNode) return null;

    const titleRect = titleNode.getBoundingClientRect();
    let primaryRoot = titleNode.parentElement || titleNode;
    let candidate = titleNode.parentElement;
    for (let depth = 0; candidate && depth < 6; depth += 1, candidate = candidate.parentElement) {
      const text = String(candidate.innerText || candidate.textContent || '').replace(/\s+/g, ' ').trim();
      const detailLinks = candidate.querySelectorAll('a[href*="/starfield/details/"]').length;
      if (text.length > 6500 || detailLinks > 2) break;
      primaryRoot = candidate;
    }

    const candidates = [...primaryRoot.querySelectorAll('img')]
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
        const alt = img.alt || '';
        const width = Math.max(img.naturalWidth || 0, rect.width || 0);
        const height = Math.max(img.naturalHeight || 0, rect.height || 0);
        const ratio = width / Math.max(1, height);
        const nearTitle = rect.bottom >= titleRect.top - 180 && rect.top <= titleRect.bottom + 720;
        const inRecommendation = Boolean(img.closest('[class*="featured" i],[class*="recommend" i],[class*="related" i]'));
        return { src, alt, width, height, ratio, rectTop: rect.top, rectLeft: rect.left, area: width * height, nearTitle, inRecommendation };
      })
      .filter((item) => item.src && item.nearTitle && !item.inRecommendation)
      .filter((item) => item.width >= 80 && item.height >= 80)
      .filter((item) => item.ratio >= 0.75 && item.ratio <= 2.25)
      .filter((item) => item.area <= 1000000)
      .filter((item) => !/avatar|logo|icon|favicon|spinner|placeholder|banner|background/i.test(item.src + ' ' + item.alt))
      .sort((a, b) => {
        const aScore = Math.abs(a.rectTop - titleRect.bottom) + Math.abs(a.rectLeft - titleRect.left);
        const bScore = Math.abs(b.rectTop - titleRect.bottom) + Math.abs(b.rectLeft - titleRect.left);
        return aScore - bScore;
      });

    return candidates[0]?.src || null;
  });
}

async function verifyCreationAuthor(page, expectedAuthor = 'TownGG') {
  return page.evaluate((expected) => {
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const exactExpected = (value) => {
      const normalized = normalizeText(value).toLowerCase();
      const target = expected.toLowerCase();
      return normalized === target
        || normalized === 'by ' + target
        || normalized === 'author: ' + target
        || normalized === 'creator: ' + target;
    };

    const titleNode = [...document.querySelectorAll('h1,[data-testid="creation-title"]')]
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 20 && rect.height > 8;
      });
    let root = titleNode?.parentElement || document.querySelector('main') || document.body;
    let candidate = titleNode?.parentElement;
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

    if (signals.some(exactExpected)) return { ok: true, author: expected };
    const explicitOther = signals.find((value) => /^(by|author:|creator:)/i.test(value));
    return explicitOther
      ? { ok: false, author: explicitOther }
      : { ok: null, author: '' };
  }, expectedAuthor);
}

function compactStats(stats)function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value));
}

function isEmptyMetricValue(value) {
  return /^[-–—]+$|^n\/?a$/i.test(String(value || '').trim());
}

function aggregateImmediateLabeledNumbers(text, labels, context = {}) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  let total = 0;
  let matchCount = 0;
  const debugMatches = [];

  for (const label of labels) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b\\s*:?\\s*(---|[-–—]|n\\/?a|[0-9][0-9,.]*)`, 'gi');
    for (const match of normalized.matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      const value = isEmptyMetricValue(raw) ? 0 : parseNumberValue(raw);
      total += value;
      matchCount += 1;
      if (context.debug && context.metric === 'likes') {
        const start = Math.max(0, match.index - 90);
        const end = Math.min(normalized.length, match.index + match[0].length + 90);
        debugMatches.push({ label, raw, value, snippet: normalized.slice(start, end) });
      }
    }
  }

  if (context.debug && context.metric === 'likes') {
    console.log('');
    console.log(`[LIKE INLINE DEBUG] title=${context.title || '-'}`);
    console.log(`[LIKE INLINE DEBUG] source=${context.source || '-'}`);
    console.log(`[LIKE INLINE DEBUG] matchCount=${debugMatches.length}, matchedSum=${total}, formatted=${matchCount > 0 ? numberFormat.format(Math.round(total)) : '-'}`);
    if (!debugMatches.length) {
      console.log('[LIKE INLINE DEBUG] no immediate like/likes value found at main sync parse moment.');
    }
    debugMatches.forEach((item, index) => {
      console.log(`[LIKE INLINE DEBUG] #${index + 1} label=${item.label}, raw=${item.raw}, value=${item.value}`);
      console.log(`[LIKE INLINE DEBUG] #${index + 1} snippet=${item.snippet}`);
    });
  }

  return matchCount > 0 ? numberFormat.format(Math.round(total)) : null;
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

function parsePlatformStats(text, context = {}) {
  return {
    likes: aggregateImmediateLabeledNumbers(text, ['likes', 'like', '喜欢'], { ...context, metric: 'likes' }),
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

async function scrapeAllTimeEngagementStats(page, debugContext = {}) {
  await openStatsTab(page);
  await forceSelectAllTime(page);
  await selectPlatformAny(page);
  const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
  const stats = compactStats(parsePlatformStats(text, { ...debugContext, source: 'STATS All time body' }));
  return { ok: Boolean(Object.keys(stats).length), stats, timeRange: 'all-time-or-fallback' };
}

function statsLine(stats, coverImage, title, oldTitle, pricing) {
  const pricingLabel = pricing?.ok
    ? (pricing.isPaid ? `${pricing.price} CC (paid)` : 'free')
    : 'kept';
  return `title=${title && title !== oldTitle ? `${oldTitle} -> ${title}` : title || oldTitle}, price=${pricingLabel}, likes=${stats.likes || '-'}, downloads=${stats.downloads || '-'}, cover=${coverImage ? 'yes' : 'no'}, views=${stats.views || '-'}, plays=${stats.plays || '-'}, bookmarks=${stats.bookmarks || '-'}, libraryAdds=${stats.libraryAdds || '-'}`;
}

async function scrapeCreation(page, creation) {
  const url = getCreationUrl(creation);
  if (!url) return { ok: false, error: 'missing_url' };

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  const status = response?.status?.();
  if (isRemovedStatus(status)) {
    return { ok: true, removed: true, status, title: creation.title, stats: {}, coverImage: null };
  }
  await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(SLOW_MS);

  const ownership = await verifyCreationAuthor(page, 'TownGG').catch(() => ({ ok: null, author: '' }));
  if (ownership.ok === false) {
    return { ok: false, error: 'author_mismatch:' + ownership.author };
  }

  const debugLikes = parseNumberValue(creation.likes) > LIKE_DEBUG_THRESHOLD;
  const debugContext = { debug: debugLikes, title: creation.title };
  const finalUrl = page.url() || url;
  const title = await scrapeTitle(page, creation.title, titleFromUrl(finalUrl) || titleFromUrl(url));
  const coverImage = normalizeImageUrl(await scrapeCoverImage(page), url);
  const pricing = await scrapePricing(page).catch(() => ({
    ok: false,
    price: null,
    isPaid: null,
    source: 'scrape-error'
  }));
  const allTime = await scrapeAllTimeEngagementStats(page, debugContext);
  let fallbackStats = {};
  if (!allTime.ok) {
    await openDetailsTab(page);
    const text = await page.locator('body').innerText({ timeout: TIMEOUT_MS }).catch(() => '');
    fallbackStats = compactStats(parsePlatformStats(text, { ...debugContext, source: 'DETAILS fallback body' }));
  }

  const stats = {
    ...fallbackStats,
    ...(allTime.ok ? allTime.stats : {})
  };

  if (!Object.keys(stats).length && !coverImage && title === creation.title) {
    return { ok: false, error: 'no_stats_cover_or_title_found' };
  }

  return { ok: true, title, stats, coverImage, pricing };
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

      if (result.removed) {
        const merged = {
          ...creation,
          image: '',
          updatedAt: today,
          source: 'Removed from Creations'
        };
        nextSource = replaceCreationObjectByKey(nextSource, creation, renderCreationObject(merged));
        success += 1;
        console.log(`removed from Creations (HTTP ${result.status}), hidden on site`);
        continue;
      }

      const merged = {
        ...creation,
        title: result.title || creation.title,
        alt: creation.alt ? String(creation.alt).replace(creation.title, result.title || creation.title) : creation.alt,
        ...result.stats,
        ...(result.coverImage ? { image: result.coverImage } : {}),
        ...(result.pricing?.ok ? {
          price: String(result.pricing.price),
          isPaid: result.pricing.isPaid
        } : {}),
        updatedAt: today,
        source: 'Browser Capture'
      };
      nextSource = replaceCreationObjectByKey(nextSource, creation, renderCreationObject(merged));
      success += 1;
      console.log(statsLine(result.stats, result.coverImage, result.title, creation.title, result.pricing));
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