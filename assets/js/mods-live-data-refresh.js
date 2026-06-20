(() => {
  const WATCHED_FILES = [
    './assets/js/site-data.js',
    './assets/data/creations-history.csv',
    './assets/data/creations-mod-daily.csv',
    './assets/data/nexus-history.csv',
    './assets/data/nexus-latest.json'
  ];
  const POLL_INTERVAL_MS = 60 * 1000;
  const INITIAL_DELAY_MS = 30 * 1000;
  const RELOAD_COOLDOWN_MS = 45 * 1000;
  const RELOAD_LOCK_KEY = `townggLiveDataReload:${location.pathname}`;
  const signatures = new Map();
  let checking = false;
  let reloading = false;

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function cacheBustedUrl(path) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}live=${Date.now()}`;
  }

  async function fileSignature(path) {
    const response = await fetch(cacheBustedUrl(path), { cache: 'no-store' });
    if (!response.ok) return null;
    const text = await response.text();
    const etag = response.headers.get('etag') || '';
    const modified = response.headers.get('last-modified') || '';
    return `${etag}|${modified}|${text.length}|${hashText(text)}`;
  }

  function canReload() {
    const lastReload = Number(sessionStorage.getItem(RELOAD_LOCK_KEY) || 0);
    return !lastReload || Date.now() - lastReload > RELOAD_COOLDOWN_MS;
  }

  function reloadPage(reason) {
    if (reloading || !canReload()) return;
    reloading = true;
    sessionStorage.setItem(RELOAD_LOCK_KEY, String(Date.now()));
    console.info(`[TownGG] Mod metrics changed: ${reason}. Reloading page.`);
    window.location.reload();
  }

  async function checkForChanges() {
    if (checking || reloading) return;
    checking = true;
    try {
      for (const path of WATCHED_FILES) {
        const signature = await fileSignature(path);
        if (!signature) continue;
        const previous = signatures.get(path);
        if (previous && previous !== signature) {
          reloadPage(path);
          return;
        }
        signatures.set(path, signature);
      }
    } catch (error) {
      console.warn('[TownGG] Live mod metrics refresh skipped', error);
    } finally {
      checking = false;
    }
  }

  function start() {
    checkForChanges();
    window.setTimeout(checkForChanges, INITIAL_DELAY_MS);
    window.setInterval(checkForChanges, POLL_INTERVAL_MS);
    window.addEventListener('focus', checkForChanges);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForChanges();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();