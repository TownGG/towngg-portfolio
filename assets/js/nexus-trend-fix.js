(() => {
  const chartEl = document.querySelector("[data-dashboard-chart]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const translations = {
    "zh-CN": {
      "No Nexus history data available yet.": "暂时没有可展示的 Nexus 历史数据。",
      "7-Day Nexus Downloads Trend": "近 7 日 Nexus 下载趋势",
      "Nexus trend note": "展示最近 7 日 Nexus 下载趋势。最后日期：{date}。",
      "Daily downloads": "每日下载",
      "7-Day Avg Downloads": "近7日日均下载",
      "Accurate Nexus daily downloads trend chart": "Nexus 每日下载趋势图",
      "daily downloads on": "每日下载，日期"
    },
    "zh-TW": {
      "No Nexus history data available yet.": "暫時沒有可顯示的 Nexus 歷史資料。",
      "7-Day Nexus Downloads Trend": "近 7 日 Nexus 下載趨勢",
      "Nexus trend note": "顯示最近 7 日 Nexus 下載趨勢。最後日期：{date}。",
      "Daily downloads": "每日下載",
      "7-Day Avg Downloads": "近7日日均下載",
      "Accurate Nexus daily downloads trend chart": "Nexus 每日下載趨勢圖",
      "daily downloads on": "每日下載，日期"
    },
    ja: {
      "No Nexus history data available yet.": "表示できるNexus履歴データがありません。",
      "7-Day Nexus Downloads Trend": "直近7日間のNexusダウンロード推移",
      "Nexus trend note": "直近7日間のNexusダウンロード推移を表示します。最終日：{date}。",
      "Daily downloads": "日別ダウンロード",
      "7-Day Avg Downloads": "過去7日平均ダウンロード",
      "Accurate Nexus daily downloads trend chart": "Nexus日別ダウンロード推移チャート",
      "daily downloads on": "日別ダウンロード 日付"
    },
    ko: {
      "No Nexus history data available yet.": "표시할 Nexus 기록 데이터가 없습니다.",
      "7-Day Nexus Downloads Trend": "최근 7일 Nexus 다운로드 추세",
      "Nexus trend note": "최근 7일 Nexus 다운로드 추세를 표시합니다. 마지막 날짜: {date}.",
      "Daily downloads": "일일 다운로드",
      "7-Day Avg Downloads": "최근 7일 일평균 다운로드",
      "Accurate Nexus daily downloads trend chart": "Nexus 일일 다운로드 추세 차트",
      "daily downloads on": "일일 다운로드, 날짜"
    },
    ru: {
      "No Nexus history data available yet.": "Нет данных Nexus для отображения.",
      "7-Day Nexus Downloads Trend": "Тренд загрузок Nexus за последние 7 дней",
      "Nexus trend note": "Показаны последние 7 дней загрузок Nexus. Последняя дата: {date}.",
      "Daily downloads": "Ежедневные загрузки",
      "7-Day Avg Downloads": "Среднее за 7 дней",
      "Accurate Nexus daily downloads trend chart": "График ежедневных загрузок Nexus",
      "daily downloads on": "ежедневных загрузок, дата"
    },
    en: {
      "7-Day Avg Downloads": "7-Day Avg Downloads"
    }
  };

  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.05.202607031000-preview";
  let cachedRows = [];
  let isRendering = false;
  let rerenderTimer = 0;

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en";
  }

  function locale() {
    return lang() === "zh-CN" ? "zh-CN" : lang() === "zh-TW" ? "zh-TW" : lang() === "ja" ? "ja-JP" : lang() === "ko" ? "ko-KR" : lang() === "ru" ? "ru-RU" : "en-US";
  }

  function t(key, replacements = {}) {
    let value = translations[lang()]?.[key] || translations.en?.[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, replacement);
    });
    return value;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(Number(value || 0));
  }

  function dashboardNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function todayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

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
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
  }

  function formatDateLabel(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value || "").slice(5);
    return date.toLocaleDateString(locale(), { month: "short", day: "numeric" });
  }

  function latestRowsByMod(rows) {
    const latest = new Map();
    rows.forEach((row, order) => {
      const key = row.mod_id || row.mod_url || row.mod_name || String(order);
      const current = latest.get(key);
      const currentOrder = current ? `${current.date || ""}:${current.__order || 0}` : "";
      const nextOrder = `${row.date || ""}:${order}`;
      if (!current || nextOrder > currentOrder) latest.set(key, { ...row, __order: order });
    });
    return [...latest.values()];
  }

  function latestRowsForDate(rows, date) {
    const latest = new Map();
    rows.forEach((row, order) => {
      if (row.date !== date) return;
      const key = row.mod_id || row.mod_url || row.mod_name || String(order);
      latest.set(key, { ...row, __order: order });
    });
    return [...latest.values()];
  }

  function selectedDailyDate(rows) {
    const today = todayKey();
    if (rows.some((row) => row.date === today)) return today;
    return rows.map((row) => row.date).filter(Boolean).sort().at(-1) || "";
  }

  function updateDashboardSummary(rows) {
    const target = document.querySelector("[data-dashboard-summary]");
    if (!target) return;

    const latest = latestRowsByMod(rows);
    const date = selectedDailyDate(rows);
    const dailyRows = latestRowsForDate(rows, date);
    const totals = latest.reduce((sum, row) => {
      sum.unique += dashboardNumber(row.unique_downloads);
      sum.total += dashboardNumber(row.total_downloads);
      sum.likes += dashboardNumber(row.likes);
      return sum;
    }, { unique: 0, total: 0, likes: 0 });
    const daily = dailyRows.reduce((sum, row) => sum + dashboardNumber(row.daily_downloads), 0);

    target.innerHTML = [
      ["Unique Downloads", totals.unique],
      ["Daily Downloads", daily],
      ["Total Downloads", totals.total],
      ["Endorsements", totals.likes]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${label}</span>
        <strong>${formatNumber(value)}</strong>
      </article>
    `).join("");
  }

  function buildDailySeries(rows) {
    const values = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      values.set(row.date, (values.get(row.date) || 0) + dashboardNumber(row.daily_downloads));
    });
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, value]) => ({ date, value }));
  }

  function trendAverageLabel(series) {
    const label = t("7-Day Avg Downloads");
    const separator = ["zh-CN", "zh-TW", "ja"].includes(lang()) ? "：" : ": ";
    if (!series?.length) return `${label}${separator}—`;
    const total = series.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const avg = Math.round(total / Math.max(series.length, 1));
    return `${label}${separator}${formatNumber(avg)}`;
  }

  function pointLine(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  }

  function renderChart(rows) {
    if (isRendering) return;
    isRendering = true;
    updateDashboardSummary(rows || []);
    const data = buildDailySeries(rows || []);
    if (!data.length) {
      chartEl.innerHTML = `<p class="section-desc">${t("No Nexus history data available yet.")}</p>`;
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
    const values = data.map((item) => Number(item.value));
    const maxValue = Math.max(...values, 1);
    const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    const points = data.map((item, index) => {
      const x = padLeft + (chartW / Math.max(1, data.length - 1)) * index;
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
    const latestDate = data.at(-1)?.date || "";
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const note = t("Nexus trend note", { date: formatDateLabel(latestDate) });

    panel?.classList.add("is-nexus-trend-panel");
    toolbar?.classList.add("is-hidden-for-nexus-trend");
    chartEl.className = "dashboard-chart nexus-telemetry-chart";
    chartEl.dataset.trendRenderer = "nexus-trend-fix";
    chartEl.innerHTML = `<div class="nexus-trend-shell" data-trend-renderer="nexus-trend-fix"><div class="nexus-trend-header"><div><h3>${t("7-Day Nexus Downloads Trend")}</h3><p>${note}</p></div><span class="telemetry-pill telemetry-pill-heading">${trendAverageLabel(data)}</span></div><div class="nexus-trend-canvas"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("Accurate Nexus daily downloads trend chart")}" preserveAspectRatio="xMidYMid meet">${gridRows}<polygon class="telemetry-area" points="${areaPoints}" /><polyline class="telemetry-line" points="${pointLine(points)}" />${dots}${labels}</svg>${points.map(({ x, y, item }) => `<span class="nexus-html-tooltip" style="left:${(x / width) * 100}%; top:${(y / height) * 100}%">${formatNumber(item.value)}</span>`).join("")}</div></div>`;
    chartEl.dataset.trendTotal = String(total);
    chartEl.dataset.trendLatestDate = latestDate;
    isRendering = false;
  }

  function scheduleRender(delay = 60) {
    if (!cachedRows.length) return;
    window.clearTimeout(rerenderTimer);
    rerenderTimer = window.setTimeout(() => renderChart(cachedRows), delay);
  }

  function installLegacyChartGuard() {
    const observer = new MutationObserver(() => {
      if (isRendering || !cachedRows.length) return;
      if (!chartEl.querySelector('[data-trend-renderer="nexus-trend-fix"]')) scheduleRender(40);
    });
    observer.observe(chartEl, { childList: true, subtree: false });
    window.addEventListener("load", () => scheduleRender(80));
  }

  async function init() {
    try {
      installTrendPillHeadingStyles();
      installLegacyChartGuard();
      const response = await fetch(`./assets/data/nexus-history.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Nexus history could not be loaded.");
      cachedRows = parseCSV(await response.text());
      if (!cachedRows.length) return;
      updateDashboardSummary(cachedRows);
      window.setTimeout(() => renderChart(cachedRows), 0);
      window.setTimeout(() => renderChart(cachedRows), 450);
      window.setTimeout(() => renderChart(cachedRows), 1400);
    } catch (error) { console.warn("Nexus trend fix skipped", error); }
  }

  document.addEventListener("click", (event) => { if (event.target.closest(".language-option[data-lang]")) window.setTimeout(() => scheduleRender(80), 90); });
  init();
})();