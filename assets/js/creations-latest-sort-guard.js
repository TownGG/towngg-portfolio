(() => {
  // Creations latest sorting is handled by mod-list-sort.js.

  const STYLE_ID = "trend-average-pill-polish";
  const PILL_SELECTOR = ".telemetry-pill.telemetry-pill-heading";
  const SUMMARY_SELECTOR = "[data-creations-summary]";
  const DAILY_CSV_URL = "./assets/data/creations-mod-daily.csv";
  const LANG_KEY = "townggSiteLang";
  const SUPPORTED_LANGS = ["en", "zh-CN", "zh-TW", "ja", "ko", "ru"];
  const LANG_LABELS = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", ru: "Русский" };
  const STAT_TRANSLATIONS = {
    en: { "Yesterday Downloads": "Yesterday Downloads", Likes: "Likes", "Total Downloads": "Total Downloads", "Library Adds": "Library Adds" },
    "zh-CN": { "Yesterday Downloads": "昨日下载", Likes: "点赞", "Total Downloads": "总下载", "Library Adds": "加入库" },
    "zh-TW": { "Yesterday Downloads": "昨日下載", Likes: "按讚", "Total Downloads": "總下載", "Library Adds": "加入庫" },
    ja: { "Yesterday Downloads": "昨日のダウンロード", Likes: "いいね", "Total Downloads": "総ダウンロード", "Library Adds": "ライブラリ追加" },
    ko: { "Yesterday Downloads": "어제 다운로드", Likes: "좋아요", "Total Downloads": "총 다운로드", "Library Adds": "라이브러리 추가" },
    ru: { "Yesterday Downloads": "Загрузки вчера", Likes: "Лайки", "Total Downloads": "Всего загрузок", "Library Adds": "Добавления в библиотеку" }
  };

  let cachedDailyRows = null;
  let summaryRendering = false;
  let summaryFetchPromise = null;

  function lang() {
    const value = localStorage.getItem(LANG_KEY);
    return SUPPORTED_LANGS.includes(value) ? value : "en";
  }

  function locale() {
    return lang() === "zh-CN" ? "zh-CN"
      : lang() === "zh-TW" ? "zh-TW"
        : lang() === "ja" ? "ja-JP"
          : lang() === "ko" ? "ko-KR"
            : lang() === "ru" ? "ru-RU"
              : "en-US";
  }

  function tStat(key) {
    return STAT_TRANSLATIONS[lang()]?.[key] || STAT_TRANSLATIONS.en[key] || key;
  }

  function labelText() {
    switch (lang()) {
      case "zh-CN": return "近7日均值";
      case "zh-TW": return "近7日均值";
      case "ja": return "7日平均";
      case "ko": return "7일 평균";
      case "ru": return "Среднее 7 дн.";
      default: return "7-Day Avg";
    }
  }

  function separator() {
    return ["zh-CN", "zh-TW", "ja"].includes(lang()) ? "：" : ": ";
  }

  function extractValue(text) {
    const matches = String(text || "").match(/\d[\d,.]*/g);
    return matches?.at(-1) || "—";
  }

  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(Number(value || 0));
  }

  function formatMetric(value) {
    return value === null || value === undefined ? "—" : formatNumber(value);
  }

  function todayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function parseCSV(text) {
    const rows = [];
    let cell = "";
    let row = [];
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
  }

  function snapshotTotal(rows) {
    return rows.reduce((sum, row) => sum + toNumber(row.daily_downloads), 0);
  }

  function latestSnapshotRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.last_updated || "";
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    });
    const snapshots = [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const latestNonzero = [...snapshots].reverse().find(([, snapshotRows]) => snapshotTotal(snapshotRows) > 0);
    return latestNonzero?.[1] || snapshots.at(-1)?.[1] || rows;
  }

  function dailySeries(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const current = groups.get(row.date) || [];
      current.push(row);
      groups.set(row.date, current);
    });
    return [...groups.entries()]
      .map(([date, dateRows]) => ({ date, value: snapshotTotal(latestSnapshotRows(dateRows)) }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function completedDownloadMetric(rows) {
    const today = todayKey();
    const previous = dailySeries(rows || [])
      .filter((item) => item.date < today && item.value > 0)
      .reverse()[0];
    return { label: "Yesterday Downloads", value: previous?.value ?? null };
  }

  function currentCreationTotals() {
    return (window.siteData?.creations || []).reduce((sum, item) => {
      sum.likes += toNumber(item.likes);
      sum.downloads += toNumber(item.downloads);
      sum.libraryAdds += toNumber(item.libraryAdds);
      return sum;
    }, { likes: 0, downloads: 0, libraryAdds: 0 });
  }

  async function loadDailyRows() {
    if (cachedDailyRows) return cachedDailyRows;
    if (!summaryFetchPromise) {
      summaryFetchPromise = fetch(`${DAILY_CSV_URL}?t=${Date.now()}`, { cache: "no-store" })
        .then((response) => response.ok ? response.text() : "")
        .then((text) => {
          cachedDailyRows = text ? parseCSV(text) : [];
          return cachedDailyRows;
        })
        .catch((error) => {
          console.warn("Creations yesterday summary fallback used", error);
          cachedDailyRows = [];
          return cachedDailyRows;
        })
        .finally(() => { summaryFetchPromise = null; });
    }
    return summaryFetchPromise;
  }

  function renderYesterdaySummary(rows = cachedDailyRows || []) {
    const target = document.querySelector(SUMMARY_SELECTOR);
    if (!target || summaryRendering) return;
    const totals = currentCreationTotals();
    const metric = completedDownloadMetric(rows);
    const nextHtml = [
      [metric.label, metric.value],
      ["Likes", totals.likes],
      ["Total Downloads", totals.downloads],
      ["Library Adds", totals.libraryAdds]
    ].map(([label, value]) => `<article class="dashboard-stat"><span>${tStat(label)}</span><strong>${formatMetric(value)}</strong></article>`).join("");
    if (target.innerHTML === nextHtml) return;
    summaryRendering = true;
    target.innerHTML = nextHtml;
    summaryRendering = false;
  }

  function ensureYesterdaySummary() {
    const target = document.querySelector(SUMMARY_SELECTOR);
    if (!target) return;
    loadDailyRows().then(renderYesterdaySummary);
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .telemetry-pill.telemetry-pill-heading {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
        min-height: 34px !important;
        padding: 7px 13px 6px !important;
        border: 1px solid rgba(125, 216, 255, .34) !important;
        border-radius: 999px !important;
        background:
          radial-gradient(circle at top right, rgba(125, 216, 255, .18), transparent 58%),
          linear-gradient(135deg, rgba(255, 255, 255, .072), rgba(255, 255, 255, .022)),
          rgba(8, 12, 18, .56) !important;
        box-shadow: 0 0 22px rgba(125, 216, 255, .11), inset 0 1px 0 rgba(255, 255, 255, .08) !important;
        color: #e9f8ff !important;
        font-family: "Rajdhani", "Inter", sans-serif !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        letter-spacing: .02em !important;
        text-transform: none !important;
        text-shadow: 0 0 16px rgba(125, 216, 255, .18) !important;
      }
      .language-switcher.is-open .language-menu,
      .language-switcher:focus-within .language-menu {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateY(0) !important;
      }

      @media (max-width: 700px) {
        .telemetry-pill.telemetry-pill-heading {
          font-size: 14px !important;
          min-height: 32px !important;
          padding: 7px 12px 6px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function polishPills(root = document) {
    installStyles();
    root.querySelectorAll(PILL_SELECTOR).forEach((pill) => {
      const value = extractValue(pill.textContent);
      const nextText = `${labelText()}${separator()}${value}`;
      if (pill.textContent !== nextText) pill.textContent = nextText;
      pill.setAttribute("aria-label", nextText);
    });
  }

  function ensureFullLanguageOptions() {
    const menu = document.querySelector(".language-switcher .language-menu");
    if (!menu) return;
    const existing = new Set([...menu.querySelectorAll(".language-option[data-lang]")].map((option) => option.dataset.lang));
    SUPPORTED_LANGS.forEach((code) => {
      if (existing.has(code)) return;
      const option = document.createElement("button");
      option.className = "language-option";
      option.type = "button";
      option.dataset.lang = code;
      option.setAttribute("role", "menuitem");
      option.textContent = LANG_LABELS[code] || code;
      menu.appendChild(option);
    });
  }

  function updateLanguageUI(next) {
    document.documentElement.lang = next;
    document.documentElement.dataset.siteLang = next;
    const label = document.querySelector(".language-button-label");
    if (label) label.textContent = LANG_LABELS[next] || LANG_LABELS.en;
    document.querySelectorAll(".language-option[data-lang]").forEach((option) => {
      option.textContent = `${option.dataset.lang === next ? "✓ " : ""}${LANG_LABELS[option.dataset.lang] || option.dataset.lang}`;
      option.classList.toggle("is-active", option.dataset.lang === next);
    });
  }

  function setupLanguageSwitcherGuard() {
    const switcher = document.querySelector(".language-switcher");
    if (!switcher || switcher.dataset.clickGuardReady === "true") return;
    switcher.dataset.clickGuardReady = "true";
    ensureFullLanguageOptions();
    updateLanguageUI(lang());
    const button = switcher.querySelector(".language-button");

    document.addEventListener("pointerdown", (event) => {
      const trigger = event.target.closest(".language-button");
      if (!trigger || !switcher.contains(trigger)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = !switcher.classList.contains("is-open");
      switcher.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    }, true);

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".language-button");
      if (!trigger || !switcher.contains(trigger)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener("click", (event) => {
      const option = event.target.closest(".language-option[data-lang]");
      if (!option || !switcher.contains(option)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = SUPPORTED_LANGS.includes(option.dataset.lang) ? option.dataset.lang : "en";
      localStorage.setItem(LANG_KEY, next);
      updateLanguageUI(next);
      if (window.TownGGI18n?.setLanguage) window.TownGGI18n.setLanguage(next);
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
      window.setTimeout(polishPills, 120);
      window.setTimeout(ensureYesterdaySummary, 120);
    }, true);

    document.addEventListener("pointerdown", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
    });
  }

  function boot() {
    polishPills();
    ensureYesterdaySummary();
    setupLanguageSwitcherGuard();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) polishPills(node);
        });
      });
      polishPills();
      ensureYesterdaySummary();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    [120, 520, 1500, 2600].forEach((delay) => window.setTimeout(() => {
      polishPills();
      ensureYesterdaySummary();
      setupLanguageSwitcherGuard();
    }, delay));
    window.addEventListener("focus", () => { cachedDailyRows = null; ensureYesterdaySummary(); });
    window.addEventListener("towngg:creations-live-refreshed", () => { cachedDailyRows = null; ensureYesterdaySummary(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-option[data-lang]")) {
      window.setTimeout(polishPills, 120);
      window.setTimeout(ensureYesterdaySummary, 120);
    }
  });
})();