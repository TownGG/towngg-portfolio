(() => {
  const TABLES = [
    {
      bodySelector: '[data-creations-table]',
      tableName: 'creations',
      buttonAttr: 'data-creations-table-sort',
      ready: (table) => table.dataset.creationsDailyReady === 'true',
      columns: new Map([
        ['creation', 'text'],
        ['likes', 'number'],
        ['downloads', 'number'],
        ['plays', 'number'],
        ['library adds', 'number'],
        ['daily', 'number']
      ])
    },
    {
      bodySelector: '[data-dashboard-table]',
      tableName: 'nexus',
      buttonAttr: 'data-nexus-table-sort',
      ready: () => true,
      columns: new Map([
        ['mod', 'text'],
        ['daily', 'number'],
        ['total', 'number'],
        ['unique', 'number'],
        ['endorse', 'number']
      ])
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

  function columnType(config, label) {
    return config.columns.get(normalize(label)) || '';
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

  function enhanceTable(config) {
    const { body, table, headerRow } = tableElements(config);
    if (!body || !table || !headerRow || !body.children.length) return;
    if (!config.ready(table)) return;

    const state = stateByTable.get(table) || { activeKey: '', activeDirection: 'desc', isSorting: false };
    stateByTable.set(table, state);
    table.dataset.sortableTable = config.tableName;

    [...headerRow.children].forEach((header, index) => {
      const label = header.textContent.trim();
      const type = columnType(config, label);
      if (!type || header.querySelector(`[${config.buttonAttr}]`)) return;

      header.innerHTML = `<button type="button" class="dashboard-table-sort" ${config.buttonAttr}="${normalize(label)}" aria-sort="none">${label}</button>`;
      header.querySelector(`[${config.buttonAttr}]`).addEventListener('click', () => {
        const key = normalize(label);
        const defaultDirection = type === 'text' ? 'asc' : 'desc';
        const nextDirection = state.activeKey === key && state.activeDirection === defaultDirection
          ? (defaultDirection === 'asc' ? 'desc' : 'asc')
          : defaultDirection;

        state.activeKey = key;
        state.activeDirection = nextDirection;
        stateByTable.set(table, state);
        sortTableBy(config, index, type, nextDirection);
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
