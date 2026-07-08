(() => {
  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.05.202607031000-preview";
  let downloadMetric = { label: "Yesterday Downloads", value: null };
  let isRendering = false;
  const translations = {
    "zh-CN": { "Daily Downloads": "今日下载", "Yesterday Downloads": "昨日下载", Likes: "点赞", "Total Downloads": "总下载", "Library Adds": "加入库" },
    "zh-TW": { "Daily Downloads": "今日下載", "Yesterday Downloads": "昨日下載", Likes: "按讚", "Total Downloads": "總下載", "Library Adds": "加入庫" },
    ja: { "Daily Downloads": "今日のダウンロード", "Yesterday Downloads": "昨日のダウンロード", Likes: "いいね", "Total Downloads": "総ダウンロード", "Library Adds": "ライブラリ追加" },
    ko: { "Daily Downloads": "오늘 다운로드", "Yesterday Downloads": "어제 다운로드", Likes: "좋아요", "Total Downloads": "총 다운로드", "Library Adds": "라이브러리 추가" },
    ru: { "Daily Downloads": "Загрузки сегодня", "Yesterday Downloads": "Загрузки вчера", Likes: "Лайки", "Total Downloads": "Всего загрузок", "Library Adds": "Добавления в библиотеку" }
  };

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en";
  }

  function locale() {
    return lang() === "zh-CN" ? "zh-CN" : lang() === "zh-TW" ? "zh-TW" : lang() === "ja" ? "ja-JP" : lang() === "ko" ? "ko-KR" : lang() === "ru" ? "ru-RU" : "en-US";
  }

  function t(key) { return translations[lang()]?.[key] || key; }
  function formatNumber(value) { return new Intl.NumberFormat(locale()).format(Number(value || 0)); }
  function formatMetric(value) { return value === null || value === undefined ? "—" : formatNumber(value); }
  function toNumber(value) { const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
  function todayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function parseCSV(text) {
    const rows = [];
    let cell = "";
    let row = [];
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index += 1; row.push(cell); if (row.some((item) => item.trim())) rows.push(row); row = []; cell = ""; }
      else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
  }

  function snapshotTotal(rows) { return rows.reduce((sum, row) => sum + toNumber(row.daily_downloads), 0); }
  function latestSnapshotRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.last_updated || "";
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    });
    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, snapshotRows]) => snapshotTotal(snapshotRows) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || rows;
  }

  function dailySeries(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const current = groups.get(row.date) || [];
      current.push(row);
      groups.set(row.date, current);
    });
    return [...groups.entries()]
      .map(([date, dateRows]) => ({ date, value: snapshotTotal(latestSnapshotRows(dateRows)) }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function resolveDownloadMetric(rows) {
    const today = todayKey();
    const previous = dailySeries(rows)
      .filter((item) => item.date < today && item.value > 0)
      .reverse()[0];
    return { label: "Yesterday Downloads", value: previous?.value ?? null };
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
    target.innerHTML = [
      [downloadMetric.label, downloadMetric.value], ["Likes", totalsData.likes], ["Total Downloads", totalsData.downloads], ["Library Adds", totalsData.libraryAdds]
    ].map(([label, value]) => `<article class="dashboard-stat"><span>${t(label)}</span><strong>${formatMetric(value)}</strong></article>`).join("");
    isRendering = false;
  }

  async function loadDaily() {
    try {
      const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
      downloadMetric = response.ok ? resolveDownloadMetric(parseCSV(await response.text())) : { label: "Yesterday Downloads", value: null };
    } catch (error) {
      console.warn("Creations daily summary fallback used", error);
      downloadMetric = { label: "Yesterday Downloads", value: null };
    }
    renderSummary();
  }

  function keepAlive() {
    const target = document.querySelector("[data-creations-summary]");
    if (!target) return;
    const observer = new MutationObserver(() => {
      const labels = [...target.querySelectorAll(".dashboard-stat span")].map((item) => item.textContent?.trim());
      const expectedFirst = t(downloadMetric.label);
      if (labels[0] !== expectedFirst || labels.includes("Plays") || labels.length !== 4) window.setTimeout(renderSummary, 0);
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    keepAlive();
    loadDaily();
    window.setTimeout(renderSummary, 250);
    window.setTimeout(renderSummary, 900);
    document.addEventListener("click", (event) => { if (event.target.closest(".language-option[data-lang]")) window.setTimeout(renderSummary, 90); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();