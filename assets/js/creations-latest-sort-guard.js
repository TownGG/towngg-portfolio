(() => {
  // Creations latest sorting is handled by mod-list-sort.js.

  const STYLE_ID = "trend-average-pill-polish";
  const PILL_SELECTOR = ".telemetry-pill.telemetry-pill-heading";

  function lang() {
    const value = localStorage.getItem("townggSiteLang");
    return ["zh-CN", "zh-TW", "ja", "ko", "ru"].includes(value) ? value : "en";
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

  function boot() {
    polishPills();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) polishPills(node);
        });
      });
      polishPills();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    [120, 520, 1500, 2600].forEach((delay) => window.setTimeout(polishPills, delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  document.addEventListener("click", (event) => {
    if (event.target.closest(".language-option[data-lang]")) window.setTimeout(polishPills, 120);
  });
})();