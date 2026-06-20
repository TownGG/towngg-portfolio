(() => {
  const LANG_KEY = "townggSiteLang";
  let isApplying = false;

  const dictionaries = {
    "zh-CN": {
      "TownGG Secure Terminal": "TownGG 安全终端",
      "Admin": "后台",
      "Login": "登录",
      "Enter your admin upload key once. Choose remember key to unlock this upload page automatically next time on this device.": "输入一次后台密钥。勾选记住密钥后，下次在这台设备上会自动解锁上传页面。",
      "Admin Key": "后台密钥",
      "Remember key on this device": "在此设备上记住密钥",
      "Enter Upload System": "进入上传系统",
      "The saved key is stored only in this browser. Use this only on your own device.": "保存的密钥只会存储在当前浏览器。请只在自己的设备上使用。",
      "Hidden Admin Terminal": "隐藏后台终端",
      "Gallery": "画廊",
      "Control Center": "控制中心",
      "Upload gallery assets, manage images, and handle Reddit / Nexus community replies through separate admin modules.": "通过独立后台模块上传画廊资源、管理图片，并处理 Reddit / Nexus 社区回复。",
      "Lock Admin": "锁定后台",
      "Upload Images": "上传图片",
      "Image Management": "图片管理",
      "Community Ops": "社区运营",
      "Access": "访问",
      "Upload Settings": "上传设置",
      "Worker connected": "Worker 已连接",
      "Admin key loaded": "后台密钥已加载",
      "Session only": "仅本次会话",
      "Forget Key": "忘记密钥",
      "Upload Type": "上传类型",
      "In-Game Screenshots": "游戏截图",
      "Concept Art": "概念设计",
      "Homepage Featured": "首页精选",
      "Project Prefix": "项目前缀",
      "Optional. Used for automatic filenames and alt text.": "可选。用于自动文件名和图片替代文本。",
      "Alt Text Mode": "替代文本模式",
      "Auto": "自动",
      "Use custom text for all": "全部使用自定义文本",
      "Custom Alt Text": "自定义替代文本",
      "Clear": "清空",
      "Upload": "上传",
      "Images": "图片",
      "Drag & Drop": "拖拽上传",
      "Drop images here": "把图片拖到这里",
      "or click to select JPG, PNG or WEBP files": "或点击选择 JPG、PNG、WEBP 文件",
      "Browser compression target: max 1920px, JPG quality 0.86": "浏览器压缩目标：最大 1920px，JPG 质量 0.86",
      "Preview": "预览",
      "Pending Uploads": "待上传图片",
      "No images selected yet.": "尚未选择图片。",
      "Result": "结果",
      "Upload Status": "上传状态",
      "Ready": "就绪",
      "Ready.": "就绪。",
      "Select images, then click Upload.": "选择图片后点击上传。",
      "Gallery Manager": "画廊管理",
      "Load existing gallery images, then delete an image together with its JSON record.": "加载现有画廊图片，并可同时删除图片及其 JSON 记录。",
      "Category": "分类",
      "Load Images": "加载图片",
      "Click Load Images to view current gallery records.": "点击加载图片以查看当前画廊记录。",
      "Image records are not loaded yet.": "图片记录尚未加载。",
      "TownGG Social Inbox": "TownGG 社区收件箱",
      "Manage Reddit and Nexus Mods feedback. Reddit can send through API after confirmation; Nexus falls back to copy-and-open when API access is unavailable.": "管理 Reddit 与 Nexus Mods 反馈。Reddit 确认后可通过 API 发送；Nexus API 不可用时会退回到复制并打开原链接。",
      "New Message": "新消息",
      "Load Messages": "加载消息",
      "Total": "总计",
      "Pending": "待处理",
      "Platform": "平台",
      "All": "全部",
      "Status": "状态",
      "New": "新消息",
      "Drafted": "已起草",
      "Sent": "已发送",
      "Copied": "已复制",
      "Replied": "已回复",
      "Ignored": "已忽略",
      "Praise": "称赞",
      "Bug Report": "Bug 反馈",
      "Feature Request": "功能建议",
      "Install Question": "安装问题",
      "AI Criticism": "AI 争议",
      "Lore Discussion": "剧情讨论",
      "General": "通用",
      "Search": "搜索",
      "Messages are not loaded yet.": "消息尚未加载。",
      "Select a message": "选择一条消息",
      "Load or add a Reddit / Nexus message, then generate a safe English reply draft.": "加载或添加 Reddit / Nexus 消息，然后生成安全的英文回复草稿。",
      "Manual Import": "手动导入",
      "Add Reddit / Nexus Message": "添加 Reddit / Nexus 消息",
      "Paste the source comment and URL. For Reddit one-click replies, use a full comment thing ID such as t1_xxxxx.": "粘贴原评论和链接。Reddit 一键回复需要填写完整评论 thing ID，例如 t1_xxxxx。",
      "Mod Name": "模组名称",
      "Author": "作者",
      "Source URL": "来源链接",
      "External Message ID": "外部消息 ID",
      "Nexus Thread ID": "Nexus 主题 ID",
      "Original Content": "原始内容",
      "Save Message": "保存消息"
    },
    ja: {
      "TownGG Secure Terminal": "TownGG セキュア端末",
      "Admin": "管理",
      "Login": "ログイン",
      "Enter your admin upload key once. Choose remember key to unlock this upload page automatically next time on this device.": "管理アップロードキーを入力してください。キーを記憶すると、この端末では次回から自動で解除されます。",
      "Admin Key": "管理キー",
      "Remember key on this device": "この端末でキーを記憶",
      "Enter Upload System": "アップロードシステムへ",
      "The saved key is stored only in this browser. Use this only on your own device.": "保存されたキーはこのブラウザのみに保存されます。自分の端末でのみ使用してください。",
      "Hidden Admin Terminal": "非公開管理端末",
      "Gallery": "ギャラリー",
      "Control Center": "コントロールセンター",
      "Upload gallery assets, manage images, and handle Reddit / Nexus community replies through separate admin modules.": "管理モジュールからギャラリー素材のアップロード、画像管理、Reddit / Nexus の返信対応を行います。",
      "Lock Admin": "管理画面をロック",
      "Upload Images": "画像アップロード",
      "Image Management": "画像管理",
      "Community Ops": "コミュニティ運用",
      "Access": "アクセス",
      "Upload Settings": "アップロード設定",
      "Worker connected": "Worker接続済み",
      "Admin key loaded": "管理キー読み込み済み",
      "Session only": "このセッションのみ",
      "Forget Key": "キーを削除",
      "Upload Type": "アップロード種別",
      "In-Game Screenshots": "ゲーム内スクリーンショット",
      "Concept Art": "コンセプトアート",
      "Homepage Featured": "ホーム注目画像",
      "Project Prefix": "プロジェクト接頭辞",
      "Optional. Used for automatic filenames and alt text.": "任意。自動ファイル名と代替テキストに使用されます。",
      "Alt Text Mode": "代替テキスト方式",
      "Auto": "自動",
      "Use custom text for all": "すべてカスタムテキストを使用",
      "Custom Alt Text": "カスタム代替テキスト",
      "Clear": "クリア",
      "Upload": "アップロード",
      "Images": "画像",
      "Drag & Drop": "ドラッグ＆ドロップ",
      "Drop images here": "ここに画像をドロップ",
      "or click to select JPG, PNG or WEBP files": "またはクリックして JPG、PNG、WEBP を選択",
      "Browser compression target: max 1920px, JPG quality 0.86": "ブラウザ圧縮目標：最大1920px、JPG品質0.86",
      "Preview": "プレビュー",
      "Pending Uploads": "アップロード待ち",
      "No images selected yet.": "画像はまだ選択されていません。",
      "Result": "結果",
      "Upload Status": "アップロード状態",
      "Ready": "準備完了",
      "Ready.": "準備完了。",
      "Select images, then click Upload.": "画像を選択してアップロードをクリックしてください。",
      "Gallery Manager": "ギャラリー管理",
      "Load existing gallery images, then delete an image together with its JSON record.": "既存のギャラリー画像を読み込み、画像とJSONレコードをまとめて削除できます。",
      "Category": "カテゴリ",
      "Load Images": "画像を読み込む",
      "Click Load Images to view current gallery records.": "画像を読み込むをクリックして現在のレコードを表示します。",
      "Image records are not loaded yet.": "画像レコードはまだ読み込まれていません。",
      "TownGG Social Inbox": "TownGG ソーシャル受信箱",
      "Manage Reddit and Nexus Mods feedback. Reddit can send through API after confirmation; Nexus falls back to copy-and-open when API access is unavailable.": "Reddit と Nexus Mods のフィードバックを管理します。Reddit は確認後API送信、Nexus はAPI不可時にコピーして元リンクを開きます。",
      "New Message": "新規メッセージ",
      "Load Messages": "メッセージ読み込み",
      "Total": "合計",
      "Pending": "保留中",
      "Platform": "プラットフォーム",
      "All": "すべて",
      "Status": "状態",
      "New": "新規",
      "Drafted": "下書き済み",
      "Sent": "送信済み",
      "Copied": "コピー済み",
      "Replied": "返信済み",
      "Ignored": "無視",
      "Praise": "称賛",
      "Bug Report": "バグ報告",
      "Feature Request": "機能要望",
      "Install Question": "インストール質問",
      "AI Criticism": "AI批判",
      "Lore Discussion": "ロア議論",
      "General": "一般",
      "Search": "検索",
      "Messages are not loaded yet.": "メッセージはまだ読み込まれていません。",
      "Select a message": "メッセージを選択",
      "Load or add a Reddit / Nexus message, then generate a safe English reply draft.": "Reddit / Nexus メッセージを読み込みまたは追加し、安全な英語返信案を生成します。",
      "Manual Import": "手動インポート",
      "Add Reddit / Nexus Message": "Reddit / Nexus メッセージを追加",
      "Paste the source comment and URL. For Reddit one-click replies, use a full comment thing ID such as t1_xxxxx.": "元コメントとURLを貼り付けます。Redditのワンクリック返信には t1_xxxxx のような完全なIDを使用します。",
      "Mod Name": "Mod名",
      "Author": "作者",
      "Source URL": "ソースURL",
      "External Message ID": "外部メッセージID",
      "Nexus Thread ID": "NexusスレッドID",
      "Original Content": "元の内容",
      "Save Message": "メッセージ保存"
    }
  };

  const placeholders = {
    "zh-CN": {
      "Enter admin upload key": "输入后台上传密钥",
      "Cassilia UC Power Fist in-game screenshot": "Cassilia UC Power Fist 游戏截图",
      "Mod, author, content": "模组、作者、内容",
      "Player name": "玩家名称",
      "https://www.reddit.com/... or https://www.nexusmods.com/...": "https://www.reddit.com/... 或 https://www.nexusmods.com/...",
      "Optional Nexus commentThreadId": "可选 Nexus commentThreadId",
      "Paste the player comment here": "在这里粘贴玩家评论"
    },
    ja: {
      "Enter admin upload key": "管理アップロードキーを入力",
      "Cassilia UC Power Fist in-game screenshot": "Cassilia UC Power Fist ゲーム内スクリーンショット",
      "Mod, author, content": "Mod、作者、内容",
      "Player name": "プレイヤー名",
      "https://www.reddit.com/... or https://www.nexusmods.com/...": "https://www.reddit.com/... または https://www.nexusmods.com/...",
      "Optional Nexus commentThreadId": "任意の Nexus commentThreadId",
      "Paste the player comment here": "プレイヤーコメントをここに貼り付け"
    }
  };

  function currentLang() {
    return localStorage.getItem(LANG_KEY) || document.documentElement.lang || "en";
  }

  function shouldSkip(node) {
    return node.closest(".language-switcher, .community-inbox-list, [data-community-detail], .upload-preview-list, .admin-manager-grid")
      && !node.classList.contains("empty-state");
  }

  function translateNode(node, lang) {
    if (!node || node.nodeType !== 1 || shouldSkip(node) || node.children.length) return;
    const raw = node.textContent.trim();
    if (!raw) return;
    if (!node.dataset.adminI18nOriginal) node.dataset.adminI18nOriginal = raw;
    const original = node.dataset.adminI18nOriginal;
    const next = lang === "en" ? original : (dictionaries[lang]?.[original] || original);
    if (node.textContent !== next) node.textContent = next;
  }

  function translatePlaceholder(node, lang) {
    if (!node.placeholder) return;
    if (!node.dataset.adminI18nPlaceholder) node.dataset.adminI18nPlaceholder = node.placeholder;
    const original = node.dataset.adminI18nPlaceholder;
    const next = lang === "en" ? original : (placeholders[lang]?.[original] || original);
    if (node.placeholder !== next) node.placeholder = next;
  }

  function applyAdminI18n() {
    if (isApplying) return;
    isApplying = true;
    const lang = currentLang();
    document.querySelectorAll(".admin-upload-page a, .admin-upload-page button, .admin-upload-page label span, .admin-upload-page option, .admin-upload-page p, .admin-upload-page h2, .admin-upload-page h3, .admin-upload-page div.eyebrow, .admin-upload-page div.empty-state, .admin-upload-page small, .admin-upload-page strong, .admin-upload-page span.upload-status-message, .admin-upload-page span.community-status-line, .admin-upload-page span.admin-status-pill").forEach((node) => translateNode(node, lang));
    document.querySelectorAll(".admin-upload-page input[placeholder], .admin-upload-page textarea[placeholder]").forEach((node) => translatePlaceholder(node, lang));
    isApplying = false;
  }

  function scheduleApply() {
    if (isApplying) return;
    window.clearTimeout(scheduleApply.timer);
    scheduleApply.timer = window.setTimeout(applyAdminI18n, 120);
  }

  function init() {
    applyAdminI18n();
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-lang]")) window.setTimeout(applyAdminI18n, 20);
    });
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
