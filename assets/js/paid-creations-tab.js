(() => {
  // Paid Creations page split support.
  // Price comes from Bethesda CC purchase button: 100-500 CC.
  const filters = window.townggCreationFilters || {};

  filters.getPrice = (item) => {
    if (!item) return 0;
    const value = Number(String(item.price || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(value) ? value : 0;
  };

  filters.isPaid = (item) => {
    if (!item) return false;
    if (item.isPaid === true) return true;
    if (filters.getPrice(item) > 0) return true;
    if (item.priceTier && !/free|0/i.test(String(item.priceTier))) return true;
    return false;
  };

  filters.isFree = (item) => !filters.isPaid(item);

  window.townggCreationFilters = filters;
})();
