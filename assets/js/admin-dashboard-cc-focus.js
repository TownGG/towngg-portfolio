(() => {
  const DAILY_URL = './assets/data/creations-mod-daily.csv';
  const NEXUS_HISTORY_URL = './assets/data/nexus-history.csv';
  const NEXUS_LATEST_URL = './assets/data/nexus-latest.json';
  const state = { mode: 'paid', range: 7, rows: [], days: [], nexusRows: [], nexusDays: [], nexusLatest: null, ready: false, lastSync: '' };

  const copy = {
    en: {
      title: 'Mod Analytics',
      paid: 'Paid Creations',
      free: 'Free Creations',
      nexus: 'Nexus Mods',
      paidFocus: 'Priority',
      paidSubtitle: 'Paid Creation performance, growth and conversion overview',
      freeSubtitle: 'Free Creation performance, growth and reach overview',
      nexusSubtitle: 'Nexus Mods downloads, unique downloads and endorsement overview',
      dayWindow: 'Daily statistics: Beijing 12:00–next day 12:00',
      lastSync: 'Last Sync',
      last7: 'Last 7 days',
      last30: 'Last 30 days',
      totalDownloads: 'Total Downloads',
      today: 'Today',
      yesterday: 'Yesterday',
      sevenDays: '7 Days',
      thirtyDays: '30 Days',
      works: 'Creations',
      avgPrice: 'Avg Price',
      likes: 'Likes',
      views: 'Views',
      library: 'Library Adds',
      plays: 'Plays',
      uniqueDownloads: 'Unique Downloads',
      endorsements: 'Endorsements',
      vsYesterday: 'vs yesterday',
      vsPrevious: 'vs previous period',
      allTime: 'All-time',
      paidWorks: 'Paid works',
      freeWorks: 'Free works',
      nexusWorks: 'Nexus mods',
      downloadsTrend: 'Downloads Trend',
      ccShare: 'CC Download Share',
      shareCopyPaid: 'Paid downloads as a share of all CC downloads in the selected period.',
      shareCopyFree: 'Free downloads as a share of all CC downloads in the selected period.',
      shareCopyNexus: 'Unique downloads as a share of total Nexus downloads.',
      nexusShare: 'Unique Download Ratio',
      periodDownloads: 'Period downloads',
      allTimeShare: 'All-time share',
      recent: 'Recent Daily Downloads',
      ranking: 'Top Creations',
      conversion: 'Conversion Overview',
      detail: 'Creation Performance',
      detailPaid: 'Paid works sorted by total downloads, with price and current-period activity.',
      detailFree: 'Free works sorted by total downloads, with current-period activity.',
      detailNexus: 'Nexus mods sorted by total downloads with daily, unique and endorsement data.',
      uniqueRate: 'Unique / Total',
      endorsementRate: 'Endorsements / Unique',
      downloadRate: 'Downloads / Views',
      libraryRate: 'Library Adds / Downloads',
      likeRate: 'Likes / Downloads',
      playsPerDownload: 'Plays / Download',
      creation: 'Creation',
      price: 'Price',
      daily: 'Today',
      total: 'Total',
      noData: 'No data available yet.',
      focusHintPaid: 'Default view · paid CC is the primary focus',
      focusHintFree: 'Free CC performance view'
    },
    'zh-CN': {
      title: '模组数据看板',
      paid: '付费 Creations',
      free: '免费 Creations',
      nexus: 'Nexus Mods',
      paidFocus: '重点关注',
      paidSubtitle: '聚焦付费 CC 的下载增长、作品表现与转化数据',
      freeSubtitle: '查看免费 CC 的下载增长、作品表现与传播数据',
      nexusSubtitle: '查看 Nexus Mods 下载、唯一下载与 Endorsements 表现',
      dayWindow: '每日统计口径：北京时间 12:00–次日 12:00',
      lastSync: '最后同步',
      last7: '最近 7 天',
      last30: '最近 30 天',
      totalDownloads: '累计下载',
      today: '今日下载',
      yesterday: '昨日下载',
      sevenDays: '近 7 日下载',
      thirtyDays: '近 30 日下载',
      works: '作品数量',
      avgPrice: '平均价格',
      likes: '点赞',
      views: '浏览',
      library: '加入库',
      plays: '游玩',
      uniqueDownloads: '唯一下载',
      endorsements: 'Endorsements',
      vsYesterday: '较昨日',
      vsPrevious: '较上一周期',
      allTime: '累计数据',
      paidWorks: '付费作品',
      freeWorks: '免费作品',
      nexusWorks: 'Nexus 模组',
      downloadsTrend: '下载趋势',
      ccShare: 'CC 下载占比',
      shareCopyPaid: '当前周期内，付费 CC 下载量占全部 CC 下载量的比例。',
      shareCopyFree: '当前周期内，免费 CC 下载量占全部 CC 下载量的比例。',
      shareCopyNexus: 'Nexus 唯一下载占累计总下载的比例。',
      nexusShare: '唯一下载占比',
      periodDownloads: '周期下载',
      allTimeShare: '累计占比',
      recent: '近期每日下载',
      ranking: '作品下载排行',
      conversion: '转化概览',
      detail: '作品表现明细',
      detailPaid: '按累计下载排序查看付费作品价格、今日增长及各项核心数据。',
      detailFree: '按累计下载排序查看免费作品今日增长及各项核心数据。',
      detailNexus: '按累计下载排序查看 Nexus 模组今日下载、唯一下载与 Endorsements。',
      uniqueRate: '唯一下载 / 总下载',
      endorsementRate: 'Endorsements / 唯一下载',
      downloadRate: '下载 / 浏览',
      libraryRate: '加入库 / 下载',
      likeRate: '点赞 / 下载',
      playsPerDownload: '游玩 / 下载',
      creation: '作品',
      price: '价格',
      daily: '今日',
      total: '总下载',
      noData: '暂无可用数据。',
      focusHintPaid: '默认页签 · 优先查看付费 CC',
      focusHintFree: '免费 CC 数据视图'
    },
    ja: {
      title: 'Mod 分析',
      paid: '有料 Creations',
      free: '無料 Creations',
      nexus: 'Nexus Mods',
      paidFocus: '重点',
      paidSubtitle: '有料 CC のダウンロード、成長、転換データ',
      freeSubtitle: '無料 CC のダウンロードと成長データ',
      nexusSubtitle: 'Nexus Mods のダウンロード、ユニークDL、Endorsement データ',
      dayWindow: '日次集計：北京時間 12:00–翌日 12:00',
      lastSync: '最終同期',
      last7: '直近 7 日',
      last30: '直近 30 日',
      totalDownloads: '累計DL',
      today: '今日',
      yesterday: '昨日',
      sevenDays: '7日間',
      thirtyDays: '30日間',
      works: '作品数',
      avgPrice: '平均価格',
      likes: 'いいね',
      views: '閲覧',
      library: 'ライブラリ追加',
      plays: 'プレイ',
      uniqueDownloads: 'ユニークDL',
      endorsements: 'Endorsements',
      vsYesterday: '昨日比',
      vsPrevious: '前期間比',
      allTime: '累計',
      paidWorks: '有料作品',
      freeWorks: '無料作品',
      nexusWorks: 'Nexus Mod',
      downloadsTrend: 'DL推移',
      ccShare: 'CC DL比率',
      shareCopyPaid: '選択期間における全 CC DL 中の有料 CC 比率。',
      shareCopyFree: '選択期間における全 CC DL 中の無料 CC 比率。',
      shareCopyNexus: 'Nexus のユニークDLが累計DLに占める比率。',
      nexusShare: 'ユニークDL比率',
      periodDownloads: '期間DL',
      allTimeShare: '累計比率',
      recent: '日別DL',
      ranking: '作品ランキング',
      conversion: '転換概要',
      detail: '作品詳細',
      detailPaid: '有料作品の価格、今日の増加、主要指標。',
      detailFree: '無料作品の今日の増加と主要指標。',
      detailNexus: 'Nexus Mod を累計DL順に表示し、日次・ユニークDL・Endorsement を確認。',
      uniqueRate: 'ユニーク / 総DL',
      endorsementRate: 'Endorsements / ユニーク',
      downloadRate: 'DL / 閲覧',
      libraryRate: 'ライブラリ / DL',
      likeRate: 'いいね / DL',
      playsPerDownload: 'プレイ / DL',
      creation: '作品',
      price: '価格',
      daily: '今日',
      total: '総DL',
      noData: 'データがありません。',
      focusHintPaid: 'デフォルト · 有料 CC を優先',
      focusHintFree: '無料 CC データ'
    }
  };

  function lang() {
    const value = document.documentElement.lang || localStorage.getItem('townggSiteLang') || 'en';
    return copy[value] ? value : 'en';
  }
  function t(key) { return copy[lang()]?.[key] || copy.en[key] || key; }
  function n(value) {
    const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function fmt(value, digits = 0) {
    return new Intl.NumberFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US', {
      maximumFractionDigits: digits
    }).format(n(value));
  }
  function pct(value) { return Number.isFinite(value) ? value.toFixed(1) + '%' : '—'; }
  function formatBeijingTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const iso = raw.replace(' ', 'T');
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : iso + 'Z';
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date).map((part) => [part.type, part.value]));
    return parts.year + '-' + parts.month + '-' + parts.day + ' ' + parts.hour + ':' + parts.minute;
  }
  function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function normalizeTitle(value) {
    return String(value || '').normalize('NFKD').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, '').trim();
  }
  function isPaid(item) {
    return item?.isPaid === true || String(item?.isPaid).toLowerCase() === 'true' || n(item?.price) > 0;
  }
  function creations() {
    return Array.isArray(window.siteData?.creations) ? window.siteData.creations : [];
  }
  function modeCreations() {
    if (state.mode === 'nexus') return [];
    return creations().filter((item) => state.mode === 'paid' ? isPaid(item) : !isPaid(item));
  }
  function paidTitleSet() {
    return new Set(creations().filter(isPaid).map((item) => normalizeTitle(item.title)).filter(Boolean));
  }
  function todayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(Date.now() - 12 * 60 * 60 * 1000)).map((part) => [part.type, part.value]));
    return parts.year + '-' + parts.month + '-' + parts.day;
  }
  function dateLabel(value) {
    const date = new Date(String(value) + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return String(value || '');
    return new Intl.DateTimeFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' }).format(date);
  }
  function parseCSV(text) {
    const rows = [];
    let cell = '', row = [], quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quoted && next === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header.trim(), items[index] || ''])));
  }
  function latestSnapshotRows(dateRows) {
    const groups = new Map();
    dateRows.forEach((row) => {
      const key = String(row.last_updated || '');
      const list = groups.get(key) || [];
      list.push(row);
      groups.set(key, list);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).at(-1)?.[1] || dateRows;
  }
  function buildDays(rows) {
    const paid = paidTitleSet();
    const byDate = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const list = byDate.get(row.date) || [];
      list.push(row);
      byDate.set(row.date, list);
    });
    return [...byDate.entries()].map(([date, dateRows]) => {
      const snapshot = latestSnapshotRows(dateRows);
      let free = 0, paidTotal = 0;
      snapshot.forEach((row) => {
        if (paid.has(normalizeTitle(row.title))) paidTotal += n(row.daily_downloads);
        else free += n(row.daily_downloads);
      });
      return { date, free, paid: paidTotal, rows: snapshot, updatedAt: snapshot[0]?.last_updated || '' };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }
  function buildNexusDays(rows) {
    const byDate = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const list = byDate.get(row.date) || [];
      list.push(row);
      byDate.set(row.date, list);
    });
    return [...byDate.entries()].map(([date, dateRows]) => ({
      date,
      nexus: dateRows.reduce((sum, row) => sum + n(row.daily_downloads), 0),
      rows: dateRows
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
  function activeDays() {
    return state.mode === 'nexus' ? state.nexusDays : state.days;
  }
  function selectedValue(day, mode = state.mode) {
    if (!day) return 0;
    return mode === 'nexus' ? n(day.nexus) : n(day[mode]);
  }
  function currentDay() {
    const days = activeDays();
    return days.find((day) => day.date === todayKey()) || (state.mode === 'nexus'
      ? { date: todayKey(), nexus: 0, rows: [] }
      : { date: todayKey(), free: 0, paid: 0, rows: [] });
  }
  function priorDay(beforeDate) {
    const days = activeDays();
    return [...days].filter((day) => day.date < beforeDate).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      || (state.mode === 'nexus' ? { nexus: 0, rows: [] } : { free: 0, paid: 0, rows: [] });
  }
  function periodDays(count, offset = 0) {
    const eligible = activeDays().filter((day) => day.date <= todayKey());
    const end = Math.max(0, eligible.length - offset);
    return eligible.slice(Math.max(0, end - count), end);
  }
  function periodValue(count, offset = 0, mode = state.mode) {
    const days = mode === 'nexus' ? state.nexusDays : state.days;
    const eligible = days.filter((day) => day.date <= todayKey());
    const end = Math.max(0, eligible.length - offset);
    return eligible.slice(Math.max(0, end - count), end).reduce((sum, day) => sum + selectedValue(day, mode), 0);
  }
  function nexusMods() {
    return Array.isArray(state.nexusLatest?.mods) ? state.nexusLatest.mods : [];
  }
  function allTimeStats(mode = state.mode) {
    if (mode === 'nexus') {
      return nexusMods().reduce((sum, item) => {
        sum.downloads += n(item.total_downloads);
        sum.unique += n(item.unique_downloads);
        sum.likes += n(item.likes);
        return sum;
      }, { downloads: 0, unique: 0, likes: 0, views: 0, library: 0, plays: 0, price: 0, count: nexusMods().length });
    }
    const items = creations().filter((item) => mode === 'paid' ? isPaid(item) : !isPaid(item));
    return items.reduce((sum, item) => {
      sum.downloads += n(item.downloads);
      sum.likes += n(item.likes);
      sum.views += n(item.views);
      sum.library += n(item.libraryAdds);
      sum.plays += n(item.plays);
      sum.price += n(item.price);
      return sum;
    }, { downloads: 0, unique: 0, likes: 0, views: 0, library: 0, plays: 0, price: 0, count: items.length });
  }
  function percentChange(current, previous) {
    if (!n(previous)) return null;
    return ((n(current) - n(previous)) / n(previous)) * 100;
  }
  function trend(change, label) {
    if (change === null || !Number.isFinite(change)) return '<span class="admin-metric-trend is-flat">—</span><span>' + esc(label) + '</span>';
    const cls = change > .05 ? 'is-up' : change < -.05 ? 'is-down' : 'is-flat';
    const arrow = change > .05 ? '↑' : change < -.05 ? '↓' : '→';
    return '<span class="admin-metric-trend ' + cls + '">' + arrow + ' ' + Math.abs(change).toFixed(1) + '%</span><span>' + esc(label) + '</span>';
  }
  function card(label, value, icon, foot) {
    return '<article class="admin-metric-card"><div class="admin-metric-label"><span>' + esc(label) + '</span><span class="admin-metric-icon">' + esc(icon) + '</span></div><strong class="admin-metric-value">' + esc(value) + '</strong><div class="admin-metric-foot">' + foot + '</div></article>';
  }
  function dailyMap() {
    const paid = paidTitleSet();
    const day = currentDay();
    const map = new Map();
    day.rows.forEach((row) => {
      const rowPaid = paid.has(normalizeTitle(row.title));
      if ((state.mode === 'paid') !== rowPaid) return;
      map.set(normalizeTitle(row.title), n(row.daily_downloads));
    });
    return map;
  }
  function modeRowsInRange() {
    if (state.mode === 'nexus') return periodDays(state.range).flatMap((day) => day.rows.map((row) => ({ ...row, date: day.date })));
    const paid = paidTitleSet();
    const rows = periodDays(state.range).flatMap((day) => day.rows.map((row) => ({ ...row, date: day.date })));
    return rows.filter((row) => {
      const rowPaid = paid.has(normalizeTitle(row.title));
      return (state.mode === 'paid') === rowPaid;
    });
  }
  function topRows() {
    const map = new Map();
    modeRowsInRange().forEach((row) => {
      const title = state.mode === 'nexus' ? (row.mod_name || 'Unknown') : (row.title || 'Unknown');
      const key = state.mode === 'nexus' ? String(row.mod_id || title) : normalizeTitle(title);
      const item = map.get(key) || { title, downloads: 0 };
      item.downloads += n(row.daily_downloads);
      map.set(key, item);
    });
    return [...map.values()].sort((a, b) => b.downloads - a.downloads).slice(0, 8);
  }
  function renderMetrics() {
    const target = document.querySelector('[data-cc-kpis]');
    if (!target) return;
    const today = currentDay();
    const yesterday = priorDay(today.date);
    const beforeYesterday = priorDay(yesterday.date || today.date);
    const current = selectedValue(today);
    const previous = selectedValue(yesterday);
    const p7 = periodValue(7), prev7 = periodValue(7, 7);
    const p30 = periodValue(30), prev30 = periodValue(30, 30);
    const totals = allTimeStats();
    const cards = [
      card(t('totalDownloads'), fmt(totals.downloads), '↓', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'),
      card(t('today'), fmt(current), '◫', trend(percentChange(current, previous), t('vsYesterday'))),
      card(t('yesterday'), fmt(previous), '◫', trend(percentChange(previous, selectedValue(beforeYesterday)), t('vsYesterday'))),
      card(t('sevenDays'), fmt(p7), '↗', trend(percentChange(p7, prev7), t('vsPrevious'))),
      card(t('thirtyDays'), fmt(p30), '∿', trend(percentChange(p30, prev30), t('vsPrevious'))),
      card(t('works'), fmt(totals.count), '▱', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(state.mode === 'paid' ? t('paidWorks') : state.mode === 'free' ? t('freeWorks') : t('nexusWorks')) + '</span>')
    ];
    if (state.mode === 'paid') {
      cards.push(card(t('avgPrice'), totals.count ? fmt(totals.price / totals.count) + ' CC' : '—', '$', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
    }
    if (state.mode === 'nexus') {
      cards.push(card(t('uniqueDownloads'), fmt(totals.unique), '◎', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
      cards.push(card(t('endorsements'), fmt(totals.likes), '♡', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
    } else {
      cards.push(card(t('likes'), fmt(totals.likes), '♡', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
      cards.push(card(t('views'), fmt(totals.views), '◉', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
      cards.push(card(t('library'), fmt(totals.library), '＋', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
      if (state.mode === 'free') cards.push(card(t('plays'), fmt(totals.plays), '▶', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
    }
    target.innerHTML = cards.join('');
  }
  function lineChart(days) {
    const values = days.map(selectedValue);
    if (!days.length) return '<div class="admin-cc-empty">' + esc(t('noData')) + '</div>';
    const width = 900, height = 245, pl = 54, pr = 18, pt = 18, pb = 34;
    const chartW = width - pl - pr, chartH = height - pt - pb;
    const max = Math.max(1, ...values);
    const yMax = Math.max(4, Math.ceil(max / 4) * 4);
    const points = days.map((day, index) => {
      const x = pl + (chartW / Math.max(1, days.length - 1)) * index;
      const y = pt + chartH - (selectedValue(day) / yMax) * chartH;
      return { x, y, day };
    });
    const grid = [0,1,2,3,4].map((step) => {
      const y = pt + chartH * (step / 4);
      const label = Math.round(yMax * (1 - step / 4));
      return '<line class="admin-chart-grid-line" x1="' + pl + '" y1="' + y + '" x2="' + (width-pr) + '" y2="' + y + '"></line><text class="admin-chart-axis-text" x="5" y="' + (y+4) + '">' + fmt(label) + '</text>';
    }).join('');
    const poly = points.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const dots = points.map((p) => '<circle class="admin-chart-point ' + state.mode + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4"><title>' + esc(dateLabel(p.day.date) + ' · ' + fmt(selectedValue(p.day))) + '</title></circle>').join('');
    const labels = points.map((p, index) => {
      if (days.length > 12 && index % Math.ceil(days.length / 7) !== 0 && index !== days.length - 1) return '';
      return '<text class="admin-chart-axis-text" x="' + p.x.toFixed(1) + '" y="' + (height-8) + '" text-anchor="middle">' + esc(dateLabel(p.day.date)) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-label="' + esc(t('downloadsTrend')) + '">' + grid + '<polyline class="admin-chart-line ' + state.mode + '" points="' + poly + '"></polyline>' + dots + labels + '</svg>';
  }
  function renderTrend() {
    const target = document.querySelector('[data-cc-line-chart]');
    if (target) target.innerHTML = lineChart(periodDays(state.range));
  }
  function renderShare() {
    const ring = document.querySelector('[data-cc-share-ring]');
    const center = document.querySelector('[data-cc-share-center]');
    const copyNode = document.querySelector('[data-cc-share-copy]');
    let share = 0, selected = 0, secondaryLabel = t('allTimeShare'), secondaryValue = '0%';
    if (state.mode === 'nexus') {
      const totals = allTimeStats('nexus');
      selected = periodValue(state.range, 0, 'nexus');
      share = totals.downloads ? totals.unique / totals.downloads * 100 : 0;
      secondaryLabel = t('uniqueDownloads');
      secondaryValue = fmt(totals.unique);
    } else {
      selected = periodValue(state.range);
      const totalCC = periodValue(state.range, 0, 'paid') + periodValue(state.range, 0, 'free');
      share = totalCC ? selected / totalCC * 100 : 0;
      const modeAll = allTimeStats(state.mode).downloads;
      const allTotal = allTimeStats('paid').downloads + allTimeStats('free').downloads;
      secondaryValue = pct(allTotal ? modeAll / allTotal * 100 : 0);
    }
    if (ring) ring.style.setProperty('--share', Math.min(100, Math.max(0, share)) + '%');
    if (center) center.textContent = pct(share);
    if (copyNode) {
      const copyKey = state.mode === 'paid' ? 'shareCopyPaid' : state.mode === 'free' ? 'shareCopyFree' : 'shareCopyNexus';
      copyNode.innerHTML = '<strong>' + fmt(selected) + '</strong><p>' + esc(t(copyKey)) + '</p><div class="admin-cc-share-meta"><div><span>' + esc(t('periodDownloads')) + '</span><b>' + fmt(selected) + '</b></div><div><span>' + esc(secondaryLabel) + '</span><b>' + esc(secondaryValue) + '</b></div></div>';
    }
  }
  function renderBars() {
    const target = document.querySelector('[data-cc-bars]');
    if (!target) return;
    const days = periodDays(state.range).slice(-10);
    const max = Math.max(1, ...days.map(selectedValue));
    target.innerHTML = days.map((day) => '<div class="admin-bar-day" title="' + esc(dateLabel(day.date) + ' · ' + fmt(selectedValue(day))) + '"><div class="admin-bar-stack"><span class="admin-bar-seg ' + state.mode + '" style="height:' + (selectedValue(day)/max*100).toFixed(2) + '%"></span></div><label>' + esc(dateLabel(day.date)) + '</label></div>').join('');
  }
  function renderRanking() {
    const body = document.querySelector('[data-cc-ranking]');
    if (!body) return;
    const rows = topRows(), total = rows.reduce((sum, item) => sum + item.downloads, 0) || 1;
    body.innerHTML = rows.length ? rows.map((item, index) => '<tr><td>' + (index+1) + '</td><td title="' + esc(item.title) + '">' + esc(item.title) + '</td><td>' + fmt(item.downloads) + '</td><td>' + ((item.downloads/total)*100).toFixed(1) + '%</td></tr>').join('') : '<tr><td colspan="4">' + esc(t('noData')) + '</td></tr>';
  }
  function renderConversion() {
    const target = document.querySelector('[data-cc-conversion]');
    if (!target) return;
    const total = allTimeStats();
    const values = state.mode === 'nexus'
      ? [
          [t('uniqueRate'), total.downloads ? total.unique / total.downloads * 100 : 0, '%', 100],
          [t('endorsementRate'), total.unique ? total.likes / total.unique * 100 : 0, '%', 10]
        ]
      : [
          [t('downloadRate'), total.views ? total.downloads / total.views * 100 : 0, '%', 100],
          [t('libraryRate'), total.downloads ? total.library / total.downloads * 100 : 0, '%', 100],
          [t('likeRate'), total.downloads ? total.likes / total.downloads * 100 : 0, '%', 10],
          [t('playsPerDownload'), total.downloads ? total.plays / total.downloads : 0, 'x', 30]
        ];
    target.innerHTML = values.map(([label, value, suffix, scale]) => {
      const width = Math.min(100, Math.max(2, value / scale * 100));
      const shown = suffix === '%' ? value.toFixed(1) + '%' : value.toFixed(1) + '×';
      return '<div class="admin-cc-conversion-row"><div class="admin-cc-conversion-head"><span>' + esc(label) + '</span><strong>' + esc(shown) + '</strong></div><div class="admin-cc-conversion-track"><i style="width:' + width.toFixed(1) + '%"></i></div></div>';
    }).join('');
  }
  function renderDetails() {
    const head = document.querySelector('[data-cc-detail-head]');
    const body = document.querySelector('[data-cc-detail-body]');
    const note = document.querySelector('[data-cc-detail-note]');
    if (!head || !body) return;
    if (state.mode === 'nexus') {
      const daily = new Map(currentDay().rows.map((row) => [String(row.mod_id || ''), n(row.daily_downloads)]));
      const items = nexusMods().map((item) => ({ ...item, daily: daily.get(String(item.mod_id || '')) || 0 })).sort((a,b) => n(b.total_downloads) - n(a.total_downloads));
      head.innerHTML = '<tr><th>' + esc(t('creation')) + '</th><th>' + esc(t('daily')) + '</th><th>' + esc(t('total')) + '</th><th>' + esc(t('uniqueDownloads')) + '</th><th>' + esc(t('endorsements')) + '</th></tr>';
      body.innerHTML = items.length ? items.map((item) => '<tr><td title="' + esc(item.mod_name) + '">' + esc(item.mod_name) + '</td><td class="' + (item.daily > 0 ? 'admin-cc-daily-positive' : '') + '">' + fmt(item.daily) + '</td><td>' + fmt(item.total_downloads) + '</td><td>' + fmt(item.unique_downloads) + '</td><td>' + fmt(item.likes) + '</td></tr>').join('') : '<tr><td colspan="5">' + esc(t('noData')) + '</td></tr>';
      if (note) note.textContent = t('detailNexus');
      return;
    }
    const daily = dailyMap();
    const items = modeCreations().map((item) => ({ ...item, daily: daily.get(normalizeTitle(item.title)) || 0 })).sort((a,b) => n(b.downloads) - n(a.downloads));
    head.innerHTML = '<tr><th>' + esc(t('creation')) + '</th>' + (state.mode === 'paid' ? '<th>' + esc(t('price')) + '</th>' : '') + '<th>' + esc(t('daily')) + '</th><th>' + esc(t('total')) + '</th><th>' + esc(t('likes')) + '</th><th>' + esc(t('views')) + '</th><th>' + esc(t('library')) + '</th><th>' + esc(t('plays')) + '</th></tr>';
    body.innerHTML = items.length ? items.map((item) => '<tr><td title="' + esc(item.title) + '">' + esc(item.title) + '</td>' + (state.mode === 'paid' ? '<td class="admin-cc-price">' + fmt(item.price) + ' CC</td>' : '') + '<td class="' + (item.daily > 0 ? 'admin-cc-daily-positive' : '') + '">' + fmt(item.daily) + '</td><td>' + fmt(item.downloads) + '</td><td>' + fmt(item.likes) + '</td><td>' + fmt(item.views) + '</td><td>' + fmt(item.libraryAdds) + '</td><td>' + fmt(item.plays) + '</td></tr>').join('') : '<tr><td colspan="' + (state.mode === 'paid' ? 8 : 7) + '">' + esc(t('noData')) + '</td></tr>';
    if (note) note.textContent = state.mode === 'paid' ? t('detailPaid') : t('detailFree');
  }
  function updateText() {
    const dashboard = document.querySelector('.cc-focus-dashboard');
    if (!dashboard) return;
    dashboard.dataset.ccMode = state.mode;
    const title = dashboard.querySelector('[data-cc-title]');
    const subtitle = dashboard.querySelector('[data-cc-subtitle]');
    const dayWindow = dashboard.querySelector('[data-cc-day-window]');
    const sync = dashboard.querySelector('[data-cc-sync]');
    if (title) title.textContent = t('title');
    if (subtitle) subtitle.textContent = state.mode === 'paid' ? t('paidSubtitle') : state.mode === 'free' ? t('freeSubtitle') : t('nexusSubtitle');
    if (dayWindow) dayWindow.textContent = t('dayWindow');
    const syncRaw = state.mode === 'nexus' ? (state.nexusLatest?.updatedAt || state.lastSync || '') : (state.lastSync || '');
    if (sync) sync.textContent = t('lastSync') + ': ' + formatBeijingTime(syncRaw);
    dashboard.querySelectorAll('[data-cc-tab]').forEach((button) => {
      const active = button.dataset.ccTab === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      const label = button.querySelector('span');
      if (label) label.textContent = button.dataset.ccTab === 'paid' ? t('paid') : button.dataset.ccTab === 'free' ? t('free') : t('nexus');
    });
    const range = dashboard.querySelector('[data-cc-range]');
    if (range) {
      const a = range.querySelector('option[value="7"]'), b = range.querySelector('option[value="30"]');
      if (a) a.textContent = t('last7');
      if (b) b.textContent = t('last30');
    }
    const map = {
      '[data-cc-trend-title]': 'downloadsTrend',
      '[data-cc-recent-title]': 'recent',
      '[data-cc-ranking-title]': 'ranking',
      '[data-cc-conversion-title]': 'conversion',
      '[data-cc-detail-title]': 'detail'
    };
    Object.entries(map).forEach(([selector,key]) => {
      const node = dashboard.querySelector(selector);
      if (node) node.textContent = t(key);
    });
    const shareTitle = dashboard.querySelector('[data-cc-share-title]');
    if (shareTitle) shareTitle.textContent = state.mode === 'nexus' ? t('nexusShare') : t('ccShare');
    dashboard.querySelectorAll('[data-cc-range-label]').forEach((node) => { node.textContent = state.range === 30 ? t('last30') : t('last7'); });
    const legend = dashboard.querySelector('[data-cc-legend]');
    if (legend) legend.lastChild.textContent = state.mode === 'paid' ? t('paid') : state.mode === 'free' ? t('free') : t('nexus');
    const rhead = dashboard.querySelector('[data-cc-ranking-head]');
    if (rhead) rhead.innerHTML = '<tr><th>#</th><th>' + esc(t('creation')) + '</th><th>' + esc(t('downloadsTrend').replace(' Trend','')) + '</th><th>%</th></tr>';
  }
  function renderAll() {
    if (!state.ready) return;
    updateText();
    renderMetrics();
    renderTrend();
    renderShare();
    renderBars();
    renderRanking();
    renderConversion();
    renderDetails();
  }
  function markup() {
    return '<header class="admin-dashboard-header"><div class="admin-dashboard-title"><h1 data-cc-title>Mod Analytics</h1><p data-cc-subtitle></p><p class="admin-dashboard-day-window" data-cc-day-window></p></div><div class="admin-dashboard-tools"><span class="admin-dashboard-sync" data-cc-sync></span><select class="admin-dashboard-range" data-cc-range aria-label="Dashboard period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div></header>' +
      '<div class="admin-cc-focus-strip"><div class="admin-cc-focus-tabs" role="tablist" aria-label="Mod data source"><button class="admin-cc-focus-tab is-active" type="button" role="tab" aria-selected="true" data-cc-tab="paid"><i></i><span>Paid Creations</span></button><button class="admin-cc-focus-tab" type="button" role="tab" aria-selected="false" data-cc-tab="free"><i></i><span>Free Creations</span></button><button class="admin-cc-focus-tab" type="button" role="tab" aria-selected="false" data-cc-tab="nexus"><i></i><span>Nexus Mods</span></button></div></div>' +
      '<section class="admin-dashboard-metrics" data-cc-kpis></section>' +
      '<div class="admin-cc-focus-dashboard-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-trend-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-focus-legend" data-cc-legend><i></i><span></span></div><div class="admin-line-chart" data-cc-line-chart></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-share-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-share-card"><div class="admin-cc-share-ring" data-cc-share-ring><div class="admin-cc-share-center"><strong data-cc-share-center>0%</strong><span>MOD</span></div></div><div class="admin-cc-share-copy" data-cc-share-copy></div></div></section></div>' +
      '<div class="admin-cc-bottom-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-recent-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-bars" data-cc-bars></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-ranking-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-ranking-wrap"><table class="admin-ranking-table"><thead data-cc-ranking-head></thead><tbody data-cc-ranking></tbody></table></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-conversion-title></h3><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-conversion" data-cc-conversion></div></section></div>' +
      '<section class="admin-analytics-panel admin-cc-detail-panel admin-cc-panel-accent"><div class="admin-analytics-head"><div><h3 data-cc-detail-title></h3><p class="admin-insight-caption" data-cc-detail-note></p></div><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-detail-wrap"><table class="admin-cc-detail-table"><thead data-cc-detail-head></thead><tbody data-cc-detail-body></tbody></table></div></section>' +
      '<div class="admin-dashboard-loading" data-cc-loading>Loading mod analytics…</div>';
  }
  async function load() {
    const [creationResponse, nexusHistoryResponse, nexusLatestResponse] = await Promise.all([
      fetch(DAILY_URL + '?v=' + Date.now(), { cache: 'no-store' }),
      fetch(NEXUS_HISTORY_URL + '?v=' + Date.now(), { cache: 'no-store' }),
      fetch(NEXUS_LATEST_URL + '?v=' + Date.now(), { cache: 'no-store' })
    ]);
    if (!creationResponse.ok) throw new Error('CC data HTTP ' + creationResponse.status);
    if (!nexusHistoryResponse.ok) throw new Error('Nexus history HTTP ' + nexusHistoryResponse.status);
    if (!nexusLatestResponse.ok) throw new Error('Nexus latest HTTP ' + nexusLatestResponse.status);
    state.rows = parseCSV(await creationResponse.text());
    state.days = buildDays(state.rows);
    state.nexusRows = parseCSV(await nexusHistoryResponse.text());
    state.nexusDays = buildNexusDays(state.nexusRows);
    state.nexusLatest = await nexusLatestResponse.json();
    state.lastSync = creations().map((item) => String(item.updatedAt || '')).filter(Boolean).sort().at(-1) || state.days.at(-1)?.updatedAt || '';
    state.ready = true;
    document.querySelector('[data-cc-loading]')?.remove();
    renderAll();
  }
  function install() {
    const dashboard = document.querySelector('.admin-dashboard');
    if (!dashboard) { window.setTimeout(install, 80); return; }
    if (dashboard.dataset.ccFocusReady === 'true') return;
    dashboard.dataset.ccFocusReady = 'true';
    dashboard.classList.add('cc-focus-dashboard');
    dashboard.dataset.ccMode = 'paid';
    dashboard.innerHTML = markup();

    dashboard.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-cc-tab]');
      if (!tab) return;
      state.mode = ['paid', 'free', 'nexus'].includes(tab.dataset.ccTab) ? tab.dataset.ccTab : 'paid';
      renderAll();
    });
    dashboard.querySelector('[data-cc-range]')?.addEventListener('change', (event) => {
      state.range = Number(event.target.value) === 30 ? 30 : 7;
      renderAll();
    });

    let observedLang = document.documentElement.lang;
    const langObserver = new MutationObserver(() => {
      const currentLang = document.documentElement.lang;
      if (currentLang === observedLang) return;
      observedLang = currentLang;
      renderAll();
    });
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    load().catch((error) => {
      console.error('[admin-cc-focus]', error);
      const loading = dashboard.querySelector('[data-cc-loading]');
      if (loading) {
        loading.className = 'admin-dashboard-error';
        loading.textContent = error.message;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();