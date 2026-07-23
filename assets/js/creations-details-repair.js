(() => {
  const TABLE_SELECTOR = '[data-creations-table]';
  const state = { sorting: false, activeKey: '', activeDirection: 'desc', bound: false, pendingTimer: 0 };

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

  function uuidFromUrl(url) {
    return String(url || '').match(/details\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
  }

  function metricValue(item, key) {
    return item?.[key];
  }

  function creationKeyFromItem(item) {
    return normalize(item?.creationKey || item?.creation_key || item?.creationId || item?.contentId || item?.content_id || uuidFromUrl(primaryUrl(item)) || '');
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

  function dailyState() {
    return window.townggCreationsDailyState?.ready ? window.townggCreationsDailyState : null;
  }

  function dailyForItem(item) {
    const daily = dailyState();
    if (!daily) return 0;
    const byKey = daily.byKey || {};
    const byTitle = daily.byTitle || {};
    const key = creationKeyFromItem(item);
    const title = normalizeTitle(item.title);
    const row = (key && byKey[key]) || (title && byTitle[title]) || null;
    return row ? toNumber(row.daily_downloads) : 0;
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

  function renderRow(item) {
    const title = item.title || '';
    const href = primaryUrl(item);
    return `
      <tr>
        <td><a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></td>
        <td>${formatNumber(dailyForItem(item))}</td>
        <td>${formatNumber(metricValue(item, 'likes'))}</td>
        <td>${formatNumber(metricValue(item, 'views'))}</td>
        <td>${formatNumber(metricValue(item, 'downloads'))}</td>
        <td>${formatNumber(metricValue(item, 'plays'))}</td>
        <td>${formatNumber(metricValue(item, 'libraryAdds'))}</td>
      </tr>
    `;
  }

  function markTotalsDirty(table) {
    const totalBody = table.querySelector('tbody[data-table-total-for="creations"]');
    if (totalBody) totalBody.remove();
    table.dataset.creationsDailyReady = 'true';
    table.dispatchEvent(new CustomEvent('towngg:creations-details-rendered', { bubbles: true }));
  }

  function renderDetails(force = false) {
    if (state.sorting) return;
    const body = document.querySelector(TABLE_SELECTOR);
    const table = body?.closest('table');
    const headerRow = table?.querySelector('thead tr');
    if (!body || !table || !headerRow) return;
    if (!dailyState()) return;

    const items = confirmedCreations();
    const signature = `${lang()}|${window.townggCreationsDailyState?.latestDate || ''}|${window.townggCreationsDailyState?.snapshotAt || ''}|${items.length}`;
    if (!force && table.dataset.creationsDetailsRepairSignature === signature && hasCompleteTable(table, body, items.length)) return;

    renderHeaders(headerRow);
    body.innerHTML = items.map(renderRow).join('');

    table.dataset.creationsDetailsRepairSignature = signature;
    table.dataset.creationsDailyReady = 'true';
    table.dataset.creationsDetailsReady = 'true';
    table.dataset.creationsDetailsRepairReady = 'true';
    table.dataset.sortableTable = 'creations';
    markTotalsDirty(table);
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
    const sorted = [...body.querySelectorAll(':scope > tr')]
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
    markTotalsDirty(table);
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

  function scheduleRender(force = false, delay = 80) {
    window.clearTimeout(state.pendingTimer);
    state.pendingTimer = window.setTimeout(() => renderDetails(force), delay);
  }

  function boot() {
    bindSort();
    scheduleRender(true, 40);
    [250, 700, 1400, 2600].forEach((delay) => window.setTimeout(() => renderDetails(), delay));
    window.addEventListener('towngg:creations-daily-ready', () => scheduleRender(true, 20));
    const body = document.querySelector(TABLE_SELECTOR);
    if (body && !body.dataset.creationsDetailsRepairObserver) {
      const observer = new MutationObserver(() => {
        if (!state.sorting) scheduleRender(false, 80);
      });
      observer.observe(body, { childList: true });
      body.dataset.creationsDetailsRepairObserver = 'true';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('click', (event) => {
    if (event.target.closest('.language-option[data-lang]')) scheduleRender(true, 120);
  });
})();