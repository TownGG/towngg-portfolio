(() => {
  function runHomeMetrics() {
    const hasHomeMetrics = document.querySelector("[data-home-metric]");
    if (!hasHomeMetrics) return;
    if (typeof window.setupHomeMetrics === "function") {
      window.setupHomeMetrics();
      return;
    }
    if (typeof setupHomeMetrics === "function") {
      setupHomeMetrics();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(runHomeMetrics, 900);
  });
})();
