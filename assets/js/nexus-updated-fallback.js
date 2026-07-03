(() => {
  const VERSION = localStorage.getItem('townggSiteVersion') || 'v2.05.202607031120-preview';
  const translations = {
    en: { Updated: 'Updated {time}', Source: 'Nexus timestamp fallback from history CSV.' },
    'zh-CN': { Updated: '更新于 {time}', Source: 'Nexus 更新时间来自历史 CSV 兜底。' },
    'zh-TW': { Updated: '更新於 {time}', Source: 'Nexus 更新時間來自歷史 CSV 兜底。' },
    ja: { Updated: '更新 {time}', Source: 'Nexus更新時刻は履歴CSVから補完されました。' },
    ko: { Updated: '업데이트 {time}', Source: 'Nexus 업데이트 시간은 기록 CSV에서 보완되었습니다.' },
    ru: { Updated: 'Обновлено {time}', Source: 'Время обновления Nexus восстановлено из CSV истории.' }
  };

  function lang() {
    const html = document.documentElement.lang;
    if (translations[html]) return html;
    const stored = localStorage.getItem('townggSiteLang');
    return translations[stored] ? stored : 'en';
  }

  function t(key, replacements = {}) {
    let value = translations[lang()]?.[key] || translations.en[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, replacement);
    });
    return value;
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

  function formatDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`;
    const date = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return raw;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  async function repairTimestamp(force = false) {
    const target = document.querySelector('[data-dashboard-updated]');
    if (!target) return;
    if (!force && target.textContent.trim() && !target.classList.contains('loading-value')) return;
    try {
      const response = await fetch(`./assets/data/nexus-history.csv?v=${encodeURIComponent(VERSION)}&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const rows = parseCSV(await response.text());
      const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1);
      if (!latestDate) return;
      target.classList.add('is-fresh');
      target.textContent = t('Updated', { time: formatDate(latestDate) });
      target.title = t('Source');
    } catch (error) {
      console.warn('Nexus updated timestamp fallback skipped', error);
    }
  }

  function boot() {
    repairTimestamp(false);
    window.setTimeout(() => repairTimestamp(false), 500);
    window.setTimeout(() => repairTimestamp(false), 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('click', (event) => {
    if (event.target.closest('.language-option[data-lang]')) {
      window.setTimeout(() => repairTimestamp(true), 120);
    }
  });
})();
