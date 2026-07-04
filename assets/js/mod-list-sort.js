(() => {
  const SORT_STORAGE_PREFIX = "townggModSort";
  const DEFAULT_SORT = "time";
  const controlsReady = new WeakSet();
  const observerState = new WeakMap();
  const applyingTargets = new WeakSet();

  const translations = {
    "zh-CN": { Sort: "排序", "Sort mod cards": "排序模组卡片", "Latest Time": "最新时间", Downloads: "下载量", Likes: "点赞" },
    "zh-TW": { Sort: "排序", "Sort mod cards": "排序模組卡片", "Latest Time": "最新時間", Downloads: "下載量", Likes: "按讚" },
    ja: { Sort: "並び替え", "Sort mod cards": "Modカードを並び替え", "Latest Time": "最新順", Downloads: "ダウンロード", Likes: "いいね" },
    ko: { Sort: "정렬", "Sort mod cards": "모드 카드 정렬", "Latest Time": "최신순", Downloads: "다운로드", Likes: "좋아요" },
    ru: { Sort: "Сортировка", "Sort mod cards": "Сортировать карточки модов", "Latest Time": "Сначала новые", Downloads: "Загрузки", Likes: "Лайки" }
  };

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en";
  }

  function t(key) {
    return translations[lang()]?.[key] || key;
  }

  function revealHeader() {
    requestAnimationFrame(() => document.body.classList.add("header-ready"));
  }

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

  function decodeBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    try { return atob(padded); } catch { return ""; }
  }

  function bethesdaContentIdFromImage(url) {
    const raw = String(url || "");
    const direct = raw.match(/GENESIS\/(\d+)/i);
    if (direct) return direct[1];

    const encoded = decodeURIComponent(raw.split("/image/")[1]?.split(/[?#]/)[0] || "");
    const decoded = decodeBase64Url(encoded);
    const match = decoded.match(/GENESIS\/(\d+)/i) || decoded.match(/GENESIS\?\/(\d+)/i);
    return match?.[1] || "";
  }

  function bethesdaContentId(item) {
    return item?.creationId || item?.contentId || item?.content_id || bethesdaContentIdFromImage(item?.image) || bethesdaContentIdFromImage(item?.thumbnail) || bethesdaContentIdFromImage(item?.cover) || "";
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
    return platform === "creations" ? window.siteData?.creations || [] : window.siteData?.mods || [];
  }

  function itemDateValue(item, platform, index) {
    const explicit = item.publishedAt || item.releaseDate || item.createdAt || item.date;
    const explicitDate = parseDateValue(explicit);
    if (explicitDate) return explicitDate;

    if (platform === "creations") return number(bethesdaContentId(item)) || -index;
    return number(nexusIdFromUrl(primaryUrl(item)) || item.mod_id) || -index;
  }

  function metricValue(entry, platform, metric) {
    const item = entry.item;
    if (metric === "downloads") return number(item.downloads || item.total_downloads);
    if (metric === "likes") return number(item.likes || item.endorsements);
    return itemDateValue(item, platform, entry.index);
  }

  function targetSelector(platform) {
    return platform === "creations" ? "[data-creations-mods]" : "[data-all-mods]";
  }

  function storedSortForPlatform(platform) {
    const stored = localStorage.getItem(`${SORT_STORAGE_PREFIX}:${platform}`) || DEFAULT_SORT;
    return ["time", "downloads", "likes"].includes(stored) ? stored : DEFAULT_SORT;
  }

  function controlId(platform) {
    return `mod-sort-${platform}`;
  }

  function buildSortControl(platform) {
    return `<div class="mods-sort-control" data-mod-sort-control><label class="mods-sort-label" for="${controlId(platform)}">${t("Sort")}</label><select class="mods-sort-select" id="${controlId(platform)}" data-mod-sort aria-label="${t("Sort mod cards")}"><option value="time">${t("Latest Time")}</option><option value="downloads">${t("Downloads")}</option><option value="likes">${t("Likes")}</option></select></div>`;
  }

  function ensureControls(panel) {
    if (!panel || controlsReady.has(panel)) return;
    const bar = panel.querySelector(".mods-control-bar");
    const filter = bar?.querySelector(".mods-filter-control");
    if (!bar || !filter) return;
    const platform = panel.dataset.platformPanel || "nexus";
    const wrapper = document.createElement("div");
    wrapper.className = "mods-list-controls";
    wrapper.innerHTML = buildSortControl(platform);
    const sortSelect = wrapper.querySelector("[data-mod-sort]");
    sortSelect.value = storedSortForPlatform(platform);
    sortSelect.addEventListener("change", () => {
      localStorage.setItem(`${SORT_STORAGE_PREFIX}:${platform}`, sortSelect.value);
      applyPanelState(panel);
    });
    bar.insertBefore(wrapper, filter);
    controlsReady.add(panel);
  }

  function applyLocalizedLabels() {
    document.querySelectorAll("[data-platform-panel]").forEach((panel) => {
      const platform = panel.dataset.platformPanel || "nexus";
      const sortControl = panel.querySelector("[data-mod-sort-control]");
      if (!sortControl) return;
      sortControl.querySelector(".mods-sort-label").textContent = t("Sort");
      const select = sortControl.querySelector("[data-mod-sort]");
      select.setAttribute("aria-label", t("Sort mod cards"));
      select.querySelector('option[value="time"]').textContent = t("Latest Time");
      select.querySelector('option[value="downloads"]').textContent = t("Downloads");
      select.querySelector('option[value="likes"]').textContent = t("Likes");
      select.value = storedSortForPlatform(platform);
    });
  }

  function applyPanelState(panel) {
    if (!panel) return;
    const platform = panel.dataset.platformPanel || "nexus";
    const target = panel.querySelector(targetSelector(platform));
    if (!target || applyingTargets.has(target)) return;
    const cards = [...target.children].filter((element) => element.classList.contains("project-card"));
    if (!cards.length) return;

    const metric = panel.querySelector("[data-mod-sort]")?.value || storedSortForPlatform(platform);
    const entries = sourceForPlatform(platform).map((item, index) => ({ item, index }));

    cards.forEach((card) => { card.style.display = ""; });

    const sortedEntries = [...entries].sort((a, b) => {
      const valueDiff = metricValue(b, platform, metric) - metricValue(a, platform, metric);
      if (valueDiff) return valueDiff;
      return a.index - b.index;
    });
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
    applyingTargets.add(target);
    target.appendChild(fragment);
    requestAnimationFrame(() => { applyingTargets.delete(target); });
  }

  function observePanel(panel) {
    const platform = panel.dataset.platformPanel || "nexus";
    const target = panel.querySelector(targetSelector(platform));
    if (!target || observerState.has(target)) return;
    const observer = new MutationObserver(() => {
      if (applyingTargets.has(target)) return;
      requestAnimationFrame(() => applyPanelState(panel));
      window.setTimeout(() => applyPanelState(panel), 80);
    });
    observer.observe(target, { childList: true });
    observerState.set(target, observer);
  }

  function setupModListSort() {
    document.querySelectorAll("[data-platform-panel]").forEach((panel) => {
      ensureControls(panel);
      observePanel(panel);
      applyPanelState(panel);
    });
    applyLocalizedLabels();
  }

  function applyActivePanelSort() {
    setupModListSort();
    const activePanel = document.querySelector("[data-platform-panel].is-active");
    applyPanelState(activePanel);
  }

  function boot() {
    setupModListSort();
    revealHeader();
    window.setTimeout(revealHeader, 120);
    [120, 700, 1600, 2400].forEach((delay) => window.setTimeout(setupModListSort, delay));
    window.setTimeout(applyActivePanelSort, 2600);
  }

  document.addEventListener("click", (event) => {
    const langOption = event.target.closest(".language-option[data-lang]");
    if (langOption) window.setTimeout(applyLocalizedLabels, 80);
    const tab = event.target.closest("[data-platform-tab]");
    if (!tab) return;
    requestAnimationFrame(applyActivePanelSort);
    window.setTimeout(applyActivePanelSort, 120);
  });

  window.addEventListener("towngg:creations-live-refreshed", applyActivePanelSort);
  window.addEventListener("load", () => window.setTimeout(setupModListSort, 120));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.townggApplyModListSort = applyActivePanelSort;
})();
