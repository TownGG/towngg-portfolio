(() => {
  const formatter = new Intl.NumberFormat("en-US");
  const LATEST_REFRESH_MS = 5 * 60 * 1000;
  const STALE_AFTER_MS = 90 * 60 * 1000;

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

  function getSiteMods() {
    return window.siteData?.mods || [];
  }

  function updateSiteData(latestRows) {
    const byId = new Map(latestRows.map((row) => [String(row.mod_id), row]));
    getSiteMods().forEach((mod) => {
      const latest = byId.get(nexusIdFromMod(mod));
      if (!latest) return;
      mod.downloads = formatter.format(number(latest.total_downloads));
      mod.endorsements = formatter.format(number(latest.likes));
      mod.uniqueDownloads = formatter.format(number(latest.unique_downloads));
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
        <span>${label}</span>
        <strong>${formatter.format(value)}</strong>
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
        <td>${formatter.format(number(row.daily_downloads))}</td>
        <td>${formatter.format(number(row.total_downloads))}</td>
        <td>${formatter.format(number(row.unique_downloads))}</td>
        <td>${formatter.format(number(row.likes))}</td>
      </tr>
    `).join("");
  }

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
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
    target.textContent = `Updated ${formatDateTime(date)}`;
    target.title = isStale
      ? "Nexus latest snapshot is older than the expected hourly sync window."
      : "Nexus latest snapshot loaded independently from the trend chart.";
  }

  async function applyNexusLatest() {
    const dashboard = document.querySelector("[data-nexus-dashboard]");
    if (!dashboard) return;

    try {
      const response = await fetch(latestSnapshotPath("./assets/data/nexus-latest.json"), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const latestRows = Array.isArray(payload.mods) ? payload.mods : [];
      if (!latestRows.length) return;

      updateSiteData(latestRows);
      updateCards();
      updateSummary(latestRows);
      updateTable(latestRows);
      updateTimestamp(payload.updatedAt);
    } catch (error) {
      console.warn("Nexus latest snapshot could not be applied.", error);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applyNexusLatest, 500);
  });
})();
