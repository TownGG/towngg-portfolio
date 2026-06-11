const data = window.siteData || {};
const creatorNotes = window.creatorNotes || [];
const creatorNotesMeta = window.creatorNotesMeta || {};

function tagList(tags = []) {
  return tags
    .filter((tag) => !String(tag).toLowerCase().startsWith("version"))
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
}

function actionLinks(links = []) {
  return links.map((link, index) => {
    const kind = index === 0 ? "button primary" : "button";
    return `<a class="${kind}" href="${link.url}" target="_blank" rel="noopener">${link.label}</a>`;
  }).join("");
}

function modCard(mod) {
  const primaryLink = mod.links?.[0]?.url || "#";
  return `
    <a class="project-card project-card-link" data-group="${mod.group}" href="${primaryLink}" target="_blank" rel="noopener">
      <div class="project-image">
        <img src="${mod.image}" alt="${mod.alt}" loading="lazy">
      </div>
      <div class="project-content">
        <h3 class="card-title">${mod.title}</h3>
        <p class="card-desc">${mod.description}</p>
        <div class="mod-tags">${tagList(mod.tags)}</div>
      </div>
      <div class="stats">
        <span title="Endorsements"><span class="stat-icon">&#9733;</span>${mod.endorsements}</span>
        <span title="Downloads"><span class="stat-icon">&#8595;</span>${mod.downloads}</span>
      </div>
    </a>
  `;
}

function creationCard(mod) {
  const primaryLink = mod.links?.[0]?.url || "#";
  const image = mod.image
    ? `<img src="${mod.image}" alt="${mod.alt}" loading="lazy">`
    : `<div class="project-image-placeholder"><span>Bethesda</span><strong>Creations</strong></div>`;
  return `
    <a class="project-card project-card-link" data-group="${mod.group}" href="${primaryLink}" target="_blank" rel="noopener">
      <div class="project-image">
        ${image}
      </div>
      <div class="project-content">
        <h3 class="card-title">${mod.title}</h3>
        <p class="card-desc">${mod.description}</p>
        <div class="mod-tags">${tagList(mod.tags)}</div>
      </div>
      <div class="stats">
        <span title="Likes"><span class="stat-icon">&#9733;</span>${mod.likes}</span>
        <span title="Downloads"><span class="stat-icon">&#8595;</span>${mod.downloads}</span>
      </div>
    </a>
  `;
}

function artworkCard(art, index) {
  return `
    <article class="gallery-card">
      <button type="button" data-art-index="${index}" aria-label="Open artwork">
        <img src="${art.image}" alt="${art.alt}" loading="lazy">
      </button>
    </article>
  `;
}

