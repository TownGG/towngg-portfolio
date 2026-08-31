(() => {
  const LANG_KEY = 'townggSiteLang';
  const languageLabels = { en: 'English', 'zh-CN': '简体中文', ja: '日本語' };

  const body = document.body;
  if (!body || body.dataset.page !== 'admin-upload') return;

  const chromeTranslations = {
    en: {
      dashboard: 'Dashboard', upload: 'Upload Images', manage: 'Image Management', community: 'Community Ops', messageBoard: 'Message Board',
      dashboardSubtitle: 'Download analytics overview', lastSync: 'Last Sync', admin: 'Admin', superAdmin: 'Super Admin',
      systemStatus: 'System Status', systemCopy: 'Worker connected · data feeds available', dataFeed: 'Data Feed', healthy: 'Healthy',
      adminSession: 'Admin Session', active: 'Active', viewWebsite: 'View Website', lockAdmin: 'Lock Admin'
    },
    'zh-CN': {
      dashboard: '首页看板', upload: '上传图片', manage: '图片管理', community: '社区运营', messageBoard: '留言板',
      dashboardSubtitle: '平台下载数据分析总览', lastSync: '最后同步', admin: '管理员', superAdmin: '超级管理员',
      systemStatus: '系统状态', systemCopy: 'Worker 已连接 · 数据源可用', dataFeed: '数据源', healthy: '正常',
      adminSession: '后台会话', active: '已激活', viewWebsite: '返回官网', lockAdmin: '锁定后台'
    },
    ja: {
      dashboard: 'ダッシュボード', upload: '画像アップロード', manage: '画像管理', community: 'コミュニティ運用', messageBoard: 'メッセージボード',
      dashboardSubtitle: 'プラットフォーム別ダウンロード分析', lastSync: '最終同期', admin: '管理者', superAdmin: 'スーパー管理者',
      systemStatus: 'システム状態', systemCopy: 'Worker 接続済み · データ利用可能', dataFeed: 'データフィード', healthy: '正常',
      adminSession: '管理セッション', active: '有効', viewWebsite: 'サイトを見る', lockAdmin: '管理画面をロック'
    }
  };

  const zhExact = {
    'TownGG Secure Terminal': 'TownGG 安全终端',
    'Login': '登录',
    'Admin Key': '后台密钥',
    'Remember key on this device': '在此设备上记住密钥',
    'Enter Upload System': '进入后台',
    'The saved key is stored only in this browser. Use this only on your own device.': '保存的密钥只会存储在当前浏览器中，请仅在自己的设备上使用。',
    'Enter your admin upload key once. Choose remember key to unlock this upload page automatically next time on this device.': '输入后台密钥即可进入。勾选记住密钥后，下次在此设备上会自动解锁后台。',
    'Dashboard': '首页看板',
    'Upload Images': '上传图片',
    'Image Management': '图片管理',
    'Community Ops': '社区运营',
    'Message Board': '留言板',
    'Access': '访问',
    'Upload Settings': '上传设置',
    'Worker connected': 'Worker 已连接',
    'Admin key loaded': '后台密钥已加载',
    'Session only': '仅本次会话',
    'Remembered on this device': '已在此设备记住',
    'Forget Key': '忘记密钥',
    'Upload Type': '上传类型',
    'In-Game Screenshots': '游戏截图',
    'Concept Art': '概念设计',
    'Homepage Featured': '首页精选',
    'Project Prefix': '项目前缀',
    'Alt Text Mode': '替代文本模式',
    'Auto': '自动',
    'Use custom text for all': '全部使用自定义文本',
    'Custom Alt Text': '自定义替代文本',
    'Clear': '清空',
    'Upload': '上传',
    'Images': '图片',
    'Drag & Drop': '拖拽上传',
    'Drop images here': '把图片拖到这里',
    'Preview': '预览',
    'Pending Uploads': '待上传图片',
    'Result': '结果',
    'Upload Status': '上传状态',
    'Ready': '就绪',
    'Ready.': '就绪。',
    'Gallery Manager': '画廊管理',
    'Category': '分类',
    'Load Images': '加载图片',
    'New Message': '新消息',
    'Load Messages': '加载消息',
    'Total': '总计',
    'Pending': '待处理',
    'Platform': '平台',
    'All': '全部',
    'Status': '状态',
    'New': '新消息',
    'Drafted': '已起草',
    'Sent': '已发送',
    'Copied': '已复制',
    'Replied': '已回复',
    'Ignored': '已忽略',
    'Praise': '称赞',
    'Bug Report': 'Bug 反馈',
    'Feature Request': '功能建议',
    'Install Question': '安装问题',
    'AI Criticism': 'AI 争议',
    'Lore Discussion': '剧情讨论',
    'General': '通用',
    'Search': '搜索',
    'Select a message': '选择一条消息',
    'Manual Import': '手动导入',
    'Add Reddit / Nexus Message': '添加 Reddit / Nexus 消息',
    'Mod Name': '模组名称',
    'Author': '作者',
    'Source URL': '来源链接',
    'External Message ID': '外部消息 ID',
    'Nexus Thread ID': 'Nexus 主题 ID',
    'Original Content': '原始内容',
    'Save Message': '保存消息',
    'Message Board Management': '留言板管理',
    'Load Comments': '加载留言',
    'Open Discussion': '打开讨论',
    'All Discussions': '全部讨论',
    'Open': '打开',
    'Delete': '删除',
    'Comments are not loaded yet.': '尚未加载留言。',
    'Ready. Click Load Comments.': '就绪，点击“加载留言”。',
    'No message board comments loaded.': '当前没有留言。',
    'Load public Giscus / GitHub Discussions comments and delete bad comments from this admin page.': '加载公开的 Giscus / GitHub Discussions 留言，并可直接在后台删除不合适的评论。',
    'Manage Reddit and Nexus Mods feedback. Reddit can send through API after confirmation; Nexus falls back to copy-and-open when API access is unavailable.': '管理 Reddit 与 Nexus Mods 玩家反馈。Reddit 可确认后通过 API 发送回复；Nexus API 不可用时会自动切换为复制并打开原页面。',
    'Load or add a Reddit / Nexus message, then generate a safe English reply draft.': '加载或添加 Reddit / Nexus 消息，然后生成可编辑的英文回复草稿。',
    'Paste the source comment and URL. For Reddit one-click replies, use a full comment thing ID such as t1_xxxxx.': '粘贴原始评论和链接。Reddit 一键回复需要填写完整评论 ID，例如 t1_xxxxx。',
    'Load existing gallery images, then delete an image together with its JSON record.': '加载现有画廊图片，并可同时删除图片文件及对应 JSON 记录。',
    'Click Load Images to view current gallery records.': '点击“加载图片”查看当前画廊记录。',
    'No images selected yet.': '尚未选择图片。',
    'Select images, then click Upload.': '选择图片后点击“上传”。',
    'Optional. Used for automatic filenames and alt text.': '可选，用于自动生成文件名和替代文本。',
    'or click to select JPG, PNG or WEBP files': '或点击选择 JPG、PNG、WEBP 文件',
    'Browser compression target: max 1920px, JPG quality 0.86': '浏览器压缩目标：最长边 1920px，JPG 质量 0.86'
  };

  const zhPlaceholders = {
    'Enter admin upload key': '请输入后台密钥',
    'Mod, author, content': '模组、作者、内容',
    'Player name': '玩家名称',
    'Paste the player comment here': '在此粘贴玩家评论',
    'Optional Nexus commentThreadId': '可选 Nexus commentThreadId',
    'Reddit t1_xxxxx / Nexus replyToId': 'Reddit t1_xxxxx / Nexus replyToId'
  };

  const globeSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5"/></g></svg>`;

  function currentLanguage() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (languageLabels[stored]) return stored;
    } catch (_) {}
    const html = document.documentElement.lang;
    return languageLabels[html] ? html : 'en';
  }

  function copy() {
    return chromeTranslations[currentLanguage()] || chromeTranslations.en;
  }

  function createChrome() {
    const c = copy();

    if (!document.querySelector('.admin-sidebar-brand')) {
      const brand = document.createElement('a');
      brand.className = 'admin-sidebar-brand';
      brand.href = './index.html';
      brand.setAttribute('aria-label', 'TownGG MOD home');
      brand.innerHTML = `<img src="./assets/icons/favicon.svg" alt=""><strong>TownGG <span>MOD</span></strong>`;
      document.body.appendChild(brand);
    }

    if (!document.querySelector('.admin-app-topbar')) {
      const lang = currentLanguage();
      const topbar = document.createElement('header');
      topbar.className = 'admin-app-topbar';
      topbar.innerHTML = `
        <button class="admin-topbar-toggle" type="button" aria-label="Toggle sidebar"><span></span></button>
        <div class="admin-topbar-spacer"></div>
        <div class="admin-topbar-cluster">
          <div class="admin-topbar-lang">
            <button class="admin-topbar-lang-button" type="button" aria-haspopup="menu" aria-expanded="false">${globeSvg}<span data-polish-language-label>${languageLabels[lang]}</span><span>⌄</span></button>
            <div class="admin-topbar-lang-menu" role="menu">
              ${Object.entries(languageLabels).map(([code, label]) => `<button type="button" role="menuitem" data-polish-lang="${code}" class="${code === lang ? 'is-active' : ''}">${label}</button>`).join('')}
            </div>
          </div>
          <div class="admin-topbar-sync"><i></i><span><span data-polish-last-sync-label>${c.lastSync}</span>: <strong data-polish-last-sync>--:--</strong></span></div>
          <div class="admin-topbar-user">
            <div class="admin-topbar-avatar">TG</div>
            <div class="admin-topbar-user-copy"><strong data-polish-admin-label>${c.admin}</strong><span data-polish-super-admin-label>${c.superAdmin}</span></div>
            <span style="color:#63788c;font-size:10px">⌄</span>
          </div>
        </div>`;
      document.body.appendChild(topbar);
    }

    if (!document.querySelector('.admin-sidebar-status-panel')) {
      const panel = document.createElement('aside');
      panel.className = 'admin-sidebar-status-panel';
      panel.innerHTML = `
        <div class="admin-sidebar-status-title"><i></i><span data-polish-system-title>${c.systemStatus}</span></div>
        <small class="admin-sidebar-status-copy" data-polish-system-copy>${c.systemCopy}</small>
        <div class="admin-sidebar-health">
          <div class="admin-sidebar-health-row"><span data-polish-data-feed>${c.dataFeed}</span><strong data-polish-healthy>${c.healthy}</strong></div>
          <div class="admin-sidebar-health-row"><span data-polish-admin-session>${c.adminSession}</span><strong data-polish-active>${c.active}</strong></div>
        </div>
        <div class="admin-sidebar-status-actions">
          <a href="./index.html" data-polish-view-site>${c.viewWebsite}</a>
          <button type="button" data-polish-lock>${c.lockAdmin}</button>
        </div>`;
      document.body.appendChild(panel);
    }
  }

  function applyChromeLanguage() {
    const lang = currentLanguage();
    const c = copy();
    document.documentElement.lang = lang;
    document.documentElement.dataset.siteLang = lang;

    const setText = (selector, value) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    };

    const sidebar = {
      'admin-module-dashboard': c.dashboard,
      'admin-module-upload': c.upload,
      'admin-module-manage': c.manage,
      'admin-module-community': c.community,
      'admin-module-message-board': c.messageBoard
    };
    Object.entries(sidebar).forEach(([id, value]) => {
      const label = document.querySelector(`.admin-module-tab[for="${id}"]`);
      if (label && label.textContent.trim() !== value) label.textContent = value;
    });

    setText('[data-polish-last-sync-label]', c.lastSync);
    setText('[data-polish-admin-label]', c.admin);
    setText('[data-polish-super-admin-label]', c.superAdmin);
    setText('[data-polish-system-title]', c.systemStatus);
    setText('[data-polish-system-copy]', c.systemCopy);
    setText('[data-polish-data-feed]', c.dataFeed);
    setText('[data-polish-healthy]', c.healthy);
    setText('[data-polish-admin-session]', c.adminSession);
    setText('[data-polish-active]', c.active);
    setText('[data-polish-view-site]', c.viewWebsite);
    setText('[data-polish-lock]', c.lockAdmin);

    document.querySelectorAll('.admin-dashboard-title h1').forEach((node) => { node.textContent = c.dashboard; });
    document.querySelectorAll('.admin-dashboard-title p').forEach((node) => { node.textContent = c.dashboardSubtitle; });

    if (lang === 'zh-CN') applyChineseSupplement();
  }

  function applyChineseSupplement(root = document) {
    const nodes = root.querySelectorAll?.('a,button,label,option,p,h1,h2,h3,div.eyebrow,div.empty-state,small,strong,span.upload-status-message,span.community-status-line,span.admin-status-pill') || [];
    nodes.forEach((node) => {
      if (node.closest('.admin-topbar-lang-menu')) return;
      if (node.children.length) return;
      const text = node.textContent.trim();
      const translated = zhExact[text];
      if (translated && node.textContent !== translated) node.textContent = translated;
    });

    root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach((field) => {
      const translated = zhPlaceholders[field.getAttribute('placeholder')];
      if (translated) field.setAttribute('placeholder', translated);
    });
  }

  function bindChrome() {
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('.admin-topbar-toggle');
      if (toggle) {
        body.classList.toggle('admin-sidebar-collapsed');
        return;
      }

      const langButton = event.target.closest('.admin-topbar-lang-button');
      if (langButton) {
        const wrap = langButton.closest('.admin-topbar-lang');
        const open = wrap.classList.toggle('is-open');
        langButton.setAttribute('aria-expanded', String(open));
        return;
      }

      const langOption = event.target.closest('[data-polish-lang]');
      if (langOption) {
        try { localStorage.setItem(LANG_KEY, langOption.dataset.polishLang); } catch (_) {}
        location.reload();
        return;
      }

      if (!event.target.closest('.admin-topbar-lang')) {
        const wrap = document.querySelector('.admin-topbar-lang');
        wrap?.classList.remove('is-open');
        wrap?.querySelector('.admin-topbar-lang-button')?.setAttribute('aria-expanded', 'false');
      }

      const lock = event.target.closest('[data-polish-lock]');
      if (lock) document.querySelector('.admin-hero [data-lock-admin]')?.click();
    });
  }

  function syncLastUpdated() {
    const target = document.querySelector('[data-polish-last-sync]');
    if (!target) return;

    const candidates = [
      document.querySelector('[data-dashboard-sync]'),
      document.querySelector('.admin-dashboard-sync'),
      document.querySelector('[data-creations-updated]')
    ].filter(Boolean);

    let value = '';
    for (const node of candidates) {
      const text = (node.textContent || '').trim();
      const match = text.match(/(?:Last Sync[:：]?|Updated[:：]?|最后同步[:：]?|更新于|更新於)?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i);
      if (match) { value = match[1]; break; }
      const datetime = text.match(/(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})/);
      if (datetime) { value = datetime[2]; break; }
    }

    if (!value && window.siteData?.creations?.length) {
      const timestamps = window.siteData.creations
        .map((item) => item.updatedAt)
        .filter(Boolean)
        .map((stamp) => new Date(String(stamp).replace(' ', 'T')))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);
      if (timestamps[0]) value = timestamps[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    if (!value) value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    target.textContent = value;
  }

  function bindSpotlights(root = document) {
    root.querySelectorAll?.('.admin-metric-card, .admin-analytics-panel, .admin-card').forEach((card) => {
      if (card.dataset.polishPointerBound) return;
      card.dataset.polishPointerBound = 'true';
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
  }

  function polishMetricIcons(root = document) {
    const cards = root.querySelectorAll?.('.admin-metric-card') || [];
    cards.forEach((card, index) => {
      const icon = card.querySelector('.admin-metric-icon');
      if (!icon || icon.dataset.polished) return;
      icon.dataset.polished = 'true';
      const svgs = [
        '<svg viewBox="0 0 24 24"><path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14"/></svg>',
        '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></svg>',
        '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="M4 18 9 12l3 3 6-8m0 0v5m0-5h-5"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="M4 18 9 12l3 3 6-8m0 0v5m0-5h-5"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v10m3-7.5c-.6-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.1 1.8 3.1 2.2c1.9.4 2.9 1.1 2.9 2.2 0 1.3-1.3 2.1-3 2.1-1.5 0-2.7-.5-3.4-1.6"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z"/><path d="M8.5 9.5 12 7l3.5 2.5L12 12l-3.5-2.5Z"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="m4 8 8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4"/></svg>',
        '<svg viewBox="0 0 24 24"><path d="M3 12h4l2.1-5 4.2 10 2.1-5H21"/></svg>'
      ];
      icon.innerHTML = svgs[index % svgs.length];
      const svg = icon.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.65');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.style.width = '16px';
        svg.style.height = '16px';
      }
    });
  }

  function ensureDashboardHeading() {
    const dashboard = document.querySelector('.admin-dashboard');
    if (!dashboard || dashboard.querySelector('.admin-dashboard-header')) return;
    const c = copy();
    const head = document.createElement('div');
    head.className = 'admin-dashboard-header';
    head.innerHTML = `<div class="admin-dashboard-title"><h1>${c.dashboard}</h1><p>${c.dashboardSubtitle}</p></div>`;
    dashboard.prepend(head);
  }

  function observeDynamicUi() {
    let queued = false;
    const refresh = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureDashboardHeading();
        applyChromeLanguage();
        syncLastUpdated();
      });
    };

    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        bindSpotlights(node);
        polishMetricIcons(node);
        if (currentLanguage() === 'zh-CN') applyChineseSupplement(node);
      }));
      refresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    document.documentElement.lang = currentLanguage();
    createChrome();
    bindChrome();
    bindSpotlights();
    polishMetricIcons();
    ensureDashboardHeading();
    applyChromeLanguage();
    observeDynamicUi();
    syncLastUpdated();
    setInterval(syncLastUpdated, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();