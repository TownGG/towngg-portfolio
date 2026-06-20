(() => {
  const LANG_KEY = "townggSiteLang";
  const supported = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const labels = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };

  function currentLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    if (supported.includes(stored)) return stored;
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh-tw") || browser.startsWith("zh-hk") || browser.startsWith("zh-mo")) return "zh-TW";
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    if (browser.startsWith("ko")) return "ko";
    if (browser.startsWith("ru")) return "ru";
    return "en";
  }

  function syncHtmlLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dataset.siteLang = lang;
  }

  function updateSwitcher(lang) {
    const label = document.querySelector(".language-button-label");
    if (label) label.textContent = labels[lang] || labels.en;
    document.querySelectorAll("[data-lang]").forEach((option) => {
      option.textContent = `${option.dataset.lang === lang ? "✓ " : ""}${labels[option.dataset.lang] || option.dataset.lang}`;
      option.classList.toggle("is-active", option.dataset.lang === lang);
    });
  }

  function setLanguage(lang) {
    const next = supported.includes(lang) ? lang : "en";
    localStorage.setItem(LANG_KEY, next);
    syncHtmlLanguage(next);
    updateSwitcher(next);
    if (window.TownGGI18n?.setLanguage) window.TownGGI18n.setLanguage(next);
  }

  function init() {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher || switcher.dataset.staticLanguageReady === "true") return;
    switcher.dataset.staticLanguageReady = "true";
    const button = switcher.querySelector(".language-button");
    button?.addEventListener("click", () => switcher.classList.toggle("is-open"));
    switcher.addEventListener("click", (event) => {
      const option = event.target.closest("[data-lang]");
      if (!option) return;
      setLanguage(option.dataset.lang);
      switcher.classList.remove("is-open");
    });
    document.addEventListener("click", (event) => {
      if (!switcher.contains(event.target)) switcher.classList.remove("is-open");
    });
    setLanguage(currentLanguage());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
