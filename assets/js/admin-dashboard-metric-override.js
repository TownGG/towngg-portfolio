(() => {
  const NEXUS_HISTORY_URL = 'https://raw.githubusercontent.com/TownGG/towngg-portfolio/main/assets/data/nexus-history.csv';
  const state = { loaded: false, value: 0 };

  const labels = {
    en: {
      title: 'Nexus Unique Downloads',
      foot: 'Across all Nexus mods'
    },
    'zh-CN': {
      title: 'Nexus 唯一下载总量',
      foot: '全部 Nexus 作品累计'
    },
    ja: {
      title: 'Nexus ユニークDL総数',
      foot: '全 Nexus Mod 累計'
    }
  };

  function lang() {
    const htmlLang = document.documentElement.lang;
    if (labels[htmlLang]) return htmlLang;
    const stored = localStorage.getItem('townggSiteLang');
    return labels[stored] ? stored : 'en';
  }

  function t(key) {
    return labels[lang()]?.[key] || labels.en[key] || key;
  }

  function number(value) {
    const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    const locale = lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US';
    return new Intl.NumberFormat(locale).format(Math.round(number(value)));
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
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header.trim(), items[index] || ''])));
  }

  function latestRowsPerMod(rows) {
    const latest = new Map();
    rows.forEach((row) => {
      const key = String(row.mod_id || row.mod_name || '').trim();
      if (!key) return;
      const current = latest.get(key);
      const rowOrder = `${row.date || ''}|${row.timestamp || row.last_updated || ''}`;
      const currentOrder = current ? `${current.date || ''}|${current.timestamp || current.last_updated || ''}` : '';
      if (!current || rowOrder >= currentOrder) latest.set(key, row);
    });
    return [...latest.values()];
  }

  function applyMetricCard() {
    if (!state.loaded) return;
    const cards = document.querySelectorAll('[data-admin-dashboard-metrics] .admin-metric-card');
    if (cards.length < 5) return;

    const card = cards[4];
    const label = card.querySelector('.admin-metric-label > span:first-child');
    const icon = card.querySelector('.admin-metric-icon');
    const value = card.querySelector('.admin-metric-value');
    const foot = card.querySelector('.admin-metric-foot');

    if (label && label.textContent !== t('title')) label.textContent = t('title');
    if (icon && icon.textContent !== '◎') icon.textContent = '◎';
    if (value && value.textContent !== formatNumber(state.value)) value.textContent = formatNumber(state.value);
    if (foot) {
      const next = `<span class="admin-metric-trend is-flat">●</span><span>${t('foot')}</span>`;
      if (foot.innerHTML !== next) foot.innerHTML = next;
    }

    card.dataset.metricOverride = 'nexus-unique-total';
  }

  async function loadUniqueTotal() {
    try {
      const response = await fetch(`${NEXUS_HISTORY_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parseCSV(await response.text());
      state.value = latestRowsPerMod(rows).reduce((sum, row) => sum + number(row.unique_downloads), 0);
      state.loaded = true;
      applyMetricCard();
    } catch (error) {
      console.warn('Nexus unique downloads metric skipped', error);
    }
  }

  function boot() {
    const target = document.querySelector('[data-admin-dashboard-metrics]') || document.body;
    const observer = new MutationObserver(() => applyMetricCard());
    observer.observe(target, { childList: true, subtree: true });

    loadUniqueTotal();
    window.addEventListener('focus', loadUniqueTotal);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadUniqueTotal();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.language-option[data-lang]')) window.setTimeout(applyMetricCard, 120);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
