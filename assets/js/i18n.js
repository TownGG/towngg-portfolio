(() => {
  const LANG_KEY = "townggSiteLang";
  const languages = ["en", "zh-CN", "ja"];
  const labels = { en: "English", "zh-CN": "简体中文", ja: "日本語" };

  const dict = {
    "zh-CN": {
      "Home": "首页", "Mods": "模组", "Gallery": "画廊", "Personal Logs": "个人日志", "Message Board": "留言板", "About": "关于", "Admin": "后台",
      "View Mods": "查看模组", "Explore Gallery": "浏览画廊", "Leave a Message": "留言", "Donate": "赞助",
      "Total Downloads": "总下载量", "Community Likes": "社区点赞", "Published Mods": "已发布模组", "Creations Plays": "Creations 游玩数",
      "Latest Logs": "最新日志", "All Logs": "全部日志", "Featured Release": "精选发布", "Signature Starfield Experience": "代表性星空体验",
      "Selected Mods": "精选模组", "Nexus Releases": "Nexus 发布", "Original Art": "原创美术", "Concept Gallery Preview": "概念画廊预览", "Open Gallery": "打开画廊",
      "Community Notes": "社区留言", "Visit Message Board": "进入留言板", "Public Feedback": "公开反馈", "Contact": "联系", "Social Links": "社交链接",
      "MOD Archive": "模组档案", "Nexus Telemetry": "Nexus 数据", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Mods 发布数据，包含每日下载、总下载和点赞。",
      "Trend": "趋势", "Daily downloads": "每日下载", "Total downloads": "总下载", "Unique downloads": "唯一下载", "Endorsements": "点赞", "All releases": "全部发布", "Nexus Details": "Nexus 明细",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creation 数据", "Latest Bethesda Creations stats.": "最新 Bethesda Creations 数据。",
      "Creations Ranking": "Creations 排名", "Snapshot from Bethesda Creations stats.": "来自 Bethesda Creations 数据的快照。", "Creations Details": "Creations 明细",
      "All": "全部", "Quest": "任务", "Gameplay": "玩法", "Clothing": "服装", "Translation": "翻译", "Filter": "筛选",
      "Original Art Gallery": "原创美术画廊", "Concept Art": "概念设计", "In-Game Screenshots": "游戏截图",
      "About TownGG": "关于 TownGG", "Profile": "简介", "Creator Direction": "创作方向", "Workflow": "工作流程", "Production Workflow": "制作流程", "Concept Design": "概念设计", "Asset Creation": "资产制作", "Integration": "集成实现", "Testing": "测试",
      "Site Telemetry": "站点数据", "Portfolio Traffic": "官网流量", "Visits": "访问量", "Requests": "请求数", "Bandwidth Served": "带宽用量", "Cache Hit Rate": "缓存命中率", "7-Day Visits Trend": "7 日访问趋势", "Loading": "加载中", "Loading telemetry...": "正在加载站点数据...",
      "Community Terminal": "社区终端", "Public Board": "公开留言板", "Community Messages": "社区留言", "Comments": "评论", "Discussion": "讨论",
      "Active Projects": "进行中项目", "Latest Entry": "最新条目", "Total Notes": "日志总数", "Journal": "日志", "Recent Milestones": "近期里程碑", "Timeline": "时间线",
      "Read More": "阅读全文", "Previous Article": "上一篇", "Next Article": "下一篇", "Back to Personal Logs": "返回个人日志",
      "Likes": "点赞", "Downloads": "下载", "Plays": "游玩", "Library Adds": "加入库", "Views": "浏览", "Daily": "每日", "Total": "总计", "Unique": "唯一", "Endorse": "点赞", "Creation": "Creation"
    },
    ja: {
      "Home": "ホーム", "Mods": "Mods", "Gallery": "ギャラリー", "Personal Logs": "個人ログ", "Message Board": "メッセージボード", "About": "概要", "Admin": "管理",
      "View Mods": "Modsを見る", "Explore Gallery": "ギャラリーを見る", "Leave a Message": "メッセージを残す", "Donate": "支援",
      "Total Downloads": "総ダウンロード", "Community Likes": "コミュニティいいね", "Published Mods": "公開済みMods", "Creations Plays": "Creationsプレイ数",
      "Latest Logs": "最新ログ", "All Logs": "すべてのログ", "Featured Release": "注目リリース", "Signature Starfield Experience": "代表的なStarfield体験",
      "Selected Mods": "選択されたMods", "Nexus Releases": "Nexusリリース", "Original Art": "オリジナルアート", "Concept Gallery Preview": "コンセプトギャラリー プレビュー", "Open Gallery": "ギャラリーを開く",
      "Community Notes": "コミュニティノート", "Visit Message Board": "メッセージボードへ", "Public Feedback": "公開フィードバック", "Contact": "連絡先", "Social Links": "ソーシャルリンク",
      "MOD Archive": "MODアーカイブ", "Nexus Telemetry": "Nexusデータ", "Nexus Mods releases with daily downloads, total downloads and endorsements.": "Nexus Modsのリリースデータ、日別ダウンロード、総ダウンロード、支持数を表示します。",
      "Trend": "トレンド", "Daily downloads": "日別ダウンロード", "Total downloads": "総ダウンロード", "Unique downloads": "ユニークダウンロード", "Endorsements": "支持数", "All releases": "すべてのリリース", "Nexus Details": "Nexus詳細",
      "Bethesda Creations": "Bethesda Creations", "Creation Metrics": "Creationデータ", "Latest Bethesda Creations stats.": "最新のBethesda Creationsデータ。",
      "Creations Ranking": "Creationsランキング", "Snapshot from Bethesda Creations stats.": "Bethesda Creationsデータのスナップショット。", "Creations Details": "Creations詳細",
      "All": "すべて", "Quest": "クエスト", "Gameplay": "ゲームプレイ", "Clothing": "衣装", "Translation": "翻訳", "Filter": "フィルター",
      "Original Art Gallery": "オリジナルアートギャラリー", "Concept Art": "コンセプトアート", "In-Game Screenshots": "ゲーム内スクリーンショット",
      "About TownGG": "TownGGについて", "Profile": "プロフィール", "Creator Direction": "制作方針", "Workflow": "ワークフロー", "Production Workflow": "制作ワークフロー", "Concept Design": "コンセプト設計", "Asset Creation": "アセット制作", "Integration": "実装", "Testing": "テスト",
      "Site Telemetry": "サイトデータ", "Portfolio Traffic": "ポートフォリオ流入", "Visits": "訪問数", "Requests": "リクエスト", "Bandwidth Served": "配信帯域", "Cache Hit Rate": "キャッシュ率", "7-Day Visits Trend": "7日間の訪問トレンド", "Loading": "読み込み中", "Loading telemetry...": "サイトデータを読み込み中...",
      "Community Terminal": "コミュニティ端末", "Public Board": "公開ボード", "Community Messages": "コミュニティメッセージ", "Comments": "コメント", "Discussion": "ディスカッション",
      "Active Projects": "進行中プロジェクト", "Latest Entry": "最新エントリー", "Total Notes": "ログ総数", "Journal": "ジャーナル", "Recent Milestones": "最近のマイルストーン", "Timeline": "タイムライン",
      "Read More": "続きを読む", "Previous Article": "前の記事", "Next Article": "次の記事", "Back to Personal Logs": "個人ログへ戻る",
      "Likes": "いいね", "Downloads": "ダウンロード", "Plays": "プレイ", "Library Adds": "ライブラリ追加", "Views": "閲覧", "Daily": "日別", "Total": "合計", "Unique": "ユニーク", "Endorse": "支持", "Creation": "Creation"
    }
  };

  const heroCopy = {
    home: {
      en: ["TownGG", "Creator Hub", "Starfield gameplay systems, immersive world interaction, NASA-punk equipment design and original sci-fi concept art."],
      "zh-CN": ["TownGG", "创作者中心", "星空玩法系统、沉浸式世界互动、NASA-punk 装备设计与原创科幻概念美术。"],
      ja: ["TownGG", "クリエイターハブ", "Starfield向けゲームプレイシステム、没入型ワールドインタラクション、NASA-punk装備デザイン、オリジナルSFコンセプトアート。"]
    },
    mods: {
      en: ["Starfield", "Mods", "Full catalog of gameplay systems, world interaction mods, weapons, outfits and character customization work."],
      "zh-CN": ["Starfield", "模组", "完整收录玩法系统、世界互动模组、武器、服装与角色自定义作品。"],
      ja: ["Starfield", "Mods", "ゲームプレイシステム、ワールドインタラクション、武器、衣装、キャラクターカスタマイズ作品の一覧。"]
    },
    gallery: {
      en: ["Concept", "Design", "A dedicated place for original paintings, character studies, weapon concepts, UI moods and environment direction."],
      "zh-CN": ["概念", "设计", "收录原创绘画、角色设定、武器概念、UI 情绪板与环境方向。"],
      ja: ["コンセプト", "デザイン", "オリジナル絵画、キャラクター研究、武器コンセプト、UIムード、環境デザインの保管場所。"]
    },
    about: {
      en: ["Mod Creator", "CUP Founder", "I am the creator of the Cassilia Universe Project (CUP), an original Starfield mod series centered around Cassilia, Terminus and the stories that connect them. CUP is built to expand Starfield with lore-friendly characters, weapons, outfits and future story-driven adventures that feel like a natural extension of Bethesda's universe."],
      "zh-CN": ["模组作者", "CUP 创始人", "我是 Cassilia Universe Project（CUP）的创作者，这是一个围绕 Cassilia、Terminus 以及相关故事展开的原创 Starfield 模组系列。"],
      ja: ["Mod制作者", "CUP創設者", "Cassilia、Terminus、そして関連する物語を中心に展開するオリジナルStarfield Modシリーズ、Cassilia Universe Project（CUP）の制作者です。"]
    },
    "message-board": {
      en: ["Message", "Board", "Leave feedback, ideas, collaboration notes or requests for future Starfield releases."],
      "zh-CN": ["留言", "板", "留下反馈、想法、合作信息，或对未来 Starfield 作品的需求。"],
      ja: ["メッセージ", "ボード", "フィードバック、アイデア、コラボ相談、今後のStarfieldリリースへのリクエストを残せます。"]
    },
    "dev-log": {
      en: ["Personal", "Logs", "Thoughts, development stories and random moments from TownGG."],
      "zh-CN": ["个人", "日志", "TownGG 的想法、开发故事与日常片段。"],
      ja: ["個人", "ログ", "TownGGの考え、開発ストーリー、日々の小さな記録。"]
    }
  };

  function pageId() {
    if (document.body.dataset.page) return document.body.dataset.page;
    const file = location.pathname.split("/").pop().replace(".html", "") || "home";
    return file === "index" ? "home" : file;
  }

  function preferredLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    if (languages.includes(stored)) return stored;
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    return "en";
  }

  function injectStyle() {
    if (document.getElementById("towngg-i18n-style")) return;
    const style = document.createElement("style");
    style.id = "towngg-i18n-style";
    style.textContent = `
      .nav { display:grid; grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr); }
      .nav .brand{justify-self:start}.nav .nav-links{justify-self:center}.nav .nav-toggle{justify-self:end}
      .language-switcher{position:relative;justify-self:end}.language-button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:800}.language-button:hover,.language-switcher.is-open .language-button{border-color:var(--line-blue);background:rgba(125,216,255,.08)}
      .language-menu{position:absolute;top:calc(100% + 10px);right:0;z-index:30;display:grid;min-width:168px;padding:8px;border:1px solid var(--line);border-radius:16px;background:rgba(8,12,18,.94);box-shadow:var(--shadow);backdrop-filter:blur(18px);opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .18s ease,transform .18s ease}.language-switcher.is-open .language-menu{opacity:1;pointer-events:auto;transform:translateY(0)}
      .language-option{min-height:38px;padding:0 12px;border:1px solid transparent;border-radius:12px;background:transparent;color:#c7d4e3;cursor:pointer;text-align:left;font:inherit;font-size:13px;font-weight:800}.language-option:hover,.language-option.is-active{border-color:var(--line-blue);background:rgba(125,216,255,.08);color:var(--text)}
      @media(max-width:980px){.nav{display:flex;align-items:center;gap:6px}.language-switcher{margin-left:auto;margin-right:0;justify-self:auto;position:relative}.nav-toggle{order:4;margin-left:0}.nav-links{right:0}.site-header .language-switcher .language-button{width:44px;height:44px;min-height:44px;padding:0;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;display:inline-flex;align-items:center;justify-content:center;color:var(--text);gap:0}.site-header .language-switcher .language-button:hover,.site-header .language-switcher.is-open .language-button{border:0!important;background:transparent!important;box-shadow:none!important;color:#8fe7ff}.site-header .language-switcher .language-button>span{display:none!important}.site-header .language-switcher .language-button::before{content:"";display:block;width:22px;height:22px;background:currentColor;-webkit-mask:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z"/></svg>') center/contain no-repeat;mask:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z"/></svg>') center/contain no-repeat}.site-header .language-switcher .language-menu{top:calc(100% + 8px);right:-4px}}@media(max-width:520px){.site-header .language-switcher .language-button{width:44px;height:44px;min-height:44px;padding:0}}
    `;
    document.head.appendChild(style);
  }

  function renderSwitcher() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector(".language-switcher")) return;
    const switcher = document.createElement("div");
    switcher.className = "language-switcher";
    switcher.innerHTML = `<button class="language-button" type="button" aria-haspopup="true" aria-expanded="false"><span aria-hidden="true">🌐</span><span class="language-button-label"></span><span aria-hidden="true">▾</span></button><div class="language-menu" role="menu">${languages.map((code) => `<button class="language-option" type="button" data-lang="${code}" role="menuitem"></button>`).join("")}</div>`;
    nav.appendChild(switcher);
    const button = switcher.querySelector(".language-button");
    button.addEventListener("click", () => {
      const open = switcher.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    });
    switcher.addEventListener("click", (event) => {
      const option = event.target.closest("[data-lang]");
      if (!option) return;
      setLanguage(option.dataset.lang);
      switcher.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function updateSwitcher(lang) {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher) return;
    switcher.querySelector(".language-button-label").textContent = labels[lang] || labels.en;
    switcher.querySelectorAll("[data-lang]").forEach((option) => {
      option.textContent = `${option.dataset.lang === lang ? "✓ " : ""}${labels[option.dataset.lang]}`;
      option.classList.toggle("is-active", option.dataset.lang === lang);
    });
  }

  function translateSimpleText(lang) {
    const map = dict[lang] || {};
    document.querySelectorAll("a,button,div,p,h2,h3,h4,span,th,option,label,strong").forEach((node) => {
      if (node.closest(".language-switcher")) return;
      if (node.children.length) return;
      const current = node.textContent.trim();
      if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = current;
      const original = node.dataset.i18nOriginal;
      node.textContent = lang === "en" ? original : (map[original] || original);
    });
  }

  function applyHero(lang) {
    const copy = heroCopy[pageId()]?.[lang];
    if (!copy) return;
    const title = document.querySelector(".hero-content h1");
    const subtitle = document.querySelector(".hero-sub,.page-sub");
    if (title) title.innerHTML = `${copy[0]}<br><span>${copy[1]}</span>`;
    if (subtitle) subtitle.textContent = copy[2];
  }

  function syncGiscusLanguage(lang) {
    const value = lang === "ja" ? "ja" : lang === "zh-CN" ? "zh-CN" : "en";
    document.querySelectorAll('script[src*="giscus.app/client.js"]').forEach((script) => { script.dataset.lang = value; });
  }

  function setLanguage(lang) {
    const next = languages.includes(lang) ? lang : "en";
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    renderSwitcher();
    updateSwitcher(next);
    translateSimpleText(next);
    applyHero(next);
    syncGiscusLanguage(next);
  }

  function setupObserver() {
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      window.setTimeout(() => {
        pending = false;
        setLanguage(preferredLanguage());
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    injectStyle();
    setLanguage(preferredLanguage());
    setupObserver();
    window.TownGGI18n = { setLanguage };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
