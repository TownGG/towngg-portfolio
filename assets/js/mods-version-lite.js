(() => {
  const VERSION_URL = './assets/data/site-version.json';

  function ensureAdminNavEntry() {
    document.querySelectorAll('.nav-links').forEach((nav) => {
      if (nav.querySelector('a[href="./admin-upload.html"]')) return;
      const about = nav.querySelector('a[href="./about.html"]');
      if (!about) return;
      const admin = document.createElement('a');
      admin.href = './admin-upload.html';
      admin.textContent = 'Admin';
      admin.setAttribute('data-admin-nav', 'true');
      about.insertAdjacentElement('afterend', admin);
    });
  }

  async function syncVersionLabel() {
    ensureAdminNavEntry();
    try {
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.version) return;
      localStorage.setItem('townggSiteVersion', data.version);
      document.querySelectorAll('[data-site-version]').forEach((node) => {
        node.textContent = `Version ${data.version}`;
      });
    } catch (error) {
      console.warn('Mods version label sync skipped', error);
    }
  }

  function boot() {
    syncVersionLabel();
    window.setInterval(syncVersionLabel, 5 * 60 * 1000);
    window.addEventListener('focus', syncVersionLabel);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncVersionLabel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
