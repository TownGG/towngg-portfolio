// TownGG Cyber i18n System (Starfield UI style)
// 7-language live switch, no refresh

const I18N = (() => {
  const langs = ['en','zh','ja','ko','ru','fr','de'];

  let dict = {};
  let current = localStorage.getItem('lang') || 'en';

  const mapLabel = {
    en: 'EN', zh: '中文', ja: '日本語', ko: '한국어', ru: 'RU', fr: 'FR', de: 'DE'
  };

  function detect() {
    const path = location.pathname.split('/')[1];
    if (langs.includes(path)) return path;

    const b = (navigator.language || 'en').toLowerCase();
    if (b.startsWith('zh')) return 'zh';
    if (b.startsWith('ja')) return 'ja';
    if (b.startsWith('ko')) return 'ko';
    if (b.startsWith('ru')) return 'ru';
    if (b.startsWith('fr')) return 'fr';
    if (b.startsWith('de')) return 'de';
    return 'en';
  }

  async function load(lang) {
    current = lang;
    localStorage.setItem('lang', lang);

    const res = await fetch(`./locales/${lang}.json`);
    dict = await res.json();

    apply();
    updateButton();
  }

  function t(key) {
    return dict[key] || key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerText = t(el.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
  }

  function updateButton() {
    const btn = document.getElementById('langSwitch');
    if (btn) btn.innerHTML = `🌍 ${mapLabel[current] || current.toUpperCase()} ▾`;
  }

  function initUI() {
    const btn = document.getElementById('langSwitch');
    const menu = document.getElementById('langMenu');

    if (!btn || !menu) return;

    // toggle menu
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('active');
    });

    // select language
    menu.querySelectorAll('button[data-lang]').forEach(b => {
      b.addEventListener('click', () => {
        load(b.dataset.lang);
        menu.classList.remove('active');
      });
    });

    // close on outside click
    document.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  }

  function init() {
    const lang = current || detect();
    initUI();
    load(lang);
  }

  return { init, load, t };
})();

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
});