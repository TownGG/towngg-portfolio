(() => {
  const TABLE_SELECTOR = '[data-creations-table]';
  const VERSION = localStorage.getItem('townggSiteVersion') || 'v2.05.202607031055-preview';
  const state = { sorting: false, activeKey: '', activeDirection: 'desc', bound: false };

  const labels = {
    en: ['Creation', 'Daily', 'Likes', 'Views', 'Downloads', 'Plays', 'Library Adds'],
    'zh-CN': ['Creation', '每日', '点赞', '浏览', '下载', '游玩', '加入库'],
    'zh-TW': ['Creation', '每日', '按讚', '瀏覽', '下載', '遊玩', '加入庫'],
    ja: ['Creation', '日別', 'いいね', '閲覧', 'ダウンロード', 'プレイ', 'ライブラリ追加'],
    ko: ['Creation', '일일', '좋아요', '조회', '다운로드', '플레이', '라이브러리 추가'],
    ru: ['Creation', 'Ежедневно', 'Лайки', 'Просмотры', 'Загрузки', 'Запуски', 'Добавления в библиотеку']
  };

  const columns = [
    { key: 'creation', type: 'text' },
    { key: 'daily', type: 'number' },
    { key: 'likes', type: 'number' },
    { key: 'views', type: 'number' },
    { key: 'downloads', type: 'number' },
    { key: 'plays', type: 'number' },
    { key: 'library-adds', type: 'number' }
  ];

  function lang() {
    const html = document.documentElement.lang;
    if (labels[html]) return html;
    const stored = localStorage.getItem('townggSiteLang');
    return labels[stored] ? stored : 'en';
  }

  function locale() {
    return lang() === 'zh-CN' ? 'zh-CN'
      : lang() === 'zh-TW' ? 'zh-TW'
        : lang() === 'ja' ? 'ja-JP'
          : lang() === 'ko' ? 'ko-KR'
            : lang() === 'ru' ? 'ru-RU'
              : 'en-US';
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeTitle(value) {
    return normalize(value)
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(toNumber(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function primaryUrl(item) {
    return item?.links?.[0]?.url || item?.url || '#';
  }

  function metricValue(item, key) {
    return item?.[key];
  }

  function isDisplayCreationTitle(value) {
    const title = normalizeTitle(value);
    if (!title || title.length < 3) return false;
    return !new Set([
      'featured',
      'starfield creations featured',
      'starfield creation featured',
      'starfield creations',
      'bethesda creations',
      'auto discovered'
    ]).has(title);
  }

  function confirmedCreations() {
    return (window.siteData?.creations || []).filter((item) =>
      isDisplayCreationTitle(item.title)
      && ['likes', 'downloads', 'views', 'plays', 'libraryAdds'].some((key) => toNumber(metricValue(item, key)) > 0)
    );
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
    const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    return parseCSV(await response.text());
  }

  function snapshotTotal(rows) {
    return rows.reduce((sum, row) => sum + toNumber(row.daily_downloads), 0);
  }

  function latestSnapshotRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.last_updated || '';
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    });
    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, group]) => snapshotTotal(group) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || rows;
  }

  function dailyMap(rows) {
    const map = new Map();
    const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1);
    if (!latestDate) return map;
    latestSnapshotRows(rows.filter((row) => row.date === latestDate)).forEach((row) => {
      const key = normalizeTitle(row.title);
      if (key) map.set(key, row);
    });
    return map;
  }

  function hasCompleteTable(table, body, itemsLength) {
    const hasSevenHeaders = table.querySelectorAll('thead th').length === columns.length;
    const hasSevenCells = [...body.querySelectorAll('tr')].every((row) => row.children.length === columns.length);
    return hasSevenHeaders && hasSevenCells && body.children.length === itemsLength;
  }

  function renderHeaders(headerRow) {
    const text = labels[lang()] || labels.en;
    headerRow.innerHTML = columns.map((column, index) => (
      `<th><button type="button" class="dashboard-table-sort" data-creations-table-sort="${column.key}" aria-sort="none">${text[index]}</button></th>`
    )).join('');
  }

  function renderRow(item, daily) {
    const title = item.title || '';
    const href = primaryUrl(item);
    return `
      <tr>
        <td><a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></td>
        <td>${formatNumber(daily)}</td>
        <td>${formatNumber(metricValue(item, 'likes'))}</td>
        <td>${formatNumber(metricValue(item, 'views'))}</td>
        <td>${formatNumber(metricValue(item, 'downloads'))}</td>
        <td>${formatNumber(metricValue(item, 'plays'))}</td>
        <td>${formatNumber(metricValue(item, 'libraryAdds'))}</td>
      </tr>
    `;
  }

  async function renderDetails(force = false) {
    if (state.sorting) return;
    const body = document.querySelector(TABLE_SELECTOR);
    const table = body?.closest('table');
    const headerRow = table?.querySelector('thead tr');
    if (!body || !table || !headerRow) return;

    const items = confirmedCreations();
    if (!force && table.dataset.creationsDetailsRepairReady === 'true' && hasCompleteTable(table, body, items.length)) return;

    const daily = dailyMap(await loadDailyRows());
    renderHeaders(headerRow);
    body.innerHTML = items.map((item) => {
      const row = daily.get(normalizeTitle(item.title));
      return renderRow(item, row ? toNumber(row.daily_downloads) : 0);
    }).join('');

    table.dataset.creationsDailyReady = 'true';
    table.dataset.creationsDetailsReady = 'true';
    table.dataset.creationsDetailsRepairReady = 'true';
    table.dataset.sortableTable = 'creations';
  }

  function cellValue(row, index, type) {
    const text = row.children[index]?.textContent || '';
    return type === 'number' ? toNumber(text) : normalize(text);
  }

  function setHeaderState(headerRow, activeIndex, direction) {
    [...headerRow.children].forEach((header, index) => {
      const button = header.querySelector('[data-creations-table-sort]');
      const active = index === activeIndex;
      header.classList.toggle('is-sorted', active);
      header.dataset.sortDirection = active ? direction : '';
      if (button) button.setAttribute('aria-sort', active ? direction : 'none');
    });
  }

  function sortBy(index, column) {
    const body = document.querySelector(TABLE_SELECTOR);
    const table = body?.closest('table');
    const headerRow = table?.querySelector('thead tr');
    if (!body || !table || !headerRow) return;

    const defaultDirection = column.type === 'text' ? 'asc' : 'desc';
    const direction = state.activeKey === column.key && state.activeDirection === defaultDirection
      ? (defaultDirection === 'asc' ? 'desc' : 'asc')
      : defaultDirection;
    const multiplier = direction === 'asc' ? 1 : -1;
    const sorted = [...body.querySelectorAll('tr')]
      .map((row, originalIndex) => ({ row, originalIndex }))
      .sort((a, b) => {
        const av = cellValue(a.row, index, column.type);
        const bv = cellValue(b.row, index, column.type);
        let result = column.type === 'text' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv);
        if (result === 0) result = a.originalIndex - b.originalIndex;
        return result * multiplier;
      });

    state.sorting = true;
    const fragment = document.createDocumentFragment();
    sorted.forEach(({ row }) => fragment.appendChild(row));
    body.appendChild(fragment);
    state.activeKey = column.key;
    state.activeDirection = direction;
    setHeaderState(headerRow, index, direction);
    requestAnimationFrame(() => { state.sorting = false; });
  }

  function bindSort() {
    if (state.bound) return;
    state.bound = true;
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-creations-table-sort]');
      if (!button) return;
      const index = [...button.closest('tr').children].indexOf(button.closest('th'));
      const column = columns[index];
      if (!column) return;
      sortBy(index, column);
    });
  }

  function boot() {
    bindSort();
    renderDetails(true);
    [150, 500, 1200, 2400].forEach((delay) => window.setTimeout(() => renderDetails(), delay));
    const body = document.querySelector(TABLE_SELECTOR);
    if (body && !body.dataset.creationsDetailsRepairObserver) {
      const observer = new MutationObserver(() => {
        if (!state.sorting) window.setTimeout(() => renderDetails(), 80);
      });
      observer.observe(body, { childList: true });
      body.dataset.creationsDetailsRepairObserver = 'true';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('click', (event) => {
    if (event.target.closest('.language-option[data-lang]')) {
      window.setTimeout(() => renderDetails(true), 120);
    }
  });
})();
