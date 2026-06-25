import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const SITE_DATA_PATH = 'assets/js/site-data.js';
const STAT_KEYS = ['views', 'bookmarks', 'likes', 'downloads', 'plays', 'libraryAdds'];
const GUARD_SKIP_UUIDS = new Set(['ca001d54-6f29-43cd-98f5-773339dbfb05']);
const GUARD_SKIP_TITLES = new Set([
  'cassilias trainning dummy',
  'cassilias training dummy',
  'cassilia s trainning dummy',
  'cassilia s training dummy',
  'cassilias trainning dummy',
  'cassilias training dummy'
]);

function loadSiteData(source) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'site-data.js' });
  return context.window.siteData || {};
}

function parseNumberValue(value) {
  const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function getCreationUrl(item) {
  return item?.links?.find((link) => /creations\.bethesda\.net/i.test(link.url))?.url || '';
}

function stableKeyFromUrl(url) {
  const raw = String(url || '');
  const uuid = raw.match(/\/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  return uuid ? uuid.toLowerCase() : raw.split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();
}

function stableKey(item) {
  return stableKeyFromUrl(getCreationUrl(item)) || String(item?.title || '').trim().toLowerCase();
}

function normalizeTitle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uuidFromUrl(url) {
  return String(url || '').match(/\/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
}

function shouldSkipGuard(item) {
  const title = normalizeTitle(item?.title);
  const uuid = uuidFromUrl(getCreationUrl(item));
  if (GUARD_SKIP_UUIDS.has(uuid)) return true;
  if (GUARD_SKIP_TITLES.has(title)) return true;
  return title.includes('cassilias trainning dummy')
    || title.includes('cassilias training dummy')
    || title.includes('cassilia s trainning dummy')
    || title.includes('cassilia s training dummy');
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

function findCreationObject(source, key) {
  const range = findCreationsArrayRange(source);
  if (!range) return null;
  const objectPattern = /\{\s*title\s*:/g;
  const segment = source.slice(range.openIndex + 1, range.closeIndex);
  let match;
  while ((match = objectPattern.exec(segment))) {
    const objectStart = range.openIndex + 1 + match.index;
    const objectEnd = findMatchingBrace(source, objectStart);
    if (objectEnd < 0 || objectEnd > range.closeIndex) continue;
    const objectText = source.slice(objectStart, objectEnd + 1);
    try {
      const context = { value: null };
      vm.createContext(context);
      vm.runInContext(`value = (${objectText});`, context);
      if (stableKey(context.value) === key) return { objectStart, objectEnd, objectText };
    } catch {
      // Keep scanning.
    }
  }
  return null;
}

function replaceStringField(objectText, key, value) {
  const replacement = `${key}: ${JSON.stringify(String(value ?? ''))}`;
  const fieldPattern = new RegExp(`${key}\\s*:\\s*"(?:\\\\.|[^"\\\\])*"`);
  if (fieldPattern.test(objectText)) return objectText.replace(fieldPattern, replacement);
  const insertBefore = objectText.match(/,\s*updatedAt\s*:/) || objectText.match(/,\s*source\s*:/) || objectText.match(/,\s*links\s*:/);
  if (insertBefore?.index !== undefined) return `${objectText.slice(0, insertBefore.index)}, ${replacement}${objectText.slice(insertBefore.index)}`;
  return objectText.replace(/\s*}$/, `, ${replacement} }`);
}

function getOldSource() {
  try {
    return execFileSync('git', ['show', `HEAD:${SITE_DATA_PATH}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function valueLabel(value) {
  const text = String(value || '').trim();
  return text || '-';
}

const oldSource = getOldSource();
if (!oldSource) {
  console.log('[GUARD] skipped: no previous site-data.js found in HEAD.');
  process.exit(0);
}

let nextSource = fs.readFileSync(SITE_DATA_PATH, 'utf8');
const oldData = loadSiteData(oldSource);
const newData = loadSiteData(nextSource);
const oldByKey = new Map((oldData.creations || []).map((item) => [stableKey(item), item]));
let corrections = 0;
let checked = 0;
let accepted = 0;
let guardSkipped = 0;

for (const item of newData.creations || []) {
  const key = stableKey(item);
  const previous = oldByKey.get(key);
  if (!previous) continue;

  if (shouldSkipGuard(item) || shouldSkipGuard(previous)) {
    guardSkipped += 1;
    console.log(`[GUARD_SKIP] title=${item.title || previous.title || '-'} decision=accept_scraped reason=explicit_skip_for_cassilias_training_dummy`);
    continue;
  }

  const found = findCreationObject(nextSource, key);
  if (!found) continue;

  let objectText = found.objectText;
  let changed = false;

  for (const statKey of STAT_KEYS) {
    const oldValue = previous[statKey];
    const newValue = item[statKey];
    const oldNumber = parseNumberValue(oldValue);
    const newNumber = parseNumberValue(newValue);
    checked += 1;

    if (oldNumber <= 0 && newNumber <= 0) {
      console.log(`[GUARD_CHECK] title=${item.title || previous.title || '-'} field=${statKey} current=${valueLabel(oldValue)} scraped=${valueLabel(newValue)} decision=keep_empty`);
      continue;
    }

    if (newNumber < oldNumber) {
      console.log(`[GUARD_CHECK] title=${item.title || previous.title || '-'} field=${statKey} current=${valueLabel(oldValue)} scraped=${valueLabel(newValue)} decision=reject_lower`);
      objectText = replaceStringField(objectText, statKey, oldValue);
      changed = true;
      corrections += 1;
      console.log(`[GUARD_REJECTED] title=${item.title || previous.title || '-'} field=${statKey} current=${valueLabel(oldValue)} scraped=${valueLabel(newValue)} final=${valueLabel(oldValue)} reason=new_less_than_existing`);
      continue;
    }

    accepted += 1;
    const decision = newNumber > oldNumber ? 'accept_increase' : 'keep_equal';
    console.log(`[GUARD_CHECK] title=${item.title || previous.title || '-'} field=${statKey} current=${valueLabel(oldValue)} scraped=${valueLabel(newValue)} decision=${decision}`);
  }

  if (changed) {
    nextSource = nextSource.slice(0, found.objectStart) + objectText + nextSource.slice(found.objectEnd + 1);
  }
}

if (corrections > 0) fs.writeFileSync(SITE_DATA_PATH, nextSource, 'utf8');
console.log(`[GUARD] Creations non-decreasing stat guard complete: checked=${checked}, accepted=${accepted}, rejected=${corrections}, skipped=${guardSkipped}.`);
