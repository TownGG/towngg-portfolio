(function () {
  const hiddenCreationTitles = new Set([
    "Naked body",
    "TGGs Sexy Lingerie Set"
  ]);

  function isHiddenCreation(item) {
    return hiddenCreationTitles.has(String(item?.title || "").trim());
  }

  function visibleCreations() {
    const siteData = window.siteData || {};
    if (!Array.isArray(siteData.creations)) return [];
    siteData.creations = siteData.creations.filter((item) => !isHiddenCreation(item));
    return siteData.creations;
  }

  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function displayMetric(value) {
    return value === undefined || value === null || String(value).trim() === "" ? "-" : value;
  }

  function cleanHiddenCreationCards() {
    document.querySelectorAll("[data-creations-mods] .project-card").forEach((card) => {
      const title = card.querySelector(".card-title")?.textContent?.trim();
      if (hiddenCreationTitles.has(title)) card.remove();
    });
  }

  function confirmedCreations() {
    return visibleCreations().filter((item) =>
      ["likes", "downloads", "plays", "libraryAdds"].some((key) => toNumber(item[key]) > 0)
    );
  }

  function renderCreationsSummaryAndTable() {
    const creations = visibleCreations();
    const confirmed = confirmedCreations();
    const summary = document.querySelector("[data-creations-summary]");
    const table = document.querySelector("[data-creations-table]");

    const totals = creations.reduce(
      (sum, item) => {
        sum.likes += toNumber(item.likes);
        sum.downloads += toNumber(item.downloads);
        sum.plays += toNumber(item.plays);
        sum.libraryAdds += toNumber(item.libraryAdds);
        return sum;
      },
      { likes: 0, downloads: 0, plays: 0, libraryAdds: 0 }
    );

    if (summary) {
      summary.innerHTML = [
        ["Likes", totals.likes],
        ["Downloads", totals.downloads],
        ["Plays", totals.plays],
        ["Library Adds", totals.libraryAdds]
      ].map(([label, value]) => `
        <article class="dashboard-stat">
          <span>${label}</span>
          <strong>${new Intl.NumberFormat("en-US").format(value)}</strong>
        </article>
      `).join("");
    }

    if (table) {
      table.innerHTML = confirmed.map((item) => `
        <tr>
          <td><a href="${item.links?.[0]?.url || "#"}" target="_blank" rel="noopener">${item.title}</a></td>
          <td>${displayMetric(item.likes)}</td>
          <td>${displayMetric(item.downloads)}</td>
          <td>${displayMetric(item.plays)}</td>
          <td>${displayMetric(item.libraryAdds)}</td>
        </tr>
      `).join("");
    }
  }

  function renderCreationsRankingBars() {
    const ranking = document.querySelector("[data-creations-ranking]");
    const metricSelect = document.querySelector("[data-creations-ranking-metric]");
    if (!ranking || !metricSelect) return;

    const metric = metricSelect.value || "likes";
    const sorted = [...confirmedCreations()]
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
    visibleCreations();
    cleanHiddenCreationCards();
    renderCreationsSummaryAndTable();
    renderCreationsRankingBars();

    const ranking = document.querySelector("[data-creations-ranking]");
    const metricSelect = document.querySelector("[data-creations-ranking-metric]");
    if (!ranking || !metricSelect) return;

    if (!metricSelect.dataset.barsFixReady) {
      metricSelect.addEventListener("change", () => {
        window.setTimeout(() => {
          visibleCreations();
          cleanHiddenCreationCards();
          renderCreationsSummaryAndTable();
          renderCreationsRankingBars();
        }, 0);
      });
      metricSelect.dataset.barsFixReady = "true";
    }

    if (!ranking.dataset.barsObserverReady) {
      const observer = new MutationObserver(() => {
        cleanHiddenCreationCards();
        if (!ranking.querySelector(".creation-bar-track")) {
          window.setTimeout(renderCreationsRankingBars, 0);
        }
      });
      observer.observe(ranking, { childList: true, subtree: true });
      ranking.dataset.barsObserverReady = "true";
    }
  }

  function scheduleFix() {
    [0, 50, 150, 400, 900, 1600].forEach((delay) => {
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
