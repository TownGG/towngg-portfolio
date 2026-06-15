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

  function latestDailyByTitle(rows) {
    const latest = new Map();
    rows.forEach((row) => {
      const key = normalize(row.title);
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

    const dailyMap = latestDailyByTitle(await loadDailyRows());
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      headerRow.insertAdjacentHTML('beforeend', '<th>Daily</th><th>Updated</th>');
    }

    const confirmed = (window.siteData?.creations || []).filter((item) =>
      ['likes', 'downloads', 'plays', 'libraryAdds'].some((key) => toNumber(item[key]) > 0)
    );

    [...body.querySelectorAll('tr')].forEach((row, index) => {
      const item = confirmed[index] || {};
      const daily = dailyMap.get(normalize(item.title));
      const dailyValue = daily ? toNumber(daily.daily_downloads) : 0;
      const updatedAt = daily?.last_updated || item.updatedAt || '-';
      row.insertAdjacentHTML(
        'beforeend',
        `<td>${numberFormatter.format(dailyValue)}</td><td>${updatedAt}</td>`
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
