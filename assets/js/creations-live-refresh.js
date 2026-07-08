(() => {
  const RAW_BASE = 'https://raw.githubusercontent.com/TownGG/towngg-portfolio/main';
  const SITE_DATA_URL = `${RAW_BASE}/assets/js/site-data.js`;
  const DAILY_CSV_URL = `${RAW_BASE}/assets/data/creations-mod-daily.csv`;
  const REFRESH_MS = 2 * 60 * 1000;
  const state = { data: null, dailyRows: [], activeSortKey: '', activeSortDirection: 'desc' };

  const translations = {
    en: { Updated: 'Updated {time}', 'Daily Downloads': 'Daily Downloads', 'Yesterday Downloads': 'Yesterday Downloads', Likes: 'Likes', 'Total Downloads': 'Total Downloads', 'Library Adds': 'Library Adds' },
    'zh-CN': { Updated: '更新于 {time}', 'Daily Downloads': '今日下载', 'Yesterday Downloads': '昨日下载', Likes: '点赞', 'Total Downloads': '总下载', 'Library Adds': '加入库' },
    'zh-TW': { Updated: '更新於 {time}', 'Daily Downloads': '今日下載', 'Yesterday Downloads': '昨日下載', Likes: '按讚', 'Total Downloads': '總下載', 'Library Adds': '加入庫' },
    ja: { Updated: '更新 {time}', 'Daily Downloads': '今日のダウンロード', 'Yesterday Downloads': '昨日のダウンロード', Likes: 'いいね', 'Total Downloads': '総ダウンロード', 'Library Adds': 'ライブラリ追加' },
    ko: { Updated: '업데이트 {time}', 'Daily Downloads': '오늘 다운로드', 'Yesterday Downloads': '어제 다운로드', Likes: '좋아요', 'Total Downloads': '총 다운로드', 'Library Adds': '라이브러리 추가' },
    ru: { Updated: 'Обновлено {time}', 'Daily Downloads': 'Загрузки сегодня', 'Yesterday Downloads': 'Загрузки вчера', Likes: 'Лайки', 'Total Downloads': 'Всего загрузок', 'Library Adds': 'Добавления в библиотеку' }
  };

  function lang() {
    const html = document.documentElement.lang;
    if (translations[html]) return html;
    const stored = localStorage.getItem('townggSiteLang');
    return translations[stored] ? stored : 'en';
  }

  function locale() {
    return lang() === 'zh-CN' ? 'zh-CN'
      : lang() === 'zh-TW' ? 'zh-TW'
        : lang() === 'ja' ? 'ja-JP'
          : lang() === 'ko' ? 'ko-KR'
            : lang() === 'ru' ? 'ru-RU'
              : 'en-US';
  }

  function t(key, replacements = {}) {
    let value = translations[lang()]?.[key] || translations.en?.[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement); });
    return value;
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(toNumber(value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const date = new Date(raw.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const date = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return raw;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  function latestUpdatedAt() {
    return (state.data?.creations || [])
      .map((item) => String(item.updatedAt || '').trim())
      .filter(Boolean)
      .sort((a, b) => parseTime(b) - parseTime(a))[0] || '';
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

  function confirmedCreations() {
    return (state.data?.creations || []).filter((item) =>
      normalizeTitle(item.title).length > 2
      && ['likes', 'downloads', 'views', 'plays', 'libraryAdds'].some((key) => toNumber(item[key]) > 0)
    );
  }

  function parseSiteData(source) {
    const liveWindow = {};
    return Function('window', `${source}\n;return window.siteData;`)(liveWindow);
  }

  function parseCSV(text) {
    const rows = [];
    let cell = '';
    let row = [];
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = '';
      } else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ''])));
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

  function dailySeries(rows = state.dailyRows) {
    const groups = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const group = groups.get(row.date) || [];
      group.push(row);
      groups.set(row.date, group);
    });
    return [...groups.entries()]
      .map(([date, dateRows]) => ({ date, value: snapshotTotal(latestSnapshotRows(dateRows)) }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function todayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function downloadMetric() {
    const today = todayKey();
    const previous = dailySeries()
      .filter((item) => item.date < today && item.value > 0)
      .reverse()[0];
    return { label: 'Yesterday Downloads', value: previous?.value ?? null };
  }

  function updateTimestamp() {
    const target = document.querySelector('[data-creations-updated]');
    const latest = latestUpdatedAt();
    if (!target || !latest) return;
    target.classList.add('is-fresh');
    target.textContent = t('Updated', { time: formatTime(latest) });
    target.title = 'Live GitHub main branch data.';
  }

  function updateSummary() {
    const target = document.querySelector('[data-creations-summary]');
    if (!target) return;
    const totals = (state.data?.creations || []).reduce((sum, item) => {
      sum.likes += toNumber(item.likes);
      sum.downloads += toNumber(item.downloads);
      sum.libraryAdds += toNumber(item.libraryAdds);
      return sum;
    }, { likes: 0, downloads: 0, libraryAdds: 0 });
    const metric = downloadMetric();
    target.innerHTML = [
      [metric.label, metric.value],
      ['Likes', totals.likes],
      ['Total Downloads', totals.downloads],
      ['Library Adds', totals.libraryAdds]
    ].map(([label, value]) => `<article class="dashboard-stat"><span>${t(label)}</span><strong>${value == null ? '—' : formatNumber(value)}</strong></article>`).join('');
  }

  function dailyMap() {
    const map = new Map();
    const latestDate = state.dailyRows.map((row) => row.date).filter(Boolean).sort().at(-1);
    if (!latestDate) return map;
    latestSnapshotRows(state.dailyRows.filter((row) => row.date === latestDate)).forEach((row) => {
      const key = normalizeTitle(row.title);
      if (key) map.set(key, row);
    });
    return map;
  }

  function primaryUrl(item) {
    return item?.links?.[0]?.url || item?.url || '#';
  }

  function updateCards() {
    const target = document.querySelector('[data-creations-mods]');
    if (!target) return;
    target.innerHTML = confirmedCreations().filter((item) => item.image && toNumber(item.downloads) > 0).map((item) => `
      <a class="project-card project-card-link" data-group="${escapeHtml(item.group || '')}" href="${escapeHtml(primaryUrl(item))}" target="_blank" rel="noopener">
        <div class="project-image"><img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.alt || item.title || '')}" loading="lazy"></div>
        <div class="project-content"><h3 class="card-title">${escapeHtml(item.title || '')}</h3><p class="card-desc">${escapeHtml(item.description || '')}</p><div class="mod-tags">${(item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></div>
        <div class="stats"><span title="Likes"><span class="stat-icon">★</span>${escapeHtml(item.likes || '')}</span><span title="Downloads"><span class="stat-icon">↓</span>${escapeHtml(item.downloads || '')}</span></div>
      </a>
    `).join('');
  }

  function updateTable() {
    const body = document.querySelector('[data-creations-table]');
    const table = body?.closest('table');
    const headerRow = table?.querySelector('thead tr');
    if (!body || !headerRow) return;
    const daily = dailyMap();
    headerRow.innerHTML = ['Creation', 'Daily', 'Likes', 'Views', 'Downloads', 'Plays', 'Library Adds']
      .map((label, index) => `<th><button type="button" class="dashboard-table-sort" data-creations-table-sort="${index}" aria-sort="none">${label}</button></th>`).join('');
    body.innerHTML = confirmedCreations().map((item) => {
      const row = daily.get(normalizeTitle(item.title));
      return `<tr><td><a href="${escapeHtml(primaryUrl(item))}" target="_blank" rel="noopener">${escapeHtml(item.title || '')}</a></td><td>${formatNumber(row ? row.daily_downloads : 0)}</td><td>${formatNumber(item.likes)}</td><td>${formatNumber(item.views)}</td><td>${formatNumber(item.downloads)}</td><td>${formatNumber(item.plays)}</td><td>${formatNumber(item.libraryAdds)}</td></tr>`;
    }).join('');
    if (table) {
      table.dataset.creationsDailyReady = 'true';
      table.dataset.creationsDetailsReady = 'true';
      table.dataset.creationsDetailsRepairReady = 'true';
    }
  }

  function updateRanking() {
    const ranking = document.querySelector('[data-creations-ranking]');
    const select = document.querySelector('[data-creations-ranking-metric]');
    if (!ranking || !select) return;
    const metric = select.value || 'likes';
    const sorted = [...confirmedCreations()].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric])).slice(0, 8);
    const max = Math.max(1, ...sorted.map((item) => toNumber(item[metric])));
    ranking.classList.add('creation-bars');
    ranking.innerHTML = sorted.map((item) => {
      const value = toNumber(item[metric]);
      const width = Math.max(3, Math.round((value / max) * 100));
      return `<article class="creation-bar"><div class="creation-bar-head"><span>${escapeHtml(item.title || '')}</span><strong>${formatNumber(value)}</strong></div><div class="creation-bar-track"><span style="width:${width}%"></span></div></article>`;
    }).join('');
  }

  function applyAll() {
    if (!state.data?.creations?.length) return;
    window.siteData = { ...(window.siteData || {}), creations: state.data.creations };
    updateTimestamp();
    updateSummary();
    updateCards();
    updateTable();
    updateRanking();
    window.dispatchEvent(new CustomEvent('towngg:creations-live-refreshed', { detail: { updatedAt: latestUpdatedAt() } }));
  }

  async function refreshLiveCreations() {
    try {
      const [siteSource, dailyText] = await Promise.all([
        fetch(`${SITE_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' }).then((response) => response.ok ? response.text() : ''),
        fetch(`${DAILY_CSV_URL}?t=${Date.now()}`, { cache: 'no-store' }).then((response) => response.ok ? response.text() : '')
      ]);
      const nextData = siteSource ? parseSiteData(siteSource) : null;
      if (!nextData?.creations?.length) return;
      state.data = nextData;
      state.dailyRows = dailyText ? parseCSV(dailyText) : [];
      applyAll();
    } catch (error) {
      console.warn('Creations live GitHub refresh skipped', error);
    }
  }

  function boot() {
    refreshLiveCreations();
    window.setTimeout(refreshLiveCreations, 1500);
    window.setInterval(refreshLiveCreations, REFRESH_MS);
    window.addEventListener('focus', refreshLiveCreations);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLiveCreations(); });
    document.addEventListener('click', (event) => { if (event.target.closest('.language-option[data-lang]')) window.setTimeout(applyAll, 120); });
    document.querySelector('[data-creations-ranking-metric]')?.addEventListener('change', updateRanking);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();