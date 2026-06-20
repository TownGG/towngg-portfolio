(() => {
  const LATEST_REFRESH_MS = 5 * 60 * 1000;
  const STALE_AFTER_MS = 90 * 60 * 1000;
  const translations = {
    "zh-CN": {
      "Unique Downloads": "唯一下载",
      "Daily Downloads": "每日下载",
      "Total Downloads": "总下载",
      Endorsements: "点赞",
      Updated: "更新于 {time}",
      "Nexus latest snapshot is older than the expected hourly sync window.": "Nexus 最新快照已超过预期的每小时同步窗口。",
      "Nexus latest snapshot loaded independently from the trend chart.": "Nexus 最新快照已独立于趋势图加载。"
    },
    ja: {
      "Unique Downloads": "ユニークダウンロード",
      "Daily Downloads": "日別ダウンロード",
      "Total Downloads": "総ダウンロード",
      Endorsements: "支持数",
      Updated: "更新 {time}",
      "Nexus latest snapshot is older than the expected hourly sync window.": "Nexus最新スナップショットは想定される毎時同期ウィンドウより古くなっています。",
      "Nexus latest snapshot loaded independently from the trend chart.": "Nexus最新スナップショットはトレンドチャートとは独立して読み込まれました。"
    }
  };

  let cachedPayload = null;

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return value === "zh-CN" || value === "ja" ? value : "en";
  }

  function locale() {
    return lang() === "zh-CN" ? "zh-CN" : lang() === "ja" ? "ja-JP" : "en-US";
  }

  function t(key, replacements = {}) {
    let value = translations[lang()]?.[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, replacement);
    });
    return value;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(number(value));
  }

  function latestSnapshotPath(path) {
    const bucket = Math.floor(Date.now() / LATEST_REFRESH_MS);
    return `${path}?latest=${bucket}`;
  }

  function number(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function nexusIdFromMod(mod) {
    const link = (mod.links || []).find((item) => String(item.url || "").includes("nexusmods.com"));
    const match = String(link?.url || "").match(/\/mods\/(\d+)/);
    return match?.[1] || "";
  }

  function isNexusImage(url) {
    return String(url || "").includes("staticdelivery.nexusmods.com");
  }

  function isAutoSyncedMod(mod) {
    const tags = Array.isArray(mod.tags) ? mod.tags : [];
    return /^Nexus Mod \d+$/i.test(String(mod.title || ""))
      || mod.category === "Nexus Mods / Auto Synced"
      || tags.some((tag) => String(tag).toLowerCase() === "auto synced");
  }

  function isLocalFallbackImage(url) {
    const value = String(url || "");
    return value.startsWith("./assets/images/mods/") || value.startsWith("assets/images/mods/");
  }

  function latestImageFromRow(row) {
    return row?.image_url || row?.picture_url || row?.image || "";
  }

  function latestNameFromRow(row) {
    return row?.mod_name || row?.name || "";
  }

  function getSiteMods() {
    return window.siteData?.mods || [];
  }

  function updateSiteData(latestRows) {
    const byId = new Map(latestRows.map((row) => [String(row.mod_id), row]));
    getSiteMods().forEach((mod) => {
      const latest = byId.get(nexusIdFromMod(mod));
      if (!latest) return;

      const autoSynced = isAutoSyncedMod(mod);
      const latestName = latestNameFromRow(latest);
      const latestImage = latestImageFromRow(latest);
      if (autoSynced && latestName && mod.title !== latestName) {
        mod.title = latestName;
        mod.alt = `${latestName} Nexus Mods cover image`;
      }
      if (latestImage && (isNexusImage(mod.image) || (autoSynced && isLocalFallbackImage(mod.image))) && mod.image !== latestImage) {
        mod.image = latestImage;
      }

      mod.downloads = formatNumber(latest.total_downloads);
      mod.endorsements = formatNumber(latest.likes);
      mod.uniqueDownloads = formatNumber(latest.unique_downloads);
    });
  }

  function updateCards() {
    if (typeof renderFeaturedMod === "function") renderFeaturedMod();
    if (typeof renderMods === "function") {
      renderMods("[data-home-mods]", { excludeFeatured: true, limit: 3 });
      renderMods("[data-all-mods]");
    }
    document.querySelectorAll("[data-filter-target-current]").forEach((modsFilter) => {
      const activeFilter = modsFilter.querySelector("[data-filter].is-active")?.dataset.filter || "All";
      if (typeof applyFilter === "function") applyFilter(modsFilter, activeFilter);
    });
  }

  function updateSummary(latestRows) {
    const target = document.querySelector("[data-dashboard-summary]");
    if (!target) return;

    const totals = latestRows.reduce(
      (sum, row) => {
        sum.mods += 1;
        sum.daily += number(row.daily_downloads);
        sum.total += number(row.total_downloads);
        sum.unique += number(row.unique_downloads);
        sum.likes += number(row.likes);
        return sum;
      },
      { mods: 0, daily: 0, total: 0, unique: 0, likes: 0 }
    );

    target.innerHTML = [
      ["Unique Downloads", totals.unique],
      ["Daily Downloads", totals.daily],
      ["Total Downloads", totals.total],
      ["Endorsements", totals.likes]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${t(label)}</span>
        <strong>${formatNumber(value)}</strong>
      </article>
    `).join("");
  }

  function updateTable(latestRows) {
    const target = document.querySelector("[data-dashboard-table]");
    if (!target) return;

    const sorted = [...latestRows].sort((a, b) => number(b.total_downloads) - number(a.total_downloads));
    target.innerHTML = sorted.map((row) => `
      <tr>
        <td><a href="${row.mod_url}" target="_blank" rel="noopener">${row.mod_name}</a></td>
        <td>${formatNumber(row.daily_downloads)}</td>
        <td>${formatNumber(row.total_downloads)}</td>
        <td>${formatNumber(row.unique_downloads)}</td>
        <td>${formatNumber(row.likes)}</td>
      </tr>
    `).join("");
  }

  function formatDateTime(date) {
    return date.toLocaleString(locale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function updateTimestamp(updatedAt) {
    const target = document.querySelector("[data-dashboard-updated]");
    if (!target || !updatedAt) return;
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return;

    const age = Date.now() - date.getTime();
    const isStale = age > STALE_AFTER_MS;
    target.classList.toggle("is-stale", isStale);
    target.classList.toggle("is-fresh", !isStale);
    target.textContent = t("Updated", { time: formatDateTime(date) });
    target.title = isStale
      ? t("Nexus latest snapshot is older than the expected hourly sync window.")
      : t("Nexus latest snapshot loaded independently from the trend chart.");
  }

  function renderNexusLatest(payload) {
    const latestRows = Array.isArray(payload.mods) ? payload.mods : [];
    if (!latestRows.length) return;
    updateSiteData(latestRows);
    updateCards();
    updateSummary(latestRows);
    updateTable(latestRows);
    updateTimestamp(payload.updatedAt);
  }

  async function applyNexusLatest() {
    const dashboard = document.querySelector("[data-nexus-dashboard]");
    if (!dashboard) return;

    try {
      const response = await fetch(latestSnapshotPath("./assets/data/nexus-latest.json"), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      cachedPayload = payload;
      renderNexusLatest(payload);
    } catch (error) {
      console.warn("Nexus latest snapshot could not be applied.", error);
    }
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".language-option[data-lang]")) return;
    window.setTimeout(() => {
      if (cachedPayload) renderNexusLatest(cachedPayload);
    }, 90);
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applyNexusLatest, 500);
  });
})();
