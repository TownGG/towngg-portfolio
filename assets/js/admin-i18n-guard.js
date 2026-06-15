window.addEventListener('towngg:languagechange', (event) => {
  event.stopImmediatePropagation();
  if (typeof window.tggAdminApply === 'function') {
    window.tggAdminApply(document);
  }
}, true);
