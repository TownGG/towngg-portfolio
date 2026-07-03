(() => {
  const chartEl = document.querySelector("[data-creations-chart]");
  const toolbar = chartEl?.closest(".dashboard-panel")?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const translations = {
    "zh-CN": { "Daily Downloads": "每日下载", "Yesterday Downloads": "昨日下载", Likes: "点赞", "Total Downloads": "总下载", Plays: "游玩", "Library Adds": "加入库", "7-Day Creations Downloads Trend": "7 日 Creations 下载趋势", "Creations trend note": "基于每个 Creation 的每日下载记录统计发布活跃度。最新快照：{date}。", "Daily downloads": "每日下载", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "暂时没有 Creations 每日数据。下一次定时 CC 同步后会显示。", "Creations daily downloads chart": "Creations 每日下载图表" },
    "zh-TW": { "Daily Downloads": "每日下載", "Yesterday Downloads": "昨日下載", Likes: "按讚", "Total Downloads": "總下載", Plays: "遊玩", "Library Adds": "加入庫", "7-Day Creations Downloads Trend": "7 日 Creations 下載趨勢", "Creations trend note": "基於每個 Creation 的每日下載記錄統計發佈活躍度。最新快照：{date}。", "Daily downloads": "每日下載", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "暫時沒有 Creations 每日資料。下一次定時 CC 同步後會顯示。", "Creations daily downloads chart": "Creations 每日下載圖表" },
    ja: { "Daily Downloads": "日別ダウンロード", "Yesterday Downloads": "昨日のダウンロード", Likes: "いいね", "Total Downloads": "総ダウンロード", Plays: "プレイ", "Library Adds": "ライブラリ追加", "7-Day Creations Downloads Trend": "7日間のCreationsダウンロード推移", "Creations trend note": "各Creationの日別ダウンロード記録をもとに表示します。最新スナップショット：{date}。", "Daily downloads": "日別ダウンロード", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "Creationsの日別データはまだありません。次回の同期後に表示されます。", "Creations daily downloads chart": "Creations日別ダウンロードチャート" },
    ko: { "Daily Downloads": "일일 다운로드", "Yesterday Downloads": "어제 다운로드", Likes: "좋아요", "Total Downloads": "총 다운로드", Plays: "플레이", "Library Adds": "라이브러리 추가", "7-Day Creations Downloads Trend": "7일 Creations 다운로드 추세", "Creations trend note": "각 Creation의 일일 다운로드 기록을 표시합니다. 최신 스냅샷: {date}.", "Daily downloads": "일일 다운로드", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "Creations 일일 데이터가 아직 없습니다. 다음 동기화 후 표시됩니다.", "Creations daily downloads chart": "Creations 일일 다운로드 차트" },
    ru: { "Daily Downloads": "Ежедневные загрузки", "Yesterday Downloads": "Загрузки вчера", Likes: "Лайки", "Total Downloads": "Всего загрузок", Plays: "Запуски", "Library Adds": "Добавления в библиотеку", "7-Day Creations Downloads Trend": "Тренд загрузок Creations за 7 дней", "Creations trend note": "Активность релизов на основе ежедневных загрузок. Последний снимок: {date}.", "Daily downloads": "Ежедневные загрузки", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "Ежедневные данные Creations пока недоступны. Они появятся после следующей синхронизации.", "Creations daily downloads chart": "График ежедневных загрузок Creations" }
  };

  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.05.202607031000-preview";
  let cachedModDailyRows = null;
  let rerenderTimer = 0;

  function lang() { const value = localStorage.getItem("townggSiteLang"); return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en"; }
  function locale() { return lang() === "zh-CN" ? "zh-CN" : lang() === "zh-TW" ? "zh-TW" : lang() === "ja" ? "ja-JP" : lang() === "ko" ? "ko-KR" : lang() === "ru" ? "ru-RU" : "en-US"; }
  function t(key, replacements = {}) { let value = translations[lang()]?.[key] || key; Object.entries(replacements).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement); }); return value; }
  function toNumber(value) { const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
  function formatNumber(value) { return new Intl.NumberFormat(locale()).format(Number(value || 0)); }
  function formatMetric(value) { return value === null || value === undefined ? "—" : formatNumber(value); }
  function formatDateLabel(value) { const date = new Date(`${value}T00:00:00`); if (Number.isNaN(date.getTime())) return String(value || "").slice(5); return date.toLocaleDateString(locale(), { month: "short", day: "numeric" }); }

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
    rows.forEach((row) => { const key = row.last_updated || ""; const current = groups.get(key) || []; current.push(row); groups.set(key, current); });
    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, snapshotRows]) => snapshotTotal(snapshotRows) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || rows;
  }
  function buildDailySeries(rows) {
    const groups = new Map();
    rows.forEach((row) => { if (!row.date) return; const current = groups.get(row.date) || []; current.push(row); groups.set(row.date, current); });
    return [...groups.entries()].map(([date, dateRows]) => ({ date, value: snapshotTotal(latestSnapshotRows(dateRows)) })).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-7);
  }
  function resolveDownloadMetric(data) {
    if (!data?.length) return { label: "Daily Downloads", value: null };
    const latest = data.at(-1);
    if (latest?.value > 0) return { label: "Daily Downloads", value: latest.value };
    const previous = [...data].slice(0, -1).reverse().find((item) => item.value > 0);
    if (previous) return { label: "Yesterday Downloads", value: previous.value };
    return { label: "Daily Downloads", value: null };
  }
  function currentCreationTotals() {
    return (window.siteData?.creations || []).reduce((sum, item) => {
      sum.likes += toNumber(item.likes);
      sum.downloads += toNumber(item.downloads);
      sum.plays += toNumber(item.plays);
      sum.libraryAdds += toNumber(item.libraryAdds);
      return sum;
    }, { likes: 0, downloads: 0, plays: 0, libraryAdds: 0 });
  }

  function updateDailySummary(data) {
    const target = document.querySelector("[data-creations-summary]");
    if (!target) return;
    const totals = currentCreationTotals();
    const metric = resolveDownloadMetric(data);
    target.innerHTML = [[metric.label, metric.value], ["Likes", totals.likes], ["Total Downloads", totals.downloads], ["Plays", totals.plays], ["Library Adds", totals.libraryAdds]].map(([label, value]) => `<article class="dashboard-stat"><span>${t(label)}</span><strong>${formatMetric(value)}</strong></article>`).join("");
  }

  function renderToolbar(latestDate) {
    if (!toolbar) return;
    toolbar.innerHTML = `<div><h3>${t("7-Day Creations Downloads Trend")}</h3><p class="dashboard-note">${t("Creations trend note", { date: latestDate ? formatDateLabel(latestDate) : "—" })}</p></div><span class="telemetry-pill">${t("Daily downloads")}</span>`;
  }

  function renderChart(rows) {
    const data = buildDailySeries(rows || []);
    updateDailySummary(data);
    renderToolbar(data.at(-1)?.date || "");
    if (!data.length) {
      chartEl.innerHTML = `<p class="section-desc">${t("No Creations daily data available yet. It will appear after the next scheduled CC sync.")}</p>`;
      return;
    }
    const width = 920;
    const height = 260;
    const pad = { left: 64, right: 38, top: 24, bottom: 44 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const maxValue = Math.max(...data.map((item) => Number(item.value)), 1);
    const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    const points = data.map((item, index) => ({
      x: pad.left + (chartW / Math.max(1, data.length - 1)) * index,
      y: pad.top + chartH - (Number(item.value) / yMax) * chartH,
      item
    }));
    const linePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    const labels = data.map((item, index) => {
      const x = pad.left + (chartW / Math.max(1, data.length - 1)) * index;
      return `<text class="nexus-date-label" x="${x}" y="${height - 14}" text-anchor="middle">${formatDateLabel(item.date)}</text>`;
    }).join("");
    const dots = points.map(({ x, y, item }) => `<g class="nexus-point" tabindex="0"><circle class="telemetry-dot" cx="${x}" cy="${y}" r="5"><title>${formatNumber(item.value)} ${formatDateLabel(item.date)}</title></circle></g>`).join("");
    chartEl.className = "dashboard-chart nexus-telemetry-chart";
    chartEl.innerHTML = `<div class="nexus-trend-canvas"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("Creations daily downloads chart")}" preserveAspectRatio="xMidYMid meet"><polyline class="nexus-chart-line nexus-chart-line-glow" points="${linePoints}" fill="none" stroke="rgba(116, 217, 255, 0.35)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"></polyline><polyline class="nexus-chart-line" points="${linePoints}" fill="none" stroke="rgba(116, 217, 255, 0.98)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>${dots}${labels}</svg>${points.map(({ x, y, item }) => `<span class="nexus-html-tooltip" style="left:${(x / width) * 100}%; top:${(y / height) * 100}%">${formatNumber(item.value)}</span>`).join("")}</div>`;
  }

  async function loadModDailyRows() {
    const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const rows = parseCSV(await response.text());
    return rows.length ? rows : null;
  }
  function scheduleRender() { clearTimeout(rerenderTimer); rerenderTimer = setTimeout(() => renderChart(cachedModDailyRows), 120); }
  loadModDailyRows().then((modDailyRows) => { cachedModDailyRows = modDailyRows; renderChart(modDailyRows); }).catch(() => updateDailySummary(null));
  document.addEventListener("click", (event) => { if (event.target.closest(".language-option[data-lang]")) window.setTimeout(scheduleRender, 80); });
  window.addEventListener("focus", scheduleRender);
  window.addEventListener("storage", scheduleRender);
})();
