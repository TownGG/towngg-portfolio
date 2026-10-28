(() => {
  const SITE_DATA_URL = './assets/js/site-data.js';
  const DAILY_URL = './assets/data/creations-mod-daily.csv';
  const PAID_LIBRARY_HISTORY_URL = './assets/data/paid-creations-library-history.csv';
  const NEXUS_HISTORY_URL = './assets/data/nexus-history.csv';
  const NEXUS_LATEST_URL = './assets/data/nexus-latest.json';
  const EARNINGS_URL = './assets/data/partner-earnings.json';
  const REFRESH_MS = 2 * 60 * 1000;
  const PAID_RMB_PER_LIBRARY_ADD = 4.62;
  const REVENUE_GOAL_RMB = 200000;
  const REVENUE_GOAL_STEP = 10000;
  const DEFAULT_REVENUE_TAX_RATE = 10;
  const REVENUE_TAX_STORAGE_KEY = 'townggPaidRevenueTaxRatePct';
  const STALE_AFTER_MS = 60 * 60 * 1000;
  const state = { mode: 'paid', range: 7, goalRange: 'day', taxRatePct: DEFAULT_REVENUE_TAX_RATE, rows: [], days: [], nexusRows: [], nexusDays: [], nexusLatest: null, earnings: null, earningsDays: [], paidLibraryHistory: [], ready: false, refreshing: false, signature: '', lastSync: '' };

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
      estimatedTodayRmb: "Today",
      estimatedWeekRmb: "This Week",
      estimatedMonthRmb: "This Month",
      estimatedYesterdayRmb: "Yesterday",
      estimatedLastWeekRmb: "Last Week",
      estimatedLastMonthRmb: "Last Month",
      priorPeriodComplete: 'Full previous period · estimate only',
      revenueComparedTo: 'vs',
      revenueComparedYesterday: 'vs yesterday',
      revenueComparedWeek: 'vs last week',
      revenueComparedMonth: 'vs last month',
      estimatedRevenueNote: 'Library Adds × 4.62 · estimate only',
      revenueSectionTitle: "Estimated Net Revenue",
      goalTitle: "REVENUE GOAL",
      goalSubtitle: "Paid Creations · cumulative estimated net revenue",
      goalCurrent: "Cumulative after-withholding estimate",
      goalTarget: "Goal",
      goalProgress: "Completed",
      goalRemaining: "Remaining to goal",
      goalNext: "Next milestone",
      goalNextRemaining: "To next milestone",
      goalAchievedCount: "Milestones unlocked",
      goalTrend: "Cumulative Estimated Net Revenue",
      goalTrendDesc: "After configurable estimated withholding · not actual bank receipts",
      goalDay: "Day",
      goalMonth: "Month",
      goalYear: "Year",
      goalOneYear: "Only one year of recorded data",
      goalNoData: "No revenue snapshots yet",
      goalLatest: "Latest snapshot",
      goalMilestones: "¥10,000 Milestones",
      goalMilestonesDesc: "¥10,000 net-estimate milestones; first snapshot reaching each threshold at the selected rate",
      goalDone: "First observed",
      goalPending: "Pending",
      goalFinished: "Goal reached",
      goalNote: "Goal, milestones and their dates use the current withholding-rate assumption. Changing that rate recalculates them. Actual payouts and bank receipts may differ.",
      revenueSectionSubtitle: "After estimated withholding · original gross estimate remains available · not actual bank receipts",
      taxPanelTitle: "After-Withholding Estimate & Breakdown",
      taxPanelSubtitle: "Net estimate is primary · gross and withholding retained for reference",
      taxRateLabel: "Estimated withholding rate",
      taxRateHelp: "Saved only in this browser; enter 0–100%. Default 10%.",
      taxGross: "Before withholding",
      taxWithheld: "Estimated withholding",
      taxNet: "After withholding (estimate)",
      taxNetShort: "After withholding",
      taxWithheldShort: "Withholding",
      taxGrossShort: "Before withholding",
      taxMonthTax: "This month · estimated withholding",
      taxMonthNet: "This month · after withholding",
      taxTrend: "Last 7 Days · After Withholding vs Gross",
      taxTrendNote: "Beijing noon-to-noon days · missing snapshots are not zero · dashed estimates reuse the existing boundary model",
      taxDisclaimer: "10% is a provisional assumption. Bank payment differences may also involve intermediary charges; official payout and bank receipt amounts are separate.",
      taxSummaryMissing: "Insufficient snapshots",
      taxActualSeparate: "Not actual bank receipts",
      downloadSectionTitle: 'Download Data',
      downloadSectionSubtitle: 'Download performance, growth and engagement',
      revenueAnalysis: "After-Withholding Revenue Analytics",
      revenueAnalysisDesc: "After estimated withholding · snapshots from library additions · not actual bank receipts",
      revenueLine: "Today's After-Withholding Trend",
      revenueLineSub: 'Since 12:00 Beijing time',
      revenueDaily: "This Week · Estimated After Withholding",
      revenueDailySub: 'Monday–Sunday · statistical days run from Beijing 12:00 to next day 12:00',
      revenueMonthWeekly: "This Month · Estimated After Withholding by Week",
      revenueMonthWeeklySub: 'Calendar weeks (Mon–Sun); weeks crossing month boundaries count only days in this month',
      revenueMonthWeeklyNote: 'Dashed bars represent interpolated estimates · — means missing or not yet started, not zero',
      revenueMonthWeekLabel: 'Week {n}',
      revenueNotStarted: 'Not started',
      revenueWeekdayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      revenueInsightsTitle: '7 Completed Days · Revenue Insights',
      revenueInsightsDesc: 'Excludes the current unfinished statistics day',
      revenueSevenTotal: '7-day Total',
      revenueSevenAverage: 'Daily Average',
      revenueSevenBest: 'Highest Day',
      revenueThreeDayMomentum: '3-day Momentum',
      revenueSevenTotalFoot: 'Last 7 completed days',
      revenueSevenAverageFoot: 'Reference line on chart',
      revenueThreeDayFoot: 'Latest 3 vs previous 3 days',
      revenueDailyAverageGuide: "Week-to-date after-withholding daily average",
      revenueDaysAvailable: 'Valid days',
      revenueInsightsMissing: '7 complete days of data needed',
      revenueWeekInsightsTitle: "This Week · After-Withholding Analysis",
      revenueWeekInsightsDesc: "Week to date; including today's unfinished statistics",
      revenueMonthInsightsTitle: "This Month · After-Withholding Analysis",
      revenueMonthInsightsDesc: "Month to date; includes ongoing week",
      revenueWeekTotal: "Week-to-date Revenue",
      revenueWeekAverage: "Daily Average",
      revenueWeekBest: "Highest Recorded Day",
      revenueWeekGrowth: "vs Full Last Week",
      revenueMonthTotal: "Month-to-date Revenue",
      revenueMonthAverage: "Weekly Average",
      revenueMonthBest: "Highest Recorded Week",
      revenueMonthGrowth: "vs Full Last Month",
      revenueWeekTotalFoot: "Through latest snapshot",
      revenueWeekAverageFoot: "Total ÷ {n} started days (incl. today)",
      revenueWeekBestFoot: "{date} · {n} recorded days",
      revenueMonthTotalFoot: "Through latest snapshot",
      revenueMonthAverageFoot: "Total ÷ {n} started calendar-week segments",
      revenueMonthBestFoot: "{week} · {n} recorded weeks",
      revenueWeekGrowthFoot: "Week-to-date vs last full week",
      revenueMonthGrowthFoot: "Month-to-date vs last full month",
      revenueStatMissing: "Insufficient snapshots",
      revenueDailyAverageGuide: "Week-to-date daily average",
      revenueCompare: 'Period-on-Period Comparison',
      revenueCompareSub: 'Current period to date vs the previous full period',
      revenueVsDay: 'Today vs Yesterday (full day)',
      revenueVsWeek: 'This Week vs Last Week (full week)',
      revenueVsMonth: 'This Month vs Last Month (full month)',
      revenueVsYear: 'This Month vs Last Year',
      revenueNoHistory: 'Insufficient history',
      revenueNewGrowth: 'New growth',
      revenuePrior: 'Previous full period',
      revenueEstimated: 'Estimate · snapshots',
      revenueDateNote: 'Missing boundaries are estimated from neighboring snapshots · dashed bars indicate estimates · long gaps remain unavailable',
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
      estimatedTodayRmb: "今日收入",
      estimatedWeekRmb: "本周收入",
      estimatedMonthRmb: "本月收入",
      estimatedYesterdayRmb: "昨日收入",
      estimatedLastWeekRmb: "上周收入",
      estimatedLastMonthRmb: "上月收入",
      priorPeriodComplete: '上一完整统计周期 · 预估',
      revenueComparedTo: '较',
      revenueComparedYesterday: '较昨日',
      revenueComparedWeek: '较上周',
      revenueComparedMonth: '较上月',
      estimatedRevenueNote: '入库数 × 4.62 · 非实际结算',
      revenueSectionTitle: "税后预估收入",
      goalTitle: "收入目标",
      goalSubtitle: "付费 CC · 累计税后预估收入",
      goalCurrent: "累计税后预估收入",
      goalTarget: "目标金额",
      goalProgress: "完成进度",
      goalRemaining: "距离目标还差",
      goalNext: "下一个里程碑",
      goalNextRemaining: "距离下一万元还差",
      goalAchievedCount: "已解锁里程碑",
      goalTrend: "累计税后预估收入走势",
      goalTrendDesc: "入库量 × ¥4.62 扣除预估预扣税 · 非实际到账",
      goalDay: "按日",
      goalMonth: "按月",
      goalYear: "按年",
      goalOneYear: "目前只有一个年份的记录",
      goalNoData: "暂无预估收入快照",
      goalLatest: "最新快照",
      goalMilestones: "万元里程碑 · 每达成 1 万记录一次",
      goalMilestonesDesc: "每满 1 万元税后预估收入解锁 · 日期为当前税率下历史快照首次达标日",
      goalDone: "首次记录",
      goalPending: "未达成",
      goalFinished: "目标已达成",
      goalNote: "20 万目标、进度与里程碑均按当前预估预扣税率测算；修改税率会重新计算达成状态及历史日期。非实际到账。",
      revenueSectionSubtitle: "以预扣税后估算为主 · 保留税前数据 · 非实际银行到账",
      taxPanelTitle: "税后预估与预扣税明细",
      taxPanelSubtitle: "税后金额重点展示，税前和预扣税仅作参考",
      taxRateLabel: "预估预扣税率",
      taxRateHelp: "仅保存在当前浏览器，允许 0–100%，默认 10%",
      taxGross: "税前预估",
      taxWithheld: "预估预扣税",
      taxNet: "税后预估",
      taxNetShort: "税后预估",
      taxWithheldShort: "预扣税",
      taxGrossShort: "税前预估",
      taxMonthTax: "本月预估预扣税",
      taxMonthNet: "本月税后预估",
      taxTrend: "近 7 日 · 税后与税前收入对照",
      taxTrendNote: "北京时间 12:00 至次日 12:00 · 缺失不当零 · 插值沿用现有统计口径",
      taxDisclaimer: "10% 为暂用测算比例；银行到账差额也可能包含中转行费用等，不代表已核实的实际扣税。",
      taxSummaryMissing: "历史快照不足",
      taxActualSeparate: "与实际银行到账金额分开统计",
      downloadSectionTitle: '下载数据',
      downloadSectionSubtitle: '下载量、增长趋势与作品表现',
      revenueAnalysis: "税后预估收入分析",
      revenueAnalysisDesc: "以税后预估收入为主 · 付费入库量测算 · 非实际到账",
      revenueLine: "今日税后预估收入走势",
      revenueLineSub: '北京时间 12:00 至最新快照',
      revenueDaily: "本周税后预估收入（按日）",
      revenueDailySub: '周一至周日 · 每个统计日为北京时间 12:00 至次日 12:00',
      revenueMonthWeekly: "本月税后预估收入（按周）",
      revenueMonthWeeklySub: '横坐标按周一至周日分组 · 跨月周只计算本月内的天数',
      revenueMonthWeeklyNote: '虚线柱为相邻快照插值估算 · — 表示缺失或尚未开始，并非零收入',
      revenueMonthWeekLabel: '第{n}周',
      revenueNotStarted: '待统计',
      revenueWeekdayNames: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      revenueInsightsTitle: '近 7 个完整统计日分析',
      revenueInsightsDesc: '不含尚未结束的当日统计',
      revenueSevenTotal: '7 日累计收入',
      revenueSevenAverage: '7 日日均收入',
      revenueSevenBest: '单日最高收入',
      revenueThreeDayMomentum: '近 3 日增长趋势',
      revenueSevenTotalFoot: '最近 7 个完整统计日',
      revenueSevenAverageFoot: '柱状图中的日均参考线',
      revenueThreeDayFoot: '最近 3 日较此前 3 日',
      revenueDailyAverageGuide: "本周税后预估日均",
      revenueDaysAvailable: '有效统计日',
      revenueInsightsMissing: '需要 7 个完整统计日数据',
      revenueWeekInsightsTitle: "本周税后预估收入分析",
      revenueWeekInsightsDesc: "本周至今 · 包含尚未结束的今日统计",
      revenueMonthInsightsTitle: "本月税后预估收入分析",
      revenueMonthInsightsDesc: "本月至今 · 包含进行中周；缺失周不参与最高值",
      revenueWeekTotal: "本周累计收入",
      revenueWeekAverage: "本周日均收入",
      revenueWeekBest: "已记录最高单日",
      revenueWeekGrowth: "较上周全周",
      revenueMonthTotal: "本月累计收入",
      revenueMonthAverage: "本月周均收入",
      revenueMonthBest: "已记录最高单周",
      revenueMonthGrowth: "较上月全月",
      revenueWeekTotalFoot: "截至最新有效快照",
      revenueWeekAverageFoot: "累计 ÷ 已开始的 {n} 天（含今日）",
      revenueWeekBestFoot: "{date} · 已记录 {n} 天",
      revenueMonthTotalFoot: "截至最新有效快照",
      revenueMonthAverageFoot: "累计 ÷ 已开始的 {n} 个自然周段",
      revenueMonthBestFoot: "{week} · 已记录 {n} 个周段",
      revenueWeekGrowthFoot: "本周至今 vs 上周全周",
      revenueMonthGrowthFoot: "本月至今 vs 上月全月",
      revenueStatMissing: "历史快照不足",
      revenueDailyAverageGuide: "本周截至今日的日均",
      revenueCompare: '收入周期对比',
      revenueCompareSub: '本周期截至目前与上一完整周期总额对比',
      revenueVsDay: '今日较昨日全天',
      revenueVsWeek: '本周较上周全周',
      revenueVsMonth: '本月较上月全月',
      revenueVsYear: '本月较去年同期',
      revenueNoHistory: '历史快照不足',
      revenueNewGrowth: '新增收入',
      revenuePrior: '上一完整周期',
      revenueEstimated: '估算 · 快照口径',
      revenueDateNote: '边界缺少快照时按前后数据估算，虚线柱代表估算值 · 过长空档仍显示缺失',
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
      estimatedTodayRmb: "本日の収益",
      estimatedWeekRmb: "今週の収益",
      estimatedMonthRmb: "今月の収益",
      estimatedYesterdayRmb: "昨日の収益",
      estimatedLastWeekRmb: "先週の収益",
      estimatedLastMonthRmb: "先月の収益",
      priorPeriodComplete: '前の期間の合計 · 推定値',
      revenueComparedTo: '前期比',
      revenueComparedYesterday: '昨日比',
      revenueComparedWeek: '先週比',
      revenueComparedMonth: '先月比',
      estimatedRevenueNote: '追加数 × 4.62 · 推定値',
      revenueSectionTitle: "税引後推定収益",
      goalTitle: "収益目標",
      goalSubtitle: "有料 CC · 累計税引後推定収益",
      goalCurrent: "累計税引後推定収益",
      goalTarget: "目標金額",
      goalProgress: "達成率",
      goalRemaining: "目標まで",
      goalNext: "次のマイルストーン",
      goalNextRemaining: "次までの残額",
      goalAchievedCount: "達成済みマイルストーン",
      goalTrend: "累計税引後推定収益の推移",
      goalTrendDesc: "ライブラリ追加数 × ¥4.62 から推定源泉徴収を差引 · 入金額ではありません",
      goalDay: "日別",
      goalMonth: "月別",
      goalYear: "年別",
      goalOneYear: "現在は1年分のみ記録",
      goalNoData: "履歴データがありません",
      goalLatest: "最新スナップショット",
      goalMilestones: "¥10,000ごとの達成記録",
      goalMilestonesDesc: "税引後の推定額が1万元ごとに達成 · 選択税率で初めて観測された日",
      goalDone: "初回観測",
      goalPending: "未達成",
      goalFinished: "目標達成",
      goalNote: "目標と達成日には現在の推定税率を適用。税率変更により再計算されます。実際の入金とは異なります。",
      revenueSectionSubtitle: "推定源泉徴収後を優先表示 · 税引前記録も保存 · 実際の入金額ではありません",
      taxPanelTitle: "税引後見込と源泉徴収内訳",
      taxPanelSubtitle: "税引後を大きく表示し、税引前と源泉徴収は参考として表示",
      taxRateLabel: "推定源泉徴収率",
      taxRateHelp: "このブラウザ内で保存 · 0～100% · 初期値 10%",
      taxGross: "税引前見込",
      taxWithheld: "推定源泉徴収",
      taxNet: "税引後見込",
      taxNetShort: "税引後",
      taxWithheldShort: "源泉徴収",
      taxGrossShort: "税引前",
      taxMonthTax: "今月の推定源泉徴収",
      taxMonthNet: "今月の税引後見込",
      taxTrend: "直近7日 · 税引後と税引前の推移",
      taxTrendNote: "北京時間の正午区切り · 欠測はゼロ扱いせず既存の補間方式を利用",
      taxDisclaimer: "10% は暫定的な仮定です。銀行の着金差額には中継銀行手数料なども含まれる場合があります。",
      taxSummaryMissing: "履歴データ不足",
      taxActualSeparate: "銀行の実際の着金とは別に表示",
      downloadSectionTitle: 'ダウンロードデータ',
      downloadSectionSubtitle: 'DL 数、成長率、作品パフォーマンス',
      revenueAnalysis: "税引後推定収益分析",
      revenueAnalysisDesc: "税引後見込を主に表示 · 実際の入金額ではありません",
      revenueLine: "本日の税引後収益推移",
      revenueLineSub: '北京時間12:00から最新データまで',
      revenueDaily: "今週の税引後推定収益（日別）",
      revenueDailySub: '月曜～日曜 · 集計日は北京時間12:00から翌12:00まで',
      revenueMonthWeekly: "今月の税引後推定収益（週別）",
      revenueMonthWeeklySub: '月曜～日曜ごと · 月をまたぐ週は今月分のみ集計',
      revenueMonthWeeklyNote: '破線は前後の記録からの推定値 · — は欠測または未開始であり、収益ゼロではありません',
      revenueMonthWeekLabel: '第{n}週',
      revenueNotStarted: '未開始',
      revenueWeekdayNames: ['月', '火', '水', '木', '金', '土', '日'],
      revenueInsightsTitle: '直近7完了日の収益分析',
      revenueInsightsDesc: '進行中の統計日は含みません',
      revenueSevenTotal: '7日間の合計',
      revenueSevenAverage: '1日平均',
      revenueSevenBest: '最高収益日',
      revenueThreeDayMomentum: '直近3日の推移',
      revenueSevenTotalFoot: '完了済みの直近7日',
      revenueSevenAverageFoot: 'グラフの平均基準線',
      revenueThreeDayFoot: '直近3日とその前の3日',
      revenueDailyAverageGuide: "今週の税引後日平均",
      revenueDaysAvailable: '有効な統計日',
      revenueInsightsMissing: '完了済み7日間のデータが必要',
      revenueWeekInsightsTitle: "今週の税引後収益分析",
      revenueWeekInsightsDesc: "今週の累計 · 進行中の本日を含む",
      revenueMonthInsightsTitle: "今月の税引後収益分析",
      revenueMonthInsightsDesc: "今月の累計 · 進行中の週を含み、欠測週は最高値の対象外",
      revenueWeekTotal: "今週の累計収益",
      revenueWeekAverage: "今週の日平均収益",
      revenueWeekBest: "記録済み最高日",
      revenueWeekGrowth: "前週全体比",
      revenueMonthTotal: "今月の累計収益",
      revenueMonthAverage: "今月の週平均収益",
      revenueMonthBest: "記録済み最高週",
      revenueMonthGrowth: "前月全体比",
      revenueWeekTotalFoot: "最新スナップショットまで",
      revenueWeekAverageFoot: "累計 ÷ 開始済み{n}日（本日含む）",
      revenueWeekBestFoot: "{date} · 記録済み{n}日",
      revenueMonthTotalFoot: "最新スナップショットまで",
      revenueMonthAverageFoot: "累計 ÷ 開始済み{n}週区間",
      revenueMonthBestFoot: "{week} · 記録済み{n}週区間",
      revenueWeekGrowthFoot: "今週と前週全体を比較",
      revenueMonthGrowthFoot: "今月と前月全体を比較",
      revenueStatMissing: "履歴データ不足",
      revenueDailyAverageGuide: "今週の日平均（本日含む）",
      revenueCompare: '期間別収益比較',
      revenueCompareSub: '今期の累計と前の完全な期間を比較',
      revenueVsDay: '本日対昨日全日',
      revenueVsWeek: '今週対先週全体',
      revenueVsMonth: '今月対先月全体',
      revenueVsYear: '今月対前年',
      revenueNoHistory: '履歴不足',
      revenueNewGrowth: '新規増加',
      revenuePrior: '前の完全な期間',
      revenueEstimated: '推定 · スナップショット',
      revenueDateNote: '境界の欠測は前後のデータから推定します · 破線は推定値、長期欠測は未表示です',
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
    const snapshots = paidRevenueSnapshots();
    const latest = snapshots.at(-1);
    const baseline = paidRevenueBoundary(snapshots, boundary);
    if (!baseline || !latest || latest.time < boundary) return null;
    return Math.max(0, latest.count - baseline.count);
  }
  const PAID_REVENUE_DAY_MS = 86400000;
  const PAID_REVENUE_SAMPLE_TOLERANCE = 2 * 60 * 60 * 1000;
  function revenueMoney(value) {
    return '¥' + new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  // Preserve the monetary value, but render symbol and fractional cents smaller in cards.
  function revenueCardMoneyMarkup(formatted) {
    const match = /^¥([0-9,]+)(\.[0-9]{2})$/.exec(String(formatted));
    if (!match) return esc(formatted);
    return '<span class="admin-cc-revenue-amount-symbol">¥</span>' +
      esc(match[1]) + '<span class="admin-cc-revenue-amount-cents">' + esc(match[2]) + '</span>';
  }
  function paidRevenueSnapshots() {
    return state.paidLibraryHistory.map((row) => ({
      time: utcDate(row.timestamp)?.getTime(),
      count: Number(row.total_paid_library_adds)
    })).filter((point) => Number.isFinite(point.time) && Number.isFinite(point.count) && point.count >= 0)
      .sort((a, b) => a.time - b.time);
  }
  function paidRevenueAt(snapshots, at) {
    let found = null;
    for (const point of snapshots) {
      if (point.time > at) break;
      found = point;
    }
    return found && at - found.time <= PAID_REVENUE_SAMPLE_TOLERANCE ? found : null;
  }
  // Keep the established Beijing-noon cutoff, but do not require a noon sample.
  // First use a nearby recorded baseline; otherwise interpolate between real
  // snapshots over gaps up to 14 days. Raw CSV observations stay unchanged.
  function paidRevenueBoundary(snapshots, at) {
    if (!Number.isFinite(at) || !snapshots.length) return null;
    const observed = paidRevenueAt(snapshots, at);
    if (observed) return { ...observed, estimated: false };
    let before = null, after = null;
    for (const point of snapshots) {
      if (point.time === at) return { ...point, estimated: false };
      if (point.time < at) before = point;
      else { after = point; break; }
    }
    if (before && after && after.time - before.time <= 14 * PAID_REVENUE_DAY_MS &&
        after.time > before.time) {
      const fraction = (at - before.time) / (after.time - before.time);
      return { time: at, count: before.count + (after.count - before.count) * fraction, estimated: true };
    }
    const nearby = 12 * 60 * 60 * 1000;
    if (before && at - before.time <= nearby)
      return { time: at, count: before.count, estimated: true };
    if (after && after.time - at <= nearby)
      return { time: at, count: after.count, estimated: true };
    return null;
  }
  function paidRevenueStart(period, offset = 0) {
    const date = new Date(todayKey() + 'T00:00:00Z');
    if (period === 'day') date.setUTCDate(date.getUTCDate() - offset);
    else if (period === 'week') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) - 7 * offset);
    else {
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - offset);
    }
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 4);
  }
  function paidRevenuePriorStart(period) {
    if (period === 'year') {
      const cur = new Date(paidRevenueStart('month'));
      return Date.UTC(cur.getUTCFullYear() - 1, cur.getUTCMonth(), 1, 4);
    }
    return paidRevenueStart(period, 1);
  }
  function paidRevenueNextStart(period, start) {
    const d = new Date(start);
    if (period === 'day') d.setUTCDate(d.getUTCDate() + 1);
    else if (period === 'week') d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
    return d.getTime();
  }
  function paidRevenueComparison(snapshots, period) {
    const latest = snapshots.at(-1);
    const curStart = paidRevenueStart(period === 'year' ? 'month' : period);
    const curBase = paidRevenueBoundary(snapshots, curStart);
    if (!latest || !curBase || latest.time < curStart) return null;
    const current = Math.max(0, latest.count - curBase.count) * PAID_RMB_PER_LIBRARY_ADD;
    const prevStart = paidRevenuePriorStart(period);
    // Compare this period's live running total against the ENTIRE previous period.
    // Matching the same time of day is no longer required.
    const prevEnd = paidRevenueNextStart(period, prevStart);
    const prevBase = paidRevenueBoundary(snapshots, prevStart);
    const prevPoint = paidRevenueBoundary(snapshots, prevEnd);
    if (!prevBase || !prevPoint || prevPoint.time <= prevBase.time) return { current, previous: null };
    return { current, previous: Math.max(0, prevPoint.count - prevBase.count) * PAID_RMB_PER_LIBRARY_ADD };
  }
  // Daily and weekly charts use the same flexible, transparent estimate.
  function paidRevenueDailyBoundary(snapshots, boundary) {
    return paidRevenueBoundary(snapshots, boundary);
  }
  function paidRevenueDailyRows(snapshots, count = 7) {
    const latest = snapshots.at(-1);
    const dayStart = paidRevenueStart('day');
    return Array.from({ length: count }, (_, index) => {
      const start = dayStart - (count - 1 - index) * PAID_REVENUE_DAY_MS;
      const end = start === dayStart ? latest?.time : start + PAID_REVENUE_DAY_MS;
      const baseline = paidRevenueDailyBoundary(snapshots, start);
      const endpoint = end >= start ? paidRevenueDailyBoundary(snapshots, end) : null;
      const amount = baseline && endpoint && endpoint.time > baseline.time
        ? Math.max(0, endpoint.count - baseline.count) * PAID_RMB_PER_LIBRARY_ADD : null;
      return { start, amount, current: start === dayStart,
        estimated: amount !== null && Boolean(baseline?.estimated || endpoint?.estimated) };
    });
  }
  function revenueBeijingTime(time, withDate = false) {
    return new Intl.DateTimeFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-GB', {
      timeZone: 'Asia/Shanghai',
      ...(withDate ? { month: '2-digit', day: '2-digit' } : {}),
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(time));
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
  function paidPreviousFullRevenue(snapshots, period) {
    const start = paidRevenueStart(period, 1);
    const end = paidRevenueStart(period);
    const baseline = paidRevenueBoundary(snapshots, start);
    const endpoint = paidRevenueBoundary(snapshots, end);
    if (!baseline || !endpoint || endpoint.time <= baseline.time) return null;
    return Math.max(0, endpoint.count - baseline.count) * PAID_RMB_PER_LIBRARY_ADD;
  }



  // Calculate true week/month totals from cumulative boundary snapshots,
  // not the sum of potentially missing chart bars.
  function revenueSummaryPeriodData(snapshots, period, days, weeks) {
    const comparison = paidRevenueComparison(snapshots, period);
    const total = revenueNetAmount(comparison?.current ?? null);
    const count = period === 'week'
      ? 1 + Math.round((paidRevenueStart('day') - paidRevenueStart('week')) / PAID_REVENUE_DAY_MS)
      : weeks.filter((row) => !row.future).length;
    const observed = (period === 'week' ? days : weeks)
      .map((row, index) => ({ ...row, index }))
      .filter((row) => !row.future && row.amount !== null && Number.isFinite(row.amount));
    const best = observed.length
      ? observed.reduce((prev, row) => row.amount > prev.amount ? row : prev) : null;
    const change = comparison && comparison.previous !== null
      ? percentChange(revenueNetAmount(comparison.current), revenueNetAmount(comparison.previous)) : null;
    const growth = !comparison || comparison.previous === null ? '—'
      : change === null ? (total > 0 ? t('revenueNewGrowth') : '0.0%')
      : (change > 0 ? '+' : '') + change.toFixed(1) + '%';
    const direction = Number.isFinite(change)
      ? change > 0 ? 'is-up' : change < 0 ? 'is-down' : '' : '';
    return { total, count, best, observedCount: observed.length, growth, direction };
  }
  function renderRevenueInsights(snapshots, period, days, weeks) {
    const isMonth = period === 'month';
    const result = revenueSummaryPeriodData(snapshots, period, days, weeks);
    const valid = result.total !== null && Number.isFinite(result.total);
    const total = valid ? revenueMoney(result.total) : '—';
    const average = valid && result.count > 0 ? revenueMoney(result.total / result.count) : '—';
    const maximum = result.best ? revenueMoney(result.best.amount) : '—';
    const peakLabel = result.best ? isMonth
      ? t('revenueMonthWeekLabel').replace('{n}', String(result.best.index + 1))
      : new Intl.DateTimeFormat(
          lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US',
          { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }
        ).format(new Date(result.best.start))
      : '';
    const interpolate = (key, fields) =>
      Object.entries(fields).reduce((s, [k, v]) => s.replace('{' + k + '}', String(v)), t(key));
    const missing = t('revenueStatMissing');
    const entries = isMonth ? [
      [t('revenueMonthTotal'), total, valid ? t('revenueMonthTotalFoot')+' · '+t('taxGrossShort')+' '+
          revenueMoney(paidRevenueComparison(snapshots, period).current) : missing, ''],
      [t('revenueMonthAverage'), average, valid ? interpolate('revenueMonthAverageFoot', { n: result.count }) : missing, ''],
      [t('revenueMonthBest'), maximum, result.best ? interpolate('revenueMonthBestFoot', { week: peakLabel, n: result.observedCount }) : missing, ''],
      [t('revenueMonthGrowth'), result.growth, t('revenueMonthGrowthFoot'), result.direction]
    ] : [
      [t('revenueWeekTotal'), total, valid ? t('revenueWeekTotalFoot')+' · '+
        t('taxGrossShort')+' '+revenueMoney(paidRevenueComparison(snapshots, period).current) : missing, ''],
      [t('revenueWeekAverage'), average, valid ? interpolate('revenueWeekAverageFoot', { n: result.count }) : missing, ''],
      [t('revenueWeekBest'), maximum, result.best ? interpolate('revenueWeekBestFoot', { date: peakLabel, n: result.observedCount }) : missing, ''],
      [t('revenueWeekGrowth'), result.growth, t('revenueWeekGrowthFoot'), result.direction]
    ];
    const cards = entries.map(([label, value, note, direction]) =>
      '<article class="admin-cc-revenue-insight"><span>' + esc(label) + '</span>' +
      '<strong class="' + esc(direction) + '">' + revenueCardMoneyMarkup(value) + '</strong>' +
      '<small>' + esc(note) + '</small></article>'
    ).join('');
    return '<div class="admin-cc-revenue-insights-wrap">' +
      '<div class="admin-cc-revenue-insights-head"><h4>' +
      esc(t(isMonth ? 'revenueMonthInsightsTitle' : 'revenueWeekInsightsTitle')) +
      '</h4><small>' + esc(t(isMonth ? 'revenueMonthInsightsDesc' : 'revenueWeekInsightsDesc')) +
      '</small></div><div class="admin-cc-revenue-insights-grid">' + cards + '</div></div>';
  }


  function revenueGoalSeries(snapshots, by) {
    const granularity = ['day', 'month', 'year'].includes(by) ? by : 'day';
    const options = {timeZone:'Asia/Shanghai',year:'numeric',
      ...(granularity === 'year' ? {} : {month:'2-digit'}),
      ...(granularity === 'day' ? {day:'2-digit'} : {})};
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const series = new Map();
    snapshots.forEach((point) => {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(point.time))
        .map((x) => [x.type, x.value]));
      const key = parts.year + (granularity === 'year' ? '' : '-' + parts.month) +
        (granularity === 'day' ? '-' + parts.day : '');
      const old = series.get(key);
      if (!old || point.time >= old.time) series.set(key, {...point,key});
    });
    return [...series.values()].sort((a,b) => a.time - b.time).map((point) => ({
      ...point,
      grossAmount: point.count * PAID_RMB_PER_LIBRARY_ADD,
      amount: revenueNetAmount(point.count * PAID_RMB_PER_LIBRARY_ADD),
      label: granularity === 'year' ? point.key :
        granularity === 'month' ? point.key.replace('-', '/') : point.key.slice(5).replace('-', '/')
    }));
  }
  function revenueGoalChart(snapshots) {
    const values = revenueGoalSeries(snapshots, state.goalRange);
    if (!values.length) return '<div class="admin-cc-revenue-empty">' +
      esc(t('goalNoData')) + '</div>';
    const W=660,H=252,L=54,R=16,T=18,B=36,pW=W-L-R,pH=H-T-B;
    const max=Math.max(10000,Math.ceil(Math.max(...values.map(x=>x.amount))/5000)*5000);
    const x=(i)=>L+(values.length===1?pW/2:i*pW/(values.length-1));
    const y=(v)=>T+(1-Math.max(0,Math.min(1,v/max)))*pH;
    const px=(i)=>x(i).toFixed(1),py=(v)=>y(v).toFixed(1);
    const line=values.map((p,i)=>(i?'L':'M')+px(i)+' '+py(p.amount)).join(' ');
    const base=(T+pH).toFixed(1);
    const area=line+' L'+px(values.length-1)+' '+base+' L'+px(0)+' '+base+' Z';
    const axisValue=(v)=>v>=10000?(v/10000).toFixed(v%10000?1:0)+'万':fmt(v);
    const grid=[0,.5,1].map(frac=>'<line class="admin-cc-revenue-gridline" x1="'+L+
      '" y1="'+py(max*frac)+'" x2="'+(W-R)+'" y2="'+py(max*frac)+'"/>'+
      '<text class="admin-cc-revenue-axis" x="'+(L-8)+'" y="'+(y(max*frac)+4).toFixed(1)+
      '" text-anchor="end">'+esc(axisValue(max*frac))+'</text>').join('');
    const samples=[...new Set([0,Math.round((values.length-1)/4),Math.round((values.length-1)/2),
      Math.round(3*(values.length-1)/4),values.length-1])];
    const ticks=samples.map(i=>'<text class="admin-cc-revenue-axis" x="'+px(i)+
      '" y="'+(H-10)+'" text-anchor="'+(i===0?'start':i===values.length-1?'end':'middle')+
      '">'+esc(values[i].label)+'</text>').join('');
    const dots=values.map((p,i)=>{
      const label=p.key+' · '+t('taxNetShort')+': '+revenueMoney(p.amount)+
        ' · '+t('taxGrossShort')+': '+revenueMoney(p.grossAmount);
      return '<circle cx="'+px(i)+'" cy="'+py(p.amount)+
        '" r="9" fill="transparent" tabindex="0" aria-label="'+esc(label)+'"><title>'+
        esc(label)+'</title></circle>';
    }).join('');
    const last=values.at(-1);
    return '<svg class="admin-cc-goal-svg" viewBox="0 0 '+W+' '+H+
      '" role="img" aria-label="'+esc(t('goalTrend'))+'">'+
      '<defs><linearGradient id="ccGoalIncomeArea" x1="0" x2="0" y1="0" y2="1">'+
      '<stop offset="0%" stop-color="#ebbd70" stop-opacity=".23"/>'+
      '<stop offset="100%" stop-color="#ebbd70" stop-opacity="0"/></linearGradient></defs>'+
      grid+(values.length>1?'<path d="'+area+'" fill="url(#ccGoalIncomeArea)"/>':'')+
      '<path d="'+line+'" fill="none" stroke="#edc47e" stroke-width="3.2" '+
      'stroke-linecap="round" stroke-linejoin="round"/>'+dots+
      '<circle cx="'+px(values.length-1)+'" cy="'+py(last.amount)+
      '" r="5.5" fill="#ffe6a4" stroke="#704b28" stroke-width="2"/>'+
      ticks+'</svg>'+(values.length===1?'<p class="admin-cc-goal-graph-hint">'+
      esc(t('goalOneYear'))+'</p>':'');
  }
  function renderRevenueGoal() {
    const node=document.querySelector('[data-cc-revenue-goal]');
    if (!node) return;
    node.hidden=state.mode!=='paid';
    if (node.hidden) {node.innerHTML='';return;}
    const snapshots=paidRevenueSnapshots();
    const latest=snapshots.at(-1);
    const grossTotal=latest?Math.max(0,latest.count*PAID_RMB_PER_LIBRARY_ADD):null;
    const total=revenueNetAmount(grossTotal);
    const ready=total!==null&&Number.isFinite(total);
    const ratio=ready?Math.min(100,total/REVENUE_GOAL_RMB*100):0;
    const reached=ready?Math.min(20,Math.floor(total/REVENUE_GOAL_STEP)):0;
    const nextThreshold=Math.min(REVENUE_GOAL_RMB,(reached+1)*REVENUE_GOAL_STEP);
    const date=(time)=>new Intl.DateTimeFormat('en-CA',
      {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'})
      .format(new Date(time));
    const milestones=Array.from({length:20},(_,index)=>{
      const amount=(index+1)*REVENUE_GOAL_STEP;
      const first=snapshots.find(p=>revenueNetAmount(p.count*PAID_RMB_PER_LIBRARY_ADD)>=amount);
      // A milestone only lights up when its threshold was actually observed.
      // The upcoming milestone is listed in the overview, but stays gray here.
      const done=Boolean(first);
      return '<div class="admin-cc-goal-milestone'+(done?' is-achieved':'')+'">'+
        '<span class="admin-cc-goal-milestone-mark" aria-hidden="true">'+(done?'✓':'·')+
        '</span><strong>'+(index+1)+'万</strong><small>'+
        esc(done?t('goalDone')+' '+date(first.time):t('goalPending'))+'</small></div>';
    }).join('');
    const switches=['day','month','year'].map(unit=>
      '<button type="button" data-cc-goal-range="'+unit+'" class="admin-cc-goal-range'+
      (state.goalRange===unit?' is-active':'')+'" aria-pressed="'+
      (state.goalRange===unit)+'">'+esc(t('goal'+unit[0].toUpperCase()+unit.slice(1)))+
      '</button>').join('');
    const remaining=ready?Math.max(0,REVENUE_GOAL_RMB-total):null;
    node.innerHTML='<div class="admin-cc-goal-main">'+
      '<section class="admin-cc-goal-overview">'+
      '<div class="admin-cc-goal-eyebrow"><span class="admin-cc-goal-spark">✦</span>'+
      esc(t('goalTitle'))+'</div><p class="admin-cc-goal-subtitle">'+esc(t('goalSubtitle'))+
      '</p><div class="admin-cc-goal-stat-label">'+esc(t('goalCurrent'))+'</div>'+
      '<div class="admin-cc-goal-current">'+(ready?revenueCardMoneyMarkup(revenueMoney(total)):'—')+
      '</div><div class="admin-cc-goal-gross">'+esc(t('taxGrossShort'))+': '+
      (grossTotal===null?'—':esc(revenueMoney(grossTotal)))+'</div>'+
      '<div class="admin-cc-goal-target">'+esc(t('goalTarget'))+
      '<strong>'+esc(revenueMoney(REVENUE_GOAL_RMB))+'</strong></div>'+
      '<div class="admin-cc-goal-progress-track" role="progressbar" aria-label="'+esc(t('goalProgress'))+
      '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+ratio.toFixed(2)+'">'+
      '<div class="admin-cc-goal-progress-fill" style="width:'+ratio.toFixed(3)+'%"></div>'+
      '</div><div class="admin-cc-goal-progress-meta"><strong>'+(ready?ratio.toFixed(2)+'%':'—')+
      '</strong><span>'+esc(t('goalProgress'))+'</span></div>'+
      '<div class="admin-cc-goal-summary"><div><span>'+esc(t('goalRemaining'))+
      '</span><strong>'+(ready?esc(revenueMoney(remaining)):'—')+'</strong></div>'+
      '<div><span>'+esc(t('goalNext'))+'</span><strong>'+
      (reached===20?esc(t('goalFinished')):esc(revenueMoney(nextThreshold)))+
      '</strong><small>'+(ready&&reached<20?esc(t('goalNextRemaining')+': '+
        revenueMoney(Math.max(0,nextThreshold-total))):'')+'</small></div>'+
      '<div><span>'+esc(t('goalAchievedCount'))+'</span><strong>'+reached+
      ' / 20</strong></div></div></section>'+
      '<section class="admin-cc-goal-graph"><div class="admin-cc-goal-graph-head">'+
      '<div><h3>'+esc(t('goalTrend'))+'</h3><p>'+esc(t('goalTrendDesc'))+
      '</p></div><div class="admin-cc-goal-range-switch" role="group" aria-label="'+
      esc(t('goalTrend'))+'">'+switches+'</div></div>'+
      '<div class="admin-cc-goal-plot">'+revenueGoalChart(snapshots)+'</div>'+
      '<div class="admin-cc-goal-graph-foot">'+esc(t('goalLatest'))+': '+
      (latest?esc(date(latest.time)):'—')+'</div></section></div>'+
      '<div class="admin-cc-goal-milestone-section">'+
      '<div class="admin-cc-goal-milestone-header"><h3>'+esc(t('goalMilestones'))+
      '</h3><p>'+esc(t('goalMilestonesDesc'))+'</p></div>'+
      '<div class="admin-cc-goal-milestone-grid">'+milestones+'</div></div>'+
      '<p class="admin-cc-goal-note">'+esc(t('goalNote'))+'</p>';
  }


  function revenueTaxRateFraction() {
    return Math.max(0, Math.min(100, state.taxRatePct)) / 100;
  }
  function revenueTaxBreakdown(gross) {
    if (gross === null || !Number.isFinite(gross)) return null;
    const rate = revenueTaxRateFraction();
    return { gross, withholding: gross * rate, net: gross * (1 - rate) };
  }
  // Presentation-only view of the unchanged gross revenue model.
  function revenueNetAmount(gross) {
    return gross === null || !Number.isFinite(gross)
      ? null : gross * (1 - revenueTaxRateFraction());
  }
  // All revenue figures retain the configurable after-withholding calculation.
  function revenueCompactComparison(snapshots, unit, label, gross) {
    if (gross === null) return null;
    const data = paidRevenueComparison(snapshots, unit);
    const change = data?.previous == null ? null : percentChange(gross, data.previous);
    if (!Number.isFinite(change)) return null;
    return {
      label: t(label) + ' ' + (change > 0 ? '+' : '') + change.toFixed(1) + '%',
      tone: change > 0 ? ' is-up' : change < 0 ? ' is-down' : ''
    };
  }
  function renderRevenueTax() {
    const target = document.querySelector('[data-cc-revenue-tax]');
    if (!target) return;
    target.hidden = state.mode !== 'paid';
    if (target.hidden) { target.innerHTML = ''; return; }
    const snapshots = paidRevenueSnapshots();
    const periods = [
      ['estimatedTodayRmb', 'today', 'day', 'revenueComparedYesterday', 'today'],
      ['estimatedMonthRmb', 'month', 'month', 'revenueComparedMonth', 'month']
    ];
    const cards = periods.map(([label, period, unit, comparisonLabel, variant]) => {
      const adds = paidLibraryIncrement(period);
      const gross = adds === null ? null : adds * PAID_RMB_PER_LIBRARY_ADD;
      const net = revenueNetAmount(gross);
      const money = net === null ? '—' : revenueCardMoneyMarkup(revenueMoney(net));
      const change = revenueCompactComparison(snapshots, unit, comparisonLabel, gross);
      return '<article class="admin-cc-revenue-hero-card is-' + variant + '">' +
        '<span class="admin-cc-revenue-hero-label">' + esc(t(label)) + '</span>' +
        '<strong class="admin-cc-revenue-hero-value">' + money + '</strong>' +
        (change ? '<p class="admin-cc-revenue-hero-compare' + change.tone + '">' +
          esc(change.label) + '</p>' : '') + '</article>';
    }).join('');
    target.innerHTML = '<div class="admin-cc-revenue-hero-grid">' + cards + '</div>' +
      '<details class="admin-cc-revenue-hero-settings">' +
      '<summary title="' + esc(t('taxRateLabel')) + '" aria-label="' +
      esc(t('taxRateLabel')) + '">⚙</summary>' +
      '<div class="admin-cc-revenue-hero-settings-panel">' +
      '<label class="admin-cc-revenue-tax-config">' +
      '<span>' + esc(t('taxRateLabel')) + '</span>' +
      '<span class="admin-cc-revenue-tax-input"><input data-cc-tax-rate type="number"' +
      ' min="0" max="100" step="0.5" inputmode="decimal" value="' +
      state.taxRatePct.toFixed(1) + '" aria-label="' + esc(t('taxRateLabel')) + '">' +
      '<span>%</span></span></label>' +
      '<p>' + esc(t('taxRateHelp')) + '</p></div></details>';
  }
  function renderRevenueMetrics() {
    const target = document.querySelector('[data-cc-revenue-kpis]');
    if (!target) return;
    target.hidden = state.mode !== 'paid';
    if (target.hidden) { target.innerHTML = ''; return; }
    // Today and this month are already present in the large summary cards.
    const periods = [
      ['estimatedYesterdayRmb', null, 'day', null, true],
      ['estimatedWeekRmb', 'week', 'week', 'revenueComparedWeek', false],
      ['estimatedLastWeekRmb', null, 'week', null, true],
      ['estimatedLastMonthRmb', null, 'month', null, true]
    ];
    const snapshots = paidRevenueSnapshots();
    target.innerHTML = periods.map(([label, period, unit, comparisonLabel, previous]) => {
      const adds = previous ? null : paidLibraryIncrement(period);
      const gross = previous ? paidPreviousFullRevenue(snapshots, unit)
        : adds === null ? null : adds * PAID_RMB_PER_LIBRARY_ADD;
      const net = revenueNetAmount(gross);
      const money = net === null ? '—' : revenueMoney(net);
      const change = previous ? null :
        revenueCompactComparison(snapshots, unit, comparisonLabel, gross);
      return '<article class="admin-cc-revenue-card">' +
        '<div class="admin-cc-revenue-card-head"><span>' + esc(t(label)) + '</span></div>' +
        '<strong class="admin-cc-revenue-card-value">' +
          revenueCardMoneyMarkup(money) + '</strong>' +
        (change ? '<p class="admin-cc-revenue-card-foot' + change.tone + '">' +
          esc(change.label) + '</p>' : '') +
        '</article>';
    }).join('');
  }

  // Reuse the existing daily snapshot calculation, but restrict the visible
  // chart to the current MON–SUN calendar week (including future day slots).
  function paidRevenueThisWeekRows(snapshots) {
    const weekStart = paidRevenueStart('week');
    const todayStart = paidRevenueStart('day');
    const recent = new Map(paidRevenueDailyRows(snapshots, 7).map((row) => [row.start, row]));
    return Array.from({ length: 7 }, (_, index) => {
      const start = weekStart + index * PAID_REVENUE_DAY_MS;
      const row = recent.get(start);
      return row
        ? { ...row, future: false }
        : { start, amount: null, current: false, estimated: false, future: start > todayStart };
    });
  }

  // Split this month into Monday–Sunday calendar weeks. Clip the first and last
  // week to month boundaries, so weeks never include previous/next-month income.
  // A completed bin needs boundary snapshots at BOTH ends; do not turn missing
  // observations into zero, or silently sum only the observed days.
  function paidRevenueThisMonthWeekRows(snapshots) {
    const monthStart = paidRevenueStart('month');
    const monthEnd = paidRevenueNextStart('month', monthStart);
    const todayStart = paidRevenueStart('day');
    const latest = snapshots.at(-1);
    const firstMonday = monthStart -
      ((new Date(monthStart).getUTCDay() + 6) % 7) * PAID_REVENUE_DAY_MS;
    const result = [];
    for (let monday = firstMonday; monday < monthEnd; monday += 7 * PAID_REVENUE_DAY_MS) {
      const start = Math.max(monthStart, monday);
      const end = Math.min(monthEnd, monday + 7 * PAID_REVENUE_DAY_MS);
      const future = start > todayStart;
      const current = start <= todayStart && todayStart < end;
      const baseline = future ? null : paidRevenueDailyBoundary(snapshots, start);
      const endpoint = future ? null : current
        ? (latest && latest.time >= start ? latest : null)
        : paidRevenueDailyBoundary(snapshots, end);
      const amount = baseline && endpoint && endpoint.time > baseline.time
        ? Math.max(0, endpoint.count - baseline.count) * PAID_RMB_PER_LIBRARY_ADD
        : null;
      result.push({
        start, end, amount, current, future,
        estimated: amount !== null && Boolean(baseline?.estimated || endpoint?.estimated)
      });
    }
    return result;
  }
  function renderRevenueAnalysis() {
    const target = document.querySelector('[data-cc-revenue-analysis]');
    if (!target) return;
    target.hidden = state.mode !== 'paid';
    if (state.mode !== 'paid') {
      target.innerHTML = '';
      return;
    }
    const snapshots = paidRevenueSnapshots();
    const latest = snapshots.at(-1);
    const start = paidRevenueStart('day');
    const baseline = paidRevenueBoundary(snapshots, start);
    let svg = '<div class="admin-cc-revenue-empty">' + esc(t('revenueNoHistory')) + '</div>';
    if (latest && baseline && latest.time > start) {
      const points = [{ time: start, value: 0 }].concat(snapshots
        .filter((p) => p.time > start && p.time <= latest.time)
        .map((p) => ({ time: p.time, value: revenueNetAmount(Math.max(0, p.count - baseline.count) * PAID_RMB_PER_LIBRARY_ADD) })));
      const W = 690, H = 240, L = 56, R = 16, T = 18, B = 37;
      const pw = W - L - R, ph = H - T - B;
      const maxValue = Math.max(10, ...points.map((p) => p.value));
      const x = (p) => L + (p.time - start) / Math.max(1, latest.time - start) * pw;
      const y = (p) => T + (1 - p.value / maxValue) * ph;
      const coord = (p) => x(p).toFixed(1) + ',' + y(p).toFixed(1);
      const path = points.map((p, i) => (i ? 'L' : 'M') + coord(p)).join(' ');
      const area = path + ' L' + coord({ time: latest.time, value: 0 }) + ' L' + coord({ time: start, value: 0 }) + ' Z';
      const marks = points.filter((p, i) => i === 0 || i === points.length - 1 || i % Math.max(1, Math.ceil(points.length / 14)) === 0)
        .map((p) => '<circle cx="' + x(p).toFixed(1) + '" cy="' + y(p).toFixed(1) +
          '" r="3.4" fill="#ffcb7e" stroke="#342515" stroke-width="1.5"><title>' +
          esc(revenueBeijingTime(p.time, true) + ' · ' + revenueMoney(p.value)) + '</title></circle>').join('');
      const axis = [0, .5, 1].map((fraction) => {
        const yy = (T + (1 - fraction) * ph).toFixed(1);
        return '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy +
          '" class="admin-cc-revenue-gridline"/><text x="' + (L - 10) + '" y="' + (+yy + 4) +
          '" text-anchor="end" class="admin-cc-revenue-axis">' + esc(fmt(maxValue * fraction)) + '</text>';
      }).join('');
      const ticks = [start, start + (latest.time - start) / 2, latest.time].map((time, i) => {
        const xx = L + i / 2 * pw;
        return '<text x="' + xx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' +
          (i === 0 ? 'start' : i === 2 ? 'end' : 'middle') + '" class="admin-cc-revenue-axis">' +
          esc(revenueBeijingTime(time)) + '</text>';
      }).join('');
      svg = '<svg class="admin-cc-revenue-chart" viewBox="0 0 ' + W + ' ' + H +
        '" role="img" aria-label="' + esc(t('revenueLine')) + '">' +
        '<defs><linearGradient id="ccEstimatedRevenueFill" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0%" stop-color="#ffbf72" stop-opacity=".3"/>' +
        '<stop offset="100%" stop-color="#ffbf72" stop-opacity="0"/></linearGradient></defs>' +
        axis + '<path d="' + area + '" fill="url(#ccEstimatedRevenueFill)"/>' +
        '<path d="' + path + '" fill="none" stroke="#ffc97a" stroke-width="3.3" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' + marks + ticks + '</svg>';
    }
    const comparisons = [
      ['revenueVsDay', 'day'],
      ['revenueVsWeek', 'week'],
      ['revenueVsMonth', 'month']
    ].map(([label, period]) => {
      const comparison = paidRevenueComparison(snapshots, period);
      const valid = comparison && comparison.previous !== null;
      let textValue = '—', valueClass = 'is-neutral';
      if (valid) {
        const change = percentChange(revenueNetAmount(comparison.current), revenueNetAmount(comparison.previous));
        if (change === null) {
          textValue = revenueNetAmount(comparison.current) > 0 ? t('revenueNewGrowth') : '0.0%';
        } else {
          textValue = (change > 0 ? '+' : '') + change.toFixed(1) + '%';
          valueClass = change > 0 ? 'is-up' : change < 0 ? 'is-down' : 'is-neutral';
        }
      }
      return '<div class="admin-cc-revenue-comparison-row">' +
        '<div><strong>' + esc(t(label)) + '</strong><small>' +
        esc(valid ? t('revenuePrior') + ': ' + revenueMoney(revenueNetAmount(comparison.previous)) +
          ' · '+t('taxGrossShort')+' '+revenueMoney(comparison.previous) : t('revenueNoHistory')) +
        '</small></div><span class="admin-cc-revenue-change ' + valueClass + '">' +
        esc(textValue) + '</span></div>';
    }).join('');
    const daily = paidRevenueThisWeekRows(snapshots).map(row => ({
      ...row, grossAmount: row.amount, amount: revenueNetAmount(row.amount)
    }));
    const monthlyWeeks = paidRevenueThisMonthWeekRows(snapshots).map(row => ({
      ...row, grossAmount: row.amount, amount: revenueNetAmount(row.amount)
    }));
    const weekSummary = revenueSummaryPeriodData(snapshots, 'week', daily, monthlyWeeks);
    const weekAverage = weekSummary.total !== null && weekSummary.count > 0
      ? weekSummary.total / weekSummary.count : null;
    const maxDaily = Math.max(10, ...daily.map((row) => row.amount ?? 0), weekAverage ?? 0);
    const maxMonthly = Math.max(10, ...monthlyWeeks.map((row) => row.amount ?? 0));
    const averageHeight = weekAverage !== null ? (weekAverage / maxDaily * 100).toFixed(2) : null;
    const averageGuide = weekAverage !== null
      ? '<div class="admin-cc-revenue-average-legend"><span aria-hidden="true"></span>' +
        esc(t('revenueDailyAverageGuide') + ': ' + revenueMoney(weekAverage)) + '</div>'
      : '';
    const shortDate = (time) => new Intl.DateTimeFormat(
      lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US',
      { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }
    ).format(new Date(time));
    const renderBar = (row, maximum, nameHtml, title) => {
      const height = row.amount === null ? 0
        : Math.max(row.amount === 0 ? 2 : 5, row.amount / maximum * 100);
      const amount = row.amount === null ? '—' : revenueMoney(row.amount);
      const grossHint = row.grossAmount === null ? '' :
        ' · '+t('taxGrossShort')+': '+revenueMoney(row.grossAmount);
      return '<div class="admin-cc-revenue-day' +
        (row.current ? ' is-current' : '') + (row.future ? ' is-future' : '') +
        (row.amount === null ? ' is-missing' : '') +
        (row.estimated ? ' is-estimated' : '') + '">' +
        '<div class="admin-cc-revenue-day-amount" title="' + esc(title + ' · ' +
          (row.future ? t('revenueNotStarted') : amount + grossHint)) + '">' + esc(amount) + '</div>' +
        '<div class="admin-cc-revenue-day-track">' +
        (row.amount === null
          ? '<span class="admin-cc-revenue-day-missing">' + esc(row.future ? '·' : '—') + '</span>'
          : '<div class="admin-cc-revenue-day-bar" style="height:' + height.toFixed(1) +
            '%" title="' + esc(title + ' · ' + amount + grossHint) + '"></div>') +
        '</div><div class="admin-cc-revenue-day-label">' + nameHtml + '</div></div>';
    };
    const weekdayNames = t('revenueWeekdayNames');
    const dailyBars = daily.map((row) => {
      const index = (new Date(row.start).getUTCDay() + 6) % 7;
      const dateText = shortDate(row.start);
      return renderBar(row, maxDaily,
        '<span>' + esc(weekdayNames[index]) + '</span><small>' + esc(dateText) + '</small>',
        weekdayNames[index] + ' · ' + dateText);
    }).join('');
    const monthlyBars = monthlyWeeks.map((row, index) => {
      const title = t('revenueMonthWeekLabel').replace('{n}', String(index + 1));
      const dates = shortDate(row.start) + '–' + shortDate(row.end - PAID_REVENUE_DAY_MS);
      return renderBar(row, maxMonthly,
        '<span>' + esc(title) + '</span><small>' + esc(dates) + '</small>',
        title + ' · ' + dates);
    }).join('');
    target.innerHTML =
      '<header class="admin-cc-revenue-analysis-heading"><div><h2>' + esc(t('revenueAnalysis')) +
      '</h2><p>' + esc(t('revenueAnalysisDesc')) +
      '</p></div><span>' + esc(t('revenueEstimated')) + '</span></header>' +
      '<div class="admin-cc-revenue-analysis-grid">' +
      '<article class="admin-analytics-panel admin-cc-revenue-trend-panel">' +
      '<div class="admin-cc-revenue-panel-heading"><h3>' + esc(t('revenueLine')) +
      '</h3><p>' + esc(t('revenueLineSub')) + '</p></div>' + svg + '</article>' +
      '<article class="admin-analytics-panel admin-cc-revenue-compare-panel">' +
      '<div class="admin-cc-revenue-panel-heading"><h3>' + esc(t('revenueCompare')) +
      '</h3><p>' + esc(t('revenueCompareSub')) + '</p></div>' + comparisons + '</article></div>' +
      '<article class="admin-analytics-panel admin-cc-revenue-daily-panel">' +
      '<div class="admin-cc-revenue-panel-heading"><h3>' + esc(t('revenueDaily')) +
      '</h3><p>' + esc(t('revenueDailySub')) + '</p></div>' +
      '<div class="admin-cc-revenue-daily-bars' + (weekAverage !== null ? ' has-average' : '') +
      '"' + (weekAverage !== null ? ' style="--cc-revenue-average-height:' + averageHeight + '%"' : '') +
      '>' + dailyBars + '</div>' + averageGuide + renderRevenueInsights(snapshots, 'week', daily, monthlyWeeks) +
      '<p class="admin-cc-revenue-data-note">' + esc(t('revenueDateNote')) +
      '</p></article>' +
      '<article class="admin-analytics-panel admin-cc-revenue-month-panel">' +
      '<div class="admin-cc-revenue-panel-heading"><h3>' + esc(t('revenueMonthWeekly')) +
      '</h3><p>' + esc(t('revenueMonthWeeklySub')) + '</p></div>' +
      '<div class="admin-cc-revenue-daily-bars admin-cc-revenue-month-bars" style="--cc-month-week-count:' +
      monthlyWeeks.length + '">' + monthlyBars + '</div>' +
      renderRevenueInsights(snapshots, 'month', daily, monthlyWeeks) +
      '<p class="admin-cc-revenue-data-note">' + esc(t('revenueMonthWeeklyNote')) +
      '</p></article>';
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
    const revenueSection = dashboard.querySelector('[data-cc-revenue-section]');
    if (revenueSection) revenueSection.hidden = state.mode !== 'paid';
    const downloadHeading = dashboard.querySelector('[data-cc-download-heading]');
    if (downloadHeading) downloadHeading.hidden = state.mode !== 'paid';
    [
      ['[data-cc-revenue-section-title]', 'revenueSectionTitle'],
      ['[data-cc-revenue-section-subtitle]', 'revenueSectionSubtitle'],
      ['[data-cc-download-section-title]', 'downloadSectionTitle'],
      ['[data-cc-download-section-subtitle]', 'downloadSectionSubtitle']
    ].forEach(([selector, key]) => {
      const node = dashboard.querySelector(selector);
      if (node) node.textContent = t(key);
    });
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
    renderRevenueGoal();
    renderRevenueMetrics();
    renderRevenueTax();
    renderMetrics();
    renderRevenueAnalysis();
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
      '<section class="admin-cc-zone admin-cc-revenue-zone" data-cc-revenue-section>' +
      '<header class="admin-cc-zone-heading"><span class="admin-cc-zone-icon" aria-hidden="true">¥</span><div><h2 data-cc-revenue-section-title>Estimated Revenue</h2><p data-cc-revenue-section-subtitle></p></div></header>' +
      '<section class="admin-cc-revenue-tax" data-cc-revenue-tax hidden></section>' +
      '<section class="admin-cc-revenue-metrics" data-cc-revenue-kpis hidden></section>' +
      '<section class="admin-cc-revenue-analysis" data-cc-revenue-analysis hidden></section>' +
      '<section class="admin-cc-revenue-goal" data-cc-revenue-goal></section></section>' +
      '<section class="admin-cc-zone admin-cc-download-zone" data-cc-download-section>' +
      '<header class="admin-cc-zone-heading" data-cc-download-heading><span class="admin-cc-zone-icon" aria-hidden="true">↓</span><div><h2 data-cc-download-section-title>Download Data</h2><p data-cc-download-section-subtitle></p></div></header>' +
      '<section class="admin-dashboard-metrics" data-cc-kpis></section>' +
      '<div class="admin-cc-focus-dashboard-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-trend-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-focus-legend" data-cc-legend><i></i><span></span></div><div class="admin-line-chart" data-cc-line-chart></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-share-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-share-card"><div class="admin-cc-share-ring" data-cc-share-ring><div class="admin-cc-share-center"><strong data-cc-share-center>0%</strong><span>MOD</span></div></div><div class="admin-cc-share-copy" data-cc-share-copy></div></div></section></div>' +
      '<div class="admin-cc-analysis-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><div><h3 data-cc-matrix-title></h3><p class="admin-insight-caption" data-cc-matrix-subtitle></p></div><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-matrix" data-cc-matrix></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-snapshot-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-cc-snapshot" data-cc-snapshot></div></section></div>' +
      '<div class="admin-cc-bottom-grid"><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-recent-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-bars" data-cc-bars></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-ranking-title></h3><span class="admin-analytics-period" data-cc-range-label></span></div><div class="admin-ranking-wrap"><table class="admin-ranking-table"><thead data-cc-ranking-head></thead><tbody data-cc-ranking></tbody></table></div></section><section class="admin-analytics-panel admin-cc-panel-accent"><div class="admin-analytics-head"><h3 data-cc-conversion-title></h3><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-conversion" data-cc-conversion></div></section></div>' +
      '<section class="admin-analytics-panel admin-cc-detail-panel admin-cc-panel-accent"><div class="admin-analytics-head"><div><h3 data-cc-detail-title></h3><p class="admin-insight-caption" data-cc-detail-note></p></div><span class="admin-analytics-period">' + esc(t('allTime')) + '</span></div><div class="admin-cc-detail-wrap"><table class="admin-cc-detail-table"><thead data-cc-detail-head></thead><tbody data-cc-detail-body></tbody></table></div></section>' +
      '</section>' +
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
    try {
      const savedRate = localStorage.getItem(REVENUE_TAX_STORAGE_KEY);
      if (savedRate !== null && savedRate.trim() !== '') {
        const numericRate = Number(savedRate);
        if (Number.isFinite(numericRate) && numericRate >= 0 && numericRate <= 100)
          state.taxRatePct = numericRate;
      }
    } catch (error) { console.warn('[admin-cc-focus] Tax rate defaulted', error); }
    dashboard.innerHTML = markup();

    dashboard.addEventListener('change', (event) => {
      const rateInput = event.target.closest('[data-cc-tax-rate]');
      if (!rateInput) return;
      const proposed = Number(rateInput.value);
      if (!rateInput.value.trim() || !Number.isFinite(proposed) ||
          proposed < 0 || proposed > 100) {
        rateInput.value = state.taxRatePct.toFixed(1);
        return;
      }
      state.taxRatePct = proposed;
      try { localStorage.setItem(REVENUE_TAX_STORAGE_KEY, String(proposed)); }
      catch (error) { console.warn('[admin-cc-focus] Tax rate not persisted', error); }
      if (state.ready) {
        renderRevenueMetrics();
        renderRevenueTax();
        renderRevenueAnalysis();
        renderRevenueGoal();
      }
    });
    dashboard.addEventListener('click', (event) => {
      const goalSwitch = event.target.closest('[data-cc-goal-range]');
      if (goalSwitch) {
        const unit = goalSwitch.dataset.ccGoalRange;
        if (['day','month','year'].includes(unit)) {
          state.goalRange = unit;
          if (state.ready) renderRevenueGoal();
        }
        return;
      }
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