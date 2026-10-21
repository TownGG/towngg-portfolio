import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const OUTPUT_FILE = process.env.MICROSOFT_PARTNER_OUTPUT_FILE || '/tmp/towngg-private-partner-earnings.json';
const TOKEN_STATE_FILE = '.github/state/microsoft-partner-refresh-token.enc';
const API_BASE = 'https://api.partner.microsoft.com/v1.0/payouts/transactionhistory';
const TOKEN_SCOPE = 'https://api.partner.microsoft.com/.default';
const PROGRAM_NAME = process.env.MICROSOFT_PARTNER_PROGRAM || 'Bethesda Games';
const START_DATE = process.env.MICROSOFT_PARTNER_START_DATE || '2026-01-01';
const POLL_MS = 10000;
const MAX_POLLS = 36;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function env(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function number(value) {
  const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCSV(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let cell = '', row = [], quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows.map((items) => Object.fromEntries(headers.map((header, index) => [String(header).trim(), items[index] || ''])));
}

function beijingDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function latestIso(values) {
  return values
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0]?.toISOString() || '';
}

function aggregateEarnings(csvText) {
  const sourceRows = parseCSV(csvText).filter((row) => !row.programName || row.programName === PROGRAM_NAME);
  if (!sourceRows.length) throw new Error('Partner Center earnings export contained no usable rows.');

  const daily = new Map();
  const monthly = new Map();
  const products = new Map();
  const statuses = new Map();

  for (const row of sourceRows) {
    const earning = number(row.earningAmountUSD || row.transactionAmountUSD || row.earningAmount || row.transactionAmount);
    const date = beijingDate(row.earningDate || row.transactionDate || row.calculationDate);
    const month = date ? date.slice(0, 7) : '';
    const transactionId = String(row.transactionId || '').trim();
    const productName = decodeHtml(row.productName);
    const status = String(row.paymentStatus || 'Unknown').trim() || 'Unknown';

    if (date) {
      const item = daily.get(date) || { date, earningsUSD: 0, transactions: new Set() };
      item.earningsUSD += earning;
      if (transactionId) item.transactions.add(transactionId);
      daily.set(date, item);
    }

    if (month) {
      const item = monthly.get(month) || { month, earningsUSD: 0, transactions: new Set() };
      item.earningsUSD += earning;
      if (transactionId) item.transactions.add(transactionId);
      monthly.set(month, item);
    }

    if (productName) {
      const item = products.get(productName) || {
        name: productName,
        earningsUSD: 0,
        transactions: new Set(),
        firstDate: date || '',
        lastDate: date || ''
      };
      item.earningsUSD += earning;
      if (transactionId) item.transactions.add(transactionId);
      if (date && (!item.firstDate || date < item.firstDate)) item.firstDate = date;
      if (date && (!item.lastDate || date > item.lastDate)) item.lastDate = date;
      products.set(productName, item);
    }

    const statusItem = statuses.get(status) || { status, earningsUSD: 0, rows: 0 };
    statusItem.earningsUSD += earning;
    statusItem.rows += 1;
    statuses.set(status, statusItem);
  }

  const dailyRows = [...daily.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({ date: item.date, earningsUSD: round2(item.earningsUSD), transactions: item.transactions.size }));

  const monthlyRows = [...monthly.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({ month: item.month, earningsUSD: round2(item.earningsUSD), transactions: item.transactions.size }));

  const productRows = [...products.values()]
    .map((item) => ({
      name: item.name,
      earningsUSD: round2(item.earningsUSD),
      transactions: item.transactions.size,
      avgEarningUSD: round2(item.transactions.size ? item.earningsUSD / item.transactions.size : 0),
      firstDate: item.firstDate,
      lastDate: item.lastDate
    }))
    .sort((a, b) => b.earningsUSD - a.earningsUSD);

  const statusRows = [...statuses.values()]
    .map((item) => ({ status: item.status, earningsUSD: round2(item.earningsUSD), rows: item.rows }))
    .sort((a, b) => b.earningsUSD - a.earningsUSD);

  const totalEarnings = sourceRows.reduce((sum, row) => sum + number(row.earningAmountUSD || row.transactionAmountUSD || row.earningAmount || row.transactionAmount), 0);
  const transactionIds = new Set(sourceRows.map((row) => String(row.transactionId || '').trim()).filter(Boolean));
  const adjustments = sourceRows
    .filter((row) => !decodeHtml(row.productName))
    .reduce((sum, row) => sum + number(row.earningAmountUSD || row.transactionAmountUSD || row.earningAmount || row.transactionAmount), 0);

  const currentMonth = beijingDate(new Date().toISOString()).slice(0, 7);
  const last7 = dailyRows.slice(-7).reduce((sum, row) => sum + row.earningsUSD, 0);
  const last30 = dailyRows.slice(-30).reduce((sum, row) => sum + row.earningsUSD, 0);

  return {
    schemaVersion: 1,
    source: 'Microsoft Partner Center Earnings API',
    programName: PROGRAM_NAME,
    currency: 'USD',
    sourceUpdatedAt: latestIso(sourceRows.map((row) => row.earningDate || row.transactionDate || row.calculationDate)),
    syncedAt: new Date().toISOString(),
    period: {
      from: dailyRows[0]?.date || START_DATE,
      to: dailyRows.at(-1)?.date || ''
    },
    totals: {
      earningsUSD: round2(totalEarnings),
      transactionRows: transactionIds.size,
      adjustmentsUSD: round2(adjustments),
      last7DaysUSD: round2(last7),
      last30DaysUSD: round2(last30),
      currentMonthUSD: round2(monthlyRows.find((row) => row.month === currentMonth)?.earningsUSD || 0),
      products: productRows.length
    },
    daily: dailyRows,
    monthly: monthlyRows,
    products: productRows,
    paymentStatus: statusRows
  };
}

function tokenKey() {
  const raw = Buffer.from(env('MICROSOFT_PARTNER_TOKEN_KEY'), 'base64');
  if (raw.length !== 32) throw new Error('MICROSOFT_PARTNER_TOKEN_KEY must be a base64-encoded 32-byte key.');
  return raw;
}

async function readRefreshToken() {
  try {
    const encrypted = JSON.parse(await fs.readFile(TOKEN_STATE_FILE, 'utf8'));
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const data = Buffer.from(encrypted.data, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return env('MICROSOFT_PARTNER_REFRESH_TOKEN');
}

async function writeRefreshToken(refreshToken) {
  const key = tokenKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  const payload = {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64')
  };
  await fs.mkdir(path.dirname(TOKEN_STATE_FILE), { recursive: true });
  await fs.writeFile(TOKEN_STATE_FILE, JSON.stringify(payload) + '\n', 'utf8');
}

async function refreshAccessToken(refreshToken) {
  const tenantId = env('MICROSOFT_PARTNER_TENANT_ID');
  const body = new URLSearchParams({
    client_id: env('MICROSOFT_PARTNER_CLIENT_ID'),
    client_secret: env('MICROSOFT_PARTNER_CLIENT_SECRET'),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: TOKEN_SCOPE
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`Microsoft token refresh failed (${response.status}): ${payload.error_description || payload.error || 'unknown error'}`);
  }
  return payload;
}

function apiHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'ms-correlationid': crypto.randomUUID(),
    'ms-requestid': crypto.randomUUID()
  };
}

async function createExport(accessToken) {
  const today = new Date().toISOString().slice(0, 10);
  const url = new URL(API_BASE);
  url.searchParams.set('$filter', `earningForDate ge ${START_DATE} and earningForDate le ${today} and (programName eq '${PROGRAM_NAME.replace(/'/g, "''")}')`);
  url.searchParams.set('fileformat', 'csv');

  const response = await fetch(url, { method: 'POST', headers: apiHeaders(accessToken) });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== 202) {
    throw new Error(`Partner earnings export request failed (${response.status}): ${JSON.stringify(payload).slice(0, 700)}`);
  }
  const item = payload?.value?.[0] || payload;
  if (!item?.requestId) throw new Error('Partner earnings export response did not include requestId.');
  return item.requestId;
}

