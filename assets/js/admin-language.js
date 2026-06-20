(() => {
  const LANG_KEY = "townggSiteLang";
  const supported = ["en", "zh-CN", "ja"];
  const labels = { en: "English", "zh-CN": "简体中文", ja: "日本語" };
  const dictionary = {
    "zh-CN": {
      "Home": "首页", "Mods": "模组", "Gallery": "画廊", "Personal Logs": "个人日志", "Message Board": "留言板", "About": "关于", "Admin": "后台",
      "TownGG Secure Terminal": "TownGG 安全终端", "Login": "登录", "Admin Key": "后台密钥", "Remember key on this device": "在此设备上记住密钥", "Enter Upload System": "进入上传系统",
      "Hidden Admin Terminal": "隐藏后台终端", "Control Center": "控制中心", "Lock Admin": "锁定后台", "Upload Images": "上传图片", "Image Management": "图片管理", "Community Ops": "社区运营",
      "Access": "访问", "Upload Settings": "上传设置", "Worker connected": "Worker 已连接", "Admin key loaded": "后台密钥已加载", "Session only": "仅本次会话", "Forget Key": "忘记密钥",
      "Upload Type": "上传类型", "In-Game Screenshots": "游戏截图", "Concept Art": "概念设计", "Homepage Featured": "首页精选", "Project Prefix": "项目前缀", "Alt Text Mode": "替代文本模式", "Auto": "自动", "Use custom text for all": "全部使用自定义文本", "Custom Alt Text": "自定义替代文本",
      "Clear": "清空", "Upload": "上传", "Images": "图片", "Drag & Drop": "拖拽上传", "Drop images here": "把图片拖到这里", "Preview": "预览", "Pending Uploads": "待上传图片", "Result": "结果", "Upload Status": "上传状态", "Ready": "就绪", "Ready.": "就绪。",
      "Gallery Manager": "画廊管理", "Category": "分类", "Load Images": "加载图片", "New Message": "新消息", "Load Messages": "加载消息", "Total": "总计", "Pending": "待处理", "Platform": "平台", "All": "全部", "Status": "状态", "New": "新消息", "Drafted": "已起草", "Sent": "已发送", "Copied": "已复制", "Replied": "已回复", "Ignored": "已忽略",
      "Praise": "称赞", "Bug Report": "Bug 反馈", "Feature Request": "功能建议", "Install Question": "安装问题", "AI Criticism": "AI 争议", "Lore Discussion": "剧情讨论", "General": "通用", "Search": "搜索", "Select a message": "选择一条消息", "Manual Import": "手动导入", "Add Reddit / Nexus Message": "添加 Reddit / Nexus 消息", "Mod Name": "模组名称", "Author": "作者", "Source URL": "来源链接", "External Message ID": "外部消息 ID", "Nexus Thread ID": "Nexus 主题 ID", "Original Content": "原始内容", "Save Message": "保存消息"
    },
    ja: {
      "Home": "ホーム", "Mods": "Mods", "Gallery": "ギャラリー", "Personal Logs": "個人ログ", "Message Board": "メッセージボード", "About": "概要", "Admin": "管理",
      "TownGG Secure Terminal": "TownGG セキュア端末", "Login": "ログイン", "Admin Key": "管理キー", "Remember key on this device": "この端末でキーを記憶", "Enter Upload System": "アップロードシステムへ",
      "Hidden Admin Terminal": "非公開管理端末", "Control Center": "コントロールセンター", "Lock Admin": "管理画面をロック", "Upload Images": "画像アップロード", "Image Management": "画像管理", "Community Ops": "コミュニティ運用",
      "Access": "アクセス", "Upload Settings": "アップロード設定", "Worker connected": "Worker接続済み", "Admin key loaded": "管理キー読み込み済み", "Session only": "このセッションのみ", "Forget Key": "キーを削除",
      "Upload Type": "アップロード種別", "In-Game Screenshots": "ゲーム内スクリーンショット", "Concept Art": "コンセプトアート", "Homepage Featured": "ホーム注目画像", "Project Prefix": "プロジェクト接頭辞", "Alt Text Mode": "代替テキスト方式", "Auto": "自動", "Use custom text for all": "すべてカスタムテキストを使用", "Custom Alt Text": "カスタム代替テキスト",
      "Clear": "クリア", "Upload": "アップロード", "Images": "画像", "Drag & Drop": "ドラッグ＆ドロップ", "Drop images here": "ここに画像をドロップ", "Preview": "プレビュー", "Pending Uploads": "アップロード待ち", "Result": "結果", "Upload Status": "アップロード状態", "Ready": "準備完了", "Ready.": "準備完了。",
      "Gallery Manager": "ギャラリー管理", "Category": "カテゴリ", "Load Images": "画像を読み込む", "New Message": "新規メッセージ", "Load Messages": "メッセージ読み込み", "Total": "合計", "Pending": "保留中", "Platform": "プラットフォーム", "All": "すべて", "Status": "状態", "New": "新規", "Drafted": "下書き済み", "Sent": "送信済み", "Copied": "コピー済み", "Replied": "返信済み", "Ignored": "無視",
      "Praise": "称賛", "Bug Report": "バグ報告", "Feature Request": "機能要望", "Install Question": "インストール質問", "AI Criticism": "AI批判", "Lore Discussion": "ロア議論", "General": "一般", "Search": "検索", "Select a message": "メッセージを選択", "Manual Import": "手動インポート", "Add Reddit / Nexus Message": "Reddit / Nexus メッセージを追加", "Mod Name": "Mod名", "Author": "作者", "Source URL": "ソースURL", "External Message ID": "外部メッセージID", "Nexus Thread ID": "NexusスレッドID", "Original Content": "元の内容", "Save Message": "メッセージ保存"
    }
  };

  function currentLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    if (supported.includes(stored)) return stored;
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("zh")) return "zh-CN";
    if (browser.startsWith("ja")) return "ja";
    return "en";
  }

  function injectStyle() {
    if (document.getElementById("admin-language-style")) return;
    const style = document.createElement("style");
    style.id = "admin-language-style";
    style.textContent = `.nav{display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr)}.nav .brand{justify-self:start}.nav .nav-links{justify-self:center}.admin-language-switcher{position:relative;justify-self:end}.admin-language-button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:800}.admin-language-menu{position:absolute;top:calc(100% + 10px);right:0;z-index:40;display:none;min-width:168px;padding:8px;border:1px solid var(--line);border-radius:16px;background:rgba(8,12,18,.96);box-shadow:var(--shadow)}.admin-language-switcher.is-open .admin-language-menu{display:grid}.admin-language-option{min-height:38px;padding:0 12px;border:1px solid transparent;border-radius:12px;background:transparent;color:#c7d4e3;cursor:pointer;text-align:left;font:inherit;font-size:13px;font-weight:800}.admin-language-option:hover,.admin-language-option.is-active{border-color:var(--line-blue);background:rgba(125,216,255,.08);color:var(--text)}@media(max-width:980px){.nav{display:flex}.admin-language-switcher{margin-left:auto}.nav-toggle{order:4}}`;
    document.head.appendChild(style);
  }

  function renderSwitcher(lang) {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector(".admin-language-switcher")) return;
    const switcher = document.createElement("div");
    switcher.className = "admin-language-switcher";
    switcher.innerHTML = `<button class="admin-language-button" type="button"><span>🌐</span><span data-admin-language-label></span><span>▾</span></button><div class="admin-language-menu">${supported.map((code) => `<button class="admin-language-option" type="button" data-admin-lang="${code}"></button>`).join("")}</div>`;
    nav.appendChild(switcher);
    switcher.querySelector(".admin-language-button").addEventListener("click", () => switcher.classList.toggle("is-open"));
    switcher.addEventListener("click", (event) => {
      const option = event.target.closest("[data-admin-lang]");
      if (!option) return;
      setLanguage(option.dataset.adminLang);
      switcher.classList.remove("is-open");
    });
    document.addEventListener("click", (event) => {
      if (!switcher.contains(event.target)) switcher.classList.remove("is-open");
    });
  }

  function updateSwitcher(lang) {
    const label = document.querySelector("[data-admin-language-label]");
    if (label) label.textContent = labels[lang] || labels.en;
    document.querySelectorAll("[data-admin-lang]").forEach((option) => {
      option.textContent = `${option.dataset.adminLang === lang ? "✓ " : ""}${labels[option.dataset.adminLang]}`;
      option.classList.toggle("is-active", option.dataset.adminLang === lang);
    });
  }

  function translateElement(element, lang) {
    if (!element || element.closest(".admin-language-switcher")) return;
    if (element.closest(".community-inbox-list, [data-community-detail], .upload-preview-list, .admin-manager-grid") && !element.classList.contains("empty-state")) return;
    if (element.children.length) return;
    const raw = element.textContent.trim();
    if (!raw) return;
    if (!element.dataset.adminLanguageOriginal) element.dataset.adminLanguageOriginal = raw;
    const original = element.dataset.adminLanguageOriginal;
    const next = lang === "en" ? original : (dictionary[lang]?.[original] || original);
    if (element.textContent !== next) element.textContent = next;
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll(".admin-upload-page a,.admin-upload-page button,.admin-upload-page label span,.admin-upload-page option,.admin-upload-page p,.admin-upload-page h2,.admin-upload-page h3,.admin-upload-page div.eyebrow,.admin-upload-page div.empty-state,.admin-upload-page small,.admin-upload-page strong,.admin-upload-page span.upload-status-message,.admin-upload-page span.community-status-line,.admin-upload-page span.admin-status-pill").forEach((node) => translateElement(node, lang));
    updateSwitcher(lang);
  }

  function setLanguage(lang) {
    const next = supported.includes(lang) ? lang : "en";
    localStorage.setItem(LANG_KEY, next);
    applyLanguage(next);
  }

  function init() {
    injectStyle();
    const lang = currentLanguage();
    renderSwitcher(lang);
    setLanguage(lang);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
