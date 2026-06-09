const data = window.siteData || {};

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
        <div class="mod-author">TownGG</div>
        <div class="mod-category-line">${mod.group}</div>
        <p class="card-desc">${mod.description}</p>
        <div class="mod-tags">${tagList(mod.tags)}</div>
      </div>
      <div class="stats">
        <span title="Endorsements"><span class="stat-icon">★</span>${mod.endorsements}</span>
        <span title="Downloads"><span class="stat-icon">↓</span>${mod.downloads}</span>
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

function renderMods(selector, options = {}) {
  const target = document.querySelector(selector);
  if (!target) return;

  let mods = data.mods || [];
  if (options.featuredOnly) mods = mods.filter((mod) => mod.group === "Featured");
  if (options.excludeFeatured) mods = mods.slice(1);
  if (options.limit) mods = mods.slice(0, options.limit);

  target.innerHTML = mods.map(modCard).join("");
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
      <div class="mod-tags">${tagList(mod.tags)}</div>
      <div class="stats">
        <span title="Downloads"><span class="stat-icon">↓</span>${mod.downloads}</span>
        <span title="Endorsements"><span class="stat-icon">★</span>${mod.endorsements}</span>
      </div>
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
      const attr = itemType === "gallery" ? "category" : "group";
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

renderFeaturedMod();
renderMods("[data-home-mods]", { excludeFeatured: true, limit: 3 });
renderMods("[data-all-mods]");
renderGallery("[data-home-gallery]", { source: "featured", loop: true });
renderGallery("[data-all-gallery]");
renderSocials();
if (document.querySelector("[data-message-pagination]")) {
  setupMessagePagination();
} else {
  renderMessages(document.body.dataset.page === "home" ? 8 : undefined);
}
setupFilters();
setupGalleryModal();
setupMessageForm();
setupAutoScroll("[data-home-gallery]", { axis: "x", step: 1, interval: 18 });
setupAutoScroll("body[data-page='home'] [data-message-list]", { axis: "y", step: 1, interval: 38 });
