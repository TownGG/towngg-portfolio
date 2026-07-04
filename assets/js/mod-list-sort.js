(() => {
  const SORT_STORAGE_PREFIX = "townggModSort";
  const DATE_STORAGE_PREFIX = "townggModDateFilter";
  const DEFAULT_SORT = "time";
  const DEFAULT_DATE = "all";
  const controlsReady = new WeakSet();
  const observerState = new WeakMap();
  const applyingTargets = new WeakSet();

  const translations = {
    "zh-CN": { Sort: "排序", Date: "日期", "Sort mod cards": "排序模组卡片", "Filter by date": "按日期筛选", "Latest Time": "最新时间", Downloads: "下载量", Likes: "点赞", "All Time": "全部时间", "Last 7 Days": "近 7 天", "Last 30 Days": "近 30 天", "Last 90 Days": "近 90 天" },
    "zh-TW": { Sort: "排序", Date: "日期", "Sort mod cards": "排序模組卡片", "Filter by date": "依日期篩選", "Latest Time": "最新時間", Downloads: "下載量", Likes: "按讚", "All Time": "全部時間", "Last 7 Days": "近 7 天", "Last 30 Days": "近 30 天", "Last 90 Days": "近 90 天" },
    ja: { Sort: "並び替え", Date: "日付", "Sort mod cards": "Modカードを並び替え", "Filter by date": "日付で絞り込み", "Latest Time": "最新順", Downloads: "ダウンロード", Likes: "いいね", "All Time": "全期間", "Last 7 Days": "過去7日", "Last 30 Days": "過去30日", "Last 90 Days": "過去90日" },
    ko: { Sort: "정렬", Date: "날짜", "Sort mod cards": "모드 카드 정렬", "Filter by date": "날짜로 필터", "Latest Time": "최신순", Downloads: "다운로드", Likes: "좋아요", "All Time": "전체 기간", "Last 7 Days": "최근 7일", "Last 30 Days": "최근 30일", "Last 90 Days": "최근 90일" },
    ru: { Sort: "Сортировка", Date: "Дата", "Sort mod cards": "Сортировать карточки модов", "Filter by date": "Фильтр по дате", "Latest Time": "Сначала новые", Downloads: "Загрузки", Likes: "Лайки", "All Time": "За всё время", "Last 7 Days": "За 7 дней", "Last 30 Days": "За 30 дней", "Last 90 Days": "За 90 дней" }
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

    if (platform === "creations") {
      return number(bethesdaContentId(item)) || -index;
    }

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

  function storedDateForPlatform(platform) {
    const stored = localStorage.getItem(`${DATE_STORAGE_PREFIX}:${platform}`) || DEFAULT_DATE;
    return ["all", "7", "30", "90"].includes(stored) ? stored : DEFAULT_DATE;
  }

  function controlId(platform, type) {
    return `mod-${type}-${platform}`;
  }

  function buildSelectControl(platform, type) {
    if (type === "sort") {
      return `<div class="mods-sort-control" data-mod-sort-control><label class="mods-sort-label" for="${controlId(platform, "sort")}">${t("Sort")}</label><select class="mods-sort-select" id="${controlId(platform, "sort")}" data-mod-sort aria-label="${t("Sort mod cards")}"><option value="time">${t("Latest Time")}</option><option value="downloads">${t("Downloads")}</option><option value="likes">${t("Likes")}</option></select></div>`;
    }
    return `<div class="mods-date-control" data-mod-date-control><label class="mods-sort-label" for="${controlId(platform, "date")}">${t("Date")}</label><select class="mods-sort-select" id="${controlId(platform, "date")}" data-mod-date-filter aria-label="${t("Filter by date")}"><option value="all">${t("All Time")}</option><option value="7">${t("Last 7 Days")}</option><option value="30">${t("Last 30 Days")}</option><option value="90">${t("Last 90 Days")}</option></select></div>`;
  }

  function ensureControls(panel) {
    if (!panel || controlsReady.has(panel)) return;
    const bar = panel.querySelector(".mods-control-bar");
    const filter = bar?.querySelector(".mods-filter-control");
    if (!bar || !filter) return;
    const platform = panel.dataset.platformPanel || "nexus";
    const wrapper = document.createElement("div");
    wrapper.className = "mods-list-controls";
    wrapper.innerHTML = `${buildSelectControl(platform, "date")}${buildSelectControl(platform, "sort")}`;
    const sortSelect = wrapper.querySelector("[data-mod-sort]");
    const dateSelect = wrapper.querySelector("[data-mod-date-filter]");
    sortSelect.value = storedSortForPlatform(platform);
    dateSelect.value = storedDateForPlatform(platform);
    sortSelect.addEventListener("change", () => {
      localStorage.setItem(`${SORT_STORAGE_PREFIX}:${platform}`, sortSelect.value);
      applyPanelState(panel);
    });
    dateSelect.addEventListener("change", () => {
      localStorage.setItem(`${DATE_STORAGE_PREFIX}:${platform}`, dateSelect.value);
      applyPanelState(panel);
    });
    bar.insertBefore(wrapper, filter);
    controlsReady.add(panel);
  }

  function applyLocalizedLabels() {
    document.querySelectorAll("[data-platform-panel]").forEach((panel) => {
      const platform = panel.dataset.platformPanel || "nexus";
      const sortControl = panel.querySelector("[data-mod-sort-control]");
      const dateControl = panel.querySelector("[data-mod-date-control]");
      if (sortControl) {
        sortControl.querySelector(".mods-sort-label").textContent = t("Sort");
        const select = sortControl.querySelector("[data-mod-sort]");
        select.setAttribute("aria-label", t("Sort mod cards"));
        select.querySelector('option[value="time"]').textContent = t("Latest Time");
        select.querySelector('option[value="downloads"]').textContent = t("Downloads");
        select.querySelector('option[value="likes"]').textContent = t("Likes");
        select.value = storedSortForPlatform(platform);
      }
      if (dateControl) {
        dateControl.querySelector(".mods-sort-label").textContent = t("Date");
        const select = dateControl.querySelector("[data-mod-date-filter]");
        select.setAttribute("aria-label", t("Filter by date"));
        select.querySelector('option[value="all"]').textContent = t("All Time");
        select.querySelector('option[value="7"]').textContent = t("Last 7 Days");
        select.querySelector('option[value="30"]').textContent = t("Last 30 Days");
        select.querySelector('option[value="90"]').textContent = t("Last 90 Days");
        select.value = storedDateForPlatform(platform);
      }
    });
  }

  function isWithinDateFilter(entry, platform, filterValue) {
    if (filterValue === "all") return true;
    const explicitDate = parseDateValue(entry.item.publishedAt || entry.item.releaseDate || entry.item.createdAt || entry.item.date);
    if (!explicitDate) return true;
    const days = Number(filterValue);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return explicitDate >= cutoff;
  }

  function applyPanelState(panel) {
    if (!panel) return;
    const platform = panel.dataset.platformPanel || "nexus";
    const target = panel.querySelector(targetSelector(platform));
    if (!target || applyingTargets.has(target)) return;
    const cards = [...target.children].filter((element) => element.classList.contains("project-card"));
    if (!cards.length) return;

    const metric = panel.querySelector("[data-mod-sort]")?.value || storedSortForPlatform(platform);
    const dateFilter = panel.querySelector("[data-mod-date-filter]")?.value || storedDateForPlatform(platform);
    const entries = sourceForPlatform(platform).map((item, index) => ({ item, index }));
    const visibleKeys = new Set(entries.filter((entry) => isWithinDateFilter(entry, platform, dateFilter)).map((entry) => itemKey(entry.item)));

    cards.forEach((card) => {
      const visible = dateFilter === "all" || visibleKeys.has(cardKey(card));
      card.style.display = visible ? "" : "none";
    });

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
