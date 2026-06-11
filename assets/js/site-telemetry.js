(() => {
  const TELEMETRY_ENDPOINT = "https://stats.towngg.com/site-telemetry";

  const summaryEl = document.querySelector("[data-site-telemetry-summary]");
  const chartEl = document.querySelector("[data-site-telemetry-chart]");
  const noteEl = document.querySelector("[data-site-telemetry-note]");
  const pillEl = document.querySelector(".telemetry-pill");

  if (!summaryEl || !chartEl) return;

  const safeErrorMessage = "Telemetry temporarily unavailable.";

  const formatNumber = (value) => {
    const number = Number(value || 0);
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
    return new Intl.NumberFormat("en-US").format(number);
  };

  const formatBytes = (bytes) => {
    const number = Number(bytes || 0);
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = number;
    let unitIndex = 0;
    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };

  const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderSummary = (summary = {}) => {
    const cards = [
      ["Visits", formatNumber(summary.visits)],
      ["Requests", formatNumber(summary.requests)],
      ["Bandwidth Served", formatBytes(summary.bandwidthBytes)],
      ["Cache Hit Rate", formatPercent(summary.cacheHitRate)],
    ];

    summaryEl.innerHTML = cards.map(([label, value]) => `
      <article class="telemetry-card">
        <div class="telemetry-value">${value}</div>
        <div class="telemetry-label">${label}</div>
      </article>
    `).join("");
  };

  const pointLine = (points) => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  const renderChart = (trend = []) => {
    const data = trend.filter((item) => Number.isFinite(Number(item.visits)));
    if (!data.length) {
      chartEl.className = "telemetry-chart telemetry-error";
      chartEl.textContent = "No telemetry data available.";
      return;
    }

    const width = 920;
    const height = 260;
    const padX = 54;
    const padTop = 26;
    const padBottom = 44;
    const chartW = width - padX * 2;
    const chartH = height - padTop - padBottom;
    const values = data.map((item) => Number(item.visits));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const valueRange = Math.max(maxValue - minValue, 1);

    const points = data.map((item, index) => {
      const x = padX + (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * index);
      const y = padTop + chartH - ((Number(item.visits) - minValue) / valueRange) * chartH;
      return { x, y, item };
    });

    const areaPoints = [
      `${points[0].x.toFixed(2)},${(height - padBottom).toFixed(2)}`,
      pointLine(points),
      `${points[points.length - 1].x.toFixed(2)},${(height - padBottom).toFixed(2)}`,
    ].join(" ");

    const gridRows = [0, 1, 2, 3].map((step) => {
      const y = padTop + (chartH / 3) * step;
      return `<line class="telemetry-grid-line" x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" />`;
    }).join("");

    const labels = points.map(({ x, item }) => `
      <text x="${x}" y="${height - 14}" text-anchor="middle">${formatDate(item.date)}</text>
    `).join("");

    const dots = points.map(({ x, y, item }) => `
      <circle class="telemetry-dot" cx="${x}" cy="${y}" r="5">
        <title>${formatDate(item.date)}: ${formatNumber(item.visits)} visits</title>
      </circle>
    `).join("");

    chartEl.className = "telemetry-chart";
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="7-day visits trend chart" preserveAspectRatio="xMidYMid meet">
        ${gridRows}
        <polygon class="telemetry-area" points="${areaPoints}" />
        <polyline class="telemetry-line" points="${pointLine(points)}" />
        ${dots}
        ${labels}
      </svg>
    `;
  };

  const renderError = () => {
    summaryEl.innerHTML = ["Visits", "Requests", "Bandwidth Served", "Cache Hit Rate"].map((label) => `
      <article class="telemetry-card">
        <div class="telemetry-value">--</div>
        <div class="telemetry-label">${label}</div>
      </article>
    `).join("");
    chartEl.className = "telemetry-chart telemetry-error";
    chartEl.textContent = safeErrorMessage;
    if (noteEl) noteEl.textContent = "No individual visitor data, IP addresses, logs or security events are displayed.";
    if (pillEl) pillEl.textContent = "Offline";
  };

  const loadTelemetry = async () => {
    try {
      const response = await fetch(TELEMETRY_ENDPOINT, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(safeErrorMessage);
      const data = await response.json();
      if (data.error) throw new Error(safeErrorMessage);

      renderSummary(data.summary);
      renderChart(data.trend);

      const updated = data.updatedAt ? `Last updated ${new Date(data.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : "Last updated --";
      const period = data.period || "Last 24 hours";
      const privacyNote = data.note || "No individual visitor data, IP addresses, logs or security events are displayed.";
      if (noteEl) noteEl.textContent = `${privacyNote} ${period}. ${updated}.`;
      if (pillEl) pillEl.textContent = period;
    } catch (error) {
      renderError();
    }
  };

  loadTelemetry();
})();
