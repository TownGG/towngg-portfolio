(function () {
  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function displayMetric(value) {
    return value === undefined || value === null || String(value).trim() === "" ? "-" : value;
  }

  function renderCreationsRankingBars() {
    const siteData = window.siteData || {};
    const ranking = document.querySelector("[data-creations-ranking]");
    const metricSelect = document.querySelector("[data-creations-ranking-metric]");
    if (!ranking || !metricSelect) return;

    const metric = metricSelect.value || "likes";
    const confirmedCreations = (siteData.creations || []).filter((item) =>
      ["likes", "downloads", "plays", "libraryAdds"].some((key) => toNumber(item[key]) > 0)
    );

    const sorted = [...confirmedCreations]
      .sort((a, b) => toNumber(b[metric]) - toNumber(a[metric]))
      .slice(0, 8);

    const max = Math.max(1, ...sorted.map((item) => toNumber(item[metric])));

    ranking.classList.add("creation-bars");
    ranking.innerHTML = sorted.map((item) => {
      const value = toNumber(item[metric]);
      const width = Math.max(3, Math.round((value / max) * 100));

      return `
        <article class="creation-bar">
          <div class="creation-bar-head">
            <span>${item.title}</span>
            <strong>${displayMetric(item[metric])}</strong>
          </div>
          <div class="creation-bar-track">
            <span style="width:${width}%"></span>
          </div>
        </article>
      `;
    }).join("");
  }

  function initCreationsRankingBarsFix() {
    const metricSelect = document.querySelector("[data-creations-ranking-metric]");
    if (metricSelect && !metricSelect.dataset.barsFixReady) {
      metricSelect.addEventListener("change", renderCreationsRankingBars);
      metricSelect.dataset.barsFixReady = "true";
    }
    renderCreationsRankingBars();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(initCreationsRankingBarsFix, 0));
  } else {
    window.setTimeout(initCreationsRankingBarsFix, 0);
  }
})();
