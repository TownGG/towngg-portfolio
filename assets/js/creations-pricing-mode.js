(() => {
  const mode = document.body?.dataset.creationsPricing || "all";

  function toNumber(value) {
    const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function isPaid(item) {
    if (!item) return false;
    return item.isPaid === true || String(item.isPaid).toLowerCase() === "true";
  }

  function matchesMode(item) {
    if (mode === "paid") return isPaid(item);
    if (mode === "free") return !isPaid(item);
    return true;
  }

  function applyPricingMode(data) {
    if (!data || !Array.isArray(data.creations) || mode === "all") return data;
    return { ...data, creations: data.creations.filter(matchesMode) };
  }

  function normalizeTitle(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function filterDailyRows(rows) {
    if (!Array.isArray(rows) || mode === "all") return rows || [];
    const allowedTitles = new Set(
      (window.siteData?.creations || []).map((item) => normalizeTitle(item.title)).filter(Boolean)
    );
    return rows.filter((row) => allowedTitles.has(normalizeTitle(row.title)));
  }

  window.townggCreationPricingMode = mode;
  window.townggIsPaidCreation = isPaid;
  window.townggApplyCreationPricingMode = applyPricingMode;
  window.townggFilterCreationDailyRows = filterDailyRows;
  window.siteData = applyPricingMode(window.siteData);
})();
