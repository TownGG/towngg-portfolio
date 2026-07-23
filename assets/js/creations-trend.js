(() => {
  const chartEl = document.querySelector("[data-creations-chart]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const translations = {
    "zh-CN": { Updated: "更新于 {time}", "7-Day Creations Downloads Trend": "前 7 日 Creations 下载趋势", "Creations trend note": "不统计今日数据，展示截至昨日的前 7 日下载趋势。最后日期：{date}。", "7-Day Avg Downloads": "近7日日均下载", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "暂时没有可展示的前 7 日 Creations 每日数据。", "Creations daily downloads chart": "Creations 每日下载图表", "daily downloads on": "每日下载，日期" },
    "zh-TW": { Updated: "更新於 {time}", "7-Day Creations Downloads Trend": "前 7 日 Creations 下載趨勢", "Creations trend note": "不統計今日資料，顯示截至昨日的前 7 日下載趨勢。最後日期：{date}。", "7-Day Avg Downloads": "近7日日均下載", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "暫時沒有可顯示的前 7 日 Creations 每日資料。", "Creations daily downloads chart": "Creations 每日下載圖表", "daily downloads on": "每日下載，日期" },
    ja: { Updated: "更新 {time}", "7-Day Creations Downloads Trend": "過去7日間のCreationsダウンロード推移", "Creations trend note": "今日のデータは含めず、昨日までの過去7日間を表示します。最終日：{date}。", "7-Day Avg Downloads": "過去7日平均ダウンロード", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "表示できる過去7日間のCreations日別データがありません。", "Creations daily downloads chart": "Creations日別ダウンロードチャート", "daily downloads on": "日別ダウンロード 日付" },
    ko: { Updated: "업데이트 {time}", "7-Day Creations Downloads Trend": "이전 7일 Creations 다운로드 추세", "Creations trend note": "오늘 데이터는 제외하고 어제까지의 이전 7일 다운로드 추세를 표시합니다. 마지막 날짜: {date}.", "7-Day Avg Downloads": "최근 7일 일평균 다운로드", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "표시할 이전 7일 Creations 일일 데이터가 없습니다.", "Creations daily downloads chart": "Creations 일일 다운로드 차트", "daily downloads on": "일일 다운로드, 날짜" },
    ru: { Updated: "Обновлено {time}", "7-Day Creations Downloads Trend": "Тренд загрузок Creations за предыдущие 7 дней", "Creations trend note": "Сегодняшние данные не учитываются; показаны предыдущие 7 дней до вчера. Последняя дата: {date}.", "7-Day Avg Downloads": "Среднее за 7 дней", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "Нет данных Creations за предыдущие 7 дней для отображения.", "Creations daily downloads chart": "График ежедневных загрузок Creations", "daily downloads on": "ежедневных загрузок, дата" },
    en: { Updated: "Updated {time}", "7-Day Creations Downloads Trend": "7-Day Creations Downloads Trend", "Creations trend note": "Today is excluded. Showing the previous 7 days through yesterday. Last date: {date}.", "7-Day Avg Downloads": "7-Day Avg Downloads", "No Creations daily data available yet. It will appear after the next scheduled CC sync.": "No previous 7-day Creations daily data is available yet.", "Creations daily downloads chart": "Creations daily downloads chart", "daily downloads on": "daily downloads on" }
  };

  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.05.202607031000-preview";
  let cachedModDailyRows = null;
  let isRendering = false;
  let rerenderTimer = 0;

  function lang() { const value = localStorage.getItem("townggSiteLang"); return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en"; }
  function locale() { return lang() === "zh-CN" ? "zh-CN" : lang() === "zh-TW" ? "zh-TW" : lang() === "ja" ? "ja-JP" : lang() === "ko" ? "ko-KR" : lang() === "ru" ? "ru-RU" : "en-US"; }
  function t(key, replacements = {}) { let value = translations[lang()]?.[key] || translations.en?.[key] || key; Object.entries(replacements).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, replacement); }); return value; }
  function toNumber(value) { const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
  function formatNumber(value) { return new Intl.NumberFormat(locale()).format(toNumber(value)); }
  function formatDateLabel(value) { const date = new Date(`${value}T00:00:00`); if (Number.isNaN(date.getTime())) return String(value || "").slice(5); return date.toLocaleDateString(locale(), { month: "short", day: "numeric" }); }
  function todayKey() { const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; }

  function installTrendPillHeadingStyles() {
    if (document.getElementById("trend-pill-heading-style")) return;
    const style = document.createElement("style");
    style.id = "trend-pill-heading-style";
    style.textContent = `
      .nexus-trend-header h3,
      .telemetry-pill.telemetry-pill-heading {
        font-family: "Rajdhani", sans-serif;
        font-size: 30px;
        line-height: 1;
        margin: 0;
      }
      .telemetry-pill.telemetry-pill-heading {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #e9f8ff;
        box-shadow: none;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: none;
      }
    `;
    document.head.appendChild(style);
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
    rows.forEach((row) => { const key = row.last_updated || ""; const current = groups.get(key) || []; current.push(row); groups.set(key, current); });
    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, snapshotRows]) => snapshotTotal(snapshotRows) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || rows;
  }
  function allDailySeries(rows) {
    const groups = new Map();
    rows.forEach((row) => { if (!row.date) return; const current = groups.get(row.date) || []; current.push(row); groups.set(row.date, current); });
    return [...groups.entries()].map(([date, dateRows]) => ({ date, value: snapshotTotal(latestSnapshotRows(dateRows)) })).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  function previousSevenDaySeries(rows) {
    if (window.townggCreationsDailyState?.previousSevenSeries?.length) return window.townggCreationsDailyState.previousSevenSeries;
    const today = todayKey();
    return allDailySeries(rows || []).filter((item) => item.date < today).slice(-7);
  }
  function trendAverageLabel(series) {
    const label = t("7-Day Avg Downloads");
    const separator = ["zh-CN", "zh-TW", "ja"].includes(lang()) ? "：" : ": ";
    if (!series?.length) return `${label}${separator}—`;
    const total = series.reduce((sum, item) => sum + toNumber(item.value), 0);
    const avg = Math.round(total / Math.max(series.length, 1));
    return `${label}${separator}${formatNumber(avg)}`;
  }
  function pointLine(points) { return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "); }

  function parseTimestamp(value) {
    const raw = String(value || "").trim();
    if (!raw) return 0;
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  function formatDashboardTime(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return raw;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  function updateCreationsTimestamp() {
    const target = document.querySelector("[data-creations-updated]");
    if (!target) return;
    const latest = (window.siteData?.creations || [])
      .map((item) => String(item.updatedAt || "").trim())
      .filter(Boolean)
      .sort((a, b) => parseTimestamp(b) - parseTimestamp(a))[0] || "";
    if (!latest) return;
    target.classList.add("is-fresh");
    target.textContent = t("Updated", { time: formatDashboardTime(latest) });
    target.title = "Latest Bethesda Creations browser capture timestamp.";
  }

  function renderChart(rows) {
    if (isRendering) return;
    isRendering = true;
    const chartData = previousSevenDaySeries(rows || []);
    updateCreationsTimestamp();
    if (!chartData.length) {
      chartEl.innerHTML = `<p class="section-desc">${t("No Creations daily data available yet. It will appear after the next scheduled CC sync.")}</p>`;
      isRendering = false;
      return;
    }

    const width = 920;
    const height = 260;
    const padLeft = 64;
    const padRight = 38;
    const padTop = 24;
    const padBottom = 44;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const values = chartData.map((item) => Number(item.value));
    const maxValue = Math.max(...values, 1);
    const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    const points = chartData.map((item, index) => {
      const x = padLeft + (chartW / Math.max(1, chartData.length - 1)) * index;
      const y = padTop + chartH - (Number(item.value) / yMax) * chartH;
      return { x, y, item };
    });
    const areaPoints = [`${points[0].x.toFixed(2)},${(height - padBottom).toFixed(2)}`, pointLine(points), `${points[points.length - 1].x.toFixed(2)},${(height - padBottom).toFixed(2)}`].join(" ");
    const gridRows = [0, 1, 2, 3, 4].map((step) => {
      const y = padTop + (chartH / 4) * step;
      const label = Math.round(yMax * (1 - step / 4));
      return `<line class="telemetry-grid-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" /><text class="nexus-axis-label" x="14" y="${y + 5}">${formatNumber(label)}</text>`;
    }).join("");
    const labels = points.map(({ x, item }) => `<text class="nexus-date-label" x="${x}" y="${height - 14}" text-anchor="middle">${formatDateLabel(item.date)}</text>`).join("");
    const dots = points.map(({ x, y, item }) => `<g class="nexus-point" tabindex="0" aria-label="${formatNumber(item.value)} ${t("daily downloads on")} ${formatDateLabel(item.date)}"><circle class="telemetry-dot" cx="${x}" cy="${y}" r="5"></circle></g>`).join("");
    const latestDate = chartData.at(-1)?.date || "";
    const note = t("Creations trend note", { date: formatDateLabel(latestDate) });

    panel?.classList.add("is-nexus-trend-panel");
    toolbar?.classList.add("is-hidden-for-nexus-trend");
    chartEl.className = "dashboard-chart nexus-telemetry-chart";
    chartEl.dataset.trendRenderer = "creations-trend";
    chartEl.innerHTML = `<div class="nexus-trend-shell" data-trend-renderer="creations-trend"><div class="nexus-trend-header"><div><h3>${t("7-Day Creations Downloads Trend")}</h3><p>${note}</p></div><span class="telemetry-pill telemetry-pill-heading">${trendAverageLabel(chartData)}</span></div><div class="nexus-trend-canvas"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("Creations daily downloads chart")}" preserveAspectRatio="xMidYMid meet">${gridRows}<polygon class="telemetry-area" points="${areaPoints}" /><polyline class="telemetry-line" points="${pointLine(points)}" />${dots}${labels}</svg>${points.map(({ x, y, item }) => `<span class="nexus-html-tooltip" style="left:${(x / width) * 100}%; top:${(y / height) * 100}%">${formatNumber(item.value)}</span>`).join("")}</div></div>`;
    isRendering = false;
  }

  function scheduleRender(delay = 80) {
    window.clearTimeout(rerenderTimer);
    rerenderTimer = window.setTimeout(() => renderChart(cachedModDailyRows || []), delay);
  }

  async function loadModDailyRows() {
    const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const rows = parseCSV(await response.text());
    return rows.length ? rows : null;
  }

  installTrendPillHeadingStyles();
  window.setTimeout(updateCreationsTimestamp, 120);
  window.setTimeout(updateCreationsTimestamp, 600);
  loadModDailyRows().then((modDailyRows) => {
    cachedModDailyRows = modDailyRows;
    renderChart(modDailyRows);
    window.setTimeout(updateCreationsTimestamp, 1200);
  }).catch(() => { updateCreationsTimestamp(); });
  window.addEventListener("towngg:creations-daily-ready", () => scheduleRender(20));
  document.addEventListener("click", (event) => { if (event.target.closest(".language-option[data-lang]")) window.setTimeout(() => { scheduleRender(80); updateCreationsTimestamp(); }, 90); });
  window.addEventListener("focus", () => { scheduleRender(80); updateCreationsTimestamp(); });
  window.addEventListener("storage", () => { scheduleRender(80); updateCreationsTimestamp(); });
})();