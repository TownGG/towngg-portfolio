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
    const values = [];
    const pushMatches = (text) => {
      const input = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
      const patterns = [
        /\b(?:likes?|喜欢)\b\s*[:：]?\s*([0-9][0-9,.]*)/gi,
        /([0-9][0-9,.]*)\s*\b(?:likes?|喜欢)\b/gi,
        /["']?(?:likes|likeCount|likesCount|totalLikes)["']?\s*[:=]\s*["']?([0-9][0-9,.]*)/gi
      ];
      for (const pattern of patterns) {
        for (const match of input.matchAll(pattern)) {
          const value = Number(String(match[1] || '').replace(/[^0-9.]/g, ''));
          if (Number.isFinite(value) && value >= 0 && value < 10000000) values.push(value);
        }
      }
    };

    pushMatches(document.body?.innerText || '');

    const candidates = [...document.querySelectorAll('[aria-label],[title],[data-testid],button,[role="button"]')];
    for (const node of candidates) {
      const own = [
        node.getAttribute?.('aria-label'),
        node.getAttribute?.('title'),
        node.getAttribute?.('data-testid'),
        node.innerText,
        node.textContent
      ].filter(Boolean).join(' ');
      if (!/\blikes?\b|喜欢/i.test(own)) continue;
      pushMatches(own);
      const parentText = node.parentElement?.innerText || node.parentElement?.textContent || '';
      pushMatches(String(parentText).slice(0, 500));
    }

    const html = document.documentElement?.innerHTML || '';
    const propertyPatterns = [
      /["']likes["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']likeCount["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']likesCount["']\s*:\s*["']?([0-9][0-9,.]*)/gi,
      /["']totalLikes["']\s*:\s*["']?([0-9][0-9,.]*)/gi
    ];
    for (const pattern of propertyPatterns) {
      for (const match of html.matchAll(pattern)) {
        const value = Number(String(match[1] || '').replace(/[^0-9.]/g, ''));
        if (Number.isFinite(value) && value >= 0 && value < 10000000) values.push(value);
      }
    }

    return values.length ? Math.max(...values) : null;
  }).catch(() => null);
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
        const next = Math.max(previous, toNumber(detected));
        if (next > previous) {
          source = patchLikesByUuid(source, item.uuid, next);
          changed += 1;
          console.log(`${previous} -> ${next}`);
        } else {
          console.log(`kept ${previous}${detected !== null ? ` (detected ${detected})` : ' (not detected)'}`);
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
