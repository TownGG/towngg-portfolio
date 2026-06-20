(() => {
  const LANG_KEY = "townggSiteLang";
  const supported = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const labels = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };
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
    "zh-TW": {
      Home: "首頁",
      Mods: "模組",
      Gallery: "畫廊",
      "Personal Logs": "個人日誌",
      "Message Board": "留言板",
      About: "關於",
      Admin: "後台"
    },
    ja: {
      Home: "ホーム",
      Mods: "Mods",
      Gallery: "ギャラリー",
      "Personal Logs": "個人ログ",
      "Message Board": "メッセージボード",
      About: "概要",
      Admin: "管理"
    },
    ko: {
      Home: "홈",
      Mods: "모드",
      Gallery: "갤러리",
      "Personal Logs": "개인 로그",
      "Message Board": "메시지 보드",
      About: "소개",
      Admin: "관리"
    },
    ru: {
      Home: "Главная",
      Mods: "Моды",
      Gallery: "Галерея",
      "Personal Logs": "Личные записи",
      "Message Board": "Доска сообщений",
      About: "О проекте",
      Admin: "Админ"
    }
  };

  function preferredLanguage() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (supported.includes(stored)) return stored;
    } catch {}
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh-tw") || browser.startsWith("zh-hk") || browser.startsWith("zh-mo")) return "zh-TW";
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    if (browser.startsWith("ko")) return "ko";
    if (browser.startsWith("ru")) return "ru";
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
