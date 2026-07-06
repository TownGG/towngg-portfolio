(() => {
  // Creations latest sorting is handled by mod-list-sort.js.

  const STYLE_ID = "trend-average-pill-polish";
  const PILL_SELECTOR = ".telemetry-pill.telemetry-pill-heading";
  const LANG_KEY = "townggSiteLang";
  const SUPPORTED_LANGS = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const LANG_LABELS = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };

  function lang() {
    const value = localStorage.getItem(LANG_KEY);
    return SUPPORTED_LANGS.includes(value) ? value : "en";
  }

  function labelText() {
    switch (lang()) {
      case "zh-CN": return "近7日均值";
      case "zh-TW": return "近7日均值";
      case "ja": return "7日平均";
      case "ko": return "7일 평균";
      case "ru": return "Среднее 7 дн.";
      default: return "7-Day Avg";
    }
  }

  function separator() {
    return ["zh-CN", "zh-TW", "ja"].includes(lang()) ? "：" : ": ";
  }

  function extractValue(text) {
    const matches = String(text || "").match(/\d[\d,.]*/g);
    return matches?.at(-1) || "—";
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .telemetry-pill.telemetry-pill-heading {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
        min-height: 34px !important;
        padding: 7px 13px 6px !important;
        border: 1px solid rgba(125, 216, 255, .34) !important;
        border-radius: 999px !important;
        background:
          radial-gradient(circle at top right, rgba(125, 216, 255, .18), transparent 58%),
          linear-gradient(135deg, rgba(255, 255, 255, .072), rgba(255, 255, 255, .022)),
          rgba(8, 12, 18, .56) !important;
        box-shadow: 0 0 22px rgba(125, 216, 255, .11), inset 0 1px 0 rgba(255, 255, 255, .08) !important;
        color: #e9f8ff !important;
        font-family: "Rajdhani", "Inter", sans-serif !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        letter-spacing: .02em !important;
        text-transform: none !important;
        text-shadow: 0 0 16px rgba(125, 216, 255, .18) !important;
      }
      .language-switcher.is-open .language-menu,
      .language-switcher:focus-within .language-menu {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateY(0) !important;
      }

      @media (max-width: 700px) {
        .telemetry-pill.telemetry-pill-heading {
          font-size: 14px !important;
          min-height: 32px !important;
          padding: 7px 12px 6px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function polishPills(root = document) {
    installStyles();
    root.querySelectorAll(PILL_SELECTOR).forEach((pill) => {
      const value = extractValue(pill.textContent);
      const nextText = `${labelText()}${separator()}${value}`;
      if (pill.textContent !== nextText) pill.textContent = nextText;
      pill.setAttribute("aria-label", nextText);
    });
  }

  function ensureFullLanguageOptions() {
    const menu = document.querySelector(".language-switcher .language-menu");
    if (!menu) return;
    const existing = new Set([...menu.querySelectorAll(".language-option[data-lang]")].map((option) => option.dataset.lang));
    SUPPORTED_LANGS.forEach((code) => {
      if (existing.has(code)) return;
      const option = document.createElement("button");
      option.className = "language-option";
      option.type = "button";
      option.dataset.lang = code;
      option.setAttribute("role", "menuitem");
      option.textContent = LANG_LABELS[code] || code;
      menu.appendChild(option);
    });
  }

  function updateLanguageUI(next) {
    document.documentElement.lang = next;
    document.documentElement.dataset.siteLang = next;
    const label = document.querySelector(".language-button-label");
    if (label) label.textContent = LANG_LABELS[next] || LANG_LABELS.en;
    document.querySelectorAll(".language-option[data-lang]").forEach((option) => {
      option.textContent = `${option.dataset.lang === next ? "✓ " : ""}${LANG_LABELS[option.dataset.lang] || option.dataset.lang}`;
      option.classList.toggle("is-active", option.dataset.lang === next);
    });
  }

  function setupLanguageSwitcherGuard() {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher || switcher.dataset.clickGuardReady === "true") return;
    switcher.dataset.clickGuardReady = "true";
    ensureFullLanguageOptions();
    updateLanguageUI(lang());
    const button = switcher.querySelector(".language-button");

    document.addEventListener("pointerdown", (event) => {
      const trigger = event.target.closest(".language-button");
      if (!trigger || !switcher.contains(trigger)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = !switcher.classList.contains("is-open");
      switcher.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    }, true);

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".language-button");
      if (!trigger || !switcher.contains(trigger)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener("click", (event) => {
      const option = event.target.closest(".language-option[data-lang]");
      if (!option || !switcher.contains(option)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = SUPPORTED_LANGS.includes(option.dataset.lang) ? option.dataset.lang : "en";
      localStorage.setItem(LANG_KEY, next);
      updateLanguageUI(next);
      if (window.TownGGI18n?.setLanguage) window.TownGGI18n.setLanguage(next);
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
      window.setTimeout(polishPills, 120);
    }, true);

    document.addEventListener("pointerdown", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
    });
  }

  function boot() {
    polishPills();
    setupLanguageSwitcherGuard();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) polishPills(node);
        });
      });
      polishPills();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    [120, 520, 1500, 2600].forEach((delay) => window.setTimeout(() => {
      polishPills();
      setupLanguageSwitcherGuard();
    }, delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-option[data-lang]")) window.setTimeout(polishPills, 120);
  });
})();