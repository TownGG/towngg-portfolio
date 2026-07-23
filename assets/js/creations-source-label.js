(() => {
  const translations = {
    en: {
      Updated: 'Updated {time}',
      'Latest Bethesda Creations browser capture timestamp.': 'Latest Bethesda Creations browser capture timestamp.',
      'Automatically discovered from Bethesda Creations.': 'Automatically discovered from Bethesda Creations.',
      'Auto Discovered': 'Auto Discovered'
    },
    'zh-CN': {
      Updated: '更新于 {time}',
      'Latest Bethesda Creations browser capture timestamp.': '最新 Bethesda Creations 浏览器抓取时间。',
      'Automatically discovered from Bethesda Creations.': '自动从 Bethesda Creations 发现。',
      'Auto Discovered': '自动发现'
    },
    'zh-TW': {
      Updated: '更新於 {time}',
      'Latest Bethesda Creations browser capture timestamp.': '最新 Bethesda Creations 瀏覽器抓取時間。',
      'Automatically discovered from Bethesda Creations.': '自動從 Bethesda Creations 發現。',
      'Auto Discovered': '自動發現'
    },
    ja: {
      Updated: '更新 {time}',
      'Latest Bethesda Creations browser capture timestamp.': '最新のBethesda Creationsブラウザ取得時刻。',
      'Automatically discovered from Bethesda Creations.': 'Bethesda Creations から自動取得。',
      'Auto Discovered': '自動取得'
    },
    ko: {
      Updated: '업데이트 {time}',
      'Latest Bethesda Creations browser capture timestamp.': '최신 Bethesda Creations 브라우저 캡처 시간.',
      'Automatically discovered from Bethesda Creations.': 'Bethesda Creations에서 자동 발견됨.',
      'Auto Discovered': '자동 발견'
    },
    ru: {
      Updated: 'Обновлено {time}',
      'Latest Bethesda Creations browser capture timestamp.': 'Последнее время захвата браузером Bethesda Creations.',
      'Automatically discovered from Bethesda Creations.': 'Автоматически найдено в Bethesda Creations.',
      'Auto Discovered': 'Автообнаружено'
    }
  };

  function lang() {
    const html = document.documentElement.lang;
    if (['zh-CN', 'zh-TW', 'ja', 'ko', 'ru', 'en'].includes(html)) return html;
    const value = localStorage.getItem('townggSiteLang');
    return ['zh-CN', 'zh-TW', 'ja', 'ko', 'ru'].includes(value) ? value : 'en';
  }

  function t(key, replacements = {}) {
    let value = translations[lang()]?.[key] || translations.en?.[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, replacement);
    });
    return value;
  }

  function parseTimestamp(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatDashboardTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return raw;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
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
    target.textContent = t('Updated', { time: formatDashboardTime(latest) });
    target.title = t('Latest Bethesda Creations browser capture timestamp.');
  }

  function localizeAutoDiscoveredCopy() {
    document.querySelectorAll('.project-card .card-desc, .project-card .tag').forEach((node) => {
      const original = node.dataset.i18nOriginal || node.textContent.trim();
      node.dataset.i18nOriginal = original;
      if (original === 'Automatically discovered from Bethesda Creations.' || original === 'Auto Discovered') {
        node.textContent = t(original);
      }
    });
  }

  function installCreationsMeta() {
    localizeAutoDiscoveredCopy();
    updateCreationsTimestamp();
    localizeAutoDiscoveredCopy();
  }

  window.addEventListener('DOMContentLoaded', () => {
    const target = document.querySelector('[data-creations-mods]') || document.body;
    const observer = new MutationObserver(installCreationsMeta);
    observer.observe(target, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.language-option[data-lang]')) window.setTimeout(installCreationsMeta, 90);
    });

    window.setTimeout(installCreationsMeta, 300);
    window.setTimeout(installCreationsMeta, 1200);
    window.setTimeout(installCreationsMeta, 2200);
  });
})();