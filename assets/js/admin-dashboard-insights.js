(() => {
  const CREATIONS_DAILY_URL = './assets/data/creations-mod-daily.csv';
  const NEXUS_HISTORY_URL = './assets/data/nexus-history.csv';
  const state = { creationRows: [], nexusRows: [], ready: false, range: 7 };

  const labels = {
    en: {
      section: 'Deep Analytics', subtitle: 'Growth, momentum, conversion and paid Creation performance',
      cycle: 'Period vs Previous', contribution: 'Growth Contribution TOP10', momentum: 'Momentum TOP10',
      scatter: 'Total Downloads × Recent Growth', conversion: 'Creation Conversion', paid: 'Paid Creation Performance',
      current: 'Current period', previous: 'Previous period', contributionNote: 'Which mods contributed the most new downloads in this period.',
      momentumNote: 'Recent downloads as a share of all-time downloads. Higher means the mod is accelerating now.',
      scatterNote: 'Top-right = strong all-time performance and strong recent growth. Log scale keeps large and small mods readable.',
      conversionNote: 'Download, library, like and play ratios derived from Creation views/downloads.',
      paidNote: 'Paid Creations compared by price, recent downloads, total downloads and likes.',
      downloadRate: 'Download rate', libraryRate: 'Library rate', likeRate: 'Like rate', playRate: 'Plays / download',
      mod: 'Mod', price: 'Price', d7: '7D', d30: '30D', total: 'Total', likes: 'Likes',
      free: 'Creations', paidName: 'Paid Creations', nexus: 'Nexus', noData: 'Not enough data yet.'
    },
    'zh-CN': {
      section: '深度分析', subtitle: '增长贡献、作品动量、转化率与付费 Creation 表现',
      cycle: '周期环比', contribution: '增长贡献 TOP10', momentum: '作品动量 TOP10',
      scatter: '总下载 × 近期增长', conversion: 'Creation 转化分析', paid: '付费 Creation 表现',
      current: '本周期', previous: '上一周期', contributionNote: '查看本周期新增下载主要由哪些作品贡献。',
      momentumNote: '近 7 日下载占累计下载的比例，比例越高代表作品近期增长越快。',
      scatterNote: '右上角代表累计表现强且近期仍在增长；使用对数尺度避免大作品压扁小作品。',
      conversionNote: '根据 Creation 的浏览、下载、加入库、点赞与游玩次数计算转化效率。',
      paidNote: '按价格、近 7/30 日下载、累计下载与点赞对比付费作品。',
      downloadRate: '下载率', libraryRate: '加入库率', likeRate: '点赞率', playRate: '游玩/下载',
      mod: '作品', price: '价格', d7: '近7日', d30: '近30日', total: '累计', likes: '点赞',
      free: '免费 Creations', paidName: '付费 Creations', nexus: 'Nexus', noData: '暂时没有足够数据。'
    },
    ja: {
      section: '詳細分析', subtitle: '成長寄与、モメンタム、転換率、有料 Creation の分析',
      cycle: '期間比較', contribution: '成長寄与 TOP10', momentum: 'モメンタム TOP10',
      scatter: '累計 DL × 最近の成長', conversion: 'Creation 転換分析', paid: '有料 Creation パフォーマンス',
      current: '現在期間', previous: '前期間', contributionNote: 'この期間の新規ダウンロードに最も寄与した Mod。',
      momentumNote: '直近7日DL / 累計DL。高いほど現在の伸びが強い Mod。',
      scatterNote: '右上ほど累計実績と最近の成長の両方が強い状態です。',
      conversionNote: '閲覧、DL、ライブラリ追加、いいね、プレイ数から効率を算出。',
      paidNote: '価格、7/30日DL、累計DL、いいねで有料 Creation を比較。',
      downloadRate: 'DL率', libraryRate: '追加率', likeRate: 'いいね率', playRate: 'プレイ/DL',
      mod: 'Mod', price: '価格', d7: '7日', d30: '30日', total: '累計', likes: 'いいね',
      free: '無料 Creations', paidName: '有料 Creations', nexus: 'Nexus', noData: 'データが不足しています。'
    }
  };

  function lang() {
    const current = document.documentElement.lang || localStorage.getItem('townggSiteLang') || 'en';
    return labels[current] ? current : 'en';
  }
  function t(key) { return labels[lang()]?.[key] || labels.en[key] || key; }
  function n(value) {
    const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function fmt(value) { return new Intl.NumberFormat(lang() === 'zh-CN' ? 'zh-CN' : lang() === 'ja' ? 'ja-JP' : 'en-US').format(Math.round(n(value))); }
  function pct(value, digits = 1) { return `${Number(value || 0).toFixed(digits)}%`; }
  function esc(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(value) { return String(value || '').normalize('NFKD').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, '').trim(); }
  function platformClass(value) { return value === 'paid' ? 'paid' : value === 'nexus' ? 'nexus' : 'free'; }
  function platformLabel(value) { return value === 'paid' ? t('paidName') : value === 'nexus' ? t('nexus') : t('free'); }

  function parseCSV(text) {
    const rows = [];
    let cell = '', row = [], quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i], next = text[i + 1];
      if (c === '"' && quoted && next === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some((item) => item.trim())) rows.push(row);
        row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.map((items) => Object.fromEntries(headers.map((header, index) => [header.trim(), items[index] || ''])));
  }

  function paidTitleSet() {
    return new Set((window.siteData?.creations || [])
      .filter((item) => item?.isPaid === true || n(item?.price) > 0)
      .map((item) => norm(item.title)).filter(Boolean));
  }

  function latestCreationSnapshots(rows) {
    const paid = paidTitleSet();
    const byDate = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      const list = byDate.get(row.date) || [];
      list.push(row); byDate.set(row.date, list);
    });
    return [...byDate.entries()].map(([date, dateRows]) => {
      const byStamp = new Map();
      dateRows.forEach((row) => {
        const stamp = String(row.last_updated || '');
        const list = byStamp.get(stamp) || [];
        list.push(row); byStamp.set(stamp, list);
      });
      const snaps = [...byStamp.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      const sum = (list) => list.reduce((total, row) => total + n(row.daily_downloads), 0);
      const selected = [...snaps].reverse().find(([, list]) => sum(list) > 0) || snaps.at(-1) || ['', dateRows];
      const mapped = selected[1].map((row) => ({ ...row, platform: paid.has(norm(row.title)) ? 'paid' : 'free', modName: row.title }));
      return { date, rows: mapped };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  function nexusDays(rows) {
    const unique = new Map();
    rows.forEach((row) => {
      if (!row.date) return;
      unique.set(`${row.date}|${row.mod_id || norm(row.mod_name)}`, row);
    });
    const byDate = new Map();
    [...unique.values()].forEach((row) => {
      const list = byDate.get(row.date) || [];
      list.push({ ...row, platform: 'nexus', modName: row.mod_name });
      byDate.set(row.date, list);
    });
    return [...byDate.entries()].map(([date, dayRows]) => ({ date, rows: dayRows })).sort((a, b) => a.date.localeCompare(b.date));
  }

  function aggregatePeriod(days, count, offset = 0) {
    const end = Math.max(0, days.length - offset);
    const selected = days.slice(Math.max(0, end - count), end);
    const result = { free: 0, paid: 0, nexus: 0, byMod: new Map() };
    selected.forEach((day) => day.rows.forEach((row) => {
      const value = n(row.daily_downloads);
      const platform = row.platform || 'free';
      result[platform] += value;
      const key = `${platform}|${platform === 'nexus' ? (row.mod_id || norm(row.modName)) : norm(row.modName)}`;
      const item = result.byMod.get(key) || { title: row.modName || row.title || 'Unknown', platform, downloads: 0 };
      item.downloads += value;
      result.byMod.set(key, item);
    }));
    return result;
  }

  function totalMaps() {
    const result = new Map();
    (window.siteData?.creations || []).forEach((item) => {
      const platform = item.isPaid === true || n(item.price) > 0 ? 'paid' : 'free';
      result.set(`${platform}|${norm(item.title)}`, { title: item.title, platform, total: n(item.downloads), item });
    });
    const latest = new Map();
    state.nexusRows.forEach((row) => {
      const key = row.mod_id || norm(row.mod_name);
      const current = latest.get(key);
      if (!current || String(row.date || '') > String(current.date || '')) latest.set(key, row);
    });
    latest.forEach((row, key) => result.set(`nexus|${key}`, { title: row.mod_name, platform: 'nexus', total: n(row.total_downloads), item: row }));
    return result;
  }

  function mergeDays() {
    const creation = latestCreationSnapshots(state.creationRows);
    const nexus = nexusDays(state.nexusRows);
    return { creation, nexus };
  }

  function periodForAll(count, offset = 0) {
    const { creation, nexus } = mergeDays();
    const c = aggregatePeriod(creation, count, offset);
    const x = aggregatePeriod(nexus, count, offset);
    return {
      free: c.free, paid: c.paid, nexus: x.nexus,
      byMod: new Map([...c.byMod.entries(), ...x.byMod.entries()])
    };
  }

  function panel(title, note, body, extraClass = '') {
    return `<section class="admin-analytics-panel ${extraClass}"><div class="admin-analytics-head"><div><h3>${esc(title)}</h3>${note ? `<p class="admin-insight-caption">${esc(note)}</p>` : ''}</div></div>${body}</section>`;
  }

  function cyclePanel() {
    const current = periodForAll(state.range, 0), previous = periodForAll(state.range, state.range);
    const max = Math.max(1, current.free, current.paid, current.nexus, previous.free, previous.paid, previous.nexus);
    const row = (key) => {
      const c = current[key], p = previous[key];
      const change = p ? ((c - p) / p) * 100 : null;
      const cls = change === null ? 'flat' : change > .05 ? 'up' : change < -.05 ? 'down' : 'flat';
      const changeText = change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      return `<div class="admin-cycle-row ${key}"><div class="admin-cycle-label"><i class="admin-chart-dot ${key}"></i><span>${esc(platformLabel(key))}</span></div><div class="admin-cycle-bars"><div class="admin-cycle-bar current" title="${esc(`${t('current')}: ${fmt(c)}`)}"><i style="width:${Math.max(1.5, (c / max) * 100)}%"></i></div><div class="admin-cycle-bar previous" title="${esc(`${t('previous')}: ${fmt(p)}`)}"><i style="width:${Math.max(1.5, (p / max) * 100)}%"></i></div></div><strong class="admin-cycle-change ${cls}">${changeText}</strong></div>`;
    };
    return panel(t('cycle'), `${state.range}D · ${t('current')} / ${t('previous')}`, `<div class="admin-cycle-grid">${row('free')}${row('paid')}${row('nexus')}</div>`);
  }

  function barRows(items, valueGetter, suffixGetter = null) {
    const max = Math.max(1, ...items.map(valueGetter));
    return `<div class="admin-insight-bars">${items.map((item) => {
      const value = valueGetter(item);
      const suffix = suffixGetter ? suffixGetter(item) : fmt(value);
      return `<div class="admin-insight-bar-row"><div class="admin-insight-name"><i class="admin-chart-dot ${platformClass(item.platform)}"></i><span title="${esc(item.title)}">${esc(item.title)}</span></div><div class="admin-insight-track"><span class="admin-insight-fill ${platformClass(item.platform)}" style="width:${Math.max(1.5, (value / max) * 100)}%"></span></div><strong class="admin-insight-value">${esc(suffix)}</strong></div>`;
    }).join('')}</div>`;
  }

  function contributionPanel() {
    const period = periodForAll(state.range);
    const items = [...period.byMod.values()].filter((item) => item.downloads > 0).sort((a, b) => b.downloads - a.downloads).slice(0, 10);
    return panel(t('contribution'), t('contributionNote'), items.length ? barRows(items, (item) => item.downloads) : `<div class="admin-insight-empty">${esc(t('noData'))}</div>`);
  }

  function momentumPanel() {
    const p7 = periodForAll(7), totals = totalMaps();
    const items = [...p7.byMod.entries()].map(([key, item]) => {
      const total = totals.get(key)?.total || 0;
      const ratio = total > 0 ? (item.downloads / total) * 100 : 0;
      return { ...item, total, ratio };
    }).filter((item) => item.total > 0 && item.downloads > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 10);
    const body = items.length ? `<div class="admin-insight-bars">${items.map((item) => {
      const cls = item.ratio >= 20 ? 'rising' : item.ratio >= 8 ? 'growing' : '';
      const label = item.ratio >= 20 ? '🔥 Rising' : item.ratio >= 8 ? '↑ Growing' : '→ Stable';
      return `<div class="admin-insight-bar-row"><div class="admin-insight-name"><i class="admin-chart-dot ${platformClass(item.platform)}"></i><span title="${esc(item.title)}">${esc(item.title)}</span></div><div class="admin-insight-track"><span class="admin-insight-fill ${platformClass(item.platform)}" style="width:${Math.min(100, Math.max(2, item.ratio * 3))}%"></span></div><span><strong class="admin-insight-value">${pct(item.ratio)}</strong> <em class="admin-momentum-badge ${cls}">${label}</em></span></div>`;
    }).join('')}</div>` : `<div class="admin-insight-empty">${esc(t('noData'))}</div>`;
    return panel(t('momentum'), t('momentumNote'), body);
  }

  function scatterPanel() {
    const p7 = periodForAll(7), totals = totalMaps();
    const points = [...p7.byMod.entries()].map(([key, recent]) => {
      const total = totals.get(key)?.total || 0;
      return { title: recent.title, platform: recent.platform, total, recent: recent.downloads };
    }).filter((item) => item.total > 0 && item.recent > 0);
    if (!points.length) return panel(t('scatter'), t('scatterNote'), `<div class="admin-insight-empty">${esc(t('noData'))}</div>`);
    const width = 760, height = 310, left = 48, right = 16, top = 18, bottom = 36;
    const logsX = points.map((p) => Math.log10(Math.max(1, p.total))), logsY = points.map((p) => Math.log10(Math.max(1, p.recent)));
    const minX = Math.min(...logsX), maxX = Math.max(...logsX), minY = Math.min(...logsY), maxY = Math.max(...logsY);
    const x = (v) => left + ((Math.log10(Math.max(1, v)) - minX) / Math.max(.001, maxX - minX)) * (width - left - right);
    const y = (v) => top + (1 - ((Math.log10(Math.max(1, v)) - minY) / Math.max(.001, maxY - minY))) * (height - top - bottom);
    let svg = `<div class="admin-scatter-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Total downloads versus recent downloads">`;
    for (let i = 0; i <= 4; i += 1) {
      const yy = top + ((height - top - bottom) / 4) * i;
      const xx = left + ((width - left - right) / 4) * i;
      svg += `<line class="admin-scatter-grid" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"></line><line class="admin-scatter-grid" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"></line>`;
    }
    points.forEach((p) => {
      svg += `<circle class="admin-scatter-point ${platformClass(p.platform)}" cx="${x(p.total).toFixed(2)}" cy="${y(p.recent).toFixed(2)}" r="4.7"><title>${esc(`${p.title} · ${platformLabel(p.platform)} · ${t('total')}: ${fmt(p.total)} · ${t('d7')}: ${fmt(p.recent)}`)}</title></circle>`;
    });
    svg += `<text class="admin-scatter-axis" x="${width/2}" y="${height-5}" text-anchor="middle">${esc(t('total'))} →</text><text class="admin-scatter-axis" x="13" y="${height/2}" transform="rotate(-90 13 ${height/2})" text-anchor="middle">${esc(t('d7'))} →</text></svg></div>`;
    return panel(t('scatter'), t('scatterNote'), svg);
  }

  function conversionPanel() {
    const items = (window.siteData?.creations || []).map((item) => {
      const views = Math.max(0, n(item.views)), downloads = Math.max(0, n(item.downloads)), likes = Math.max(0, n(item.likes)), library = Math.max(0, n(item.libraryAdds)), plays = Math.max(0, n(item.plays));
      return {
        title: item.title, downloads,
        downloadRate: views ? downloads / views * 100 : 0,
        libraryRate: views ? library / views * 100 : 0,
        likeRate: downloads ? likes / downloads * 100 : 0,
        playRate: downloads ? plays / downloads : 0
      };
    }).filter((item) => item.downloads > 0).sort((a, b) => b.downloads - a.downloads).slice(0, 9);
    if (!items.length) return panel(t('conversion'), t('conversionNote'), `<div class="admin-insight-empty">${esc(t('noData'))}</div>`);
    const rows = items.map((item) => `<tr><td title="${esc(item.title)}">${esc(item.title)}</td><td>${pct(item.downloadRate)}</td><td>${pct(item.libraryRate)}</td><td>${pct(item.likeRate)}</td><td>${item.playRate.toFixed(1)}×</td></tr>`).join('');
    return panel(t('conversion'), t('conversionNote'), `<table class="admin-conversion-table"><thead><tr><th>${esc(t('mod'))}</th><th>${esc(t('downloadRate'))}</th><th>${esc(t('libraryRate'))}</th><th>${esc(t('likeRate'))}</th><th>${esc(t('playRate'))}</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  function paidPanel() {
    const p7 = periodForAll(7), p30 = periodForAll(30);
    const map7 = new Map([...p7.byMod.entries()].filter(([key]) => key.startsWith('paid|')));
    const map30 = new Map([...p30.byMod.entries()].filter(([key]) => key.startsWith('paid|')));
    const items = (window.siteData?.creations || []).filter((item) => item.isPaid === true || n(item.price) > 0).map((item) => {
      const key = `paid|${norm(item.title)}`;
      return { title: item.title, price: n(item.price), d7: map7.get(key)?.downloads || 0, d30: map30.get(key)?.downloads || 0, total: n(item.downloads), likes: n(item.likes) };
    }).sort((a, b) => b.d30 - a.d30 || b.total - a.total);
    if (!items.length) return panel(t('paid'), t('paidNote'), `<div class="admin-insight-empty">${esc(t('noData'))}</div>`);
    const rows = items.map((item) => `<tr><td title="${esc(item.title)}">${esc(item.title)}</td><td class="admin-paid-price">${fmt(item.price)} CC</td><td>${fmt(item.d7)}</td><td>${fmt(item.d30)}</td><td>${fmt(item.total)}</td><td>${fmt(item.likes)}</td></tr>`).join('');
    return panel(t('paid'), t('paidNote'), `<table class="admin-paid-table"><thead><tr><th>${esc(t('mod'))}</th><th>${esc(t('price'))}</th><th>${esc(t('d7'))}</th><th>${esc(t('d30'))}</th><th>${esc(t('total'))}</th><th>${esc(t('likes'))}</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  function sectionMarkup() {
    return `<section class="admin-insights-section" data-admin-insights><div class="admin-dashboard-header"><div class="admin-dashboard-title"><h2>${esc(t('section'))}</h2><p>${esc(t('subtitle'))}</p></div></div><div class="admin-insights-grid-2">${cyclePanel()}${contributionPanel()}</div><div class="admin-insights-grid-2">${momentumPanel()}${scatterPanel()}</div><div class="admin-insights-wide-narrow">${conversionPanel()}${paidPanel()}</div></section>`;
  }

  function render() {
    if (!state.ready) return;
    const dashboard = document.querySelector('.admin-dashboard');
    if (!dashboard) return;
    document.querySelector('[data-admin-insights]')?.remove();
    dashboard.insertAdjacentHTML('beforeend', sectionMarkup());
    document.querySelectorAll('[data-admin-insights] .admin-analytics-panel').forEach((panel) => {
      panel.addEventListener('pointermove', (event) => {
        const rect = panel.getBoundingClientRect();
        panel.style.setProperty('--insight-x', `${event.clientX - rect.left}px`);
        panel.style.setProperty('--insight-y', `${event.clientY - rect.top}px`);
      });
    });
  }

  async function fetchText(url) {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.text();
  }

  async function load() {
    try {
      const [creationText, nexusText] = await Promise.all([fetchText(CREATIONS_DAILY_URL), fetchText(NEXUS_HISTORY_URL)]);
      state.creationRows = parseCSV(creationText);
      state.nexusRows = parseCSV(nexusText);
      state.ready = true;
      render();
    } catch (error) {
      console.warn('Admin advanced analytics unavailable', error);
    }
  }

  function bind() {
    const dashboard = document.querySelector('.admin-dashboard');
    if (!dashboard) { window.setTimeout(bind, 120); return; }
    const range = document.querySelector('[data-admin-dashboard-range]');
    if (range) {
      state.range = Number(range.value) === 30 ? 30 : 7;
      range.addEventListener('change', () => { state.range = Number(range.value) === 30 ? 30 : 7; render(); });
    }
    document.addEventListener('click', (event) => {
      if (event.target.closest('.admin-language-option,[data-lang]')) window.setTimeout(render, 120);
    });
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
