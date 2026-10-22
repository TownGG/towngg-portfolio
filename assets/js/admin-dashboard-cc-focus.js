(() => {
  const SITE_DATA_URL = './assets/js/site-data.js';
  const DAILY_URL = './assets/data/creations-mod-daily.csv';
  const PAID_LIBRARY_HISTORY_URL = './assets/data/paid-creations-library-history.csv';
  const NEXUS_HISTORY_URL = './assets/data/nexus-history.csv';
  const NEXUS_LATEST_URL = './assets/data/nexus-latest.json';
  const EARNINGS_URL = './assets/data/partner-earnings.json';
  const REFRESH_MS = 2 * 60 * 1000;
  const PAID_RMB_PER_LIBRARY_ADD = 4.62;
  const STALE_AFTER_MS = 60 * 60 * 1000;
  const state = { mode: 'paid', range: 7, rows: [], days: [], nexusRows: [], nexusDays: [], nexusLatest: null, earnings: null, earningsDays: [], paidLibraryHistory: [], ready: false, refreshing: false, signature: '', lastSync: '' };

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
      earnings: "Creator Earnings",
      earningsSubtitle: "Microsoft Partner Center earnings, transactions and payout status",
      earningsDayWindow: "Earnings dates shown in Beijing time · API sync runs hourly",
      totalEarnings: "Total Earnings",
      currentMonthEarnings: "This Month",
      sevenDayEarnings: "Last 7 Days",
      thirtyDayEarnings: "Last 30 Days",
      transactionCount: "Transactions",
      avgPerTransaction: "Avg / Transaction",
      adjustments: "Adjustments",
      productsCount: "Paid Products",
      unprocessedEarnings: "Unprocessed",
      earningsTrend: "Earnings Trend",
      dailyEarnings: "Daily Earnings",
      rolling7Earnings: "7-day earnings average",
      earningsShare: "Unprocessed Earnings Share",
      shareCopyEarnings: "Share of creator earnings still marked UNPROCESSED by Partner Center.",
      pendingEarnings: "Unprocessed earnings",
      failedEarnings: "Failed / threshold",
      productEarnings: "Product Earnings Ranking",
      earningsStructure: "Earnings Structure",
      earningsDetail: "Product Earnings Detail",
      detailEarnings: "Earnings by paid Creation. Raw transaction and customer identifiers are not published.",
      earningsMatrix: "Transactions × Earnings",
      earningsMatrixTitle: "Earnings Efficiency Matrix",
      transactionAxis: "Transactions",
      earningsAxis: "Earnings (USD)",
      avgEarning: "Average earning",
      pendingRate: "Unprocessed share",
      failedRate: "Failed share",
      adjustmentRate: "Adjustment share",
      dayWindow: 'Daily statistics: Beijing 12:00–next day 12:00',
      lastSync: 'Last Updated',
      last7: 'Last 7 days',
      last30: 'Last 30 days',
      totalDownloads: 'Total Downloads',
      today: 'Today',
      yesterday: 'Yesterday',
      sevenDays: 'This Week Downloads',
      thirtyDays: 'This Month Downloads',
      works: 'Creations',
      avgPrice: 'Avg Price',
      likes: 'Likes',
      views: 'Views',
      library: 'Library Adds',
      todayLibrary: 'Library Adds Today',
      weekLibrary: 'Library Adds This Week',
      monthLibrary: 'Library Adds This Month',
      librarySnapshot: 'Snapshot-based increase',
      libraryUnavailable: 'Boundary snapshot missing',
      estimatedTodayRmb: 'Estimated Revenue Today',
      estimatedWeekRmb: 'Estimated Revenue This Week',
      estimatedMonthRmb: 'Estimated Revenue This Month',
      estimatedRevenueNote: 'Library Adds × 4.62 · estimate only',
      revenueAnalysis: 'Estimated Revenue Analytics',
      revenueAnalysisDesc: 'Library adds × ¥4.62 · Not actual payouts',
      revenueLine: 'Today’s Estimated Revenue Trend',
      revenueLineSub: 'Since 12:00 Beijing time',
      revenueDaily: 'Recent 7-day Revenue Trend',
      revenueDailySub: 'Beijing 12:00 to next day 12:00; missing data ≠ zero',
      revenueCompare: 'Period-on-Period Comparison',
      revenueCompareSub: 'Comparison to equally elapsed prior periods',
      revenueVsDay: 'Today vs Yesterday',
      revenueVsWeek: 'This Week vs Last Week',
      revenueVsMonth: 'This Month vs Last Month',
      revenueVsYear: 'This Month vs Last Year',
      revenueNoHistory: 'Insufficient history',
      revenueNewGrowth: 'New growth',
      revenuePrior: 'Prior period',
      revenueEstimated: 'Estimate · snapshots',
      revenueDateNote: 'Snapshots may be ~30 minutes from the cutoff',
      plays: 'Plays',
      uniqueDownloads: 'Unique Downloads',
      endorsements: 'Endorsements',
      vsYesterday: 'vs yesterday',
      vsPrevious: 'vs previous period',
      vsLastWeek: 'vs last week (same days)',
      vsLastMonth: 'vs last month (same days)',
      allTime: 'All-time',
      paidWorks: 'Paid works',
      freeWorks: 'Free works',
      nexusWorks: 'Nexus mods',
      downloadsTrend: 'Downloads Trend',
      dailySeries: 'Daily downloads',
      rolling7: '7-day average',
      performanceMatrix: 'Performance Matrix',
      paidMatrix: 'Price vs Downloads',
      freeMatrix: 'Views vs Downloads',
      nexusMatrix: 'Unique vs Total Downloads',
      growthSnapshot: 'Growth Snapshot',
      bestDay: 'Best day',
      avg7: '7-day average',
      avg30: '30-day average',
      momentum: '7-day momentum',
      top3Share: 'Top 3 share',
      priceAxis: 'Price (CC)',
      viewsAxis: 'Views',
      uniqueAxis: 'Unique downloads',
      downloadsAxis: 'Downloads',
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
      detailPaid: 'Paid works sorted by today’s downloads (highest first), with price and other metrics.',
      detailFree: 'Free works sorted by today’s downloads (highest first), with other metrics.',
      detailNexus: 'Nexus mods sorted by today’s downloads (highest first), with unique and endorsement data.',
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
      earnings: "创作者收益",
      earningsSubtitle: "同步 Microsoft Partner Center 收益、交易与结算状态",
      earningsDayWindow: "收益日期按北京时间展示 · API 每小时自动同步",
      totalEarnings: "累计收益",
      currentMonthEarnings: "本月收益",
      sevenDayEarnings: "近 7 日收益",
      thirtyDayEarnings: "近 30 日收益",
      transactionCount: "交易笔数",
      avgPerTransaction: "单笔平均收益",
      adjustments: "调整项",
      productsCount: "付费作品数",
      unprocessedEarnings: "待结算收益",
      earningsTrend: "收益趋势",
      dailyEarnings: "每日收益",
      rolling7Earnings: "7 日收益均线",
      earningsShare: "待结算收益占比",
      shareCopyEarnings: "当前创作者收益中，仍被 Partner Center 标记为 UNPROCESSED 的比例。",
      pendingEarnings: "待结算收益",
      failedEarnings: "失败 / 未达付款门槛",
      productEarnings: "作品收益排行",
      earningsStructure: "收益结构",
      earningsDetail: "作品收益明细",
      detailEarnings: "按付费 Creation 查看收益与交易。公开数据仅保留聚合结果，不发布客户或交易标识。",
      earningsMatrix: "交易笔数 × 收益",
      earningsMatrixTitle: "收益效率矩阵",
      transactionAxis: "交易笔数",
      earningsAxis: "收益（USD）",
      avgEarning: "平均单笔收益",
      pendingRate: "待结算占比",
      failedRate: "失败收益占比",
      adjustmentRate: "调整项占比",
      dayWindow: '每日统计口径：北京时间 12:00–次日 12:00',
      lastSync: '最后更新',
      last7: '最近 7 天',
      last30: '最近 30 天',
      totalDownloads: '累计下载',
      today: '今日下载',
      yesterday: '昨日下载',
      sevenDays: '本周下载',
      thirtyDays: '本月下载',
      works: '作品数量',
      avgPrice: '平均价格',
      likes: '点赞',
      views: '浏览',
      library: '加入库',
      todayLibrary: '今日入库',
      weekLibrary: '本周入库',
      monthLibrary: '本月入库数',
      librarySnapshot: '按快照增量统计',
      libraryUnavailable: '缺少起点数据',
      estimatedTodayRmb: '今日预估收入',
      estimatedWeekRmb: '本周预估收入',
      estimatedMonthRmb: '本月预估收入',
      estimatedRevenueNote: '入库数 × 4.62 · 非实际结算',
      revenueAnalysis: '预估收入分析',
      revenueAnalysisDesc: '入库增量 × ¥4.62 · 非实际结算',
      revenueLine: '今日累计预估收入走势',
      revenueLineSub: '北京时间 12:00 至最新快照',
      revenueDaily: '近 7 个统计日预估收入',
      revenueDailySub: '北京时间 12:00 至次日 12:00 · 缺失不等于零',
      revenueCompare: '收入环比与同比',
      revenueCompareSub: '与上一周期相同已过时长比较',
      revenueVsDay: '今日较昨日同期',
      revenueVsWeek: '本周较上周同期',
      revenueVsMonth: '本月较上月同期',
      revenueVsYear: '本月较去年同期',
      revenueNoHistory: '历史快照不足',
      revenueNewGrowth: '新增收入',
      revenuePrior: '上期同期',
      revenueEstimated: '估算 · 快照口径',
      revenueDateNote: '快照采样与统计边界可能相差约半小时',
      plays: '游玩',
      uniqueDownloads: '唯一下载',
      endorsements: 'Endorsements',
      vsYesterday: '较昨日',
      vsPrevious: '较上一周期',
      vsLastWeek: '较上周同期',
      vsLastMonth: '较上月同期',
      allTime: '累计数据',
      paidWorks: '付费作品',
      freeWorks: '免费作品',
      nexusWorks: 'Nexus 模组',
      downloadsTrend: '下载趋势',
      dailySeries: '每日下载',
      rolling7: '7 日均线',
      performanceMatrix: '表现矩阵',
      paidMatrix: '价格 × 下载',
      freeMatrix: '浏览 × 下载',
      nexusMatrix: '唯一下载 × 总下载',
      growthSnapshot: '增长概览',
      bestDay: '最佳单日',
      avg7: '7 日日均',
      avg30: '30 日日均',
      momentum: '7 日趋势',
      top3Share: 'Top 3 下载占比',
      priceAxis: '价格（CC）',
      viewsAxis: '浏览',
      uniqueAxis: '唯一下载',
      downloadsAxis: '下载',
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
      detailPaid: '按今日下载量从高到低排序，今日相同时按累计下载量排序；查看价格及各项核心数据。',
      detailFree: '按今日下载量从高到低排序，今日相同时按累计下载量排序；查看各项核心数据。',
      detailNexus: '按今日下载量从高到低排序，今日相同时按累计下载量排序；查看唯一下载与 Endorsements。',
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
      earnings: "クリエイター収益",
      earningsSubtitle: "Microsoft Partner Center の収益・取引・支払状況",
      earningsDayWindow: "収益日は北京時間表示 · API は毎時同期",
      totalEarnings: "累計収益",
      currentMonthEarnings: "今月",
      sevenDayEarnings: "直近7日",
      thirtyDayEarnings: "直近30日",
      transactionCount: "取引数",
      avgPerTransaction: "平均 / 取引",
      adjustments: "調整額",
      productsCount: "有料作品数",
      unprocessedEarnings: "未処理収益",
      earningsTrend: "収益推移",
      dailyEarnings: "日別収益",
      rolling7Earnings: "7日収益平均",
      earningsShare: "未処理収益比率",
      shareCopyEarnings: "Partner Center で UNPROCESSED の収益比率。",
      pendingEarnings: "未処理収益",
      failedEarnings: "失敗 / 支払しきい値未達",
      productEarnings: "作品収益ランキング",
      earningsStructure: "収益構成",
      earningsDetail: "作品収益詳細",
      detailEarnings: "有料 Creation ごとの集計収益。顧客・取引識別子は公開しません。",
      earningsMatrix: "取引数 × 収益",
      earningsMatrixTitle: "収益効率マトリクス",
      transactionAxis: "取引数",
      earningsAxis: "収益 (USD)",
      avgEarning: "平均収益",
      pendingRate: "未処理比率",
      failedRate: "失敗比率",
      adjustmentRate: "調整比率",
      dayWindow: '日次集計：北京時間 12:00–翌日 12:00',
      lastSync: '最終更新',
      last7: '直近 7 日',
      last30: '直近 30 日',
      totalDownloads: '累計DL',
      today: '今日',
      yesterday: '昨日',
      sevenDays: '今週DL',
      thirtyDays: '今月DL',
      works: '作品数',
      avgPrice: '平均価格',
      likes: 'いいね',
      views: '閲覧',
      library: 'ライブラリ追加',
      todayLibrary: '今日ライブラリ追加',
      weekLibrary: '今週ライブラリ追加',
      monthLibrary: '今月ライブラリ追加',
      librarySnapshot: 'スナップショットの増加量',
      libraryUnavailable: '開始時点のデータなし',
      estimatedTodayRmb: '今日の推定収益',
      estimatedWeekRmb: '今週の推定収益',
      estimatedMonthRmb: '今月の推定収益',
      estimatedRevenueNote: '追加数 × 4.62 · 推定値',
      revenueAnalysis: '推定収益分析',
      revenueAnalysisDesc: '追加数 × ¥4.62 · 実際の支払額ではありません',
      revenueLine: '本日の推定収益推移',
      revenueLineSub: '北京時間12:00から最新データまで',
      revenueDaily: '直近7日間の推定収益',
      revenueDailySub: '北京時間12:00〜翌12:00 · 欠測≠ゼロ',
      revenueCompare: '前期・前年との比較',
      revenueCompareSub: '同じ経過時間で比較',
      revenueVsDay: '本日対前日',
      revenueVsWeek: '今週対前週',
      revenueVsMonth: '今月対前月',
      revenueVsYear: '今月対前年',
      revenueNoHistory: '履歴不足',
      revenueNewGrowth: '新規増加',
      revenuePrior: '前期',
      revenueEstimated: '推定 · スナップショット',
      revenueDateNote: '境界時刻から約30分ずれる場合があります',
      plays: 'プレイ',
      uniqueDownloads: 'ユニークDL',
      endorsements: 'Endorsements',
      vsYesterday: '昨日比',
      vsPrevious: '前期間比',
      vsLastWeek: '前週同期比',
      vsLastMonth: '前月同期比',
      allTime: '累計',
      paidWorks: '有料作品',
      freeWorks: '無料作品',
      nexusWorks: 'Nexus Mod',
      downloadsTrend: 'DL推移',
      dailySeries: '日別DL',
      rolling7: '7日平均',
      performanceMatrix: 'パフォーマンスマトリクス',
      paidMatrix: '価格 × DL',
      freeMatrix: '閲覧 × DL',
      nexusMatrix: 'ユニークDL × 総DL',
      growthSnapshot: '成長サマリー',
      bestDay: '最高日',
      avg7: '7日平均',
      avg30: '30日平均',
      momentum: '7日モメンタム',
      top3Share: 'Top 3 比率',
      priceAxis: '価格 (CC)',
      viewsAxis: '閲覧',
      uniqueAxis: 'ユニークDL',
      downloadsAxis: 'DL',
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
      detailPaid: '有料作品を今日のDL数が多い順に表示。価格と主要指標を確認。',
      detailFree: '無料作品を今日のDL数が多い順に表示。主要指標を確認。',
      detailNexus: 'Nexus Mod を今日のDL数が多い順に表示。ユニークDLとEndorsementを確認。',
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
  function money(value) {
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n(value));
  }
  function metric(value, digits = 0) {
    return state.mode === 'earnings' ? money(value) : fmt(value, digits);
  }
  function pct(value) { return Number.isFinite(value) ? value.toFixed(1) + '%' : '—'; }
  function utcDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const iso = raw.replace(' ', 'T');
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : iso + 'Z';
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function formatBeijingTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const date = utcDate(raw);
    if (!date) return raw;
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
  function parseSiteData(source) {
    const isolatedWindow = {};
    return Function('window', source + '\n;return window.siteData;')(isolatedWindow);
  }
  function isStaleTimestamp(value) {
    const date = utcDate(value);
    return Boolean(date && Date.now() - date.getTime() > STALE_AFTER_MS);
  }
  function latestCreationTimestamp(items = creations()) {
    return items
      .map((item) => String(item.updatedAt || '').trim())
      .filter(Boolean)
      .sort((a, b) => (utcDate(b)?.getTime() || 0) - (utcDate(a)?.getTime() || 0))[0] || '';
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
    if (state.mode === 'nexus' || state.mode === 'earnings') return [];
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
  function calendarTodayKey() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return parts.year + '-' + parts.month + '-' + parts.day;
  }
  function activeTodayKey(mode = state.mode) {
    return mode === 'earnings' ? calendarTodayKey() : todayKey();
  }
  function activeDays() {
    if (state.mode === 'earnings') return state.earningsDays;
    return state.mode === 'nexus' ? state.nexusDays : state.days;
  }
  function selectedValue(day, mode = state.mode) {
    if (!day) return 0;
    if (mode === 'earnings') return n(day.earnings);
    return mode === 'nexus' ? n(day.nexus) : n(day[mode]);
  }
  function currentDay() {
    const days = activeDays();
    const key = activeTodayKey();
    return days.find((day) => day.date === key) || (state.mode === 'nexus'
      ? { date: key, nexus: 0, rows: [] }
      : state.mode === 'earnings'
        ? { date: key, earnings: 0, transactions: 0, rows: [] }
        : { date: key, free: 0, paid: 0, rows: [] });
  }
  function priorDay(beforeDate) {
    const days = activeDays();
    return [...days].filter((day) => day.date < beforeDate).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      || (state.mode === 'nexus' ? { nexus: 0, rows: [] } : state.mode === 'earnings' ? { earnings: 0, transactions: 0, rows: [] } : { free: 0, paid: 0, rows: [] });
  }
  // Used only by the two top-level "This Week / This Month" KPI cards.
  // Day keys already represent Beijing 12:00 → next-day 12:00.
  // Charts and other analytics intentionally keep their original rolling windows.
  const METRIC_DAY_MS = 24 * 60 * 60 * 1000;
  function metricPeriodBounds(period, offset = 0, mode = state.mode) {
    const date = new Date(activeTodayKey(mode) + 'T00:00:00Z');
    const start = new Date(date.getTime());
    if (period === 'month') {
      start.setUTCDate(1);
      start.setUTCMonth(start.getUTCMonth() - offset);
    } else {
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - 7 * offset);
    }
    if (!offset) return { start: start.toISOString().slice(0, 10), end: date.toISOString().slice(0, 10) };
    const currentStart = new Date(metricPeriodBounds(period, 0, mode).start + 'T00:00:00Z');
    const elapsedDays = Math.floor((date.getTime() - currentStart.getTime()) / METRIC_DAY_MS);
    const comparedEnd = new Date(start.getTime() + elapsedDays * METRIC_DAY_MS);
    const next = new Date(start.getTime());
    if (period === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 7);
    const last = new Date(next.getTime() - METRIC_DAY_MS);
    return {
      start: start.toISOString().slice(0, 10),
      end: new Date(Math.min(comparedEnd.getTime(), last.getTime())).toISOString().slice(0, 10)
    };
  }
  function metricPeriodValue(period, offset = 0, mode = state.mode) {
    const bounds = metricPeriodBounds(period, offset, mode);
    const days = mode === 'nexus' ? state.nexusDays : mode === 'earnings' ? state.earningsDays : state.days;
    return days.filter((day) => day.date >= bounds.start && day.date <= bounds.end)
      .reduce((sum, day) => sum + selectedValue(day, mode), 0);
  }
  // Paid-only Library Adds. Snapshots use UTC; Beijing noon = 04:00 UTC.
  function paidLibraryIncrement(period) {
    const key = period === 'today' ? todayKey() : metricPeriodBounds(period, 0, 'paid').start;
    const boundary = Date.parse(key + 'T04:00:00Z');
    const snapshots = state.paidLibraryHistory.map((row) => ({
      time: utcDate(row.timestamp)?.getTime(),
      value: Number(row.total_paid_library_adds)
    })).filter((row) => Number.isFinite(row.time) && Number.isFinite(row.value) && row.value >= 0)
      .sort((a, b) => a.time - b.time);
    const baseline = snapshots.filter((row) => row.time <= boundary).at(-1);
    const latest = snapshots.at(-1);
    if (!baseline || !latest || boundary - baseline.time > 2 * 60 * 60 * 1000 || latest.time < boundary) return null;
    return Math.max(0, latest.value - baseline.value);
  }
  function periodDays(count, offset = 0) {
    const eligible = activeDays().filter((day) => day.date <= activeTodayKey());
    const end = Math.max(0, eligible.length - offset);
    return eligible.slice(Math.max(0, end - count), end);
  }
  function periodValue(count, offset = 0, mode = state.mode) {
    const days = mode === 'earnings' ? state.earningsDays : mode === 'nexus' ? state.nexusDays : state.days;
    const eligible = days.filter((day) => day.date <= activeTodayKey(mode));
    const end = Math.max(0, eligible.length - offset);
    return eligible.slice(Math.max(0, end - count), end).reduce((sum, day) => sum + selectedValue(day, mode), 0);
  }
  function nexusMods() {
    return Array.isArray(state.nexusLatest?.mods) ? state.nexusLatest.mods : [];
  }
  function earningsData() {
    return state.earnings || { totals: {}, daily: [], monthly: [], products: [], paymentStatus: [] };
  }
  function earningsProducts() {
    return Array.isArray(earningsData().products) ? earningsData().products : [];
  }
  function earningsStatus(test) {
    return (earningsData().paymentStatus || []).filter((item) => test(String(item.status || ''))).reduce((sum, item) => sum + n(item.earningsUSD), 0);
  }
  function allTimeStats(mode = state.mode) {
    if (mode === 'earnings') {
      const data = earningsData();
      return { downloads: n(data.totals?.earningsUSD), unique: n(data.totals?.transactionRows), likes: 0, views: 0, library: 0, plays: 0, price: 0, count: n(data.totals?.products) };
    }
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
  function renderRevenueMetrics() {
    const target = document.querySelector('[data-cc-revenue-kpis]');
    if (!target) return;
    const isPaid = state.mode === 'paid';
    target.hidden = !isPaid;
    if (!isPaid) {
      target.innerHTML = '';
      return;
    }
    const periods = [
      ['estimatedTodayRmb', 'today'],
      ['estimatedWeekRmb', 'week'],
      ['estimatedMonthRmb', 'month']
    ];
    target.innerHTML = periods.map(([label, period]) => {
      const libraryAdds = paidLibraryIncrement(period);
      const money = libraryAdds === null
        ? '—'
        : '¥' + new Intl.NumberFormat('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(libraryAdds * PAID_RMB_PER_LIBRARY_ADD);
      const foot = libraryAdds === null ? t('libraryUnavailable') : t('estimatedRevenueNote');
      return '<article class="admin-cc-revenue-card">' +
        '<div class="admin-cc-revenue-card-head"><span>' + esc(t(label)) +
        '</span><span class="admin-cc-revenue-currency">CNY</span></div>' +
        '<strong class="admin-cc-revenue-card-value">' + esc(money) + '</strong>' +
        '<p class="admin-cc-revenue-card-foot">' + esc(foot) + '</p>' +
        '</article>';
    }).join('');
  }
  function renderMetrics() {
    const target = document.querySelector('[data-cc-kpis]');
    if (!target) return;
    if (state.mode === 'earnings') {
      const data = earningsData();
      const totals = data.totals || {};
      const average = n(totals.transactionRows) ? n(totals.earningsUSD) / n(totals.transactionRows) : 0;
      const pending = earningsStatus((status) => /unprocessed/i.test(status));
      target.innerHTML = [
        card(t('totalEarnings'), money(totals.earningsUSD), '$', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'),
        card(t('currentMonthEarnings'), money(totals.currentMonthUSD), '◫', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(data.period?.to || '') + '</span>'),
        card(t('sevenDayEarnings'), money(totals.last7DaysUSD), '7', trend(percentChange(periodValue(7), periodValue(7, 7)), t('vsPrevious'))),
        card(t('thirtyDayEarnings'), money(totals.last30DaysUSD), '30', trend(percentChange(periodValue(30), periodValue(30, 30)), t('vsPrevious'))),
        card(t('transactionCount'), fmt(totals.transactionRows), '#', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'),
        card(t('avgPerTransaction'), money(average), '÷', '<span class="admin-metric-trend is-flat">●</span><span>USD</span>'),
        card(t('productsCount'), fmt(totals.products), '▱', '<span class="admin-metric-trend is-flat">●</span><span>Bethesda Games</span>'),
        card(t('unprocessedEarnings'), money(pending), '…', '<span class="admin-metric-trend is-flat">●</span><span>Partner Center</span>'),
        card(t('adjustments'), money(totals.adjustmentsUSD), '±', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>')
      ].join('');
      return;
    }
    const today = currentDay();
    const yesterday = priorDay(today.date);
    const beforeYesterday = priorDay(yesterday.date || today.date);
    const current = selectedValue(today);
    const previous = selectedValue(yesterday);
    const p7 = metricPeriodValue('week'), prev7 = metricPeriodValue('week', 1);
    const p30 = metricPeriodValue('month'), prev30 = metricPeriodValue('month', 1);
    const totals = allTimeStats();
    const cards = [
      card(t('totalDownloads'), fmt(totals.downloads), '↓', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'),
      card(t('today'), fmt(current), '◫', trend(percentChange(current, previous), t('vsYesterday'))),
      card(t('yesterday'), fmt(previous), '◫', trend(percentChange(previous, selectedValue(beforeYesterday)), t('vsYesterday'))),
      card(t('sevenDays'), fmt(p7), '↗', trend(percentChange(p7, prev7), t('vsLastWeek'))),
      card(t('thirtyDays'), fmt(p30), '∿', trend(percentChange(p30, prev30), t('vsLastMonth'))),
      card(t('works'), fmt(totals.count), '▱', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(state.mode === 'paid' ? t('paidWorks') : state.mode === 'free' ? t('freeWorks') : t('nexusWorks')) + '</span>')
    ];
    if (state.mode === 'paid') {
      cards.push(card(t('avgPrice'), totals.count ? fmt(totals.price / totals.count) + ' CC' : '—', '$', '<span class="admin-metric-trend is-flat">●</span><span>' + esc(t('allTime')) + '</span>'));
      const labels = [['todayLibrary', 'today', '＋'], ['weekLibrary', 'week', '▣'], ['monthLibrary', 'month', '▤']];
      labels.forEach(([label, period, icon]) => {
        const increment = paidLibraryIncrement(period);
        const note = increment === null ? t('libraryUnavailable') : t('librarySnapshot');
        cards.push(card(t(label), increment === null ? '—' : fmt(increment), icon, '<span class="admin-metric-trend is-flat">●</span><span>' + esc(note) + '</span>'));
      });
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
  function rollingAverage(values, index, size = 7) {
    const start = Math.max(0, index - size + 1);
    const slice = values.slice(start, index + 1);
    return slice.length ? slice.reduce((sum, value) => sum + value, 0) / slice.length : 0;
  }
  function lineChart(days) {
    if (!days.length) return '<div class="admin-cc-empty">' + esc(t('noData')) + '</div>';
    const values = days.map((day) => selectedValue(day));
    const averages = values.map((_, index) => rollingAverage(values, index, 7));
    const width = 900, height = 245, pl = 54, pr = 18, pt = 18, pb = 34;
    const chartW = width - pl - pr, chartH = height - pt - pb;
    const max = Math.max(1, ...values, ...averages);
    const yStep = Math.max(1, Math.ceil(max / 4));
    const yMax = yStep * 4;
    const xy = (value, index) => ({
      x: pl + (chartW / Math.max(1, days.length - 1)) * index,
      y: pt + chartH - (value / yMax) * chartH
    });
    const points = days.map((day, index) => ({ ...xy(values[index], index), day, value: values[index] }));
    const avgPoints = days.map((day, index) => ({ ...xy(averages[index], index), day, value: averages[index] }));
    const grid = [0,1,2,3,4].map((step) => {
      const y = pt + chartH * (step / 4);
      const label = Math.round(yMax * (1 - step / 4));
      return '<line class="admin-chart-grid-line" x1="' + pl + '" y1="' + y + '" x2="' + (width-pr) + '" y2="' + y + '"></line><text class="admin-chart-axis-text" x="5" y="' + (y+4) + '">' + metric(label) + '</text>';
    }).join('');
    const poly = points.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const avgPoly = avgPoints.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const area = points.length ? [
      points[0].x.toFixed(1) + ',' + (pt + chartH).toFixed(1),
      ...points.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)),
      points.at(-1).x.toFixed(1) + ',' + (pt + chartH).toFixed(1)
    ].join(' ') : '';
    const dots = points.map((p) => '<circle class="admin-chart-point ' + state.mode + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4"><title>' + esc(dateLabel(p.day.date) + ' · ' + metric(p.value)) + '</title></circle>').join('');
    const labels = points.map((p, index) => {
      if (days.length > 12 && index % Math.ceil(days.length / 7) !== 0 && index !== days.length - 1) return '';
      return '<text class="admin-chart-axis-text" x="' + p.x.toFixed(1) + '" y="' + (height-8) + '" text-anchor="middle">' + esc(dateLabel(p.day.date)) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet" aria-label="' + esc(t('downloadsTrend')) + '"><polygon class="admin-chart-area" points="' + area + '"></polygon>' + grid + '<polyline class="admin-chart-line ' + state.mode + '" points="' + poly + '"></polyline><polyline class="admin-chart-line average" points="' + avgPoly + '"></polyline>' + dots + labels + '</svg>';
  }
  function renderTrend() {
    const target = document.querySelector('[data-cc-line-chart]');
    if (target) target.innerHTML = lineChart(periodDays(state.range));
    const legend = document.querySelector('[data-cc-legend]');
    if (legend) legend.innerHTML = '<span class="admin-cc-legend-item"><i></i>' + esc(t(state.mode === 'earnings' ? 'dailyEarnings' : 'dailySeries')) + '</span><span class="admin-cc-legend-item is-average"><i></i>' + esc(t(state.mode === 'earnings' ? 'rolling7Earnings' : 'rolling7')) + '</span>';
  }
  function renderShare() {
    const ring = document.querySelector('[data-cc-share-ring]');
    const center = document.querySelector('[data-cc-share-center]');
    const copyNode = document.querySelector('[data-cc-share-copy]');
    if (state.mode === 'earnings') {
      const total = n(earningsData().totals?.earningsUSD);
      const pending = earningsStatus((status) => /unprocessed/i.test(status));
      const failed = earningsStatus((status) => /failed/i.test(status));
      const share = total ? pending / total * 100 : 0;
      if (ring) ring.style.setProperty('--share', Math.min(100, Math.max(0, share)) + '%');
      if (center) center.textContent = pct(share);
      if (copyNode) copyNode.innerHTML = '<strong>' + money(pending) + '</strong><p>' + esc(t('shareCopyEarnings')) + '</p><div class="admin-cc-share-meta"><div><span>' + esc(t('pendingEarnings')) + '</span><b>' + money(pending) + '</b></div><div><span>' + esc(t('failedEarnings')) + '</span><b>' + money(failed) + '</b></div></div>';
      return;
    }
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
    const max = Math.max(1, ...days.map((day) => selectedValue(day)));
    target.innerHTML = days.map((day) => '<div class="admin-bar-day" title="' + esc(dateLabel(day.date) + ' · ' + metric(selectedValue(day))) + '"><div class="admin-bar-stack"><span class="admin-bar-seg ' + state.mode + '" style="height:' + (selectedValue(day)/max*100).toFixed(2) + '%"></span></div><label>' + esc(dateLabel(day.date)) + '</label></div>').join('');
  }
  function renderRanking() {
    const body = document.querySelector('[data-cc-ranking]');
    if (!body) return;
    if (state.mode === 'earnings') {
      const rows = earningsProducts().slice(0, 8);
      const total = rows.reduce((sum, item) => sum + n(item.earningsUSD), 0) || 1;
      body.innerHTML = rows.length ? rows.map((item, index) => '<tr><td>' + (index + 1) + '</td><td title="' + esc(item.name) + '">' + esc(item.name) + '</td><td>' + money(item.earningsUSD) + '</td><td>' + (n(item.earningsUSD) / total * 100).toFixed(1) + '%</td></tr>').join('') : '<tr><td colspan="4">' + esc(t('noData')) + '</td></tr>';
      return;
    }
    const rows = topRows(), total = rows.reduce((sum, item) => sum + item.downloads, 0) || 1;
    body.innerHTML = rows.length ? rows.map((item, index) => '<tr><td>' + (index+1) + '</td><td title="' + esc(item.title) + '">' + esc(item.title) + '</td><td>' + fmt(item.downloads) + '</td><td>' + ((item.downloads/total)*100).toFixed(1) + '%</td></tr>').join('') : '<tr><td colspan="4">' + esc(t('noData')) + '</td></tr>';
  }
  function renderConversion() {
    const target = document.querySelector('[data-cc-conversion]');
    if (!target) return;
    if (state.mode === 'earnings') {
      const data = earningsData(), totals = data.totals || {};
      const total = n(totals.earningsUSD);
      const pending = earningsStatus((status) => /unprocessed/i.test(status));
      const failed = earningsStatus((status) => /failed/i.test(status));
      const average = n(totals.transactionRows) ? total / n(totals.transactionRows) : 0;
      const rows = [
        [t('avgEarning'), money(average), Math.min(100, average / 1.5 * 100)],
        [t('pendingRate'), pct(total ? pending / total * 100 : 0), total ? pending / total * 100 : 0],
        [t('failedRate'), pct(total ? failed / total * 100 : 0), total ? failed / total * 100 : 0],
        [t('adjustmentRate'), pct(total ? n(totals.adjustmentsUSD) / total * 100 : 0), total ? n(totals.adjustmentsUSD) / total * 100 : 0]
      ];
      target.innerHTML = rows.map(([label, shown, width]) => '<div class="admin-cc-conversion-row"><div class="admin-cc-conversion-head"><span>' + esc(label) + '</span><strong>' + esc(shown) + '</strong></div><div class="admin-cc-conversion-track"><i style="width:' + Math.max(2, Math.min(100, n(width))).toFixed(1) + '%"></i></div></div>').join('');
      return;
    }
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
  function matrixDataset() {
    if (state.mode === 'earnings') {
      return earningsProducts().map((item) => ({
        title: item.name || 'Unknown',
        x: n(item.transactions),
        y: n(item.earningsUSD)
      })).filter((item) => item.x > 0 || item.y > 0).sort((a,b) => b.y - a.y).slice(0, 14);
    }
    if (state.mode === 'nexus') {
      return nexusMods().map((item) => ({
        title: item.mod_name || 'Unknown',
        x: n(item.unique_downloads),
        y: n(item.total_downloads)
      })).filter((item) => item.x > 0 || item.y > 0).sort((a,b) => b.y - a.y).slice(0, 14);
    }
    return modeCreations().map((item) => ({
      title: item.title || 'Unknown',
      x: state.mode === 'paid' ? n(item.price) : n(item.views),
      y: n(item.downloads)
    })).filter((item) => item.x > 0 || item.y > 0).sort((a,b) => b.y - a.y).slice(0, 14);
  }
  function renderPerformanceMatrix() {
    const target = document.querySelector('[data-cc-matrix]');
    if (!target) return;
    const items = matrixDataset();
    if (!items.length) {
      target.innerHTML = '<div class="admin-cc-empty">' + esc(t('noData')) + '</div>';
      return;
    }
    const width = 680, height = 270, pl = 58, pr = 20, pt = 20, pb = 42;
    const chartW = width - pl - pr, chartH = height - pt - pb;
    const maxX = Math.max(1, ...items.map((item) => item.x));
    const maxY = Math.max(1, ...items.map((item) => item.y));
    const xMax = maxX * 1.08;
    const yMax = maxY * 1.08;
    const grid = [0,1,2,3,4].map((step) => {
      const y = pt + chartH * step / 4;
      const x = pl + chartW * step / 4;
      const yLabel = Math.round(yMax * (1 - step / 4));
      const xLabel = Math.round(xMax * step / 4);
      return '<line class="admin-chart-grid-line" x1="' + pl + '" y1="' + y + '" x2="' + (width-pr) + '" y2="' + y + '"></line>' +
        '<line class="admin-chart-grid-line" x1="' + x + '" y1="' + pt + '" x2="' + x + '" y2="' + (pt+chartH) + '"></line>' +
        '<text class="admin-chart-axis-text" x="4" y="' + (y+4) + '">' + fmt(yLabel) + '</text>' +
        '<text class="admin-chart-axis-text" x="' + x + '" y="' + (height-14) + '" text-anchor="middle">' + fmt(xLabel) + '</text>';
    }).join('');
    const points = items.map((item) => {
      const x = pl + (item.x / xMax) * chartW;
      const y = pt + chartH - (item.y / yMax) * chartH;
      return '<circle class="admin-matrix-point ' + state.mode + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6"><title>' + esc(item.title + ' · X ' + fmt(item.x) + ' · Y ' + fmt(item.y)) + '</title></circle>';
    }).join('');
    const xLabel = state.mode === 'earnings' ? t('transactionAxis') : state.mode === 'paid' ? t('priceAxis') : state.mode === 'free' ? t('viewsAxis') : t('uniqueAxis');
    const yLabel = state.mode === 'earnings' ? t('earningsAxis') : t('downloadsAxis');
    return target.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">' + grid + points + '<text class="admin-chart-axis-title" x="' + (pl+chartW/2) + '" y="' + (height-1) + '" text-anchor="middle">' + esc(xLabel) + '</text><text class="admin-chart-axis-title" transform="translate(12 ' + (pt+chartH/2) + ') rotate(-90)" text-anchor="middle">' + esc(yLabel) + '</text></svg>';
  }
  function concentrationShare() {
    let values = [];
    if (state.mode === 'earnings') values = earningsProducts().map((item) => n(item.earningsUSD));
    else if (state.mode === 'nexus') values = nexusMods().map((item) => n(item.total_downloads));
    else values = modeCreations().map((item) => n(item.downloads));
    values = values.filter((value) => value > 0).sort((a,b) => b-a);
    const total = values.reduce((sum,value) => sum + value, 0);
    return total ? values.slice(0,3).reduce((sum,value) => sum + value, 0) / total * 100 : 0;
  }
  function renderGrowthSnapshot() {
    const target = document.querySelector('[data-cc-snapshot]');
    if (!target) return;
    const days = periodDays(Math.max(30, state.range));
    const visible = periodDays(state.range);
    const best = [...visible].sort((a,b) => selectedValue(b) - selectedValue(a))[0];
    const avg7Days = periodDays(7);
    const avg30Days = periodDays(30);
    const avg7 = avg7Days.length ? avg7Days.reduce((sum,day) => sum + selectedValue(day),0) / avg7Days.length : 0;
    const avg30 = avg30Days.length ? avg30Days.reduce((sum,day) => sum + selectedValue(day),0) / avg30Days.length : 0;
    const momentumValue = percentChange(periodValue(7), periodValue(7,7));
    const momentumText = momentumValue === null ? '—' : (momentumValue >= 0 ? '+' : '') + momentumValue.toFixed(1) + '%';
    const rows = [
      [t('bestDay'), best ? metric(selectedValue(best)) + ' · ' + dateLabel(best.date) : '—'],
      [t('avg7'), state.mode === 'earnings' ? money(avg7) : fmt(avg7, 1)],
      [t('avg30'), state.mode === 'earnings' ? money(avg30) : fmt(avg30, 1)],
      [t('momentum'), momentumText],
      [t('top3Share'), pct(concentrationShare())]
    ];
    target.innerHTML = rows.map(([label,value], index) => '<div class="admin-cc-snapshot-row"><span>' + esc(label) + '</span><strong class="' + (index === 3 && momentumValue !== null ? (momentumValue >= 0 ? 'is-up' : 'is-down') : '') + '">' + esc(value) + '</strong></div>').join('');
  }
  function renderDetails() {
    const head = document.querySelector('[data-cc-detail-head]');
    const body = document.querySelector('[data-cc-detail-body]');
    const note = document.querySelector('[data-cc-detail-note]');
    if (!head || !body) return;
    if (state.mode === 'earnings') {
      const items = earningsProducts();
      head.innerHTML = '<tr><th>' + esc(t('creation')) + '</th><th>' + esc(t('earningsAxis')) + '</th><th>' + esc(t('transactionCount')) + '</th><th>' + esc(t('avgPerTransaction')) + '</th></tr>';
      body.innerHTML = items.length ? items.map((item) => '<tr><td title="' + esc(item.name) + '">' + esc(item.name) + '</td><td class="admin-cc-daily-positive">' + money(item.earningsUSD) + '</td><td>' + fmt(item.transactions) + '</td><td>' + money(item.avgEarningUSD) + '</td></tr>').join('') : '<tr><td colspan="4">' + esc(t('noData')) + '</td></tr>';
      if (note) note.textContent = t('detailEarnings');
      return;
    }
    if (state.mode === 'nexus') {
      const daily = new Map(currentDay().rows.map((row) => [String(row.mod_id || ''), n(row.daily_downloads)]));
      const items = nexusMods().map((item) => ({ ...item, daily: daily.get(String(item.mod_id || '')) || 0 })).sort((a,b) => n(b.daily) - n(a.daily) || n(b.total_downloads) - n(a.total_downloads));
      head.innerHTML = '<tr><th>' + esc(t('creation')) + '</th><th>' + esc(t('daily')) + '</th><th>' + esc(t('total')) + '</th><th>' + esc(t('uniqueDownloads')) + '</th><th>' + esc(t('endorsements')) + '</th></tr>';
      body.innerHTML = items.length ? items.map((item) => '<tr><td title="' + esc(item.mod_name) + '">' + esc(item.mod_name) + '</td><td class="' + (item.daily > 0 ? 'admin-cc-daily-positive' : '') + '">' + fmt(item.daily) + '</td><td>' + fmt(item.total_downloads) + '</td><td>' + fmt(item.unique_downloads) + '</td><td>' + fmt(item.likes) + '</td></tr>').join('') : '<tr><td colspan="5">' + esc(t('noData')) + '</td></tr>';
      if (note) note.textContent = t('detailNexus');
      return;
    }
    const daily = dailyMap();
    const items = modeCreations().map((item) => ({ ...item, daily: daily.get(normalizeTitle(item.title)) || 0 })).sort((a,b) => n(b.daily) - n(a.daily) || n(b.downloads) - n(a.downloads));
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
    const sync = dashboard.querySelector('[data-cc-sync]');
    if (title) title.textContent = t('title');
    if (subtitle) subtitle.textContent = state.mode === 'paid' ? t('paidSubtitle') : state.mode === 'free' ? t('freeSubtitle') : t('nexusSubtitle');
    const syncRaw = state.mode === 'nexus' ? (state.nexusLatest?.updatedAt || state.lastSync || '') : (state.lastSync || '');
    if (sync) {
      const stale = isStaleTimestamp(syncRaw);
      sync.textContent = t('lastSync') + ': ' + formatBeijingTime(syncRaw);
      sync.classList.toggle('is-stale', stale);
      sync.classList.toggle('is-fresh', !stale);
      sync.title = stale
        ? (lang() === 'zh-CN' ? '超过 1 小时未同步，请检查数据抓取或登录状态。' : 'No sync for over 1 hour. Check data collection or login state.')
        : (lang() === 'zh-CN' ? '数据同步正常。' : 'Data sync is current.');
    }
    dashboard.querySelectorAll('[data-cc-tab]').forEach((button) => {
      const active = button.dataset.ccTab === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      const label = button.querySelector('span');
      if (label) label.textContent = button.dataset.ccTab === 'paid' ? t('paid') : button.dataset.ccTab === 'free' ? t('free') : t('nexus');
    });
    const map = {
      '[data-cc-trend-title]': 'downloadsTrend',
      '[data-cc-recent-title]': 'recent',
      '[data-cc-ranking-title]': 'ranking',
      '[data-cc-conversion-title]': 'conversion',
      '[data-cc-matrix-title]': 'performanceMatrix',
      '[data-cc-snapshot-title]': 'growthSnapshot',
      '[data-cc-detail-title]': 'detail'
    };
    Object.entries(map).forEach(([selector,key]) => {
      const node = dashboard.querySelector(selector);
      if (node) node.textContent = t(key);
    });
    const shareTitle = dashboard.querySelector('[data-cc-share-title]');
    if (shareTitle) shareTitle.textContent = state.mode === 'nexus' ? t('nexusShare') : t('ccShare');
    const matrixTitle = dashboard.querySelector('[data-cc-matrix-subtitle]');
    if (matrixTitle) matrixTitle.textContent = state.mode === 'paid' ? t('paidMatrix') : state.mode === 'free' ? t('freeMatrix') : t('nexusMatrix');
    dashboard.querySelectorAll('[data-cc-range-label]').forEach((node) => { node.textContent = state.range === 30 ? t('last30') : t('last7'); });
    const legend = dashboard.querySelector('[data-cc-legend]');
    if (legend) legend.lastChild.textContent = state.mode === 'paid' ? t('paid') : state.mode === 'free' ? t('free') : t('nexus');
    const rhead = dashboard.querySelector('[data-cc-ranking-head]');
    if (rhead) rhead.innerHTML = '<tr><th>#</th><th>' + esc(t('creation')) + '</th><th>' + esc(t('downloadsAxis')) + '</th><th>%</th></tr>';
  }
  function renderAll() {
    if (!state.ready) return;
    updateText();
    renderRevenueMetrics();
    renderMetrics();
    renderTrend();
    renderShare();
    renderBars();
    renderRanking();
    renderConversion();
    renderPerformanceMatrix();
    renderGrowthSnapshot();
    renderDetails();
  }
  function markup() {
    return '<header class="admin-dashboard-header"><div class="admin-dashboard-title"><h1 data-cc-title>Mod Analytics</h1><p data-cc-subtitle></p><p class="admin-dashboard-last-updated" data-cc-sync></p></div></header>' +
      '<div class="admin-cc-focus-strip"><div class="admin-cc-focus-tabs" role="tablist" aria-label="Mod data source"><button class="admin-cc-focus-tab is-active" type="button" role="tab" aria-selected="true" data-cc-tab="paid"><i></i><span>Paid Creations</span></button><button class="admin-cc-focus-tab" type="button" role="tab" aria-selected="false" data-cc-tab="free"><i></i><span>Free Creations</span></button><button class="admin-cc-focus-tab" type="button" role="tab" aria-selected="false" data-cc-tab="nexus"><i></i><span>Nexus Mods</span></button></div></div>' +
      '<section class="admin-cc-revenue-metrics" data-cc-revenue-kpis hidden></section>' +
      '<section class="admin-dashboard-metrics" data-cc-kpis></section>' +
      '<div class="admin-cc-focus-dashboard-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-trend-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-focus-legend" data-cc-legend><i></i><span></span></div><div class="admin-line-chart" data-cc-line-chart></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-share-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-share-card"><div class="admin-cc-share-ring" data-cc-share-ring><div class="admin-cc-share-center"><strong data-cc-share-center>0%</strong><span>MOD</span></div></div><div class="admin-cc-share-copy" data-cc-share-copy></div></div></section></div>' +
      '<div class="admin-cc-analysis-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><div><h3 data-cc-matrix-title></h3><p class="admin-insight-caption" data-cc-matrix-subtitle></p></div><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-matrix" data-cc-matrix></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-snapshot-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-snapshot" data-cc-snapshot></div></section></div>' +
      '<div class="admin-cc-bottom-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-recent-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-bars" data-cc-bars></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-ranking-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-ranking-wrap"><table class="admin-ranking-table"><thead data-cc-ranking-head></thead><tbody data-cc-ranking></tbody></table></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-conversion-title></h3><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-conversion" data-cc-conversion></div></section></div>' +
      '<section class="admin-analytics-panel admin-cc-detail-panel admin-cc-panel-accent"><div class="admin-analytics-head"><div><h3 data-cc-detail-title></h3><p class="admin-insight-caption" data-cc-detail-note></p></div><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-detail-wrap"><table class="admin-cc-detail-table"><thead data-cc-detail-head></thead><tbody data-cc-detail-body></tbody></table></div></section>' +
      '<div class="admin-dashboard-loading" data-cc-loading>Loading mod analytics…</div>';
  }
  async function load(force = false) {
    if (state.refreshing) return;
    state.refreshing = true;
    try {
      const [siteResponse, creationResponse, nexusHistoryResponse, nexusLatestResponse, paidLibraryResponse] = await Promise.all([
        fetch(SITE_DATA_URL + '?v=' + Date.now(), { cache: 'no-store' }),
        fetch(DAILY_URL + '?v=' + Date.now(), { cache: 'no-store' }),
        fetch(NEXUS_HISTORY_URL + '?v=' + Date.now(), { cache: 'no-store' }),
        fetch(NEXUS_LATEST_URL + '?v=' + Date.now(), { cache: 'no-store' }),
        fetch(PAID_LIBRARY_HISTORY_URL + '?v=' + Date.now(), { cache: 'no-store' }).catch(() => null)
      ]);
      if (!siteResponse.ok) throw new Error('Site data HTTP ' + siteResponse.status);
      if (!creationResponse.ok) throw new Error('CC data HTTP ' + creationResponse.status);
      if (!nexusHistoryResponse.ok) throw new Error('Nexus history HTTP ' + nexusHistoryResponse.status);
      if (!nexusLatestResponse.ok) throw new Error('Nexus latest HTTP ' + nexusLatestResponse.status);

      const [siteSource, creationText, nexusHistoryText, nexusLatest, paidLibraryText] = await Promise.all([
        siteResponse.text(),
        creationResponse.text(),
        nexusHistoryResponse.text(),
        nexusLatestResponse.json(),
        paidLibraryResponse?.ok ? paidLibraryResponse.text() : Promise.resolve('')
      ]);
      const parsedSite = parseSiteData(siteSource);
      const creationStamp = latestCreationTimestamp(parsedSite?.creations || []);
      const signature = [
        todayKey(),
        creationStamp,
        creationText.length,
        creationText.slice(-240),
        nexusLatest?.updatedAt || '',
        nexusHistoryText.length,
        nexusHistoryText.slice(-240),
        paidLibraryText.length,
        paidLibraryText.slice(-240)
      ].join('|');

      if (!force && state.ready && signature === state.signature) {
        updateText();
        return;
      }

      if (parsedSite?.creations?.length) {
        window.siteData = { ...(window.siteData || {}), ...parsedSite, creations: parsedSite.creations };
      }
      state.rows = parseCSV(creationText);
      state.days = buildDays(state.rows);
      state.nexusRows = parseCSV(nexusHistoryText);
      state.nexusDays = buildNexusDays(state.nexusRows);
      state.nexusLatest = nexusLatest;
      state.paidLibraryHistory = paidLibraryText ? parseCSV(paidLibraryText) : [];
      state.lastSync = latestCreationTimestamp();
      state.signature = signature;
      state.ready = true;
      document.querySelector('[data-cc-loading]')?.remove();
      renderAll();
    } finally {
      state.refreshing = false;
    }
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
    let observedLang = document.documentElement.lang;
    const langObserver = new MutationObserver(() => {
      const currentLang = document.documentElement.lang;
      if (currentLang === observedLang) return;
      observedLang = currentLang;
      renderAll();
    });
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    const refresh = (force = false) => load(force).catch((error) => {
      console.error('[admin-cc-focus]', error);
      const loading = dashboard.querySelector('[data-cc-loading]');
      if (!state.ready && loading) {
        loading.className = 'admin-dashboard-error';
        loading.textContent = error.message;
      }
    });

    refresh(true);
    window.setInterval(() => refresh(false), REFRESH_MS);
    window.setInterval(() => { if (state.ready) updateText(); }, 60 * 1000);
    window.addEventListener('focus', () => refresh(false));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
    window.addEventListener('towngg:downloads-data-updated', () => refresh(false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();