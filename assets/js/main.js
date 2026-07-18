const data = window.siteData || {};
let creatorNotes = [];
let creatorNotesMeta = {};
let siteVersion = "";
const gallerySources = {
  featured: data.featuredArtworks || [],
  concept: data.artworks || [],
  screenshots: []
};

function dataUrl(path) {
  const version = siteVersion || Date.now();
  return `${path}?v=${encodeURIComponent(version)}`;
}

async function fetchJsonData(path, fallback) {
  try {
    const response = await fetch(dataUrl(path), { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

async function checkSiteVersion() {
  try {
    const response = await fetch(`./assets/data/site-version.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load site version");
    const versionData = await response.json();
    siteVersion = versionData.version || "";

    const stored = localStorage.getItem("townggSiteVersion");
    const reloadKey = `townggVersionReloaded:${siteVersion}`;
    if (stored && siteVersion && stored !== siteVersion && !sessionStorage.getItem(reloadKey)) {
      localStorage.setItem("townggSiteVersion", siteVersion);
      sessionStorage.setItem(reloadKey, "true");
      const url = new URL(window.location.href);
      url.searchParams.set("v", siteVersion);
      window.location.replace(url.toString());
      return false;
    }

    if (siteVersion) localStorage.setItem("townggSiteVersion", siteVersion);
  } catch (error) {
    console.warn(error);
  }

  return true;
}

async function loadDynamicData() {
  [creatorNotes, creatorNotesMeta, gallerySources.concept, gallerySources.screenshots] = await Promise.all([
    fetchJsonData("./assets/data/personal-logs.json", []),
    fetchJsonData("./assets/data/personal-logs-meta.json", {}),
    fetchJsonData("./assets/data/gallery-concept-art.json", gallerySources.concept),
    fetchJsonData("./assets/data/gallery-screenshots.json", [])
  ]);
}

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
  prepareMotionItems(list, ".note-card");

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
  prepareMotionItems(target, ".timeline-item");
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
    target.innerHTML = "<h1>Log not found</h1><p>This Personal Log does not exist yet.</p>";
    return;
  }

  document.title = `${note.title} | TownGG Personal Logs`;
  target.innerHTML = `
    <a class="note-back" href="./dev-log.html">Back to Personal Logs</a>
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
  if (selector === "[data-all-mods]") prepareMotionItems(target, ".project-card");
}


function renderCreations() {
  const target = document.querySelector("[data-creations-mods]");
  if (!target) return;

  target.innerHTML = (data.creations || [])
    .filter((item) => item.image && dashboardNumber(item.downloads) > 0)
    .map(creationCard)
    .join("");
  prepareMotionItems(target, ".project-card");
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

  const source = options.source === "featured" ? "featured" : options.source || "concept";
  let artworks = gallerySources[source] || [];
  if (options.limit) artworks = artworks.slice(0, options.limit);

  target.dataset.gallerySource = source;

  if (!artworks.length && options.emptyState) {
    target.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" role="img">
            <rect x="9" y="12" width="30" height="24" rx="4"></rect>
            <circle cx="24" cy="24" r="5"></circle>
            <path d="M16 12l3-5h10l3 5"></path>
          </svg>
        </div>
        <h3>No images yet</h3>
        <p>In-game screenshots will be added here soon.</p>
      </div>
    `;
    return;
  }

  if (options.twoRows) {
    const rows = [[], []];
    artworks.forEach((art, index) => {
      rows[index % 2].push({ art, index });
    });

    target.innerHTML = rows.map((row, rowIndex) => {
      const cards = row.map((item) => artworkCard(item.art, item.index)).join("");
      return `
        <div class="gallery-track${rowIndex === 1 ? " gallery-track-offset" : ""}">
          ${options.loop ? cards + cards : cards}
        </div>
      `;
    }).join("");
  } else {
    const cards = artworks.map(artworkCard).join("");
    target.innerHTML = options.loop ? cards + cards : cards;
  }

  target.querySelectorAll("[data-art-index]").forEach((button) => {
    button.dataset.artSource = source;
  });
  if (selector === "[data-all-gallery]") prepareMotionItems(target, ".gallery-card");
}

function setupGalleryTabs() {
  const tabs = document.querySelectorAll("[data-gallery-tab]");
  const target = document.querySelector("[data-all-gallery]");
  if (!tabs.length || !target) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const source = tab.dataset.galleryTab;
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });
      renderGallery("[data-all-gallery]", { source, emptyState: source === "screenshots" });
    });
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

  function scrollToPlatformStart(panel) {
    const controlBar = panel?.querySelector(".mods-control-bar");
    const projectList = panel?.querySelector(".projects");
    if (!controlBar || !projectList) return;

    const stickyTop = parseFloat(getComputedStyle(controlBar).top) || 0;
    const listTop = projectList.getBoundingClientRect().top + window.scrollY;
    const targetTop = listTop - stickyTop - controlBar.offsetHeight - 24;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(window.scrollX, Math.max(0, targetTop));
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const platform = tab.dataset.platformTab;
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.platformPanel === platform;
        panel.classList.toggle("is-active", isActive);
        if (isActive && document.documentElement.classList.contains("motion-ready")) {
          panel.classList.remove("is-panel-entering");
          void panel.offsetWidth;
          panel.classList.add("is-panel-entering");
        }
      });
      document.querySelectorAll("[data-filter-target-current]").forEach((modsFilter) => applyFilter(modsFilter, "All"));
      const activePanel = document.querySelector(`[data-platform-panel="${platform}"]`);
      requestAnimationFrame(() => scrollToPlatformStart(activePanel));
    });
  });
}

function currentModsFilterTarget() {
  const activePanel = document.querySelector("[data-platform-panel].is-active");
  return activePanel?.dataset.platformPanel === "creations" ? "[data-creations-mods]" : "[data-all-mods]";
}

function applyFilter(group, value) {
  const targetSelector = group.hasAttribute("data-filter-target-current")
    ? currentModsFilterTarget()
    : group.dataset.filterTarget;
  const itemType = group.dataset.filterGroup;
  const target = document.querySelector(targetSelector);
  if (!target) return;

  group.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.filter === value);
  });

  const attr = itemType === "gallery" || itemType === "notes" ? "category" : "group";
  target.querySelectorAll(`[data-${attr}]`).forEach((card) => {
    const isVisible = value === "All" || card.dataset[attr] === value;
    card.style.display = isVisible ? "" : "none";
    if (isVisible && document.documentElement.classList.contains("motion-ready")) {
      card.classList.remove("is-filter-entering");
      void card.offsetWidth;
      card.classList.add("is-filter-entering");
    }
  });
}

function setupFilters() {
  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    const menuToggle = group.querySelector("[data-mobile-filter-toggle]");
    const menu = group.querySelector(".mobile-filter-menu");

    if (menuToggle && menu) {
      menuToggle.addEventListener("click", () => {
        const isOpen = group.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;

      applyFilter(group, button.dataset.filter);
      document.querySelectorAll("[data-filter-target-current]").forEach((modsFilter) => {
        if (modsFilter !== group) applyFilter(modsFilter, button.dataset.filter);
      });
      group.classList.remove("is-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".mods-filter-control.is-open").forEach((group) => {
      if (group.contains(event.target)) return;
      group.classList.remove("is-open");
      group.querySelector("[data-mobile-filter-toggle]")?.setAttribute("aria-expanded", "false");
    });
  });
}

function setupStickyToolbars() {
  const bars = document.querySelectorAll(".mods-control-bar");
  if (!bars.length) return;

  function update() {
    bars.forEach((bar) => {
      const top = parseFloat(getComputedStyle(bar).top) || 0;
      bar.classList.toggle("is-stuck", bar.getBoundingClientRect().top <= top + 1);
    });
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function setupGalleryModal() {
  const modal = document.querySelector("[data-gallery-modal]");
  if (!modal) return;

  const image = modal.querySelector("[data-modal-image]");
  const close = modal.querySelector("[data-modal-close]");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-art-index]");
    if (!trigger) return;

    const list = gallerySources[trigger.dataset.artSource] || [];
    const art = list[Number(trigger.dataset.artIndex)];
    if (!art) return;

    image.src = art.image;
    image.alt = art.alt;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  });

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
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

function syncNexusModsFromRows(rows) {
  latestDashboardRows(rows).forEach((row) => {
    const mod = (data.mods || []).find((item) =>
      (item.links || []).some((link) => String(link.url).includes(`/mods/${row.mod_id}`))
    );
    if (!mod) return;
    mod.downloads = numberFormatter.format(dashboardNumber(row.total_downloads));
    mod.endorsements = numberFormatter.format(dashboardNumber(row.likes));
  });

  renderFeaturedMod();
  renderMods("[data-home-mods]", { excludeFeatured: true, limit: 3 });
  renderMods("[data-all-mods]");
  document.querySelectorAll("[data-filter-target-current]").forEach((modsFilter) => {
    const activeFilter = modsFilter.querySelector("[data-filter].is-active")?.dataset.filter || "All";
    applyFilter(modsFilter, activeFilter);
  });
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
  if (!target) return;

  const endValue = Math.max(0, dashboardNumber(value));
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof window.requestAnimationFrame !== "function") {
    target.textContent = formatCompactNumber(endValue);
    return;
  }

  if (target._metricAnimationFrame) {
    window.cancelAnimationFrame(target._metricAnimationFrame);
  }

  const startValue = dashboardNumber(target.dataset.metricValue);
  const startedAt = performance.now();
  const duration = 900;
  target.dataset.metricValue = String(endValue);

  const update = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (endValue - startValue) * eased);
    target.textContent = formatCompactNumber(currentValue);

    if (progress < 1) {
      target._metricAnimationFrame = window.requestAnimationFrame(update);
    } else {
      target.textContent = formatCompactNumber(endValue);
      target._metricAnimationFrame = null;
    }
  };

  target._metricAnimationFrame = window.requestAnimationFrame(update);
}

function renderHomeCreationMetric() {
  const totalPlays = (data.creations || []).reduce((sum, item) => sum + dashboardNumber(item.plays), 0);
  setHomeMetric("plays", totalPlays);
}

function renderHomeNexusMetrics(rows) {
  syncNexusModsFromRows(rows);
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
  fetch(dataUrl("./assets/data/nexus-history.csv"), { cache: "no-store" })
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
    ["Unique Downloads", totals.unique],
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

  fetch(dataUrl("./assets/data/nexus-history.csv"), { cache: "no-store" })
    .then((response) => response.text())
    .then((text) => {
      const rows = parseDashboardCSV(text);
      syncNexusModsFromRows(rows);
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
    const renderRanking = (metric) => {
      const sorted = [...confirmedCreations]
        .sort((a, b) => dashboardNumber(b[metric]) - dashboardNumber(a[metric]))
        .slice(0, 8);
      ranking.innerHTML = sorted.map((item) => `
        <article class="creation-bar">
          <span>${item.title}</span>
          <strong>${metricDisplay(item[metric])}</strong>
        </article>
      `).join("");
      ranking.dataset.label = labels[metric] || "Ranking";
    };

    renderRanking(rankingMetric?.value || "likes");
    rankingMetric?.addEventListener("change", () => renderRanking(rankingMetric.value));
  }
}

function setupDiscussionEmbed() {
  const target = document.querySelector("[data-giscus]");
  if (!target) return;

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.dataset.repo = "TownGG/towngg-portfolio";
  script.dataset.repoId = "R_kgDOSgBRWw";
  script.dataset.category = "General";
  script.dataset.categoryId = "DIC_kwDOSgBRW84C-1ju";
  script.dataset.mapping = "pathname";
  script.dataset.strict = "0";
  script.dataset.reactionsEnabled = "1";
  script.dataset.emitMetadata = "1";
  script.dataset.inputPosition = "bottom";
  script.dataset.theme = "dark";
  script.dataset.lang = "zh-CN";
  script.dataset.loading = "lazy";
  script.crossOrigin = "anonymous";
  script.async = true;
  target.appendChild(script);
}

let motionRevealObserver = null;

function setupLowRiskMotion() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = document.querySelectorAll([
    ".section-header",
    ".featured-video",
    ".latest-notes",
    ".featured",
    "[data-home-mods]",
    "[data-home-gallery]",
    ".split",
    ".home-social-panel",
    ".dashboard-summary",
    ".dashboard-panel",
    ".mods-control-bar",
    ".gallery-tabs",
    ".note-filters",
    ".about-stack > .panel",
    ".telemetry-chart-panel"
  ].join(","));

  if (reduceMotion || typeof window.IntersectionObserver !== "function") return;

  revealTargets.forEach((target) => target.classList.add("motion-reveal"));

  motionRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      motionRevealObserver.unobserve(entry.target);
    });
  }, {
    rootMargin: "0px 0px -8%",
    threshold: .08
  });

  revealTargets.forEach((target) => motionRevealObserver.observe(target));

  const motionContainers = [
    [document.querySelector("[data-all-mods]"), ".project-card"],
    [document.querySelector("[data-creations-mods]"), ".project-card"],
    [document.querySelector("[data-all-gallery]"), ".gallery-card"],
    [document.querySelector("[data-notes-list]"), ".note-card"],
    [document.querySelector("[data-notes-timeline]"), ".timeline-item"],
    [document.querySelector(".tool-logos"), ".tool-logo"],
    [document.querySelector(".workflow"), ".workflow-card"],
    [document.querySelector("[data-site-telemetry-summary]"), ".telemetry-card"]
  ];

  motionContainers.forEach(([container, selector]) => {
    if (!container) return;
    prepareMotionItems(container, selector);
    const motionObserver = new MutationObserver(() => prepareMotionItems(container, selector));
    motionObserver.observe(container, { childList: true });
  });
}

function prepareMotionItems(container, selector) {
  if (!container || !document.documentElement.classList.contains("motion-ready")) return;
  container.querySelectorAll(selector).forEach((item, index) => {
    item.classList.add("motion-item");
    item.style.setProperty("--motion-delay", `${Math.min(index, 8) * 55}ms`);
    motionRevealObserver?.observe(item);
  });
}

function setupChartMotion() {
  if (!document.documentElement.classList.contains("motion-ready")) return;

  const decorate = (chart) => {
    const svg = chart.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".dash-line, .telemetry-line").forEach((line) => {
      line.setAttribute("pathLength", "1");
    });
    chart.classList.remove("motion-chart");
    void chart.offsetWidth;
    chart.classList.add("motion-chart");
  };

  document.querySelectorAll("[data-dashboard-chart], [data-creations-chart], [data-site-telemetry-chart]").forEach((chart) => {
    decorate(chart);
    const chartObserver = new MutationObserver(() => decorate(chart));
    chartObserver.observe(chart, { childList: true });
  });
}

function enableSiteMotion() {
  const supportedPage = document.body.dataset.page === "home"
    || document.body.dataset.page === "dev-log"
    || document.body.dataset.page === "about"
    || document.querySelector("[data-all-mods], [data-all-gallery]");
  if (!supportedPage) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof window.IntersectionObserver !== "function") return;
  document.documentElement.classList.add("motion-ready");
}

async function init() {
  const shouldContinue = await checkSiteVersion();
  if (!shouldContinue) return;
  await loadDynamicData();
  renderFeaturedVideo();
  renderLatestNotes();
  renderNotesPage();
  renderNotesTimeline();
  renderNoteDetail();
  renderFeaturedMod();
  renderMods("[data-home-mods]", { excludeFeatured: true, limit: 3 });
  renderMods("[data-all-mods]");
  renderCreations();
  renderGallery("[data-home-gallery]", { source: "featured", limit: 12, loop: true, twoRows: true });
  renderGallery("[data-all-gallery]", { source: "concept", emptyState: true });
  renderSocials();
  renderMessages(document.body.dataset.page === "home" ? 8 : undefined);
  setupMessagePagination();
  setupMessageForm();
  setupAutoScroll("[data-home-gallery]", { axis: "x", step: 1, interval: 28 });
  setupGalleryTabs();
  setupNav();
  setupFilters();
  setupPlatformTabs();
  setupStickyToolbars();
  setupGalleryModal();
  setupNexusDashboard();
  setupCreationsDashboard();
  setupDiscussionEmbed();
  setupLowRiskMotion();
  setupChartMotion();
}

enableSiteMotion();
init();
