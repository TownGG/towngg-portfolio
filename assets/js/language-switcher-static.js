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

  function ensureLanguageOptions(switcher) {
    const menu = switcher.querySelector(".language-menu");
    if (!menu) return;
    const existing = new Set([...menu.querySelectorAll(".language-option[data-lang]")].map((option) => option.dataset.lang));
    supported.forEach((code) => {
      if (existing.has(code)) return;
      const option = document.createElement("button");
      option.className = "language-option";
      option.type = "button";
      option.dataset.lang = code;
      option.setAttribute("role", "menuitem");
      option.textContent = labels[code] || code;
      menu.appendChild(option);
    });
  }

  function updateSwitcher(lang) {
    const label = document.querySelector(".language-button-label");
    if (label) label.textContent = labels[lang] || labels.en;
    document.querySelectorAll(".language-option[data-lang]").forEach((option) => {
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

  function bindDropdown(switcher) {
    if (switcher.dataset.staticLanguageReady === "true") return;
    switcher.dataset.staticLanguageReady = "true";
    const button = switcher.querySelector(".language-button");

    button?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = !switcher.classList.contains("is-open");
      switcher.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    }, true);

    button?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    switcher.addEventListener("click", (event) => {
      const option = event.target.closest(".language-option[data-lang]");
      if (!option) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setLanguage(option.dataset.lang);
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
    }, true);

    document.addEventListener("pointerdown", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
    });
  }

  function init() {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher) return;
    ensureLanguageOptions(switcher);
    updateSwitcher(currentLanguage());
    bindDropdown(switcher);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();