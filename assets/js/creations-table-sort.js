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

  const totalLabels = {
    en: 'Total',
    'zh-CN': '合计',
    'zh-TW': '合計',
    ja: '合計',
    ko: '합계',
    ru: 'Итого'
  };

  const stateByTable = new WeakMap();

  function lang() {
    const html = document.documentElement.lang;
    if (totalLabels[html]) return html;
    const stored = localStorage.getItem('townggSiteLang');
    return totalLabels[stored] ? stored : 'en';
  }

  function locale() {
    return lang() === 'zh-CN' ? 'zh-CN'
      : lang() === 'zh-TW' ? 'zh-TW'
        : lang() === 'ja' ? 'ja-JP'
          : lang() === 'ko' ? 'ko-KR'
            : lang() === 'ru' ? 'ru-RU'
              : 'en-US';
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(toNumber(value));
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

  function ensureTotalRow(config) {
    const { body, table } = tableElements(config);
    if (!body || !table || !body.children.length) return;

    const state = stateByTable.get(table) || {};
    const rows = [...body.querySelectorAll(':scope > tr')];
    if (!rows.length) return;

    const totals = config.columns.map((column, index) => {
      if (index === 0 || column.type !== 'number') return null;
      return rows.reduce((sum, row) => sum + cellValue(row, index, 'number'), 0);
    });

    let totalBody = table.querySelector(`tbody[data-table-total-for="${config.tableName}"]`);
    if (!totalBody) {
      totalBody = document.createElement('tbody');
      totalBody.dataset.tableTotalFor = config.tableName;
      totalBody.className = 'dashboard-table-total-body';
      table.insertBefore(totalBody, body);
    }

    const cells = config.columns.map((column, index) => {
      if (index === 0) return `<td><strong>${totalLabels[lang()] || totalLabels.en}</strong></td>`;
      return `<td><strong>${formatNumber(totals[index])}</strong></td>`;
    }).join('');
    const nextHtml = `<tr class="dashboard-table-total-row" data-table-total-row="${config.tableName}">${cells}</tr>`;

    if (totalBody.innerHTML !== nextHtml) {
      state.isUpdatingTotal = true;
      stateByTable.set(table, state);
      totalBody.innerHTML = nextHtml;
      requestAnimationFrame(() => {
        state.isUpdatingTotal = false;
        stateByTable.set(table, state);
      });
    }
  }

  function sortTableBy(config, index, type, direction) {
    const { body, headerRow, table } = tableElements(config);
    if (!body || !headerRow || !table) return;

    const state = stateByTable.get(table) || {};
    const rows = [...body.querySelectorAll(':scope > tr')];
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
    ensureTotalRow(config);
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

    const state = stateByTable.get(table) || { activeKey: '', activeDirection: 'desc', isSorting: false, isUpdatingTotal: false };
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

    ensureTotalRow(config);
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
        if (state?.isSorting || state?.isUpdatingTotal) return;
        scheduleEnhance(config, 30);
      });
      observer.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-creations-daily-ready'] });
      table.dataset.sortObserverReady = 'true';
    }

    [0, 300, 900, 1600].forEach((delay) => scheduleEnhance(config, delay));
  }

  function installStyles() {
    if (document.getElementById('dashboard-table-total-style')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-table-total-style';
    style.textContent = `
      .dashboard-table-total-body .dashboard-table-total-row {
        background: linear-gradient(90deg, rgba(255, 61, 82, 0.14), rgba(255, 61, 82, 0.035));
      }
      .dashboard-table-total-body .dashboard-table-total-row td {
        border-top: 1px solid rgba(255, 75, 91, 0.72);
        border-bottom: 1px solid rgba(255, 75, 91, 0.32);
        color: #f5f7fb;
      }
      .dashboard-table-total-body .dashboard-table-total-row td:first-child {
        color: #ff5b68;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .dashboard-table-total-body .dashboard-table-total-row strong {
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    TABLES.forEach(installTable);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.language-option[data-lang]')) return;
    window.setTimeout(() => TABLES.forEach((config) => enhanceTable(config)), 120);
  });
})();
