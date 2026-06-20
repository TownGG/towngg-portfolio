(() => {
  const VERSION_URL = "./assets/data/site-version.json";
  const LOCK_PREFIX = "townggVersionSyncReloaded:";
  const LIVE_RELOAD_LOCK_PREFIX = "townggLiveDataReloaded:";
  const POLL_INTERVAL_MS = 60 * 1000;
  const LIVE_RELOAD_COOLDOWN_MS = 45 * 1000;
  const WATCHED_FILES = [
    "./assets/js/site-data.js",
    "./assets/data/site-version.json",
    "./assets/data/creations-history.csv",
    "./assets/data/creations-mod-daily.csv",
    "./assets/data/nexus-history.csv",
    "./assets/data/nexus-latest.json"
  ];
  const liveSignatures = new Map();
  let liveChecking = false;
  let reloading = false;

  function normalizeVersion(value) {
    return String(value || "")
      .replace(/^v/i, "")
      .replace(/-preview$/i, "")
      .trim();
  }

  function currentAssetVersions() {
    return [...document.querySelectorAll('link[href*="?v="], script[src*="?v="]')]
      .map((element) => element.href || element.src || "")
      .map((url) => new URL(url, window.location.href).searchParams.get("v"))
      .filter(Boolean);
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function cacheBustedUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}t=${Date.now()}`;
  }

  async function fileSignature(path) {
    const response = await fetch(cacheBustedUrl(path), { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    const etag = response.headers.get("etag") || "";
    const modified = response.headers.get("last-modified") || "";
    return `${etag}|${modified}|${text.length}|${hashText(text)}`;
  }

  function reloadOnce(key) {
    if (reloading) return;
    reloading = true;
    sessionStorage.setItem(key, "1");
    location.reload();
  }

  function canLiveReload(lockKey) {
    const lastReload = Number(sessionStorage.getItem(lockKey) || 0);
    return !lastReload || Date.now() - lastReload > LIVE_RELOAD_COOLDOWN_MS;
  }

  function liveReload(reason) {
    const lockKey = `${LIVE_RELOAD_LOCK_PREFIX}${location.pathname}`;
    if (reloading || !canLiveReload(lockKey)) return;
    reloading = true;
    sessionStorage.setItem(lockKey, String(Date.now()));
    console.info(`[TownGG] Site data changed: ${reason}. Reloading page.`);
    location.reload();
  }

  function ensureAdminNavEntry() {
    document.querySelectorAll(".nav-links").forEach((nav) => {
      if (nav.querySelector('a[href="./admin-upload.html"]')) return;
      const about = nav.querySelector('a[href="./about.html"]');
      if (!about) return;

      const admin = document.createElement("a");
      admin.href = "./admin-upload.html";
      admin.textContent = "Admin";
      admin.setAttribute("data-admin-nav", "true");
      about.insertAdjacentElement("afterend", admin);
    });
  }

  async function syncVersion() {
    ensureAdminNavEntry();

    try {
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const version = normalizeVersion(data.version);
      if (!version) return;

      const versions = currentAssetVersions();
      const hasOutdatedAsset = versions.some((item) => item !== version);
      const lockKey = `${LOCK_PREFIX}${version}:${location.pathname}`;
      const alreadyReloaded = localStorage.getItem(lockKey) === "1";

      localStorage.setItem("townggSiteVersion", data.version || `v${version}-preview`);
      document.querySelectorAll("[data-site-version]").forEach((node) => {
        node.textContent = `Version ${data.version || `v${version}-preview`}`;
      });

      if (hasOutdatedAsset && !alreadyReloaded) {
        localStorage.setItem(lockKey, "1");
        reloadOnce(lockKey);
      }
    } catch (error) {
      console.warn("Version sync skipped", error);
    }
  }

  async function checkLiveDataChanges() {
    if (liveChecking || reloading) return;
    liveChecking = true;
    try {
      for (const path of WATCHED_FILES) {
        const signature = await fileSignature(path);
        if (!signature) continue;
        const previous = liveSignatures.get(path);
        if (previous && previous !== signature) {
          liveReload(path);
          return;
        }
        liveSignatures.set(path, signature);
      }
    } catch (error) {
      console.warn("Live data refresh skipped", error);
    } finally {
      liveChecking = false;
    }
  }

  function startLiveDataRefresh() {
    checkLiveDataChanges();
    window.setTimeout(checkLiveDataChanges, 30 * 1000);
    window.setInterval(checkLiveDataChanges, POLL_INTERVAL_MS);
    window.addEventListener("focus", checkLiveDataChanges);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkLiveDataChanges();
    });
  }

  syncVersion();
  startLiveDataRefresh();
})();