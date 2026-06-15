(() => {
  const numberFormatter = new Intl.NumberFormat('en-US');
  const storedVersion = localStorage.getItem('townggSiteVersion') || 'v2.04.42-preview';
  let dailyRowsPromise = null;

  function toNumber(value) {
    return Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0;
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function primaryUrl(item) {
    return item?.links?.[0]?.url || item?.url || '';
  }

  function uuidFromUrl(url) {
    return String(url || '').match(/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
  }

  function decodeBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    try {
      return atob(padded);
    } catch {
      return '';
    }
  }

  function contentIdFromImage(url) {
    const raw = String(url || '');
    const direct = raw.match(/GENESIS\/(\d+)/i);
    if (direct) return direct[1];

    const encoded = decodeURIComponent(raw.split('/image/')[1]?.split(/[?#]/)[0] || '');
    const decoded = decodeBase64Url(encoded);
    const match = decoded.match(/GENESIS\\?\/(\d+)/i);
    return match?.[1] || '';
  }

  function creationKeyFromItem(item) {
    return item?.creationKey
      || item?.creation_key
      || item?.creationId
      || item?.contentId
      || item?.content_id
      || uuidFromUrl(primaryUrl(item))
      || contentIdFromImage(item?.image)
      || contentIdFromImage(item?.thumbnail)
      || contentIdFromImage(item?.cover)
      || normalize(item?.title);
  }

  function creationKeyFromRow(row) {
    return row.creation_key || row.creationKey || row.content_id || row.contentId || row.creation_id || row.creationId || normalize(row.title);
  }

  function parseCSV(text) {
    const rows = [];
    let cell = '';
    let row = [];
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ''])));
  }

  async function loadDailyRows() {
    if (dailyRowsPromise) return dailyRowsPromise;
    dailyRowsPromise = fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.text() : '')
      .then(parseCSV)
      .catch(() => []);
    return dailyRowsPromise;
  }

  function latestDailyByKey(rows) {
    const latest = new Map();
    rows.forEach((row) => {
      const key = creationKeyFromRow(row);
      if (!key) return;
      const current = latest.get(key);
      const order = `${row.date || ''} ${row.last_updated || ''}`;
      const currentOrder = current ? `${current.date || ''} ${current.last_updated || ''}` : '';
      if (!current || order > currentOrder) latest.set(key, row);
    });
    return latest;
  }

  async function addDailyColumns() {
    const table = document.querySelector('[data-creations-table]')?.closest('table');
    const body = document.querySelector('[data-creations-table]');
    if (!table || !body || !body.children.length || table.dataset.creationsDailyReady === 'true') return;

    const dailyMap = latestDailyByKey(await loadDailyRows());
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      headerRow.insertAdjacentHTML('beforeend', '<th>Daily</th>');
    }

    const confirmed = (window.siteData?.creations || []).filter((item) =>
      ['likes', 'downloads', 'plays', 'libraryAdds'].some((key) => toNumber(item[key]) > 0)
    );

    [...body.querySelectorAll('tr')].forEach((row, index) => {
      const item = confirmed[index] || {};
      const daily = dailyMap.get(creationKeyFromItem(item)) || dailyMap.get(normalize(item.title));
      const dailyValue = daily ? toNumber(daily.daily_downloads) : 0;
      row.insertAdjacentHTML(
        'beforeend',
        `<td>${numberFormatter.format(dailyValue)}</td>`
      );
    });

    table.dataset.creationsDailyReady = 'true';
  }

  function parseTimestamp(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function latestUpdatedAt() {
    return (window.siteData?.creations || [])
      .map((item) => String(item.updatedAt || '').trim())
      .filter(Boolean)
      .sort((a, b) => parseTimestamp(b) - parseTimestamp(a))[0] || '';
  }

  function updateCreationsTimestamp() {
    const target = document.querySelector('[data-creations-updated]');
    if (!target) return;

    const latest = latestUpdatedAt();
    if (!latest) return;

    target.classList.add('is-fresh');
    target.textContent = `Updated ${latest}`;
    target.title = 'Latest Bethesda Creations browser capture timestamp.';
  }

  async function installCreationsMeta() {
    await addDailyColumns();
    updateCreationsTimestamp();
  }

  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(installCreationsMeta);
    const start = () => {
      const body = document.querySelector('[data-creations-table]');
      if (body) observer.observe(body, { childList: true });
      installCreationsMeta();
    };
    window.setTimeout(start, 300);
    window.setTimeout(installCreationsMeta, 1200);
  });
})();
