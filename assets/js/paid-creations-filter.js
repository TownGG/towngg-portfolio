(() => {
  // Paid Creations support helper.
  // The page can reuse the existing Creation renderer and filter by this flag.
  window.townggCreationFilters = window.townggCreationFilters || {};
  window.townggCreationFilters.isPaid = (item) => {
    if (!item) return false;
    if (item.isPaid === true) return true;
    if (item.priceTier && !/free|0/i.test(String(item.priceTier))) return true;
    if (item.price && Number(item.price) > 0) return true;
    return false;
  };
})();
