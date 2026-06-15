// Simple Vanilla i18n system for TownGG portfolio
// Supports 7-language JSON locale loading

const I18N = (() => {
  const supportedLangs = ['en','zh','ja','ko','ru','fr','de'];

  let messages = {};
  let currentLang = 'en';

  function detectLang() {
    const pathLang = location.pathname.split('/')[1];
    if (supportedLangs.includes(pathLang)) return pathLang;

    const browser = (navigator.language || 'en').toLowerCase();
    if (browser.startsWith('zh')) return 'zh';
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('ru')) return 'ru';
    if (browser.startsWith('fr')) return 'fr';
    if (browser.startsWith('de')) return 'de';

    return 'en';
  }

  async function load(lang) {
    currentLang = lang;
    const res = await fetch(`./locales/${lang}.json`);
    messages = await res.json();
    apply();
  }

  function t(key) {
    return messages[key] || key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });
  }

  function init() {
    const lang = detectLang();
    load(lang);
  }

  return { init, load, t, getLang: () => currentLang };
})();

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
});