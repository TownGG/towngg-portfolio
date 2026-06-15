(() => {
  const chartEl = document.querySelector("[data-dashboard-chart]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const numberFormatter = new Intl.NumberFormat("en-US");
  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.03.11-preview";
  let cachedRows = [];
  let isRendering = false;
  let rerenderTimer = 0;

  const copy = {
    title: {
      zh: "7 日 Nexus 下载趋势",
      ja: "7日間 Nexus ダウンロードトレンド",
      ko: "7일 Nexus 다운로드 추세",
      ru: "Тренд загрузок Nexus за 7 дней",
      fr: "Tendance des téléchargements Nexus sur 7 jours"
    },
    note: {
      zh: "基于 Nexus 历史记录的每日下载趋势。最新快照：",
      ja: "Nexus 履歴に基づく日次ダウンロード推移です。最新スナップショット：",
      ko: "Nexus 기록을 기반으로 한 일일 다운로드 추세입니다. 최신 스냅샷:",
      ru: "Ежедневный тренд загрузок на основе истории Nexus. Последний снимок:",
      fr: "Tendance des téléchargements quotidiens basée sur l’historique Nexus. Dernier instantané :"
    }
  };

  function lang() {
    return window.tggCurrentLanguage || localStorage.getItem("towngg_language") || "en";
  }

  function tr(text) {
    return typeof window.tggTranslate === "function" ? window.tggTranslate(text) : text;
  }

  function localCopy(key, fallback) {
    return copy[key]?.[lang()] || fallback;
  }

  function compactNumber(value) {
    const number = Number(value || 0);
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
    return numberFormatter.format(number);
  }

  function dashboardNumber(value) {
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

  function formatDateLabel(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value || "").slice(5);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function buildDailySeries(rows) {
    const values = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      values.set(row.date, (values.get(row.date) || 0) + dashboardNumber(row.daily_downloads));
    });

    return [...values.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, value]) => ({ date, value }));
  }

  function pointLine(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  }

  function renderHeader(latestDate) {
    if (!toolbar) return;
    toolbar.className = "dashboard-toolbar telemetry-chart-header";
    const note = lang() === "en"
      ? `Daily downloads from tracked Nexus history. Latest snapshot: ${formatDateLabel(latestDate)}.`
      : `${localCopy("note", "")} ${formatDateLabel(latestDate)}.`;
    toolbar.innerHTML = `
      <div>
        <h3>${localCopy("title", "7-Day Nexus Downloads Trend")}</h3>
        <p class="telemetry-note">${note}</p>
      </div>
      <span class="telemetry-pill">${tr("Daily downloads")}</span>
    `;
  }

  function renderChart(rows) {
    if (isRendering) return;
    isRendering = true;

    const data = buildDailySeries(rows);
    const latestDate = data.at(-1)?.date || "";
    renderHeader(latestDate);
    panel?.classList.add("telemetry-chart-panel");

    if (!data.length) {
      chartEl.className = "telemetry-chart telemetry-error";
      chartEl.textContent = tr("No Nexus data available yet.");
      isRendering = false;
      return;
    }

    const width = 920;
    const height = 260;
    const padX = 54;
    const padTop = 26;
    const padBottom = 44;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const values = data.map((item) => Number(item.value));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const valueRange = Math.max(maxValue - minValue, 1);

    const points = data.map((item, index) => {
      const x = padX + (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * index);
      const y = padTop + chartH - ((Number(item.value) - minValue) / valueRange) * chartH;
      return { x, y, item };
    });

    const areaPoints = [
      `${points[0].x.toFixed(2)},${(height - padBottom).toFixed(2)}`,
      pointLine(points),
      `${points[points.length - 1].x.toFixed(2)},${(height - padBottom).toFixed(2)}`
    ].join(" ");

    const gridRows = [0, 1, 2, 3].map((step) => {
      const y = padTop + (chartH / 3) * step;
      return `<line class="telemetry-grid-line" x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" />`;
    }).join("");

    const labels = points.map(({ x, item }) => `<text x="${x}" y="${height - 14}" text-anchor="middle">${formatDateLabel(item.date)}</text>`).join("");
    const dots = points.map(({ x, y, item }) => `
      <circle class="telemetry-dot" cx="${x}" cy="${y}" r="5">
        <title>${formatDateLabel(item.date)}: ${compactNumber(item.value)} downloads</title>
      </circle>
    `).join("");

    chartEl.className = "telemetry-chart";
    chartEl.dataset.trendRenderer = "nexus-telemetry";
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="7-day Nexus downloads trend chart" preserveAspectRatio="xMidYMid meet">
        ${gridRows}
        <polygon class="telemetry-area" points="${areaPoints}" />
        <polyline class="telemetry-line" points="${pointLine(points)}" />
        ${dots}
        ${labels}
      </svg>
    `;
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
      if (chartEl.dataset.trendRenderer !== "nexus-telemetry") {
        scheduleRender(40);
      }
    });
    observer.observe(chartEl, { childList: true, subtree: false, attributes: true });
    window.addEventListener("load", () => scheduleRender(80));
  }

  async function init() {
    try {
      installLegacyChartGuard();
      const response = await fetch(`./assets/data/nexus-history.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Nexus history could not be loaded.");
      cachedRows = parseCSV(await response.text());
      if (!cachedRows.length) return;
      [0, 450, 1400].forEach((delay) => window.setTimeout(() => renderChart(cachedRows), delay));
    } catch (error) {
      console.warn("Nexus trend fix skipped", error);
    }
  }

  window.addEventListener("towngg:languagechange", () => scheduleRender(30));
  init();
})();
