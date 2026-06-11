(() => {
  const chartEl = document.querySelector("[data-dashboard-chart]");
  const modSelect = document.querySelector("[data-dashboard-mod]");
  const metricSelect = document.querySelector("[data-dashboard-metric]");
  const panel = chartEl?.closest(".dashboard-panel");
  const toolbar = panel?.querySelector(".dashboard-toolbar");
  if (!chartEl || !modSelect || !metricSelect) return;

  const numberFormatter = new Intl.NumberFormat("en-US");
  const version = localStorage.getItem("townggSiteVersion") || Date.now();

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
    if (Number.isNaN(date.getTime())) return value.slice(5);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function latestRows(rows) {
    const latest = new Map();
    rows.forEach((row) => {
      const current = latest.get(row.mod_id);
      if (!current || row.date > current.date) latest.set(row.mod_id, row);
    });
    return [...latest.values()];
  }

  function latestDailyTotal(rows) {
    return latestRows(rows).reduce((sum, row) => sum + dashboardNumber(row.daily_downloads), 0);
  }

  function buildLastSevenDays(rows) {
    const metric = "daily_downloads";
    const sortedDates = rows.map((row) => row.date).filter(Boolean).sort();
    const endDate = sortedDates.length ? new Date(`${sortedDates.at(-1)}T00:00:00`) : new Date();
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (6 - index));
      return isoDate(date);
    });

    const values = new Map();
    rows.forEach((row) => {
      values.set(row.date, (values.get(row.date) || 0) + dashboardNumber(row[metric]));
    });

    return dates.map((date, index) => ({
      date,
      value: index === dates.length - 1 ? latestDailyTotal(rows) : (values.get(date) || 0),
    }));
  }

  function pointLine(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  }

  function renderChart(rows) {
    const data = buildLastSevenDays(rows);

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
      <g class="nexus-point" tabindex="0" aria-label="${numberFormatter.format(item.value)} daily downloads" style="--dot-x:${x}px;--dot-y:${y}px;">
        <circle class="telemetry-dot" cx="${x}" cy="${y}" r="5"></circle>
      </g>
    `).join("");

    const note = "Nexus release activity based on tracked mod history. Showing the latest 7 days of daily downloads across all releases.";

    panel?.classList.add("is-nexus-trend-panel");
    chartEl.className = "dashboard-chart nexus-telemetry-chart";
    chartEl.innerHTML = `
      <div class="nexus-trend-shell">
        <div class="nexus-trend-header">
          <div>
            <h3>7-Day Nexus Downloads Trend</h3>
            <p>${note}</p>
          </div>
          <span class="telemetry-pill">Daily downloads</span>
        </div>
        <div class="nexus-trend-canvas">
          <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="7-day Nexus downloads trend chart" preserveAspectRatio="xMidYMid meet">
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
  }

  async function init() {
    try {
      if (toolbar) toolbar.classList.add("is-hidden-for-nexus-trend");
      const response = await fetch(`./assets/data/nexus-history.csv?v=${encodeURIComponent(version)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Nexus history could not be loaded.");
      const rows = parseCSV(await response.text());
      if (!rows.length) return;

      const rerender = () => renderChart(rows);
      setTimeout(rerender, 350);
      setTimeout(rerender, 1200);
    } catch (error) {
      console.warn(error);
    }
  }

  init();
})();
