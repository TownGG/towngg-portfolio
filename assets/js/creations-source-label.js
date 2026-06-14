(() => {
  function addSourceColumns() {
    const table = document.querySelector('[data-creations-table]')?.closest('table');
    const body = document.querySelector('[data-creations-table]');
    if (!table || !body || !body.children.length || table.dataset.creationsSourceReady === 'true') return;

    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      headerRow.insertAdjacentHTML('beforeend', '<th>Source</th><th>Updated</th>');
    }

    const confirmed = (window.siteData?.creations || []).filter((item) =>
      ['likes', 'downloads', 'plays', 'libraryAdds'].some((key) => Number(String(item[key] || '0').replace(/[^0-9.-]/g, '')) > 0)
    );

    [...body.querySelectorAll('tr')].forEach((row, index) => {
      const item = confirmed[index] || {};
      row.insertAdjacentHTML(
        'beforeend',
        `<td>${item.source || 'Manual Snapshot'}</td><td>${item.updatedAt || '-'}</td>`
      );
    });

    table.dataset.creationsSourceReady = 'true';
  }

  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(addSourceColumns);
    const start = () => {
      const body = document.querySelector('[data-creations-table]');
      if (body) observer.observe(body, { childList: true });
      addSourceColumns();
    };
    window.setTimeout(start, 300);
    window.setTimeout(addSourceColumns, 1200);
  });
})();
