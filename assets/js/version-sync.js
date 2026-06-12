(() => {
  const VERSION_URL = "./assets/data/site-version.json";
  const LOCK_PREFIX = "townggVersionSyncReloaded:";

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
        location.reload();
      }
    } catch (error) {
      console.warn("Version sync skipped", error);
    }
  }

  syncVersion();
})();
