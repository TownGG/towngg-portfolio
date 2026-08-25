(() => {
  const isPaid = (item) => {
    const price = Number(item?.price || 0);
    return item?.isPaid === true || price > 0 || (item?.priceTier && !/free|0/i.test(String(item.priceTier)));
  };

  window.townggPaidCreations = {
    isPaid,
    paid: (items = []) => items.filter(isPaid),
    free: (items = []) => items.filter((item) => !isPaid(item))
  };
})();
