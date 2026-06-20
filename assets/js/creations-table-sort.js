(() => {
  const TABLES = [
    {
      bodySelector: '[data-creations-table]',
      tableName: 'creations',
      buttonAttr: 'data-creations-table-sort',
      ready: (table) => table.dataset.creationsDailyReady === 'true',
      columns: [
        { key: 'creation', type: 'text' },
        { key: 'daily', type: 'number' },
        { key: 'likes', type: 'number' },
        { key: 'views', type: 'number' },
        { key: 'downloads', type: 'number' },
        { key: 'plays', type: 'number' },
        { key: 'library-adds', type: 'number' }
      ]
    },
    {
      bodySelector: '[data-dashboard-table]',
      tableName: 'nexus',
      buttonAttr: 'data-nexus-table-sort',
      ready: () => true,
      columns: [
        { key: 'mod', type: 'text' },
        { key: 'daily', type: 'number' },
        { key: 'total', type: 'number' },
        { key: 'unique', type: 'number' },
        { key: 'endorse', type: 'number' }
      ]
    }
  ];

  const stateByTable = new WeakMap();

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function tableElements(config) {
    const body = document.querySelector(config.bodySelector);
    return {
      body,
      table: body?.closest('table') || null,
      headerRow: body?.closest('table')?.querySelector('thead tr') || null
    };
  }

  function cellValue(row, index, type) {
    const text = row.children[index]?.textContent || '';
    if (type === 'number') return toNumber(text);
    return normalize(text);
  }

  function setHeaderState(config, headerRow, activeIndex, direction) {
    [...headerRow.children].forEach((header, index) => {
      const isActive = index === activeIndex;
      header.classList.toggle('is-sorted', isActive);
      header.dataset.sortDirection = isActive ? direction : '';
      header.querySelector(`[${config.buttonAttr}]`)?.setAttribute('aria-sort', isActive ? direction : 'none');
    });
  }

  function sortTableBy(config, index, type, direction) {
    const { body, headerRow, table } = tableElements(config);
    if (!body || !headerRow || !table) return;

    const state = stateByTable.get(table) || {};
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

    state.isSorting = true;
    stateByTable.set(table, state);
    body.appendChild(fragment);
    setHeaderState(config, headerRow, index, direction);
    requestAnimationFrame(() => {
      state.isSorting = false;
      stateByTable.set(table, state);
    });
  }

  function plainHeaderText(header) {
    const existingButton = header.querySelector('button');
    if (existingButton) return existingButton.textContent.trim();
    return header.textContent.trim();
  }

  function enhanceTable(config) {
    const { body, table, headerRow } = tableElements(config);
    if (!body || !table || !headerRow || !body.children.length) return;
    if (!config.ready(table)) return;

    const state = stateByTable.get(table) || { activeKey: '', activeDirection: 'desc', isSorting: false };
    stateByTable.set(table, state);
    table.dataset.sortableTable = config.tableName;

    [...headerRow.children].forEach((header, index) => {
      const column = config.columns[index];
      if (!column?.type) return;

      const existingButton = header.querySelector(`[${config.buttonAttr}]`);
      if (existingButton) {
        existingButton.setAttribute(config.buttonAttr, column.key);
        return;
      }

      const label = plainHeaderText(header) || column.key;
      header.innerHTML = `<button type="button" class="dashboard-table-sort" ${config.buttonAttr}="${column.key}" aria-sort="none">${label}</button>`;
      header.querySelector(`[${config.buttonAttr}]`).addEventListener('click', () => {
        const defaultDirection = column.type === 'text' ? 'asc' : 'desc';
        const nextDirection = state.activeKey === column.key && state.activeDirection === defaultDirection
          ? (defaultDirection === 'asc' ? 'desc' : 'asc')
          : defaultDirection;

        state.activeKey = column.key;
        state.activeDirection = nextDirection;
        stateByTable.set(table, state);
        sortTableBy(config, index, column.type, nextDirection);
      });
    });
  }

  function scheduleEnhance(config, delay = 0) {
    window.setTimeout(() => enhanceTable(config), delay);
  }

  function installTable(config) {
    const { body, table, headerRow } = tableElements(config);
    if (!body || !table || !headerRow) return;

    if (!table.dataset.sortObserverReady) {
      const observer = new MutationObserver(() => {
        const state = stateByTable.get(table);
        if (state?.isSorting) return;
        scheduleEnhance(config, 30);
      });
      observer.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-creations-daily-ready'] });
      table.dataset.sortObserverReady = 'true';
    }

    [0, 300, 900, 1600].forEach((delay) => scheduleEnhance(config, delay));
  }

  function install() {
    TABLES.forEach(installTable);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
