(() => {
  const PANEL_SELECTOR = '[data-platform-panel="creations"]';
  const CARD_SELECTOR = '[data-creations-mods] .project-card';
  const SORT_SELECTOR = `${PANEL_SELECTOR} [data-mod-sort]`;
  const applying = new WeakSet();

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toNumber(value) {
    const parsed = Number(String(value || '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const parsed = Date.parse(raw.replace(' ', 'T'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function decodeBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    try { return atob(padded); } catch { return ''; }
  }

  function bethesdaContentIdFromImage(url) {
    const raw = String(url || '');
    const direct = raw.match(/GENESIS\/(\d+)/i);
    if (direct) return Number(direct[1]) || 0;
    const encoded = decodeURIComponent(raw.split('/image/')[1]?.split(/[?#]/)[0] || '');
    const decoded = decodeBase64Url(encoded);
    const match = decoded.match(/GENESIS\/?\??\/(\d+)/i) || decoded.match(/GENESIS\/(\d+)/i);
    return Number(match?.[1] || 0) || 0;
  }

  function primaryUrl(item) {
    return item?.links?.[0]?.url || item?.url || '';
  }

  function itemKey(item) {
    return normalize(primaryUrl(item)) || normalize(item?.title);
  }

  function cardKey(card) {
    return normalize(card.getAttribute('href')) || normalize(card.querySelector('.card-title')?.textContent);
  }

  function titlePriority(title) {
    const value = normalize(title);
    if (value.includes('cpf ryujin death claw') || value.includes('ryujin death claw')) return 9_000_000_000_000;
    if (value.includes('death claw')) return 8_000_000_000_000;
    return 0;
  }

  function creationDateValue(item, index) {
    const priority = titlePriority(item?.title);
    if (priority) return priority;

    const explicit = parseDate(item?.publishedAt || item?.releaseDate || item?.createdAt || item?.date || item?.discoveredAt);
    if (explicit) return explicit;

    const contentId = toNumber(item?.creationId || item?.contentId || item?.content_id) || bethesdaContentIdFromImage(item?.image || item?.thumbnail || item?.cover);
    if (contentId) return contentId;

    return -index;
  }

  function shouldApplyLatestSort() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) return false;
    const sort = document.querySelector(SORT_SELECTOR)?.value || localStorage.getItem('townggModSort:creations') || 'time';
    return sort === 'time';
  }

  function applyCreationsLatestSort() {
    const target = document.querySelector('[data-creations-mods]');
    if (!target || applying.has(target) || !shouldApplyLatestSort()) return;

    const cards = [...target.querySelectorAll('.project-card')];
    if (cards.length < 2) return;

    const source = Array.isArray(window.siteData?.creations) ? window.siteData.creations : [];
    if (!source.length) return;

    const orderMap = new Map(source.map((item, index) => [itemKey(item), { item, index }]));
    const sortedCards = cards
      .map((card, originalIndex) => {
        const entry = orderMap.get(cardKey(card));
        const title = card.querySelector('.card-title')?.textContent || entry?.item?.title || '';
        const score = entry ? creationDateValue(entry.item, entry.index) : titlePriority(title) || -originalIndex;
        return { card, originalIndex, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.originalIndex - b.originalIndex;
      });

    applying.add(target);
    const fragment = document.createDocumentFragment();
    sortedCards.forEach(({ card }) => fragment.appendChild(card));
    target.appendChild(fragment);
    requestAnimationFrame(() => applying.delete(target));
  }

  function scheduleSort(delay = 80) {
    window.setTimeout(applyCreationsLatestSort, delay);
  }

  function boot() {
    scheduleSort(80);
    scheduleSort(500);
    scheduleSort(1400);

    const target = document.querySelector('[data-creations-mods]');
    if (target && !target.dataset.creationsLatestSortGuard) {
      const observer = new MutationObserver(() => scheduleSort(40));
      observer.observe(target, { childList: true });
      target.dataset.creationsLatestSortGuard = 'true';
    }
  }

  document.addEventListener('change', (event) => {
    if (event.target.closest(SORT_SELECTOR)) scheduleSort(0);
  });

  window.addEventListener('towngg:creations-live-refreshed', () => scheduleSort(0));
  window.addEventListener('focus', () => scheduleSort(80));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSort(80); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
