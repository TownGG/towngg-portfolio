(() => {
  function toNumber(value) {
    return Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0;
  }

  function addSourceColumns() {
    const table = document.querySelector('[data-creations-table]')?.closest('table');
    const body = document.querySelector('[data-creations-table]');
    if (!table || !body || !body.children.length || table.dataset.creationsSourceReady === 'true') return;

    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      headerRow.insertAdjacentHTML('beforeend', '<th>Source</th><th>Updated</th>');
    }

    const confirmed = (window.siteData?.creations || []).filter((item) =>
      ['likes', 'downloads', 'plays', 'libraryAdds'].some((key) => toNumber(item[key]) > 0)
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

  function parseTimestamp(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const date = new Date(normalized.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function latestUpdatedAt() {
    return (window.siteData?.creations || [])
      .map((item) => String(item.updatedAt || '').trim())
      .filter(Boolean)
      .sort((a, b) => parseTimestamp(b) - parseTimestamp(a))[0] || '';
  }

  function updateCreationsTimestamp() {
    const target = document.querySelector('[data-creations-updated]');
    if (!target) return;

    const latest = latestUpdatedAt();
    if (!latest) return;

    target.classList.add('is-fresh');
    target.textContent = `Updated ${latest}`;
    target.title = 'Latest Bethesda Creations browser capture timestamp.';
  }

  function installCreationsMeta() {
    addSourceColumns();
    updateCreationsTimestamp();
  }

  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(installCreationsMeta);
    const start = () => {
      const body = document.querySelector('[data-creations-table]');
      if (body) observer.observe(body, { childList: true });
      installCreationsMeta();
    };
    window.setTimeout(start, 300);
    window.setTimeout(installCreationsMeta, 1200);
  });
})();
