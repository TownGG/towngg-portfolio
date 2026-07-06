(() => {
  const LANG_KEY = "townggSiteLang";
  const supported = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const labels = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };
  const nav = {
    "zh-CN": { Home: "首页", Mods: "模组", Gallery: "画廊", "Personal Logs": "个人日志", "Message Board": "留言板", About: "关于", Admin: "后台" },
    "zh-TW": { Home: "首頁", Mods: "模組", Gallery: "畫廊", "Personal Logs": "個人日誌", "Message Board": "留言板", About: "關於", Admin: "後台" },
    ja: { Home: "ホーム", Mods: "Mods", Gallery: "ギャラリー", "Personal Logs": "個人ログ", "Message Board": "メッセージボード", About: "概要", Admin: "管理" },
    ko: { Home: "홈", Mods: "모드", Gallery: "갤러리", "Personal Logs": "개인 로그", "Message Board": "메시지 보드", About: "소개", Admin: "관리" },
    ru: { Home: "Главная", Mods: "Моды", Gallery: "Галерея", "Personal Logs": "Личные записи", "Message Board": "Доска сообщений", About: "О проекте", Admin: "Админ" }
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

  function injectStableStyle() {
    if (document.getElementById("towngg-header-stable-style")) return;
    const style = document.createElement("style");
    style.id = "towngg-header-stable-style";
    style.textContent = ".nav{display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr);align-items:center}.nav .brand{justify-self:start}.nav .nav-links{justify-self:center}.nav .nav-toggle{justify-self:end}.nav .language-switcher{justify-self:end}.language-switcher{position:relative}.language-button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:800}.language-menu{position:absolute;top:calc(100% + 10px);right:0;z-index:30;display:grid;min-width:168px;padding:8px;border:1px solid var(--line);border-radius:16px;background:rgba(8,12,18,.94);box-shadow:var(--shadow);backdrop-filter:blur(18px);opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .18s ease,transform .18s ease}.language-switcher.is-open .language-menu{opacity:1;pointer-events:auto;transform:translateY(0)}.language-option{min-height:38px;padding:0 12px;border:1px solid transparent;border-radius:12px;background:transparent;color:#c7d4e3;cursor:pointer;text-align:left;font:inherit;font-size:13px;font-weight:800}@media(max-width:980px){.nav{display:flex;align-items:center;gap:6px}.language-switcher{margin-left:auto;margin-right:0;justify-self:auto}.nav-toggle{order:4;margin-left:0}.nav-links{right:0}.site-header .language-switcher .language-button{width:44px;height:44px;min-height:44px;padding:0}.site-header .language-switcher .language-button-label{display:none}}";
    document.head.appendChild(style);
  }

  function syncHeaderLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dataset.siteLang = lang;
    const dictionary = nav[lang];
    document.querySelectorAll(".site-header .nav-links a").forEach((link) => {
      const original = link.dataset.i18nOriginal || link.textContent.trim();
      link.dataset.i18nOriginal = original;
      if (dictionary?.[original]) link.textContent = dictionary[original];
    });
    const label = document.querySelector(".language-button-label");
    if (label) label.textContent = labels[lang] || labels.en;
    document.querySelectorAll(".language-option[data-lang]").forEach((option) => {
      const optionLang = option.dataset.lang;
      option.textContent = `${optionLang === lang ? "✓ " : ""}${labels[optionLang] || optionLang}`;
      option.classList.toggle("is-active", optionLang === lang);
    });
  }

  injectStableStyle();
  syncHeaderLanguage(preferredLanguage());
})();