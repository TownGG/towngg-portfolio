(() => {
  const STORAGE_PREFIX = "townggModSort";
  const DEFAULT_SORT = "time";
  const controlsReady = new WeakSet();
  const observerState = new WeakMap();
  let isApplyingSort = false;

  function number(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\/$/, "");
  }

  function primaryUrl(item) {
    return item?.links?.[0]?.url || "";
  }

  function nexusIdFromUrl(url) {
    return String(url || "").match(/\/mods\/(\d+)/)?.[1] || "";
  }

  function itemKey(item) {
    return normalize(primaryUrl(item)) || normalize(item?.title);
  }

  function cardKey(card) {
    return normalize(card.getAttribute("href")) || normalize(card.querySelector(".card-title")?.textContent);
  }

  function parseDateValue(value) {
    if (!value) return 0;
    const parsed = Date.parse(String(value).replace(" ", "T"));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function sourceForPlatform(platform) {
    return platform === "creations"
      ? window.siteData?.creations || []
      : window.siteData?.mods || [];
  }

  function metricValue(entry, platform, metric) {
    const item = entry.item;

    if (metric === "downloads") {
      return number(item.downloads || item.total_downloads);
    }

    if (metric === "likes") {
      return number(item.likes || item.endorsements);
    }

    const dateValue = parseDateValue(item.publishedAt || item.releaseDate || item.updatedAt || item.createdAt || item.date);
    if (dateValue) return dateValue;

    if (platform === "nexus") {
      return number(nexusIdFromUrl(primaryUrl(item)) || item.mod_id);
    }

    return -entry.index;
  }

  function targetSelector(platform) {
    return platform === "creations" ? "[data-creations-mods]" : "[data-all-mods]";
  }

  function ensureSortControl(panel) {
    if (!panel || controlsReady.has(panel)) return;

    const bar = panel.querySelector(".mods-control-bar");
    const filter = bar?.querySelector(".mods-filter-control");
    if (!bar || !filter) return;

    const platform = panel.dataset.platformPanel || "nexus";
    const id = `mod-sort-${platform}`;
    const stored = localStorage.getItem(`${STORAGE_PREFIX}:${platform}`) || DEFAULT_SORT;
    const control = document.createElement("div");
    control.className = "mods-sort-control";
    control.innerHTML = `
      <label class="mods-sort-label" for="${id}">Sort</label>
      <select class="mods-sort-select" id="${id}" data-mod-sort aria-label="Sort mod cards">
        <option value="time">Latest Time</option>
        <option value="downloads">Downloads</option>
        <option value="likes">Likes</option>
      </select>
    `;

    const select = control.querySelector("[data-mod-sort]");
    select.value = ["time", "downloads", "likes"].includes(stored) ? stored : DEFAULT_SORT;
    select.addEventListener("change", () => {
      localStorage.setItem(`${STORAGE_PREFIX}:${platform}`, select.value);
      applyPanelSort(panel);
    });

    bar.insertBefore(control, filter);
    controlsReady.add(panel);
  }

  function applyPanelSort(panel) {
    if (!panel || isApplyingSort) return;

    const platform = panel.dataset.platformPanel || "nexus";
    const target = panel.querySelector(targetSelector(platform));
    const metric = panel.querySelector("[data-mod-sort]")?.value || DEFAULT_SORT;
    if (!target) return;

    const entries = sourceForPlatform(platform).map((item, index) => ({ item, index }));
    const sortedEntries = [...entries].sort((a, b) => {
      const valueDiff = metricValue(b, platform, metric) - metricValue(a, platform, metric);
      if (valueDiff) return valueDiff;
      return a.index - b.index;
    });

    const cards = [...target.children].filter((element) => element.classList.contains("project-card"));
    const cardsByKey = new Map(cards.map((card) => [cardKey(card), card]));
    const appended = new Set();
    const fragment = document.createDocumentFragment();

    sortedEntries.forEach((entry) => {
      const card = cardsByKey.get(itemKey(entry.item));
      if (!card || appended.has(card)) return;
      appended.add(card);
      fragment.appendChild(card);
    });

    cards.forEach((card) => {
      if (appended.has(card)) return;
      appended.add(card);
      fragment.appendChild(card);
    });

    if (!fragment.childNodes.length) return;

    isApplyingSort = true;
    target.appendChild(fragment);
    requestAnimationFrame(() => {
      isApplyingSort = false;
    });
  }

  function observePanel(panel) {
    const platform = panel.dataset.platformPanel || "nexus";
    const target = panel.querySelector(targetSelector(platform));
    if (!target || observerState.has(target)) return;

    const observer = new MutationObserver(() => {
      if (isApplyingSort) return;
      requestAnimationFrame(() => applyPanelSort(panel));
    });
    observer.observe(target, { childList: true });
    observerState.set(target, observer);
  }

  function setupModListSort() {
    document.querySelectorAll("[data-platform-panel]").forEach((panel) => {
      ensureSortControl(panel);
      observePanel(panel);
      applyPanelSort(panel);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    setupModListSort();
    window.setTimeout(setupModListSort, 700);
    window.setTimeout(setupModListSort, 1600);
  });
})();
