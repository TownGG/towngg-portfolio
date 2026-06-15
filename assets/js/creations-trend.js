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
      zh: "Creations 发布活动基于已跟踪的 CC 历史记录。显示 CSV 历史中的实际每日下载量。最新快照：",
      ja: "Creations の公開アクティビティは追跡済み CC 履歴に基づきます。CSV 履歴から実際の日次ダウンロードを表示しています。最新スナップショット：",
      ko: "Creations 릴리스 활동은 추적된 CC 기록을 기반으로 합니다. CSV 기록의 실제 일일 다운로드를 표시합니다. 최신 스냅샷:",
      ru: "Активность Creations основана на отслеживаемой истории CC. Показаны фактические ежедневные загрузки из CSV. Последний снимок:",
      fr: "L’activité Creations est basée sur l’historique CC suivi. Affiche les téléchargements quotidiens réels depuis l’historique CSV. Dernier instantané :"
    }
  };

  function lang() {
    return window.tggCurrentLanguage || localStorage.getItem("towngg_language") || "en";
  }

  function tr(text) {
    return typeof window.tggTranslate === "function" ? window.tggTranslate(text) : text;
  }

  function localCopy(key, fallback) {
    const current = lang();
    return copy[key]?.[current] || fallback;
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

    const daily = groups.map((group, index) => {
      const current = group.lastTotal;
      const previous = index > 0 ? groups[index - 1].lastTotal : group.firstTotal;
      return {
        date: group.date,
        value: Math.max(0, current - previous),
        total: current
      };
    });

    return daily.slice(-7);
  }

  function latestModDailyTotal(rows) {
    if (!rows.length) return null;
    const latestDate = rows.map((row) => row.date).filter(Boolean).sort().at(-1);
    if (!latestDate) return null;
    return rows
      .filter((row) => row.date === latestDate)
      .reduce((sum, row) => sum + toNumber(row.daily_downloads), 0);
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

  function renderChart(rows) {
    if (isRendering) return;
    isRendering = true;

    const data = buildDailySeries(rows);
    updateDailySummary(data);

    if (!data.length) {
      chartEl.innerHTML = `<p class="section-desc">${tr("No Creations history data available yet. It will appear after the next scheduled CC sync.")}</p>`;
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

    const areaPoints = [
      `${points[0].x.toFixed(2)},${(height - padBottom).toFixed(2)}`,
      pointLine(points),
      `${points[points.length - 1].x.toFixed(2)},${(height - padBottom).toFixed(2)}`,
    ].join(" ");

    const gridRows = [0, 1, 2, 3, 4].map((step) => {
      const y = padTop + (chartH / 4) * step;
      const label = Math.round(yMax * (1 - step / 4));
      return `
        <line class="telemetry-grid-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" />
        <text class="nexus-axis-label" x="14" y="${y + 5}">${numberFormatter.format(label)}</text>
      `;
    }).join("");

    const labels = points.map(({ x, item }) => `<text class="nexus-date-label" x="${x}" y="${height - 14}" text-anchor="middle">${formatDateLabel(item.date)}</text>`).join("");
    const dots = points.map(({ x, y, item }) => `
      <g class="nexus-point" tabindex="0" aria-label="${numberFormatter.format(item.value)} daily downloads on ${item.date}">
        <circle class="telemetry-dot" cx="${x}" cy="${y}" r="5"></circle>
      </g>
    `).join("");

    const latestDate = data.at(-1)?.date || "";
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const note = lang() === "en"
      ? `Creations release activity based on tracked CC history. Showing actual daily downloads from CSV history. Latest snapshot: ${formatDateLabel(latestDate)}.`
      : `${localCopy("note", "")} ${formatDateLabel(latestDate)}.`;

    panel?.classList.add("is-nexus-trend-panel");
    toolbar?.classList.add("is-hidden-for-nexus-trend");
    chartEl.className = "dashboard-chart nexus-telemetry-chart";
    chartEl.dataset.trendRenderer = "creations-trend";
    chartEl.innerHTML = `
      <div class="nexus-trend-shell" data-trend-renderer="creations-trend">
        <div class="nexus-trend-header">
          <div>
            <h3>${localCopy("title", "7-Day Creations Downloads Trend")}</h3>
            <p>${note}</p>
          </div>
          <span class="telemetry-pill">${tr("Daily downloads")}</span>
        </div>
        <div class="nexus-trend-canvas">
          <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Accurate Creations daily downloads trend chart" preserveAspectRatio="xMidYMid meet">
            ${gridRows}
            <polygon class="telemetry-area" points="${areaPoints}" />
            <polyline class="telemetry-line" points="${pointLine(points)}" />
            ${dots}
            ${labels}
          </svg>
          ${points.map(({ x, y, item }) => `
            <span class="nexus-html-tooltip" style="left:${(x / width) * 100}%; top:${(y / height) * 100}%">${numberFormatter.format(item.value)}</span>
          `).join("")}
        </div>
      </div>
    `;

    chartEl.dataset.trendTotal = String(total);
    chartEl.dataset.trendLatestDate = latestDate;
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
      const chartReady = chartEl.dataset.trendRenderer === "creations-trend";
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
