(() => {
  const POLL_INTERVAL_MS = 5 * 60 * 1000;
  const RELOAD_PARAM = "downloads_refresh";
  const RELOAD_LOCK_PREFIX = "townggDownloadsRefreshLock:";
  const SOURCES = [
    {
      name: "Bethesda Creations",
      url: "./assets/data/creations-mod-daily.csv",
      storageKey: "townggDownloadsSignature:creations",
      fields: ["date", "title", "downloads", "daily_downloads"]
    },
    {
      name: "Nexus Mods",
      url: "./assets/data/nexus-history.csv",
      storageKey: "townggDownloadsSignature:nexus",
      fields: ["date", "mod_id", "total_downloads", "unique_downloads", "daily_downloads"]
    }
  ];

  const memorySignatures = new Map();
  let checking = false;
  let reloading = false;

  function cacheBustedUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}t=${Date.now()}`;
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function parseCsvLine(line) {
    const values = [];
    let value = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "," && !quoted) {
        values.push(value);
        value = "";
      } else {
        value += character;
      }
    }

    values.push(value);
    return values;
  }

  function downloadsSignature(csvText, fields) {
    const lines = String(csvText || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim());

    if (lines.length < 2) return "";

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    const indexes = fields.map((field) => headers.indexOf(field));
    if (indexes.some((index) => index < 0)) return "";

    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return JSON.stringify(indexes.map((index) => String(values[index] ?? "").trim()));
    }).sort();

    return hashText(rows.join("\n"));
  }

  function getStoredSignature(source) {
    try {
      return localStorage.getItem(source.storageKey) || memorySignatures.get(source.storageKey) || "";
    } catch {
      return memorySignatures.get(source.storageKey) || "";
    }
  }

  function storeSignature(source, signature) {
    memorySignatures.set(source.storageKey, signature);
    try {
      localStorage.setItem(source.storageKey, signature);
    } catch {}
  }

  async function fetchSignature(source) {
    const response = await fetch(cacheBustedUrl(source.url), { cache: "no-store" });
    if (!response.ok) throw new Error(`${source.name} returned HTTP ${response.status}`);
    const signature = downloadsSignature(await response.text(), source.fields);
    if (!signature) throw new Error(`${source.name} downloads data could not be parsed`);
    return { source, signature };
  }

  function forceCacheBustedReload(changedSources, token) {
    if (reloading) return;

    const lockKey = `${RELOAD_LOCK_PREFIX}${location.pathname}:${token}`;
    if (sessionStorage.getItem(lockKey) === "1") return;

    reloading = true;
    sessionStorage.setItem(lockKey, "1");
    console.info(`[TownGG] ${changedSources.join(" and ")} downloads data changed. Forcing a cache-busted reload.`);

    const url = new URL(window.location.href);
    url.searchParams.set(RELOAD_PARAM, `${Date.now()}-${token}`);
    window.location.replace(url.toString());
  }

  async function checkDownloadsUpdates() {
    if (checking || reloading) return;
    checking = true;

    try {
      const settled = await Promise.allSettled(SOURCES.map(fetchSignature));
      const validResults = settled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      settled.forEach((result) => {
        if (result.status === "rejected") console.warn("Downloads refresh check skipped", result.reason);
      });

      const changedSources = [];
      validResults.forEach(({ source, signature }) => {
        const previous = getStoredSignature(source);
        if (previous && previous !== signature) changedSources.push(source.name);
      });

      validResults.forEach(({ source, signature }) => storeSignature(source, signature));

      if (changedSources.length) {
        const token = hashText(validResults.map(({ source, signature }) => `${source.name}:${signature}`).sort().join("|"));
        forceCacheBustedReload(changedSources, token);
      }
    } finally {
      checking = false;
    }
  }

  function startDownloadsRefresh() {
    checkDownloadsUpdates();
    window.setInterval(checkDownloadsUpdates, POLL_INTERVAL_MS);
    window.addEventListener("focus", checkDownloadsUpdates);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkDownloadsUpdates();
    });
  }

  startDownloadsRefresh();
})();