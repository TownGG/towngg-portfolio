(() => {
  const chartEl = document.querySelector("[data-creations-chart]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const numberFormatter = new Intl.NumberFormat("en-US");
  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.04.41-preview";
  let cachedRows = [];
  let cachedModDailyRows = [];
  let isRendering = false;
  let rerenderTimer = 0;

  const copy = {
    title: {
      zh: "7 日 Creations 下载趋势",
      ja: "7日間 Creations ダウンロードトレンド",
      ko: "7일 Creations 다운로드 추세",
      ru: "Тренд загрузок Creations за 7 дней",
      fr: "Tendance des téléchargements Creations sur 7 jours"
    },
    note: {
      zh: "基于 CC 历史记录的每日下载趋势。最新快照：",
      ja: "CC 履歴に基づく日次ダウンロード推移です。最新スナップショット：",
      ko: "CC 기록을 기반으로 한 일일 다운로드 추세입니다. 최신 스냅샷:",
      ru: "Ежедневный тренд загрузок на основе истории CC. Последний снимок:",
      fr: "Tendance des téléchargements quotidiens basée sur l’historique CC. Dernier instantané :"
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

  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function compactNumber(value) {
    const number = Number(value || 0);
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
    return numberFormatter.format(number);
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

  function snapshotsGroupedByDay(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const total = toNumber(row.total_downloads);
      const timestamp = String(row.timestamp || "");
      const current = groups.get(row.date) || { date: row.date, first: row, last: row, firstTotal: total, lastTotal: total };
      if (!current.first || timestamp < String(current.first.timestamp || "")) {
        current.first = row;
        current.firstTotal = total;
      }
      if (!current.last || timestamp > String(current.last.timestamp || "")) {
        current.last = row;
        current.lastTotal = total;
      }
      groups.set(row.date, current);
    });
    return [...groups.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function buildDailySeries(rows) {
    const groups = snapshotsGroupedByDay(rows);
    if (!groups.length) return [];
    return groups.map((group, index) => {
      const current = group.lastTotal;
      const previous = index > 0 ? groups[index - 1].lastTotal : group.firstTotal;
      return { date: group.date, value: Math.max(0, current - previous), total: current };
    }).slice(-7);
  }

  function latestModDailyTotal(rows) {
    if (!rows.length) return null;
    const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1);
    if (!latestDate) return null;
    return rows.filter((row) => row.date === latestDate).reduce((sum, row) => sum + toNumber(row.daily_downloads), 0);
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
    const perModDailyTotal = latestModDailyTotal(cachedModDailyRows);
    const dailyDownloads = perModDailyTotal ?? data.at(-1)?.value ?? 0;
    target.dataset.creationsTrendSummary = "true";
    target.innerHTML = [
      ["Daily Downloads", dailyDownloads],
      ["Likes", totals.likes],
      ["Downloads", totals.downloads],
      ["Plays", totals.plays],
      ["Library Adds", totals.libraryAdds]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${tr(label)}</span>
        <strong>${numberFormatter.format(value)}</strong>
      </article>
    `).join("");
  }

  function pointLine(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  }

  function renderHeader(latestDate) {
    if (!toolbar) return;
    toolbar.className = "dashboard-toolbar telemetry-chart-header";
    const note = lang() === "en"
      ? `Daily downloads from tracked CC history. Latest snapshot: ${formatDateLabel(latestDate)}.`
      : `${localCopy("note", "")} ${formatDateLabel(latestDate)}.`;
    toolbar.innerHTML = `
      <div>
        <h3>${localCopy("title", "7-Day Creations Downloads Trend")}</h3>
        <p class="telemetry-note">${note}</p>
      </div>
      <span class="telemetry-pill">${tr("Daily downloads")}</span>
    `;
  }

  function renderChart(rows) {
    if (isRendering) return;
    isRendering = true;
    const data = buildDailySeries(rows);
    updateDailySummary(data);
    const latestDate = data.at(-1)?.date || "";
    renderHeader(latestDate);
    panel?.classList.add("telemetry-chart-panel");

    if (!data.length) {
      chartEl.className = "telemetry-chart telemetry-error";
      chartEl.textContent = tr("No Creations history data available yet. It will appear after the next scheduled CC sync.");
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
    chartEl.dataset.trendRenderer = "creations-telemetry";
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="7-day Creations downloads trend chart" preserveAspectRatio="xMidYMid meet">
        ${gridRows}
        <polygon class="telemetry-area" points="${areaPoints}" />
        <polyline class="telemetry-line" points="${pointLine(points)}" />
        ${dots}
        ${labels}
      </svg>
    `;
    isRendering = false;
  }

  async function loadRows() {
    const response = await fetch(`./assets/data/creations-history.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    return parseCSV(await response.text());
  }

  async function loadModDailyRows() {
    const response = await fetch(`./assets/data/creations-mod-daily.csv?v=${encodeURIComponent(storedVersion)}&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    return parseCSV(await response.text());
  }

  function scheduleRender(delay = 80) {
    if (!cachedRows.length) return;
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => renderChart(cachedRows), delay);
  }

  function installRenderGuard() {
    const summary = document.querySelector("[data-creations-summary]");
    const observer = new MutationObserver(() => {
      if (isRendering || !cachedRows.length) return;
      const summaryReady = summary?.dataset.creationsTrendSummary === "true";
      const chartReady = chartEl.dataset.trendRenderer === "creations-telemetry";
      if (!summaryReady || !chartReady) scheduleRender(40);
    });
    if (summary) observer.observe(summary, { childList: true, subtree: true, attributes: true });
    observer.observe(chartEl, { childList: true, subtree: false, attributes: true });
  }

  Promise.all([loadRows(), loadModDailyRows()]).then(([rows, modDailyRows]) => {
    cachedRows = rows;
    cachedModDailyRows = modDailyRows;
    installRenderGuard();
    [0, 450, 1400, 2600].forEach((delay) => setTimeout(() => renderChart(rows), delay));
  }).catch(() => updateDailySummary([]));

  window.addEventListener("focus", () => scheduleRender(80));
  window.addEventListener("storage", () => scheduleRender(80));
  window.addEventListener("towngg:languagechange", () => scheduleRender(30));
})();
