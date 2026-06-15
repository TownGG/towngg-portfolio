(() => {
  const chartEl = document.querySelector("[data-creations-chart]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl) return;

  const numberFormatter = new Intl.NumberFormat("en-US");
  const storedVersion = localStorage.getItem("townggSiteVersion") || "v2.04.41-preview";
  let cachedRows = [];
  let isRendering = false;
  let rerenderTimer = 0;

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
    const dailyDownloads = data.at(-1)?.value || 0;

    target.innerHTML = [
      ["Daily Downloads", dailyDownloads],
      ["Likes", totals.likes],
      ["Total Downloads", totals.downloads],
      ["Plays", totals.plays],
      ["Library Adds", totals.libraryAdds]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${label}</span>
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
      chartEl.innerHTML = '<p class="section-desc">No Creations history data available yet. It will appear after the next scheduled CC sync.</p>';
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

    const bars = data.map((item, index) => {
      const barW = Math.max(18, chartW / data.length * 0.42);
      const x = padLeft + (chartW / Math.max(1, data.length - 1)) * index - barW / 2;
      const barH = (Number(item.value) / yMax) * chartH;
      const y = padTop + chartH - barH;
      return `
        <rect class="nexus-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(2, barH)}" rx="6">
          <title>${item.date}: ${numberFormatter.format(item.value)} daily downloads, ${numberFormatter.format(item.total)} total downloads</title>
        </rect>
      `;
    }).join("");

    const labels = data.map((item, index) => {
      const x = padLeft + (chartW / Math.max(1, data.length - 1)) * index;
      return `<text class="nexus-axis-label" x="${x}" y="${height - 14}" text-anchor="middle">${formatDateLabel(item.date)}</text>`;
    }).join("");

    chartEl.innerHTML = `
      <svg class="nexus-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Creations daily downloads chart">
        <defs>
          <linearGradient id="creationsArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(116, 217, 255, 0.28)" />
            <stop offset="100%" stop-color="rgba(116, 217, 255, 0.03)" />
          </linearGradient>
        </defs>
        ${gridRows}
        ${bars}
        <polygon class="nexus-chart-area" points="${areaPoints}" fill="url(#creationsArea)"></polygon>
        <polyline class="nexus-chart-line" points="${pointLine(points)}"></polyline>
        ${points.map((point) => `<circle class="nexus-chart-point" cx="${point.x}" cy="${point.y}" r="5"><title>${point.item.date}: ${numberFormatter.format(point.item.value)} daily downloads</title></circle>`).join("")}
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

  function scheduleRender() {
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => renderChart(cachedRows), 120);
  }

  if (toolbar && !toolbar.querySelector("[data-creations-refresh]")) {
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "dashboard-refresh";
    refresh.dataset.creationsRefresh = "true";
    refresh.textContent = "Refresh";
    refresh.addEventListener("click", async () => {
      cachedRows = await loadRows();
      renderChart(cachedRows);
    });
    toolbar.appendChild(refresh);
  }

  loadRows().then((rows) => {
    cachedRows = rows;
    renderChart(rows);
  }).catch(() => updateDailySummary([]));

  window.addEventListener("focus", scheduleRender);
  window.addEventListener("storage", scheduleRender);
})();