async function waitForExport(accessToken, requestId) {
  for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(requestId)}`, { headers: apiHeaders(accessToken) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Partner earnings export status failed (${response.status}).`);
    const item = payload?.value?.[0] || payload;
    const status = String(item?.status || '').toLowerCase();
    if (status === 'completed' && item.blobLocation) return item.blobLocation;
    if (status === 'failed') throw new Error('Partner earnings export failed after Microsoft retries.');
    if (attempt < MAX_POLLS) await sleep(POLL_MS);
  }
  throw new Error('Timed out waiting for Partner Center earnings export.');
}

async function downloadCsv(blobLocation) {
  const response = await fetch(blobLocation);
  if (!response.ok) throw new Error(`Partner earnings CSV download failed (${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data[0] === 0x50 && data[1] === 0x4b) {
    throw new Error('Partner Center returned a ZIP archive although CSV was requested. Update the sync parser before publishing.');
  }
  return data.toString('utf8');
}

async function main() {
  const currentRefreshToken = await readRefreshToken();
  const tokens = await refreshAccessToken(currentRefreshToken);
  if (tokens.refresh_token) await writeRefreshToken(tokens.refresh_token);

  const requestId = await createExport(tokens.access_token);
  console.log(`Queued Microsoft Partner Center earnings export: ${requestId}`);
  const blobLocation = await waitForExport(tokens.access_token, requestId);
  const csv = await downloadCsv(blobLocation);
  const summary = aggregateEarnings(csv);

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`Creator earnings synced: $${summary.totals.earningsUSD.toFixed(2)} across ${summary.totals.transactionRows} transactions.`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