function sortedCreatorNotes() {
  return [...creatorNotes].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function noteCard(note, compact = false) {
  return `
    <article class="note-card" data-category="${note.category}">
      <div class="note-category">${note.category}</div>
      <h3>${note.title}</h3>
      <time datetime="${note.date}">${note.date}</time>
      ${compact ? "" : `<p>${note.excerpt}</p>`}
      <a class="note-link" href="./note.html?id=${encodeURIComponent(note.id)}">Read More</a>
    </article>
  `;
}

function renderFeaturedVideo() {
  const video = creatorNotesMeta.featuredVideo;
  if (!video) return;

  document.querySelectorAll("[data-featured-video]").forEach((target) => {
    target.innerHTML = `
      <div class="video-copy">
        <div class="eyebrow">Featured Video</div>
        <h2 class="section-title">${video.title}</h2>
        <p class="video-label">${video.label}</p>
        <p class="section-desc">${video.description}</p>
        <div class="section-actions">
          <a class="button primary" href="${video.url}" target="_blank" rel="noopener">${video.buttonLabel}</a>
        </div>
      </div>
      <div class="video-frame">
        <iframe src="${video.url}" title="${video.title} ${video.label}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    `;
  });
}

function renderLatestNotes() {
  const target = document.querySelector("[data-latest-notes]");
  if (!target) return;
  target.innerHTML = sortedCreatorNotes().slice(0, 3).map((note) => noteCard(note, true)).join("");
}

function renderNotesPage() {
  const list = document.querySelector("[data-notes-list]");
  if (!list) return;

  const notes = sortedCreatorNotes();
  list.innerHTML = notes.map((note) => noteCard(note)).join("");

  const active = document.querySelector("[data-notes-metric='active']");
  const latest = document.querySelector("[data-notes-metric='latest']");
  const total = document.querySelector("[data-notes-metric='total']");
  if (active) active.textContent = creatorNotesMeta.activeProjects || "-";
  if (latest) latest.textContent = notes[0]?.date?.slice(5) || "-";
  if (total) total.textContent = String(notes.length);
}

function renderNotesTimeline() {
  const target = document.querySelector("[data-notes-timeline]");
  const timeline = creatorNotesMeta.timeline || [];
  if (!target) return;

  target.innerHTML = timeline.map((item) => `
    <article class="timeline-item">
      <time>${item.date}</time>
      <div>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </div>
    </article>
  `).join("");
}

function renderArticleContent(content = "") {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const output = [];
  let list = [];

  function flushList() {
    if (!list.length) return;
    output.push(`<ul>${list.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    list = [];
  }

  lines.forEach((line) => {
    if (line.startsWith("* ")) {
      list.push(line.slice(2));
      return;
    }
    flushList();
    output.push(`<p>${line}</p>`);
  });
  flushList();
  return output.join("");
}

function setupNoteComments(note) {
  const target = document.querySelector("[data-note-comments]");
  if (!target || !note) return;

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.dataset.repo = "TownGG/towngg-portfolio";
  script.dataset.repoId = "R_kgDOSgBRWw";
  script.dataset.category = "General";
  script.dataset.categoryId = "DIC_kwDOSgBRW84C-1ju";
  script.dataset.mapping = "specific";
  script.dataset.term = `creator-note-${note.id}`;
  script.dataset.strict = "0";
  script.dataset.reactionsEnabled = "1";
  script.dataset.emitMetadata = "1";
  script.dataset.inputPosition = "bottom";
  script.dataset.theme = "dark";
  script.dataset.lang = "zh-CN";
  script.dataset.loading = "lazy";
  script.crossOrigin = "anonymous";
  script.async = true;
  target.innerHTML = "";
  target.appendChild(script);
}

function renderNoteDetail() {
  const target = document.querySelector("[data-note-detail]");
  if (!target) return;

  const notes = sortedCreatorNotes();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || notes[0]?.id;
  const index = notes.findIndex((note) => note.id === id);
  const note = notes[index] || notes[0];

  if (!note) {
    target.innerHTML = "<h1>Note not found</h1><p>This Creator Note does not exist yet.</p>";
    return;
  }

  document.title = `${note.title} | TownGG Creator Notes`;
  target.innerHTML = `
    <a class="note-back" href="./dev-log.html">Back to Creator Notes</a>
    <div class="note-category">${note.category}</div>
    <h1>${note.title}</h1>
    <time datetime="${note.date}">${note.date}</time>
    ${note.cover ? `<img class="note-cover" src="${note.cover}" alt="${note.title}" loading="lazy">` : ""}
    <div class="article-content">${renderArticleContent(note.content)}</div>
  `;

  const neighbors = document.querySelector("[data-note-neighbors]");
  if (neighbors) {
    const previous = notes[index + 1];
    const next = notes[index - 1];
    neighbors.innerHTML = `
      ${previous ? `<a class="neighbor-card" href="./note.html?id=${encodeURIComponent(previous.id)}"><span>Previous Article</span><strong>${previous.title}</strong></a>` : "<span></span>"}
      ${next ? `<a class="neighbor-card" href="./note.html?id=${encodeURIComponent(next.id)}"><span>Next Article</span><strong>${next.title}</strong></a>` : "<span></span>"}
    `;
  }

  setupNoteComments(note);
}
function renderMods(selector, options = {}) {
  const target = document.querySelector(selector);
  if (!target) return;

  let mods = data.mods || [];
  if (options.featuredOnly) mods = mods.filter((mod) => mod.group === "Featured");
  if (options.excludeFeatured) mods = mods.slice(1);
  if (options.limit) mods = mods.slice(0, options.limit);

  target.innerHTML = mods.map(modCard).join("");
}


function renderCreations() {
  const target = document.querySelector("[data-creations-mods]");
  if (!target) return;

  target.innerHTML = (data.creations || [])
    .filter((item) => item.image && dashboardNumber(item.downloads) > 0)
    .map(creationCard)
    .join("");
}
function renderFeaturedMod() {
  const target = document.querySelector("[data-featured-mod]");
  if (!target) return;

  const mod = (data.mods || [])[0];
  if (!mod) return;

  target.innerHTML = `
    <div class="featured-image">
      <img src="${mod.image}" alt="${mod.alt}" loading="lazy">
    </div>
    <div class="featured-copy">
      <h2 class="featured-title">${mod.title}</h2>
      <p class="lead">${mod.description}</p>
      <p class="featured-lore">${mod.featureDescription || ""}</p>
      <div class="mod-tags">${tagList(mod.tags)}</div>
    </div>
  `;
}

function renderGallery(selector, options = {}) {
  const target = document.querySelector(selector);
  if (!target) return;

  let artworks = options.source === "featured" ? data.featuredArtworks || [] : data.artworks || [];
  if (options.limit) artworks = artworks.slice(0, options.limit);
  const cards = artworks.map(artworkCard).join("");
  target.innerHTML = options.loop ? cards + cards : cards;
  target.querySelectorAll("[data-art-index]").forEach((button) => {
    button.dataset.artSource = options.source === "featured" ? "featured" : "all";
  });
}

function renderSocials() {
  document.querySelectorAll("[data-socials]").forEach((target) => {
    target.innerHTML = (data.socials || [])
      .map((link) => `<a class="social-btn" href="${link.url}" target="_blank" rel="noopener">${link.label}</a>`)
      .join("");
  });
}

function setupNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!header || !toggle || !links) return;

  function setOpen(isOpen) {
    header.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  }

  toggle.addEventListener("click", () => {
    setOpen(!header.classList.contains("is-open"));
  });

  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!header.classList.contains("is-open")) return;
    if (!header.contains(event.target)) setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setOpen(false);
  });
}

function setupPlatformTabs() {
  const tabs = document.querySelectorAll("[data-platform-tab]");
  const panels = document.querySelectorAll("[data-platform-panel]");
  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const platform = tab.dataset.platformTab;
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });
      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.platformPanel === platform);
      });
    });
  });
}

function setupFilters() {
  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    const targetSelector = group.dataset.filterTarget;
    const itemType = group.dataset.filterGroup;
    const target = document.querySelector(targetSelector);
    if (!target) return;

    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;

      group.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      const value = button.dataset.filter;
      const attr = itemType === "gallery" || itemType === "notes" ? "category" : "group";
      target.querySelectorAll(`[data-${attr}]`).forEach((card) => {
        const isVisible = value === "All" || card.dataset[attr] === value;
        card.style.display = isVisible ? "" : "none";
      });
    });
  });
}

function setupGalleryModal() {
  const modal = document.querySelector("[data-gallery-modal]");
  if (!modal) return;

  const image = modal.querySelector("[data-modal-image]");
  const close = modal.querySelector("[data-modal-close]");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-art-index]");
    if (!trigger) return;

    const list = trigger.dataset.artSource === "featured" ? data.featuredArtworks : data.artworks;
    const art = list[Number(trigger.dataset.artIndex)];
    if (!art) return;

    image.src = art.image;
    image.alt = art.alt;
    modal.classList.add("is-open");
  });

  function closeModal() {
    modal.classList.remove("is-open");
  }

  close.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

const defaultMessages = [
  {
    name: "Starfield Explorer",
    time: "Pinned",
    text: "Your immersive systems make the settled systems feel more alive. Looking forward to the next release."
  },
  {
    name: "Mod Player",
    time: "Pinned",
    text: "The drone grenade concept is exactly the kind of faction tool Starfield needed."
  }
];

function getMessages() {
  const saved = localStorage.getItem("townggMessages");
  if (!saved) return defaultMessages;
  try {
    return [...JSON.parse(saved), ...defaultMessages];
  } catch {
    return defaultMessages;
  }
}

function messageCard(message) {
  return `
    <article class="message-card">
      <div class="message-head">
        <span>${message.name}</span>
        <span class="message-time">${message.time}</span>
      </div>
      <p>${message.text}</p>
    </article>
  `;
}

function renderMessages(limit) {
  const target = document.querySelector("[data-message-list]");
  if (!target) return;

  const messages = getMessages().slice(0, limit || 20);
  target.innerHTML = messages.map(messageCard).join("");
}

function setupMessagePagination() {
  const target = document.querySelector("[data-message-list]");
  const pagination = document.querySelector("[data-message-pagination]");
  if (!target || !pagination) return;

  const pageSize = 10;
  let page = 1;

  function renderPage() {
    const messages = getMessages();
    const pageCount = Math.max(1, Math.ceil(messages.length / pageSize));
    page = Math.min(Math.max(1, page), pageCount);
    const start = (page - 1) * pageSize;
    target.innerHTML = messages.slice(start, start + pageSize).map(messageCard).join("");
    pagination.innerHTML = `
      <button class="pager-btn" type="button" data-page-action="prev" ${page === 1 ? "disabled" : ""}>Prev</button>
      <span class="pager-status">Page ${page} / ${pageCount}</span>
      <button class="pager-btn" type="button" data-page-action="next" ${page === pageCount ? "disabled" : ""}>Next</button>
    `;
  }

  if (!pagination.dataset.ready) {
    pagination.addEventListener("click", (event) => {
      const action = event.target.closest("[data-page-action]")?.dataset.pageAction;
      if (!action) return;
      page += action === "next" ? 1 : -1;
      renderPage();
    });
    pagination.dataset.ready = "true";
  }

  renderPage();
}

function setupMessageForm() {
  const form = document.querySelector("[data-message-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const message = {
      name: String(formData.get("name") || "Anonymous").trim(),
      text: String(formData.get("message") || "").trim(),
      time: new Date().toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
    };

    if (!message.text) return;

    const saved = localStorage.getItem("townggMessages");
    const messages = saved ? JSON.parse(saved) : [];
    messages.unshift(message);
    localStorage.setItem("townggMessages", JSON.stringify(messages.slice(0, 30)));
    form.reset();
    if (document.querySelector("[data-message-pagination]")) {
      setupMessagePagination();
    } else {
      renderMessages(document.body.dataset.page === "home" ? 8 : undefined);
    }
  });
}

function setupAutoScroll(selector, options = {}) {
  const element = document.querySelector(selector);
  if (!element) return;

  const axis = options.axis || "x";
  const step = options.step || 1;
  const interval = options.interval || 24;
  let isPaused = false;

  element.addEventListener("mouseenter", () => {
    isPaused = true;
  });
  element.addEventListener("mouseleave", () => {
    isPaused = false;
  });
  element.addEventListener("focusin", () => {
    isPaused = true;
  });
  element.addEventListener("focusout", () => {
    isPaused = false;
  });

  window.setInterval(() => {
    if (isPaused) return;

    if (axis === "x") {
      const loopPoint = options.loopPoint || element.scrollWidth / 2;
      const max = element.scrollWidth - element.clientWidth;
      if (max <= 0) return;
      element.scrollLeft = element.scrollLeft >= loopPoint ? 0 : element.scrollLeft + step;
      return;
    }

    const max = element.scrollHeight - element.clientHeight;
    if (max <= 0) return;
    element.scrollTop = element.scrollTop >= max - 1 ? 0 : element.scrollTop + step;
  }, interval);
}

const numberFormatter = new Intl.NumberFormat("en-US");

function parseDashboardCSV(text) {
  const rows = [];
  let cell = "";
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
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((items) =>
    Object.fromEntries(headers.map((header, index) => [header, items[index] || ""]))
  );
}

function dashboardNumber(value) {
  const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricDisplay(value) {
  return value === undefined || value === null || String(value).trim() === "" ? "-" : value;
}

function latestDashboardRows(rows) {
  const latest = new Map();
  rows.forEach((row) => {
    const key = row.mod_id;
    const current = latest.get(key);
    if (!current || row.date > current.date) latest.set(key, row);
  });
  return [...latest.values()].sort((a, b) => dashboardNumber(b.total_downloads) - dashboardNumber(a.total_downloads));
}

function formatCompactNumber(value) {
  const number = dashboardNumber(value);
  if (number >= 1000000) {
    const compact = number >= 10000000 ? Math.floor(number / 1000000) : Math.floor(number / 100000) / 10;
    return `${compact}M+`;
  }
  if (number >= 1000) {
    const compact = number >= 10000 ? Math.floor(number / 1000) : Math.floor(number / 100) / 10;
    return `${compact}K+`;
  }
  return numberFormatter.format(number);
}

function setHomeMetric(name, value) {
  const target = document.querySelector(`[data-home-metric="${name}"]`);
  if (target) target.textContent = formatCompactNumber(value);
}

function renderHomeCreationMetric() {
  const totalPlays = (data.creations || []).reduce((sum, item) => sum + dashboardNumber(item.plays), 0);
  setHomeMetric("plays", totalPlays);
}

function renderHomeNexusMetrics(rows) {
  const latest = latestDashboardRows(rows);
  const creationTotals = (data.creations || []).reduce(
    (sum, item) => {
      if (dashboardNumber(item.downloads) > 0) sum.mods += 1;
      sum.downloads += dashboardNumber(item.downloads);
      sum.likes += dashboardNumber(item.likes);
      return sum;
    },
    { mods: 0, downloads: 0, likes: 0 }
  );
  const totals = latest.reduce(
    (sum, row) => {
      sum.mods += 1;
      sum.downloads += dashboardNumber(row.total_downloads);
      sum.likes += dashboardNumber(row.likes);
      return sum;
    },
    { mods: 0, downloads: 0, likes: 0 }
  );

  setHomeMetric("downloads", totals.downloads + creationTotals.downloads);
  setHomeMetric("likes", totals.likes + creationTotals.likes);
  setHomeMetric("mods", totals.mods + creationTotals.mods);
}

function setupHomeMetrics() {
  if (!document.querySelector("[data-home-metric]")) return;

  renderHomeCreationMetric();
  fetch("./assets/data/nexus-history.csv", { cache: "no-store" })
    .then((response) => response.text())
    .then((text) => renderHomeNexusMetrics(parseDashboardCSV(text)))
    .catch(() => {
      const mods = data.mods || [];
      const creations = data.creations || [];
      const downloads = mods.reduce((sum, mod) => sum + dashboardNumber(mod.downloads), 0);
      const likes = mods.reduce((sum, mod) => sum + dashboardNumber(mod.endorsements), 0);
      const creationDownloads = creations.reduce((sum, item) => sum + dashboardNumber(item.downloads), 0);
      const creationLikes = creations.reduce((sum, item) => sum + dashboardNumber(item.likes), 0);
      const creationCount = creations.filter((item) => dashboardNumber(item.downloads) > 0).length;
      setHomeMetric("downloads", downloads + creationDownloads);
      setHomeMetric("likes", likes + creationLikes);
      setHomeMetric("mods", mods.length + creationCount);
    });
}

function dashboardSeries(rows, selectedMod, metric) {
  const values = new Map();
  rows
    .filter((row) => selectedMod === "all" || row.mod_id === selectedMod)
    .forEach((row) => {
      values.set(row.date, (values.get(row.date) || 0) + dashboardNumber(row[metric]));
    });
  return [...values.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderDashboardSummary(rows) {
  const target = document.querySelector("[data-dashboard-summary]");
  if (!target) return;

  const latest = latestDashboardRows(rows);
  const totals = latest.reduce(
    (sum, row) => {
      sum.mods += 1;
      sum.daily += dashboardNumber(row.daily_downloads);
      sum.total += dashboardNumber(row.total_downloads);
      sum.unique += dashboardNumber(row.unique_downloads);
      sum.likes += dashboardNumber(row.likes);
      return sum;
    },
    { mods: 0, daily: 0, total: 0, unique: 0, likes: 0 }
  );

  target.innerHTML = [
    ["Tracked Mods", totals.mods],
    ["Daily Downloads", totals.daily],
    ["Total Downloads", totals.total],
    ["Endorsements", totals.likes]
  ].map(([label, value]) => `
    <article class="dashboard-stat">
      <span>${label}</span>
      <strong>${numberFormatter.format(value)}</strong>
    </article>
  `).join("");
}

function renderDashboardTable(rows) {
  const target = document.querySelector("[data-dashboard-table]");
  const updated = document.querySelector("[data-dashboard-updated]");
  if (!target) return;

  const latest = latestDashboardRows(rows);
  target.innerHTML = latest.map((row) => `
    <tr>
      <td><a href="${row.mod_url}" target="_blank" rel="noopener">${row.mod_name}</a></td>
      <td>${numberFormatter.format(dashboardNumber(row.daily_downloads))}</td>
      <td>${numberFormatter.format(dashboardNumber(row.total_downloads))}</td>
      <td>${numberFormatter.format(dashboardNumber(row.unique_downloads))}</td>
      <td>${numberFormatter.format(dashboardNumber(row.likes))}</td>
    </tr>
  `).join("");

  const dates = rows.map((row) => row.date).sort();
  if (updated && dates.length) updated.textContent = `Updated ${dates.at(-1)}`;
}

function renderDashboardChart(rows) {
  const chart = document.querySelector("[data-dashboard-chart]");
  const modSelect = document.querySelector("[data-dashboard-mod]");
  const metricSelect = document.querySelector("[data-dashboard-metric]");
  if (!chart || !modSelect || !metricSelect) return;

  const series = dashboardSeries(rows, modSelect.value || "all", metricSelect.value || "daily_downloads");
  if (!series.length) {
    chart.innerHTML = '<p class="section-desc">No Nexus data available yet.</p>';
    return;
  }

  const width = 900;
  const height = 280;
  const pad = { top: 18, right: 22, bottom: 38, left: 62 };
  const max = Math.max(1, ...series.map(([, value]) => value));
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(1, series.length - 1);
  const y = (value) => height - pad.bottom - (value * (height - pad.top - pad.bottom)) / max;
  const points = series.map(([, value], index) => `${x(index)},${y(value)}`).join(" ");
  const grid = [0, .25, .5, .75, 1].map((ratio) => {
    const yy = pad.top + ratio * (height - pad.top - pad.bottom);
    const label = Math.round(max * (1 - ratio));
    return `<line class="dash-grid" x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}"></line>
      <text x="12" y="${yy + 4}">${numberFormatter.format(label)}</text>`;
  }).join("");
  const labels = series.map(([date], index) => {
    if (index !== 0 && index !== series.length - 1) return "";
    return `<text class="dash-date" x="${x(index)}" y="${height - 12}" text-anchor="${index === 0 ? "start" : "end"}">${date.slice(5)}</text>`;
  }).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Nexus trend chart">
      ${grid}
      <polyline class="dash-line" points="${points}"></polyline>
      ${series.map(([date, value], index) => `<circle class="dash-dot" cx="${x(index)}" cy="${y(value)}" r="4"><title>${date}: ${numberFormatter.format(value)}</title></circle>`).join("")}
      ${labels}
    </svg>
  `;
}

function setupNexusDashboard() {
  const dashboard = document.querySelector("[data-nexus-dashboard]");
  if (!dashboard) return;

  fetch("./assets/data/nexus-history.csv", { cache: "no-store" })
    .then((response) => response.text())
    .then((text) => {
      const rows = parseDashboardCSV(text);
      const modSelect = document.querySelector("[data-dashboard-mod]");
      if (modSelect) {
        const mods = latestDashboardRows(rows);
        modSelect.innerHTML = '<option value="all">All releases</option>' + mods
          .map((row) => `<option value="${row.mod_id}">${row.mod_name}</option>`)
          .join("");
        modSelect.addEventListener("change", () => renderDashboardChart(rows));
      }
      document.querySelector("[data-dashboard-metric]")?.addEventListener("change", () => renderDashboardChart(rows));
      renderDashboardSummary(rows);
      renderDashboardTable(rows);
      renderDashboardChart(rows);
      renderHomeNexusMetrics(rows);
    })
    .catch(() => {
      dashboard.querySelector("[data-dashboard-chart]").innerHTML = '<p class="section-desc">Nexus dashboard data could not be loaded.</p>';
    });
}

function setupCreationsDashboard() {
  const dashboard = document.querySelector("[data-platform-panel='creations']");
  if (!dashboard) return;

  const creations = data.creations || [];
  const confirmedCreations = creations.filter((item) =>
    ["likes", "downloads", "plays", "libraryAdds"].some((key) => dashboardNumber(item[key]) > 0)
  );
  const summary = document.querySelector("[data-creations-summary]");
  const table = document.querySelector("[data-creations-table]");
  const ranking = document.querySelector("[data-creations-ranking]");
  const rankingMetric = document.querySelector("[data-creations-ranking-metric]");
  const totals = creations.reduce(
    (sum, item) => {
      sum.likes += dashboardNumber(item.likes);
      sum.downloads += dashboardNumber(item.downloads);
      sum.plays += dashboardNumber(item.plays);
      sum.libraryAdds += dashboardNumber(item.libraryAdds);
      return sum;
    },
    { likes: 0, downloads: 0, plays: 0, libraryAdds: 0 }
  );

  if (summary) {
    summary.innerHTML = [
      ["Likes", totals.likes],
      ["Downloads", totals.downloads],
      ["Plays", totals.plays],
      ["Library Adds", totals.libraryAdds]
    ].map(([label, value]) => `
      <article class="dashboard-stat">
        <span>${label}</span>
        <strong>${numberFormatter.format(value)}</strong>
      </article>
    `).join("");
  }

  if (table) {
    table.innerHTML = confirmedCreations.map((item) => `
      <tr>
        <td><a href="${item.links?.[0]?.url || "#"}" target="_blank" rel="noopener">${item.title}</a></td>
        <td>${metricDisplay(item.likes)}</td>
        <td>${metricDisplay(item.downloads)}</td>
        <td>${metricDisplay(item.plays)}</td>
        <td>${metricDisplay(item.libraryAdds)}</td>
      </tr>
    `).join("");
  }

  if (ranking) {
    const labels = {
      likes: "Most Liked",
      downloads: "Most Downloaded",
      plays: "Most Played",
      libraryAdds: "Most Added"
    };

    function renderRanking() {
      const key = rankingMetric?.value || "likes";
      const rows = [...confirmedCreations]
        .filter((item) => dashboardNumber(item[key]) > 0)
        .sort((a, b) => dashboardNumber(b[key]) - dashboardNumber(a[key]))
        .slice(0, 10);
      const max = Math.max(1, ...rows.map((item) => dashboardNumber(item[key])));

      ranking.innerHTML = `
        <article class="ranking-card">
          <h4>${labels[key]}</h4>
          <div class="creation-bars">
            ${rows.map((item) => {
              const value = dashboardNumber(item[key]);
              const width = Math.max(5, (value / max) * 100);
              return `
                <div class="creation-bar">
                  <div class="creation-bar-head">
                    <span>${item.title}</span>
                    <strong>${numberFormatter.format(value)}</strong>
                  </div>
                  <div class="creation-bar-track">
                    <span style="width: ${width}%"></span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </article>
      `;
    }

    rankingMetric?.addEventListener("change", renderRanking);
    renderRanking();
  }
}

renderFeaturedMod();
renderFeaturedVideo();
renderLatestNotes();
renderNotesPage();
renderNotesTimeline();
renderNoteDetail();
renderMods("[data-home-mods]", { excludeFeatured: true, limit: 3 });
renderMods("[data-all-mods]");
renderCreations();
renderGallery("[data-home-gallery]", { source: "featured", loop: true });
renderGallery("[data-all-gallery]");
renderSocials();
setupNav();
setupPlatformTabs();
if (document.querySelector("[data-message-pagination]")) {
  setupMessagePagination();
} else {
  renderMessages(document.body.dataset.page === "home" ? 8 : undefined);
}
setupFilters();
setupGalleryModal();
setupMessageForm();
setupNexusDashboard();
setupCreationsDashboard();
setupHomeMetrics();
setupAutoScroll("[data-home-gallery]", { axis: "x", step: 1, interval: 18 });
setupAutoScroll("body[data-page='home'] [data-message-list]", { axis: "y", step: 1, interval: 38 });



