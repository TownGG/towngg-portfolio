import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE_DATA_PATH = path.join(ROOT, 'assets/js/site-data.js');
const STORAGE_PATH = path.join(ROOT, '.auth/bethesda-storage.json');
const HEADLESS = !process.argv.includes('--headed') && process.env.HEADLESS !== 'false';
const TIMEOUT_MS = Number(process.env.CC_TIMEOUT_MS || 45000);

function toNumber(value) {
  const number = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData || {};
}

function getCreationUrl(item) {
  return item?.links?.find((link) => /creations\.bethesda\.net/i.test(String(link?.url || '')))?.url || '';
}

function creationUuid(url) {
  return String(url || '').match(/\/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
}

function isPaid(item) {
  return item?.isPaid === true || toNumber(item?.price) > 0;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[') depth += 1;
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findCreationsArrayRange(source) {
  const match = /creations\s*:\s*\[/.exec(source);
  if (!match) return null;
  const openIndex = source.indexOf('[', match.index);
  const closeIndex = findMatchingBrace(source, openIndex);
  return openIndex >= 0 && closeIndex >= 0 ? { openIndex, closeIndex } : null;
}

function patchLikesByUuid(source, uuid, likes) {
  const range = findCreationsArrayRange(source);
  if (!range || !uuid) return source;
  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  const objectPattern = /\{\s*title\s*:/g;
  let match;

  while ((match = objectPattern.exec(segment))) {
    const objectStart = range.openIndex + 1 + match.index;
    const objectEnd = findMatchingBrace(source, objectStart);
    if (objectEnd < 0 || objectEnd > range.closeIndex) continue;
    const objectText = source.slice(objectStart, objectEnd + 1);
    if (!objectText.toLowerCase().includes(uuid)) continue;

    const nextLikes = String(Math.round(likes));
    let nextObject = objectText;
    if (/\blikes\s*:\s*"[^"]*"/.test(nextObject)) {
      nextObject = nextObject.replace(/\blikes\s*:\s*"[^"]*"/, `likes: "${nextLikes}"`);
    } else if (/\bdownloads\s*:/.test(nextObject)) {
      nextObject = nextObject.replace(/\bdownloads\s*:/, `likes: "${nextLikes}", downloads:`);
    } else {
      nextObject = nextObject.replace(/\}$/, `, likes: "${nextLikes}" }`);
    }
    return source.slice(0, objectStart) + nextObject + source.slice(objectEnd + 1);
  }
  return source;
}

async function scrapeLikeCount(page) {
  return page.evaluate(() => {
    const toNumber = (value) => {
      const number = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
      return Number.isFinite(number) ? number : null;
    };
    const visible = (node) => {
      const rect = node?.getBoundingClientRect?.();
      return Boolean(rect && rect.width > 2 && rect.height > 2);
    };
    const collectNumbers = (text) => {
      const values = [];
      for (const match of String(text || '').matchAll(/(?:^|\s)([0-9][0-9,.]*)(?=\s|$)/g)) {
        const value = toNumber(match[1]);
        if (value !== null && value >= 0 && value < 10000000) values.push(value);
      }
      return values;
    };

    // Keep the search scoped to the current Creation so recommendations and
    // other cards cannot leak their Like counts into this item.
    const titleNode = [...document.querySelectorAll('h1,[data-testid="creation-title"]')]
      .find((node) => visible(node));
    let root = titleNode?.parentElement || document.querySelector('main') || document.body;
    let candidate = titleNode?.parentElement;
    for (let depth = 0; candidate && depth < 6; depth += 1, candidate = candidate.parentElement) {
      const text = String(candidate.innerText || candidate.textContent || '').replace(/\s+/g, ' ').trim();
      const detailLinks = candidate.querySelectorAll('a[href*="/starfield/details/"]').length;
      if (text.length > 7000 || detailLinks > 1) break;
      root = candidate;
    }

    const rootText = String(root?.innerText || root?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    // Paid Creation detail headers currently render the Like total directly
    // after "ALL PLATFORMS" beside the thumbs-up icon.
    const platformPatterns = [
      /\bALL PLATFORMS\b\s*([0-9][0-9,.]*)/i,
      /\bANY PLATFORM\b\s*([0-9][0-9,.]*)/i,
      /(?:所有平台|全部平台)\s*([0-9][0-9,.]*)/i
    ];
    for (const pattern of platformPatterns) {
      const match = rootText.match(pattern);
      const value = toNumber(match?.[1]);
      if (value !== null && value >= 0) {
        return { value, source: 'platform-summary' };
      }
    }

    // Prefer a semantic Like / thumbs-up control. This also covers pages where
    // the icon has an aria-label/title but the visible text is only a number.
    const controls = [...root.querySelectorAll('button,[role="button"],[aria-label],[title],[data-testid]')];
    const controlValues = [];
    for (const node of controls) {
      if (!visible(node)) continue;
      const iconMarkers = [...node.querySelectorAll('svg,use,img,[aria-label],[title],[data-testid]')]
        .slice(0, 12)
        .map((icon) => [
          icon.getAttribute?.('aria-label'),
          icon.getAttribute?.('title'),
          icon.getAttribute?.('data-testid'),
          icon.getAttribute?.('alt'),
          icon.getAttribute?.('src'),
          icon.getAttribute?.('href'),
          icon.getAttribute?.('xlink:href'),
          icon.getAttribute?.('class')
        ].filter(Boolean).join(' '))
        .join(' ');
      const marker = [
        node.getAttribute?.('aria-label'),
        node.getAttribute?.('title'),
        node.getAttribute?.('data-testid'),
        node.getAttribute?.('id'),
        node.getAttribute?.('class'),
        iconMarkers
      ].filter(Boolean).join(' ');

      if (!/(?:^|[^a-z])(likes?|thumbs?[-_ ]?up|upvote|recommend)(?:[^a-z]|$)/i.test(marker)) continue;
      if (/dislike|thumbs?[-_ ]?down/i.test(marker)) continue;

      const nearby = [
        node.innerText,
        node.textContent,
        node.nextElementSibling?.innerText,
        node.nextElementSibling?.textContent,
        node.previousElementSibling?.innerText,
        node.previousElementSibling?.textContent,
        node.parentElement?.innerText
      ].filter(Boolean).join(' ');
      controlValues.push(...collectNumbers(nearby));
    }
    if (controlValues.length) {
      return { value: Math.max(...controlValues), source: 'like-control' };
    }

    // Fallback to explicitly labelled Like text inside the current Creation.
    const labelledValues = [];
    const labelledPatterns = [
      /\b(?:likes?|喜欢)\b\s*[:：]?\s*([0-9][0-9,.]*)/gi,
      /([0-9][0-9,.]*)\s*\b(?:likes?|喜欢)\b/gi
    ];
    for (const pattern of labelledPatterns) {
      for (const match of rootText.matchAll(pattern)) {
        const value = toNumber(match[1]);
        if (value !== null && value >= 0 && value < 10000000) labelledValues.push(value);
      }
    }
    if (labelledValues.length) {
      return { value: Math.max(...labelledValues), source: 'labelled-text' };
    }

    // Final fallback: inspect only this Creation's scoped HTML state.
    const rootHtml = root?.outerHTML || '';
    const stateValues = [];
    const propertyPatterns = [
      /["']likes["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']likeCount["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']likesCount["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']totalLikes["']\s*:\s*["']?([0-9][0-9,.]*)/gi
    ];
    for (const pattern of propertyPatterns) {
      for (const match of rootHtml.matchAll(pattern)) {
        const value = toNumber(match[1]);
        if (value !== null && value >= 0 && value < 10000000) stateValues.push(value);
      }
    }
    return stateValues.length
      ? { value: Math.max(...stateValues), source: 'scoped-state' }
      : { value: null, source: 'not-detected' };
  }).catch(() => ({ value: null, source: 'evaluate-error' }));
}

async function main() {
  let source = await fs.readFile(SITE_DATA_PATH, 'utf8');
  const siteData = loadSiteData(source);
  const paid = (Array.isArray(siteData.creations) ? siteData.creations : [])
    .filter(isPaid)
    .map((item) => ({ ...item, url: getCreationUrl(item), uuid: creationUuid(getCreationUrl(item)) }))
    .filter((item) => item.url && item.uuid);

  if (!paid.length) {
    console.log('Paid Creation likes sync: no paid Creations found.');
    return;
  }

  const storageState = await fs.access(STORAGE_PATH).then(() => STORAGE_PATH).catch(() => undefined);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    ...(storageState ? { storageState } : {}),
    viewport: { width: 1366, height: 900 }
  });
  const page = await context.newPage();

  let changed = 0;
  try {
    for (const item of paid) {
      process.stdout.write(`Syncing paid likes ${item.title}... `);
      try {
        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await page.waitForLoadState('networkidle', { timeout: TIMEOUT_MS }).catch(() => {});
        await page.waitForTimeout(1200);
        const detected = await scrapeLikeCount(page);
        const previous = toNumber(item.likes);
        if (detected?.value !== null && detected?.value !== undefined) {
          const next = Math.max(0, Math.round(Number(detected.value)));
          if (next !== previous) {
            source = patchLikesByUuid(source, item.uuid, next);
            changed += 1;
            console.log(`${previous} -> ${next} (${detected.source})`);
          } else {
            console.log(`kept ${previous} (${detected.source})`);
          }
        } else {
          console.log(`kept ${previous} (${detected?.source || 'not detected'})`);
        }
      } catch (error) {
        console.log(`kept ${toNumber(item.likes)} (${error.message})`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (changed > 0) {
    await fs.writeFile(SITE_DATA_PATH, source, 'utf8');
  }
  console.log(`Paid Creation likes sync complete: ${changed} updated, ${paid.length - changed} unchanged.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
