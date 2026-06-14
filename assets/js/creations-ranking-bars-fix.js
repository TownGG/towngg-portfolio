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
    if (!ranking || !metricSelect || !Array.isArray(siteData.creations)) return;

    const metric = metricSelect.value || "likes";
    const confirmedCreations = siteData.creations.filter((item) =>
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

  function installFix() {
    const ranking = document.querySelector("[data-creations-ranking]");
    const metricSelect = document.querySelector("[data-creations-ranking-metric]");
    if (!ranking || !metricSelect) return;

    if (!metricSelect.dataset.barsFixReady) {
      metricSelect.addEventListener("change", () => {
        window.setTimeout(renderCreationsRankingBars, 0);
      });
      metricSelect.dataset.barsFixReady = "true";
    }

    if (!ranking.dataset.barsObserverReady) {
      const observer = new MutationObserver(() => {
        if (!ranking.querySelector(".creation-bar-track")) {
          window.setTimeout(renderCreationsRankingBars, 0);
        }
      });
      observer.observe(ranking, { childList: true, subtree: true });
      ranking.dataset.barsObserverReady = "true";
    }

    renderCreationsRankingBars();
  }

  function scheduleFix() {
    [0, 50, 150, 400, 900].forEach((delay) => {
      window.setTimeout(installFix, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleFix);
  } else {
    scheduleFix();
  }

  window.addEventListener("load", scheduleFix);
})();
