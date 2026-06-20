(() => {
  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.04.59-preview";
  let latestDailyDownloads = null;
  let isRendering = false;
  const translations = {
    "zh-CN": {
      "Daily Downloads": "每日下载",
      Likes: "点赞",
      "Total Downloads": "总下载",
      "Library Adds": "加入库"
    },
    ja: {
      "Daily Downloads": "日別ダウンロード",
      Likes: "いいね",
      "Total Downloads": "総ダウンロード",
      "Library Adds": "ライブラリ追加"
    }
  };

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return value === "zh-CN" || value === "ja" ? value : "en";
  }

  function locale() {
    return lang() === "zh-CN" ? "zh-CN" : lang() === "ja" ? "ja-JP" : "en-US";
  }

  function t(key) {
    return translations[lang()]?.[key] || key;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(Number(value || 0));
  }

  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseCSV(text) {
    const rows = [];
    let cell = "";
    let row = [];
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
  }

  function snapshotTotal(rows) {
    return rows.reduce((sum, row) => sum + toNumber(row.daily_downloads), 0);
  }

  function latestSnapshotRows(rows, date) {
    const dateRows = rows.filter((row) => row.date === date);
    const groups = new Map();
    dateRows.forEach((row) => {
      const key = row.last_updated || "";
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    });

    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, snapshotRows]) => snapshotTotal(snapshotRows) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || dateRows;
  }

  function latestDailyTotal(rows) {
    if (!rows.length) return 0;
    const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1);
    if (!latestDate) return 0;
    return snapshotTotal(latestSnapshotRows(rows, latestDate));
  }

  function totals() {
    return (window.siteData?.creations || []).reduce((sum, item) => {
      sum.likes += toNumber(item.likes);
      sum.downloads += toNumber(item.downloads);
      sum.libraryAdds += toNumber(item.libraryAdds);
      return sum;
    }, { likes: 0, downloads: 0, libraryAdds: 0 });
  }

  function renderSummary() {
    const target = document.querySelector("[data-creations-summary]");
    if (!target || isRendering) return;
    isRendering = true;

    const totalsData = totals();
    const daily = latestDailyDownloads ?? 0;
    target.innerHTML = [
      ["Daily Downloads", daily],
      ["Likes", totalsData.likes],
      ["Total Downloads", totalsData.downloads],
      ["Library Adds", totalsData.libraryAdds]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${t(label)}</span>
        <strong>${formatNumber(value)}</strong>
      </article>
    `).join("");

    isRendering = false;
  }

  async function loadDaily() {
    try {
      const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
      if (response.ok) latestDailyDownloads = latestDailyTotal(parseCSV(await response.text()));
    } catch (error) {
      console.warn("Creations daily summary fallback used", error);
      latestDailyDownloads = 0;
    }
    renderSummary();
  }

  function keepAlive() {
    const target = document.querySelector("[data-creations-summary]");
    if (!target) return;

    const observer = new MutationObserver(() => {
      const labels = [...target.querySelectorAll(".dashboard-stat span")].map((item) => item.textContent?.trim());
      if (labels[0] !== t("Daily Downloads") || labels.includes("Plays") || labels.length !== 4) {
        window.setTimeout(renderSummary, 0);
      }
    });

    observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    keepAlive();
    loadDaily();
    window.setTimeout(renderSummary, 250);
    window.setTimeout(renderSummary, 900);
    document.addEventListener("click", (event) => {
      if (event.target.closest(".language-option[data-lang]")) window.setTimeout(renderSummary, 90);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
