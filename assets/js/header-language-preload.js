(() => {
  const LANG_KEY = "townggSiteLang";
  const supported = ["en", "zh-CN", "ja"];
  const labels = { en: "English", "zh-CN": "简体中文", ja: "日本語" };
  const nav = {
    "zh-CN": {
      Home: "首页",
      Mods: "模组",
      Gallery: "画廊",
      "Personal Logs": "个人日志",
      "Message Board": "留言板",
      About: "关于",
      Admin: "后台"
    },
    ja: {
      Home: "ホーム",
      Mods: "Mods",
      Gallery: "ギャラリー",
      "Personal Logs": "個人ログ",
      "Message Board": "メッセージボード",
      About: "概要",
      Admin: "管理"
    }
  };

  function preferredLanguage() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (supported.includes(stored)) return stored;
    } catch {}
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    return "en";
  }

  const lang = preferredLanguage();
  document.documentElement.lang = lang;
  document.documentElement.dataset.siteLang = lang;

  const dictionary = nav[lang];
  if (dictionary) {
    document.querySelectorAll(".site-header .nav-links a").forEach((link) => {
      const original = link.dataset.i18nOriginal || link.textContent.trim();
      link.dataset.i18nOriginal = original;
      if (dictionary[original]) link.textContent = dictionary[original];
    });
  }

  const label = document.querySelector(".language-button-label");
  if (label) label.textContent = labels[lang] || labels.en;

  document.querySelectorAll(".language-option[data-lang]").forEach((option) => {
    const optionLang = option.dataset.lang;
    option.textContent = `${optionLang === lang ? "✓ " : ""}${labels[optionLang] || optionLang}`;
    option.classList.toggle("is-active", optionLang === lang);
  });
})();
