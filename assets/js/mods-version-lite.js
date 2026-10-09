(() => {
  const VERSION_URL = './assets/data/site-version.json';

  async function syncVersionLabel() {
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
