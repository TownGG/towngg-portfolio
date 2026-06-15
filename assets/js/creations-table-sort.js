(() => {
  const TABLE_SELECTOR = '[data-creations-table]';
  const SORTABLE_COLUMNS = new Map([
    ['creation', 'text'],
    ['likes', 'number'],
    ['downloads', 'number'],
    ['plays', 'number'],
    ['library adds', 'number'],
    ['daily', 'number'],
    ['updated', 'date']
  ]);

  let activeKey = '';
  let activeDirection = 'desc';
  let isSorting = false;

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function toTimestamp(value) {
    const raw = String(value || '').trim();
    if (!raw || raw === '-') return 0;
    const normalized = raw.length === 10 ? `${raw} 00:00` : raw;
    const parsed = Date.parse(normalized.replace(' ', 'T'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function tableElements() {
    const body = document.querySelector(TABLE_SELECTOR);
    return {
      body,
      table: body?.closest('table') || null,
      headerRow: body?.closest('table')?.querySelector('thead tr') || null
    };
  }

  function columnType(label) {
    return SORTABLE_COLUMNS.get(normalize(label)) || '';
  }

  function cellValue(row, index, type) {
    const text = row.children[index]?.textContent || '';
    if (type === 'number') return toNumber(text);
    if (type === 'date') return toTimestamp(text);
    return normalize(text);
  }

  function setHeaderState(headerRow, activeIndex, direction) {
    [...headerRow.children].forEach((header, index) => {
      const isActive = index === activeIndex;
      header.classList.toggle('is-sorted', isActive);
      header.dataset.sortDirection = isActive ? direction : '';
      header.querySelector('[data-creations-table-sort]')?.setAttribute('aria-sort', isActive ? direction : 'none');
    });
  }

  function sortTableBy(index, type, direction) {
    const { body, headerRow } = tableElements();
    if (!body || !headerRow) return;

    const rows = [...body.querySelectorAll('tr')];
    const multiplier = direction === 'asc' ? 1 : -1;
    const sorted = rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .sort((a, b) => {
        const av = cellValue(a.row, index, type);
        const bv = cellValue(b.row, index, type);
        let result = 0;

        if (type === 'text') {
          result = String(av).localeCompare(String(bv));
        } else {
          result = Number(av) - Number(bv);
        }

        if (result === 0) result = a.originalIndex - b.originalIndex;
        return result * multiplier;
      });

    const fragment = document.createDocumentFragment();
    sorted.forEach(({ row }) => fragment.appendChild(row));

    isSorting = true;
    body.appendChild(fragment);
    setHeaderState(headerRow, index, direction);
    requestAnimationFrame(() => {
      isSorting = false;
    });
  }

  function enhanceTable() {
    const { body, table, headerRow } = tableElements();
    if (!body || !table || !headerRow || !body.children.length) return;
    if (!table.dataset.creationsDailyReady) return;

    table.dataset.sortableTable = 'creations';

    [...headerRow.children].forEach((header, index) => {
      const label = header.textContent.trim();
      const type = columnType(label);
      if (!type || header.querySelector('[data-creations-table-sort]')) return;

      header.innerHTML = `<button type="button" class="dashboard-table-sort" data-creations-table-sort="${normalize(label)}" aria-sort="none">${label}</button>`;
      header.querySelector('[data-creations-table-sort]').addEventListener('click', () => {
        const key = normalize(label);
        const defaultDirection = type === 'text' ? 'asc' : 'desc';
        const nextDirection = activeKey === key && activeDirection === defaultDirection
          ? (defaultDirection === 'asc' ? 'desc' : 'asc')
          : defaultDirection;

        activeKey = key;
        activeDirection = nextDirection;
        sortTableBy(index, type, nextDirection);
      });
    });
  }

  function scheduleEnhance(delay = 0) {
    window.setTimeout(enhanceTable, delay);
  }

  function install() {
    const { body, table, headerRow } = tableElements();
    if (!body || !table || !headerRow) return;

    const observer = new MutationObserver(() => {
      if (isSorting) return;
      scheduleEnhance(30);
    });
    observer.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-creations-daily-ready'] });

    [0, 300, 900, 1600].forEach(scheduleEnhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
