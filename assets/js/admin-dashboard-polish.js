(() => {
  const LANG_KEY = 'townggSiteLang';
  const languageLabels = { en: 'English', 'zh-CN': '简体中文', ja: '日本語' };

  const body = document.body;
  if (!body || body.dataset.page !== 'admin-upload') return;

  const globeSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5"/></g></svg>`;

  function currentLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    if (languageLabels[stored]) return stored;
    const html = document.documentElement.lang;
    return languageLabels[html] ? html : 'en';
  }

  function createChrome() {
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
          <div class="admin-topbar-sync"><i></i><span>Last Sync: <strong data-polish-last-sync>--:--</strong></span></div>
          <div class="admin-topbar-user">
            <div class="admin-topbar-avatar">TG</div>
            <div class="admin-topbar-user-copy"><strong>Admin</strong><span>Super Admin</span></div>
            <span style="color:#63788c;font-size:10px">⌄</span>
          </div>
        </div>`;
      document.body.appendChild(topbar);
    }

    if (!document.querySelector('.admin-sidebar-status-panel')) {
      const panel = document.createElement('aside');
      panel.className = 'admin-sidebar-status-panel';
      panel.innerHTML = `
        <div class="admin-sidebar-status-title"><i></i><span>System Status</span></div>
        <small class="admin-sidebar-status-copy">Worker connected · data feeds available</small>
        <div class="admin-sidebar-health">
          <div class="admin-sidebar-health-row"><span>Data Feed</span><strong>Healthy</strong></div>
          <div class="admin-sidebar-health-row"><span>Admin Session</span><strong>Active</strong></div>
        </div>
        <div class="admin-sidebar-status-actions">
          <a href="./index.html">View Website</a>
          <button type="button" data-polish-lock>Lock Admin</button>
        </div>`;
      document.body.appendChild(panel);
    }
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
        localStorage.setItem(LANG_KEY, langOption.dataset.polishLang);
        location.reload();
        return;
      }

      if (!event.target.closest('.admin-topbar-lang')) {
        const wrap = document.querySelector('.admin-topbar-lang');
        wrap?.classList.remove('is-open');
        wrap?.querySelector('.admin-topbar-lang-button')?.setAttribute('aria-expanded', 'false');
      }

      const lock = event.target.closest('[data-polish-lock]');
      if (lock) {
        document.querySelector('.admin-hero [data-lock-admin]')?.click();
      }
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
      const match = text.match(/(?:Last Sync[:：]?|Updated[:：]?|更新于|更新於)?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i);
      if (match) { value = match[1]; break; }
      const datetime = text.match(/(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})/);
      if (datetime) { value = datetime[2]; break; }
    }

    if (!value && window.siteData?.creations?.length) {
      const timestamps = window.siteData.creations
        .map((item) => item.updatedAt)
        .filter(Boolean)
        .map((value) => new Date(String(value).replace(' ', 'T')))
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
    const head = document.createElement('div');
    head.className = 'admin-dashboard-header';
    head.innerHTML = `<div class="admin-dashboard-title"><h1>Dashboard</h1><p>Download analytics overview</p></div>`;
    dashboard.prepend(head);
  }

  function observeDynamicUi() {
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        bindSpotlights(node);
        polishMetricIcons(node);
      }));
      ensureDashboardHeading();
      syncLastUpdated();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    createChrome();
    bindChrome();
    bindSpotlights();
    polishMetricIcons();
    ensureDashboardHeading();
    observeDynamicUi();
    syncLastUpdated();
    setInterval(syncLastUpdated, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
