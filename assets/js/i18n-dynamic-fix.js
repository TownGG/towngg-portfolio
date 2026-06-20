(() => {
  const dynamicSelectors = [
    "[data-home-metric]",
    "[data-notes-metric]",
    "[data-site-telemetry-summary] .telemetry-value",
    "[data-dashboard-summary] strong",
    "[data-creations-summary] strong",
    "[data-creations-ranking] strong",
    "[data-dashboard-table] td:not(:first-child)",
    "[data-creations-table] td:not(:first-child)",
    ".metric-number",
    ".telemetry-value"
  ];

  function dynamicNodes() {
    return dynamicSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  }

  function protect(node) {
    if (!node || node.nodeType !== 1) return;
    node.dataset.i18nOriginal = node.textContent.trim();
    node.dataset.i18nDynamic = "true";
  }

  function protectAll() {
    dynamicNodes().forEach(protect);
  }

  function observeNode(node) {
    if (!node || node.dataset.i18nDynamicObserved) return;
    node.dataset.i18nDynamicObserved = "true";
    protect(node);
    const observer = new MutationObserver(() => protect(node));
    observer.observe(node, { childList: true, characterData: true, subtree: true });
  }

  function observeAll() {
    dynamicNodes().forEach(observeNode);
  }

  const bodyObserver = new MutationObserver(() => {
    protectAll();
    observeAll();
  });

  function init() {
    protectAll();
    observeAll();
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
