(() => {
  const CREATIONS_DAILY_URL = './assets/data/creations-mod-daily.csv';
  const NEXUS_HISTORY_URL = './assets/data/nexus-history.csv';
  const NEXUS_LATEST_URL = './assets/data/nexus-latest.json';

  const COLORS = {
    free: '#43c7ff',
    paid: '#9b6cff',
    nexus: '#8ddf72'
  };

  const state = {
    range: 7,
    ready: false,
    creationDays: [],
    nexusDays: [],
    dates: [],
    current: null,
    nexusLatest: null,
    topRows: [],
    lastSync: ''
  };

  const translations = {
    en: {
      dashboard: 'Dashboard',
      subtitle: 'Download analytics overview',
      lastSync: 'Last Sync',
      totalDownloads: 'Total Downloads',
      today: 'Today',
      yesterday: 'Yesterday',
      sevenDays: '7 Days',
      thirtyDays: '30 Days',
      creationsToday: 'Creations Today',
      paidToday: 'Paid Creations Today',
      nexusToday: 'Nexus Today',
      totalMods: 'Total Mods',
      avgDay: 'Avg / Day',
      allPlatforms: 'Across all platforms',
      vsYesterday: 'vs Yesterday',
      vsPrevious: 'vs previous period',
      freePaidNexus: 'Free + Paid + Nexus',
      downloadsOverTime: 'Downloads Over Time',
      platformShare: 'Platform Share',
      recentDownloads: 'Recent Downloads',
      topMods: 'Top Mods by Downloads',
      compare: 'Free vs Paid vs Nexus',
      creations: 'Creations',
      paidCreations: 'Paid Creations',
      nexus: 'Nexus',
      total: 'Total',
      downloads: 'Downloads',
      allTime: 'All-time Downloads',
      mods: 'Mods',
      platform: 'Platform',
      change: 'Share',
      loading: 'Loading download analytics…',
      loadError: 'Unable to load dashboard data.',
      worker: 'System Status',
      operational: 'Worker connected · data sources available',
      viewSite: 'View Website',
      last7: 'Last 7 days',
      last30: 'Last 30 days'
    },
    'zh-CN': {
      dashboard: '首页看板',
      subtitle: '平台下载数据分析总览',
      lastSync: '最后同步',
      totalDownloads: '总下载量',
      today: '今日下载',
      yesterday: '昨日下载',
      sevenDays: '近 7 日下载',
      thirtyDays: '近 30 日下载',
      creationsToday: '免费 Creation 今日',
      paidToday: '付费 Creation 今日',
      nexusToday: 'Nexus 今日',
      totalMods: '作品总数',
      avgDay: '近 7 日日均',
      allPlatforms: '全部平台累计',
      vsYesterday: '较昨日',
      vsPrevious: '较上一周期',
      freePaidNexus: '免费 + 付费 + Nexus',
      downloadsOverTime: '下载趋势',
      platformShare: '平台下载占比',
      recentDownloads: '每日下载构成',
      topMods: '作品下载排行',
      compare: '免费 / 付费 / Nexus 对比',
      creations: '免费 Creations',
      paidCreations: '付费 Creations',
      nexus: 'Nexus',
      total: '合计',
      downloads: '周期下载',
      allTime: '累计下载',
      mods: '作品数量',
      platform: '平台',
      change: '占比',
      loading: '正在加载下载数据…',
      loadError: '看板数据加载失败。',
      worker: '系统状态',
      operational: 'Worker 已连接 · 数据源可用',
      viewSite: '返回官网',
      last7: '最近 7 天',
      last30: '最近 30 天'
    },
    ja: {
      dashboard: 'ダッシュボード',
      subtitle: 'プラットフォーム別ダウンロード分析',
      lastSync: '最終同期',
      totalDownloads: '総ダウンロード',
      today: '今日',
      yesterday: '昨日',
      sevenDays: '7日間',
      thirtyDays: '30日間',
      creationsToday: '無料 Creations 今日',
      paidToday: '有料 Creations 今日',
      nexusToday: 'Nexus 今日',
      totalMods: 'Mod 合計',
      avgDay: '1日平均',
      allPlatforms: '全プラットフォーム',
      vsYesterday: '昨日比',
      vsPrevious: '前期間比',
      freePaidNexus: '無料 + 有料 + Nexus',
      downloadsOverTime: 'ダウンロード推移',
      platformShare: 'プラットフォーム比率',
      recentDownloads: '日別ダウンロード',
      topMods: 'ダウンロード上位 Mod',
      compare: '無料 / 有料 / Nexus 比較',
      creations: '無料 Creations',
      paidCreations: '有料 Creations',
      nexus: 'Nexus',
      total: '合計',
      downloads: '期間ダウンロード',
      allTime: '累計ダウンロード',
      mods: 'Mod 数',
      platform: 'プラットフォーム',
      change: '比率',
      loading: 'データを読み込み中…',
      loadError: 'ダッシュボードデータを読み込めません。',
      worker: 'システム状態',
      operational: 'Worker 接続済み · データ利用可能',
      viewSite: 'サイトを見る',
      last7: '直近 7 日',
      last30: '直近 30 日'
    }
  };

  function lang() {
    const current = document.documentElement.lang || localStorage.getItem('townggSiteLang') || 'en';
    return translations[current] ? current : 'en';
  }

  function t(key) {
    return translations[lang()]?.[key] || translations.en[key] || key;
  }

  function toNumber(value) {
    const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US').format(Math.round(toNumber(value)));
  }

  function formatCompact(value) {
    const number = toNumber(value);
    if (Math.abs(number) < 1000) return formatNumber(number);
    return new Intl.NumberFormat(lang() === 'zh-CN' ? 'zh-CN' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: number >= 100000 ? 1 : 2
    }).format(number);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeTitle(value) {
    return String(value || '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, '')
      .trim();
  }

  function parseCSV(text) {
    const rows = [];
    let cell = '';
    let row = [];
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header.trim(), items[index] || ''])));
  }

  function percentChange(current, previous) {
    const now = toNumber(current);
    const before = toNumber(previous);
    if (!before) return null;
    return ((now - before) / before) * 100;
  }

  function trendHtml(change, compareLabel) {
    if (change === null || !Number.isFinite(change)) {
      return `<span class="admin-metric-trend is-flat">—</span><span>${escapeHtml(compareLabel)}</span>`;
    }
    const cls = change > 0.05 ? 'is-up' : change < -0.05 ? 'is-down' : 'is-flat';
    const arrow = change > 0.05 ? '↑' : change < -0.05 ? '↓' : '→';
    return `<span class="admin-metric-trend ${cls}">${arrow} ${Math.abs(change).toFixed(1)}%</span><span>${escapeHtml(compareLabel)}</span>`;
  }

  function metricCard(label, value, icon, footHtml) {
    return `<article class="admin-metric-card">
      <div class="admin-metric-label"><span>${escapeHtml(label)}</span><span class="admin-metric-icon">${icon}</span></div>
      <strong class="admin-metric-value">${escapeHtml(formatNumber(value))}</strong>
      <div class="admin-metric-foot">${footHtml}</div>
    </article>`;
  }

  function getPaidTitleSet() {
    const creations = Array.isArray(window.siteData?.creations) ? window.siteData.creations : [];
    return new Set(creations
      .filter((item) => item?.isPaid === true || toNumber(item?.price) > 0)
      .map((item) => normalizeTitle(item.title))
      .filter(Boolean));
  }

  function titleIsPaid(title, paidTitles) {
    const key = normalizeTitle(title);
    if (!key) return false;
    if (paidTitles.has(key)) return true;
    for (const paid of paidTitles) {
      if (paid.length > 7 && key.length > 7 && (paid.includes(key) || key.includes(paid))) return true;
    }
    return false;
  }

  function buildCreationDays(rows, paidTitles) {
    const byDate = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const list = byDate.get(row.date) || [];
      list.push(row);
      byDate.set(row.date, list);
    });

    return [...byDate.entries()].map(([date, dateRows]) => {
      const latestAt = dateRows.reduce((max, row) => String(row.last_updated || '') > max ? String(row.last_updated || '') : max, '');
      const latestRows = latestAt ? dateRows.filter((row) => String(row.last_updated || '') === latestAt) : dateRows;
      let free = 0;
      let paid = 0;
      latestRows.forEach((row) => {
        const daily = toNumber(row.daily_downloads);
        if (titleIsPaid(row.title, paidTitles)) paid += daily;
        else free += daily;
      });
      return { date, free, paid, total: free + paid, rows: latestRows, updatedAt: latestAt };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  function buildNexusDays(rows) {
    const unique = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      unique.set(`${row.date}|${row.mod_id || normalizeTitle(row.mod_name)}`, row);
    });
    const byDate = new Map();
    [...unique.values()].forEach((row) => {
      const list = byDate.get(row.date) || [];
      list.push(row);
      byDate.set(row.date, list);
    });
    return [...byDate.entries()].map(([date, dateRows]) => ({
      date,
      nexus: dateRows.reduce((sum, row) => sum + toNumber(row.daily_downloads), 0),
      rows: dateRows
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  function currentTotals(paidTitles, creationDays, nexusLatest) {
    const creations = Array.isArray(window.siteData?.creations) ? window.siteData.creations : [];
    let freeDownloads = 0;
    let paidDownloads = 0;
    let freeMods = 0;
    let paidMods = 0;

    creations.forEach((item) => {
      const paid = item?.isPaid === true || toNumber(item?.price) > 0 || titleIsPaid(item?.title, paidTitles);
      if (paid) {
        paidDownloads += toNumber(item.downloads);
        paidMods += 1;
      } else {
        freeDownloads += toNumber(item.downloads);
        freeMods += 1;
      }
    });

    if (!creations.length && creationDays.length) {
      const latest = creationDays.at(-1);
      latest.rows.forEach((row) => {
        const paid = titleIsPaid(row.title, paidTitles);
        if (paid) paidDownloads += toNumber(row.downloads);
        else freeDownloads += toNumber(row.downloads);
      });
    }

    const nexusMods = Array.isArray(nexusLatest?.mods) ? nexusLatest.mods : [];
    const nexusDownloads = nexusMods.reduce((sum, item) => sum + toNumber(item.total_downloads), 0);

    return {
      freeDownloads,
      paidDownloads,
      nexusDownloads,
      totalDownloads: freeDownloads + paidDownloads + nexusDownloads,
      freeMods,
      paidMods,
      nexusMods: nexusMods.length,
      totalMods: freeMods + paidMods + nexusMods.length
    };
  }

  function combinedSeries(creationDays, nexusDays) {
    const map = new Map();
    creationDays.forEach((day) => {
      map.set(day.date, { date: day.date, free: day.free, paid: day.paid, nexus: 0, creationRows: day.rows, nexusRows: [] });
    });
    nexusDays.forEach((day) => {
      const current = map.get(day.date) || { date: day.date, free: 0, paid: 0, nexus: 0, creationRows: [], nexusRows: [] };
      current.nexus = day.nexus;
      current.nexusRows = day.rows;
      map.set(day.date, current);
    });
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  function sumDays(days) {
    return days.reduce((acc, day) => {
      acc.free += toNumber(day.free);
      acc.paid += toNumber(day.paid);
      acc.nexus += toNumber(day.nexus);
      return acc;
    }, { free: 0, paid: 0, nexus: 0 });
  }

  function totalOf(parts) {
    return parts.free + parts.paid + parts.nexus;
  }

  function periodSlice(count, offset = 0) {
    const end = Math.max(0, state.dates.length - offset);
    const start = Math.max(0, end - count);
    return state.dates.slice(start, end);
  }

  function periodInfo(count) {
    const currentDays = periodSlice(count, 0);
    const previousDays = periodSlice(count, count);
    const current = sumDays(currentDays);
    const previous = sumDays(previousDays);
    return { currentDays, previousDays, current, previous, change: percentChange(totalOf(current), totalOf(previous)) };
  }

  function dateLabel(date) {
    if (!date) return '';
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' }).format(parsed);
  }

  function buildTopRows(days) {
    const map = new Map();
    days.forEach((day) => {
      (day.creationRows || []).forEach((row) => {
        const key = `creation|${normalizeTitle(row.title)}`;
        const paid = titleIsPaid(row.title, getPaidTitleSet());
        const item = map.get(key) || { title: row.title, platform: paid ? 'paid' : 'free', downloads: 0 };
        item.downloads += toNumber(row.daily_downloads);
        map.set(key, item);
      });
      (day.nexusRows || []).forEach((row) => {
        const key = `nexus|${row.mod_id || normalizeTitle(row.mod_name)}`;
        const item = map.get(key) || { title: row.mod_name, platform: 'nexus', downloads: 0 };
        item.downloads += toNumber(row.daily_downloads);
        map.set(key, item);
      });
    });
    return [...map.values()].sort((a, b) => b.downloads - a.downloads).slice(0, 7);
  }

  function svgLineChart(days) {
    const width = 860;
    const height = 245;
    const left = 48;
    const right = 16;
    const top = 14;
    const bottom = 31;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const allValues = days.flatMap((day) => [day.free, day.paid, day.nexus]);
    const rawMax = Math.max(1, ...allValues);
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rawMax)) - 1);
    const max = Math.ceil(rawMax / magnitude / 5) * magnitude * 5 || 10;
    const x = (index) => left + (days.length <= 1 ? plotW / 2 : (index / (days.length - 1)) * plotW);
    const y = (value) => top + plotH - (toNumber(value) / max) * plotH;

    let html = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Downloads over time">`;
    for (let i = 0; i <= 4; i += 1) {
      const value = (max / 4) * i;
      const yy = y(value);
      html += `<line class="admin-chart-grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line>`;
      html += `<text class="admin-chart-axis-text" x="${left - 8}" y="${yy + 3}" text-anchor="end">${escapeHtml(formatCompact(value))}</text>`;
    }

    const labelEvery = days.length <= 8 ? 1 : Math.ceil(days.length / 6);
    days.forEach((day, index) => {
      if (index % labelEvery === 0 || index === days.length - 1) {
        html += `<text class="admin-chart-axis-text" x="${x(index)}" y="${height - 7}" text-anchor="middle">${escapeHtml(dateLabel(day.date))}</text>`;
      }
    });

    ['free', 'paid', 'nexus'].forEach((key) => {
      const points = days.map((day, index) => `${x(index)},${y(day[key])}`).join(' ');
      html += `<polyline class="admin-chart-line ${key}" points="${points}"></polyline>`;
      days.forEach((day, index) => {
        html += `<circle class="admin-chart-point ${key}" cx="${x(index)}" cy="${y(day[key])}" r="3.2"><title>${escapeHtml(`${dateLabel(day.date)} · ${key === 'free' ? t('creations') : key === 'paid' ? t('paidCreations') : t('nexus')}: ${formatNumber(day[key])}`)}</title></circle>`;
      });
    });

    html += '</svg>';
    return html;
  }

  function renderMetrics() {
    const target = document.querySelector('[data-admin-dashboard-metrics]');
    if (!target || !state.ready) return;

    const today = state.dates.at(-1) || { free: 0, paid: 0, nexus: 0 };
    const yesterday = state.dates.at(-2) || { free: 0, paid: 0, nexus: 0 };
    const beforeYesterday = state.dates.at(-3) || { free: 0, paid: 0, nexus: 0 };
    const todayTotal = totalOf(today);
    const yesterdayTotal = totalOf(yesterday);
    const beforeYesterdayTotal = totalOf(beforeYesterday);
    const p7 = periodInfo(7);
    const p30 = periodInfo(30);
    const avg7 = p7.currentDays.length ? totalOf(p7.current) / p7.currentDays.length : 0;
    const prevAvg7 = p7.previousDays.length ? totalOf(p7.previous) / p7.previousDays.length : 0;

    target.innerHTML = [
      metricCard(t('totalDownloads'), state.current.totalDownloads, '↓', `<span class="admin-metric-trend is-flat">●</span><span>${escapeHtml(t('allPlatforms'))}</span>`),
      metricCard(t('today'), todayTotal, '◫', trendHtml(percentChange(todayTotal, yesterdayTotal), t('vsYesterday'))),
      metricCard(t('yesterday'), yesterdayTotal, '◫', trendHtml(percentChange(yesterdayTotal, beforeYesterdayTotal), t('vsYesterday'))),
      metricCard(t('sevenDays'), totalOf(p7.current), '↗', trendHtml(p7.change, t('vsPrevious'))),
      metricCard(t('thirtyDays'), totalOf(p30.current), '↗', trendHtml(p30.change, t('vsPrevious'))),
      metricCard(t('creationsToday'), today.free, '◇', trendHtml(percentChange(today.free, yesterday.free), t('vsYesterday'))),
      metricCard(t('paidToday'), today.paid, '$', trendHtml(percentChange(today.paid, yesterday.paid), t('vsYesterday'))),
      metricCard(t('nexusToday'), today.nexus, 'N', trendHtml(percentChange(today.nexus, yesterday.nexus), t('vsYesterday'))),
      metricCard(t('totalMods'), state.current.totalMods, '▱', `<span class="admin-metric-trend is-flat">${formatNumber(state.current.freeMods)} / ${formatNumber(state.current.paidMods)} / ${formatNumber(state.current.nexusMods)}</span><span>${escapeHtml(t('freePaidNexus'))}</span>`),
      metricCard(t('avgDay'), avg7, '∿', trendHtml(percentChange(avg7, prevAvg7), t('vsPrevious')))
    ].join('');
  }

  function renderShare(days) {
    const sum = sumDays(days);
    const total = Math.max(0, totalOf(sum));
    const values = [sum.free, sum.paid, sum.nexus];
    const percentages = total ? values.map((value) => (value / total) * 100) : [0, 0, 0];
    const firstEnd = percentages[0];
    const secondEnd = firstEnd + percentages[1];
    const donut = document.querySelector('[data-admin-share-donut]');
    const list = document.querySelector('[data-admin-share-list]');
    const center = document.querySelector('[data-admin-share-total]');
    if (donut) {
      donut.style.background = `conic-gradient(${COLORS.free} 0 ${firstEnd}%, ${COLORS.paid} ${firstEnd}% ${secondEnd}%, ${COLORS.nexus} ${secondEnd}% 100%)`;
    }
    if (center) center.textContent = formatCompact(total);
    if (list) {
      const rows = [
        ['free', t('creations'), sum.free, percentages[0]],
        ['paid', t('paidCreations'), sum.paid, percentages[1]],
        ['nexus', t('nexus'), sum.nexus, percentages[2]]
      ];
      list.innerHTML = rows.map(([key, name, value, pct]) => `<div class="admin-share-item">
        <span class="admin-share-item-name"><i class="admin-chart-dot ${key}"></i>${escapeHtml(name)}</span>
        <strong>${pct.toFixed(1)}%</strong>
        <small>${escapeHtml(formatNumber(value))}</small>
      </div>`).join('');
    }
  }

  function renderBars(days) {
    const target = document.querySelector('[data-admin-recent-bars]');
    if (!target) return;
    const visible = days.slice(-Math.min(10, days.length));
    const max = Math.max(1, ...visible.map((day) => day.free + day.paid + day.nexus));
    target.innerHTML = visible.map((day) => {
      const freeH = (day.free / max) * 100;
      const paidH = (day.paid / max) * 100;
      const nexusH = (day.nexus / max) * 100;
      return `<div class="admin-bar-day" title="${escapeHtml(`${dateLabel(day.date)} · ${formatNumber(day.free + day.paid + day.nexus)}`)}">
        <div class="admin-bar-stack">
          <span class="admin-bar-seg free" style="height:${freeH}%"></span>
          <span class="admin-bar-seg paid" style="height:${paidH}%"></span>
          <span class="admin-bar-seg nexus" style="height:${nexusH}%"></span>
        </div>
        <label>${escapeHtml(dateLabel(day.date))}</label>
      </div>`;
    }).join('');
  }

  function renderRanking(days) {
    const body = document.querySelector('[data-admin-top-mods]');
    if (!body) return;
    const rows = buildTopRows(days);
    const total = rows.reduce((sum, item) => sum + item.downloads, 0) || 1;
    body.innerHTML = rows.map((item, index) => `<tr>
      <td>${index + 1}</td>
      <td title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</td>
      <td><span class="admin-platform-badge ${item.platform}">${escapeHtml(item.platform === 'free' ? t('creations') : item.platform === 'paid' ? t('paidCreations') : t('nexus'))}</span></td>
      <td>${escapeHtml(formatNumber(item.downloads))}</td>
      <td>${((item.downloads / total) * 100).toFixed(1)}%</td>
    </tr>`).join('');
  }

  function compareRow(label, values) {
    const total = Math.max(1, values.free + values.paid + values.nexus);
    const free = (values.free / total) * 100;
    const paid = (values.paid / total) * 100;
    const nexus = (values.nexus / total) * 100;
    const segment = (key, pct) => `<span class="admin-compare-seg ${key}" style="width:${pct}%">${pct >= 11 ? `${pct.toFixed(1)}%` : ''}</span>`;
    return `<div class="admin-compare-row">
      <div class="admin-compare-label"><span>${escapeHtml(label)}</span><span>${escapeHtml(formatNumber(values.free + values.paid + values.nexus))}</span></div>
      <div class="admin-compare-bar">${segment('free', free)}${segment('paid', paid)}${segment('nexus', nexus)}</div>
    </div>`;
  }

  function renderCompare(days) {
    const target = document.querySelector('[data-admin-compare-list]');
    if (!target) return;
    const period = sumDays(days);
    target.innerHTML = [
      compareRow(t('downloads'), period),
      compareRow(t('allTime'), { free: state.current.freeDownloads, paid: state.current.paidDownloads, nexus: state.current.nexusDownloads }),
      compareRow(t('mods'), { free: state.current.freeMods, paid: state.current.paidMods, nexus: state.current.nexusMods })
    ].join('');
  }

  function renderRange() {
    if (!state.ready) return;
    const days = state.dates.slice(-state.range);
    const chart = document.querySelector('[data-admin-line-chart]');
    if (chart) chart.innerHTML = svgLineChart(days);
    renderShare(days);
    renderBars(days);
    renderRanking(days);
    renderCompare(days);
    document.querySelectorAll('[data-admin-range-label]').forEach((node) => {
      node.textContent = state.range === 30 ? t('last30') : t('last7');
    });
  }

  function renderStaticText() {
    const mapping = {
      '[data-admin-dashboard-title]': 'dashboard',
      '[data-admin-dashboard-subtitle]': 'subtitle',
      '[data-admin-downloads-title]': 'downloadsOverTime',
      '[data-admin-share-title]': 'platformShare',
      '[data-admin-recent-title]': 'recentDownloads',
      '[data-admin-top-title]': 'topMods',
      '[data-admin-compare-title]': 'compare',
      '[data-admin-legend-free]': 'creations',
      '[data-admin-legend-paid]': 'paidCreations',
      '[data-admin-legend-nexus]': 'nexus',
      '[data-admin-table-platform]': 'platform',
      '[data-admin-table-downloads]': 'downloads',
      '[data-admin-table-share]': 'change'
    };
    Object.entries(mapping).forEach(([selector, key]) => {
      document.querySelectorAll(selector).forEach((node) => { node.textContent = t(key); });
    });
    const range = document.querySelector('[data-admin-dashboard-range]');
    if (range) {
      const option7 = range.querySelector('option[value="7"]');
      const option30 = range.querySelector('option[value="30"]');
      if (option7) option7.textContent = t('last7');
      if (option30) option30.textContent = t('last30');
    }
    const label = document.querySelector('label[for="admin-module-dashboard"]');
    if (label) label.textContent = t('dashboard');
    const footerTitle = document.querySelector('[data-admin-sidebar-title]');
    const footerMeta = document.querySelector('[data-admin-sidebar-meta]');
    const viewSite = document.querySelector('[data-admin-view-site]');
    if (footerTitle) footerTitle.textContent = t('worker');
    if (footerMeta) footerMeta.textContent = t('operational');
    if (viewSite) viewSite.textContent = t('viewSite');
  }

  function renderAll() {
    renderStaticText();
    if (!state.ready) return;
    renderMetrics();
    renderRange();
  }

  function formatSyncTime(value) {
    if (!value) return '—';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-GB', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function renderSync() {
    const node = document.querySelector('[data-admin-dashboard-sync]');
    if (node) node.textContent = `${t('lastSync')}: ${formatSyncTime(state.lastSync)}`;
  }

  async function fetchText(url) {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response.text();
  }

  async function fetchJson(url) {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response.json();
  }

  async function loadData() {
    const loading = document.querySelector('[data-admin-dashboard-loading]');
    if (loading) loading.textContent = t('loading');
    const [creationText, nexusText, nexusLatest] = await Promise.all([
      fetchText(CREATIONS_DAILY_URL),
      fetchText(NEXUS_HISTORY_URL),
      fetchJson(NEXUS_LATEST_URL)
    ]);

    const paidTitles = getPaidTitleSet();
    state.creationDays = buildCreationDays(parseCSV(creationText), paidTitles);
    state.nexusDays = buildNexusDays(parseCSV(nexusText));
    state.nexusLatest = nexusLatest;
    state.dates = combinedSeries(state.creationDays, state.nexusDays);
    state.current = currentTotals(paidTitles, state.creationDays, nexusLatest);
    state.lastSync = [
      nexusLatest?.updatedAt || '',
      ...(Array.isArray(window.siteData?.creations) ? window.siteData.creations.map((item) => item.updatedAt || '') : [])
    ].filter(Boolean).sort().at(-1) || '';
    state.ready = true;

    if (loading) loading.remove();
    renderSync();
    renderAll();
  }

  function dashboardMarkup() {
    return `<div class="admin-dashboard">
      <header class="admin-dashboard-header">
        <div class="admin-dashboard-title">
          <h1 data-admin-dashboard-title>Dashboard</h1>
          <p data-admin-dashboard-subtitle>Download analytics overview</p>
        </div>
        <div class="admin-dashboard-tools">
          <span class="admin-dashboard-sync" data-admin-dashboard-sync>Last Sync: —</span>
          <select class="admin-dashboard-range" data-admin-dashboard-range aria-label="Dashboard period">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </header>

      <section class="admin-dashboard-metrics" data-admin-dashboard-metrics></section>

      <div class="admin-dashboard-grid-main">
        <section class="admin-analytics-panel">
          <div class="admin-analytics-head"><h3 data-admin-downloads-title>Downloads Over Time</h3><span class="admin-analytics-period" data-admin-range-label>Last 7 days</span></div>
          <div class="admin-chart-legend">
            <span><i class="admin-chart-dot free"></i><b data-admin-legend-free>Creations</b></span>
            <span><i class="admin-chart-dot paid"></i><b data-admin-legend-paid>Paid Creations</b></span>
            <span><i class="admin-chart-dot nexus"></i><b data-admin-legend-nexus>Nexus</b></span>
          </div>
          <div class="admin-line-chart" data-admin-line-chart></div>
        </section>

        <section class="admin-analytics-panel">
          <div class="admin-analytics-head"><h3 data-admin-share-title>Platform Share</h3><span class="admin-analytics-period" data-admin-range-label>Last 7 days</span></div>
          <div class="admin-share-wrap">
            <div class="admin-share-donut" data-admin-share-donut><div class="admin-share-center"><strong data-admin-share-total>0</strong><span>Total</span></div></div>
            <div class="admin-share-list" data-admin-share-list></div>
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid-bottom">
        <section class="admin-analytics-panel">
          <div class="admin-analytics-head"><h3 data-admin-recent-title>Recent Downloads</h3><span class="admin-analytics-period" data-admin-range-label>Last 7 days</span></div>
          <div class="admin-bars" data-admin-recent-bars></div>
          <div class="admin-chart-legend">
            <span><i class="admin-chart-dot free"></i><b data-admin-legend-free>Creations</b></span>
            <span><i class="admin-chart-dot paid"></i><b data-admin-legend-paid>Paid Creations</b></span>
            <span><i class="admin-chart-dot nexus"></i><b data-admin-legend-nexus>Nexus</b></span>
          </div>
        </section>

        <section class="admin-analytics-panel">
          <div class="admin-analytics-head"><h3 data-admin-top-title>Top Mods by Downloads</h3><span class="admin-analytics-period" data-admin-range-label>Last 7 days</span></div>
          <div class="admin-ranking-wrap">
            <table class="admin-ranking-table">
              <thead><tr><th>#</th><th>Mod</th><th data-admin-table-platform>Platform</th><th data-admin-table-downloads>Downloads</th><th data-admin-table-share>Share</th></tr></thead>
              <tbody data-admin-top-mods></tbody>
            </table>
          </div>
        </section>

        <section class="admin-analytics-panel">
          <div class="admin-analytics-head"><h3 data-admin-compare-title>Free vs Paid vs Nexus</h3><span class="admin-analytics-period" data-admin-range-label>Last 7 days</span></div>
          <div class="admin-chart-legend">
            <span><i class="admin-chart-dot free"></i><b data-admin-legend-free>Creations</b></span>
            <span><i class="admin-chart-dot paid"></i><b data-admin-legend-paid>Paid Creations</b></span>
            <span><i class="admin-chart-dot nexus"></i><b data-admin-legend-nexus>Nexus</b></span>
          </div>
          <div class="admin-compare-list" data-admin-compare-list></div>
        </section>
      </div>

      <div class="admin-dashboard-loading" data-admin-dashboard-loading>Loading download analytics…</div>
    </div>`;
  }

  function installLayout() {
    if (document.body?.dataset.page !== 'admin-upload') return false;
    const switcher = document.querySelector('.admin-module-switcher');
    const tabs = switcher?.querySelector('.admin-module-tabs');
    const content = switcher?.querySelector('.admin-module-content');
    if (!switcher || !tabs || !content) return false;

    let dashboardInput = document.getElementById('admin-module-dashboard');
    if (!dashboardInput) {
      dashboardInput = document.createElement('input');
      dashboardInput.className = 'admin-module-radio';
      dashboardInput.type = 'radio';
      dashboardInput.name = 'admin-module';
      dashboardInput.id = 'admin-module-dashboard';
      switcher.insertBefore(dashboardInput, tabs);
    }

    if (!tabs.querySelector('label[for="admin-module-dashboard"]')) {
      const label = document.createElement('label');
      label.className = 'admin-module-tab';
      label.htmlFor = 'admin-module-dashboard';
      label.setAttribute('role', 'tab');
      label.textContent = t('dashboard');
      tabs.prepend(label);
    }

    if (!content.querySelector('.admin-module-dashboard')) {
      const panel = document.createElement('div');
      panel.className = 'admin-module-panel admin-module-dashboard';
      panel.innerHTML = dashboardMarkup();
      content.prepend(panel);
    }

    let footer = switcher.querySelector('.admin-sidebar-footer');
    if (!footer) {
      footer = document.createElement('aside');
      footer.className = 'admin-sidebar-footer';
      footer.innerHTML = `<div class="admin-sidebar-status"><span class="admin-sidebar-status-dot"></span><strong data-admin-sidebar-title>${escapeHtml(t('worker'))}</strong></div>
        <small class="admin-sidebar-meta" data-admin-sidebar-meta>${escapeHtml(t('operational'))}</small>
        <a class="button" href="./index.html" data-admin-view-site>${escapeHtml(t('viewSite'))}</a>`;
      content.insertAdjacentElement('beforebegin', footer);
    }

    const lockButton = document.querySelector('.admin-hero [data-lock-admin]') || document.querySelector('[data-lock-admin]');
    if (lockButton && !footer.contains(lockButton)) {
      footer.appendChild(lockButton);
    }

    const uploadInput = document.getElementById('admin-module-upload');
    dashboardInput.checked = true;
    if (uploadInput) uploadInput.checked = false;

    const range = content.querySelector('[data-admin-dashboard-range]');
    range?.addEventListener('change', (event) => {
      state.range = Number(event.target.value) === 30 ? 30 : 7;
      renderRange();
    });

    renderStaticText();
    return true;
  }

  function observeLanguage() {
    let previous = document.documentElement.lang;
    const observer = new MutationObserver(() => {
      const current = document.documentElement.lang;
      if (current === previous) return;
      previous = current;
      renderAll();
      renderSync();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  function init() {
    if (!installLayout()) return;
    observeLanguage();
    loadData().catch((error) => {
      console.error('[admin-dashboard]', error);
      const loading = document.querySelector('[data-admin-dashboard-loading]');
      if (loading) {
        loading.className = 'admin-dashboard-error';
        loading.textContent = `${t('loadError')} ${error.message}`;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
