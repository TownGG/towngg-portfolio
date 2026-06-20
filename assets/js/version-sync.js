(() => {
  const VERSION_URL = "./assets/data/site-version.json";
  const LOCK_PREFIX = "townggVersionSyncReloaded:";
  const LIVE_RELOAD_LOCK_PREFIX = "townggLiveDataReloaded:";
  const POLL_INTERVAL_MS = 60 * 1000;
  const LIVE_RELOAD_COOLDOWN_MS = 45 * 1000;
  const MESSAGE_BOARD_LATEST_KEY = "townggMessageBoardLatestCount";
  const MESSAGE_BOARD_READ_KEY = "townggMessageBoardReadCount";
  const MESSAGE_BOARD_TERM = "/message-board.html";
  const MESSAGE_BOARD_DISCUSSION_SEARCH_URL = "https://github.com/TownGG/towngg-portfolio/discussions?discussions_q=message-board";
  const MESSAGE_BOARD_DISCUSSIONS_URL = "https://github.com/TownGG/towngg-portfolio/discussions/categories/general";
  const WATCHED_FILES = [
    "./assets/js/site-data.js",
    "./assets/js/version-sync.js",
    "./assets/data/site-version.json",
    "./assets/data/creations-history.csv",
    "./assets/data/creations-mod-daily.csv",
    "./assets/data/nexus-history.csv",
    "./assets/data/nexus-latest.json"
  ];
  const liveSignatures = new Map();
  let liveChecking = false;
  let reloading = false;
  let messageBadgeProbeStarted = false;

  function normalizeVersion(value) {
    return String(value || "").replace(/^v/i, "").replace(/-preview$/i, "").trim();
  }

  function currentAssetVersions() {
    return [...document.querySelectorAll('link[href*="?v="], script[src*="?v="]')]
      .map((element) => element.href || element.src || "")
      .map((url) => new URL(url, window.location.href).searchParams.get("v"))
      .filter(Boolean);
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function cacheBustedUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}t=${Date.now()}`;
  }

  async function fileSignature(path) {
    const response = await fetch(cacheBustedUrl(path), { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    const etag = response.headers.get("etag") || "";
    const modified = response.headers.get("last-modified") || "";
    return `${etag}|${modified}|${text.length}|${hashText(text)}`;
  }

  function reloadOnce(key) {
    if (reloading) return;
    reloading = true;
    sessionStorage.setItem(key, "1");
    location.reload();
  }

  function canLiveReload(lockKey) {
    const lastReload = Number(sessionStorage.getItem(lockKey) || 0);
    return !lastReload || Date.now() - lastReload > LIVE_RELOAD_COOLDOWN_MS;
  }

  function liveReload(reason) {
    const lockKey = `${LIVE_RELOAD_LOCK_PREFIX}${location.pathname}`;
    if (reloading || !canLiveReload(lockKey)) return;
    reloading = true;
    sessionStorage.setItem(lockKey, String(Date.now()));
    console.info(`[TownGG] Site data changed: ${reason}. Reloading page.`);
    location.reload();
  }

  function ensureAdminNavEntry() {
    document.querySelectorAll(".nav-links").forEach((nav) => {
      if (nav.querySelector('a[href="./admin-upload.html"]')) return;
      const about = nav.querySelector('a[href="./about.html"]');
      if (!about) return;
      const admin = document.createElement("a");
      admin.href = "./admin-upload.html";
      admin.textContent = "Admin";
      admin.setAttribute("data-admin-nav", "true");
      about.insertAdjacentElement("afterend", admin);
    });
  }

  function injectMessageBoardAdminTab() {
    if (document.body?.dataset.page !== "admin-upload") return;
    const switcher = document.querySelector(".admin-module-switcher");
    const tabs = document.querySelector(".admin-module-tabs");
    const content = document.querySelector(".admin-module-content");
    if (!switcher || !tabs || !content) return;

    if (!document.getElementById("admin-module-message-board")) {
      const input = document.createElement("input");
      input.className = "admin-module-radio";
      input.type = "radio";
      input.name = "admin-module";
      input.id = "admin-module-message-board";
      const communityInput = document.getElementById("admin-module-community");
      if (communityInput) communityInput.insertAdjacentElement("afterend", input);
      else switcher.insertBefore(input, tabs);
    }

    if (!tabs.querySelector('label[for="admin-module-message-board"]')) {
      const label = document.createElement("label");
      label.className = "admin-module-tab";
      label.htmlFor = "admin-module-message-board";
      label.setAttribute("role", "tab");
      label.textContent = "Message Board";
      tabs.appendChild(label);
    }

    if (!content.querySelector(".admin-module-message-board")) {
      const panel = document.createElement("div");
      panel.className = "admin-module-panel admin-module-message-board";
      panel.innerHTML = `
        <section class="admin-card panel message-board-admin-panel" data-message-board-moderation>
          <div class="admin-card-header">
            <div>
              <div class="eyebrow">Message Board</div>
              <h2>Message Board Management</h2>
              <p class="admin-subtitle">Manage public Giscus / GitHub Discussions messages from the admin area.</p>
            </div>
            <span class="admin-status-pill">GitHub Discussions</span>
          </div>
          <div class="admin-actions" style="flex-wrap: wrap;">
            <a class="button primary" href="${MESSAGE_BOARD_DISCUSSION_SEARCH_URL}" target="_blank" rel="noopener">Open Message Board Discussion</a>
            <a class="button" href="${MESSAGE_BOARD_DISCUSSIONS_URL}" target="_blank" rel="noopener">All General Discussions</a>
          </div>
          <div class="message-board-admin-list">
            <article class="message-board-admin-item">
              <strong>Current safe management mode</strong>
              <p>Deletion is handled in GitHub Discussions so your GitHub moderation permission is not exposed in frontend code.</p>
              <div class="admin-actions">
                <a class="button" href="${MESSAGE_BOARD_DISCUSSION_SEARCH_URL}" target="_blank" rel="noopener">Review / Delete in GitHub</a>
              </div>
            </article>
          </div>
          <small class="message-board-admin-note">Next upgrade can add an internal comment list and delete buttons through the Cloudflare Worker after the GitHub token has Discussions write permission.</small>
        </section>
      `;
      content.appendChild(panel);
    }
  }

  function isMessageBoardPage() {
    return document.body?.dataset.page === "message-board" || location.pathname.endsWith("/message-board.html");
  }

  function messageBoardLinks() {
    return [...document.querySelectorAll('.nav-links a[href$="message-board.html"]')];
  }

  function injectMessageBoardBadgeStyle() {
    if (document.getElementById("message-board-badge-style")) return;
    const style = document.createElement("style");
    style.id = "message-board-badge-style";
    style.textContent = `
      .nav-links a[data-message-board-nav] { position: relative; }
      .nav-links a[data-message-board-nav].has-unread::after {
        content: "";
        position: absolute;
        top: 7px;
        right: 7px;
        width: 8px;
        height: 8px;
        border: 2px solid rgba(7, 11, 18, .92);
        border-radius: 999px;
        background: #ff3b4f;
        box-shadow: 0 0 10px rgba(255, 59, 79, .82), 0 0 18px rgba(255, 59, 79, .4);
      }
    `;
    document.head.appendChild(style);
  }

  function setMessageBoardBadge(isVisible) {
    messageBoardLinks().forEach((link) => {
      link.dataset.messageBoardNav = "true";
      link.classList.toggle("has-unread", Boolean(isVisible));
      link.setAttribute("aria-label", isVisible ? "Message Board, new messages" : "Message Board");
    });
  }

  function getStoredMessageCount(key) {
    const value = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function refreshMessageBoardBadge() {
    const latest = getStoredMessageCount(MESSAGE_BOARD_LATEST_KEY);
    const read = getStoredMessageCount(MESSAGE_BOARD_READ_KEY);
    setMessageBoardBadge(!isMessageBoardPage() && latest > read);
  }

  function acknowledgeMessageBoard(count) {
    const latest = Math.max(count || 0, getStoredMessageCount(MESSAGE_BOARD_LATEST_KEY));
    localStorage.setItem(MESSAGE_BOARD_LATEST_KEY, String(latest));
    localStorage.setItem(MESSAGE_BOARD_READ_KEY, String(latest));
    setMessageBoardBadge(false);
  }

  function isMessageBoardDiscussion(discussion = {}) {
    const title = String(discussion.title || discussion.term || "").toLowerCase();
    const url = String(discussion.url || "").toLowerCase();
    return title.includes("message-board") || title.includes("message board") || url.includes("message-board");
  }

  function discussionMessageCount(discussion = {}) {
    const values = [discussion.totalCommentCount, discussion.totalReplyCount, discussion.comments?.totalCount, discussion.replies?.totalCount]
      .map((value) => Number(value))
      .filter(Number.isFinite);
    return Math.max(0, ...values, 0);
  }

  function handleGiscusMetadata(event) {
    if (event.origin !== "https://giscus.app") return;
    const giscus = event.data?.giscus;
    if (!giscus?.discussion) return;
    const discussion = giscus.discussion;
    if (!isMessageBoardPage() && !isMessageBoardDiscussion(discussion)) return;
    const count = discussionMessageCount(discussion);
    const latest = getStoredMessageCount(MESSAGE_BOARD_LATEST_KEY);
    const read = getStoredMessageCount(MESSAGE_BOARD_READ_KEY);
    localStorage.setItem(MESSAGE_BOARD_LATEST_KEY, String(Math.max(latest, count)));
    if (isMessageBoardPage()) {
      acknowledgeMessageBoard(count);
      return;
    }
    if (!read) {
      localStorage.setItem(MESSAGE_BOARD_READ_KEY, String(count));
      setMessageBoardBadge(false);
      return;
    }
    setMessageBoardBadge(count > read);
  }

  function startMessageBoardProbe() {
    if (messageBadgeProbeStarted || isMessageBoardPage()) return;
    messageBadgeProbeStarted = true;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none;opacity:0;";
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.dataset.repo = "TownGG/towngg-portfolio";
    script.dataset.repoId = "R_kgDOSgBRWw";
    script.dataset.category = "General";
    script.dataset.categoryId = "DIC_kwDOSgBRW84C-1ju";
    script.dataset.mapping = "specific";
    script.dataset.term = MESSAGE_BOARD_TERM;
    script.dataset.strict = "0";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "1";
    script.dataset.inputPosition = "bottom";
    script.dataset.theme = "dark";
    script.dataset.lang = "zh-CN";
    script.dataset.loading = "lazy";
    script.crossOrigin = "anonymous";
    script.async = true;
    probe.appendChild(script);
    document.body.appendChild(probe);
  }

  function setupMessageBoardBadge() {
    injectMessageBoardBadgeStyle();
    messageBoardLinks().forEach((link) => {
      link.dataset.messageBoardNav = "true";
      link.addEventListener("click", () => acknowledgeMessageBoard());
    });
    refreshMessageBoardBadge();
    window.addEventListener("message", handleGiscusMetadata);
    window.setTimeout(startMessageBoardProbe, 1200);
    if (isMessageBoardPage()) acknowledgeMessageBoard();
  }

  async function syncVersion() {
    ensureAdminNavEntry();
    injectMessageBoardAdminTab();
    setupMessageBoardBadge();
    try {
      const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const version = normalizeVersion(data.version);
      if (!version) return;
      const versions = currentAssetVersions();
      const hasOutdatedAsset = versions.some((item) => item !== version);
      const lockKey = `${LOCK_PREFIX}${version}:${location.pathname}`;
      const alreadyReloaded = localStorage.getItem(lockKey) === "1";
      localStorage.setItem("townggSiteVersion", data.version || `v${version}-preview`);
      document.querySelectorAll("[data-site-version]").forEach((node) => {
        node.textContent = `Version ${data.version || `v${version}-preview`}`;
      });
      if (hasOutdatedAsset && !alreadyReloaded) {
        localStorage.setItem(lockKey, "1");
        reloadOnce(lockKey);
      }
    } catch (error) {
      console.warn("Version sync skipped", error);
    }
  }

  async function checkLiveDataChanges() {
    if (liveChecking || reloading) return;
    liveChecking = true;
    try {
      for (const path of WATCHED_FILES) {
        const signature = await fileSignature(path);
        if (!signature) continue;
        const previous = liveSignatures.get(path);
        if (previous && previous !== signature) {
          liveReload(path);
          return;
        }
        liveSignatures.set(path, signature);
      }
    } catch (error) {
      console.warn("Live data refresh skipped", error);
    } finally {
      liveChecking = false;
    }
  }

  function startLiveDataRefresh() {
    checkLiveDataChanges();
    window.setTimeout(checkLiveDataChanges, 30 * 1000);
    window.setInterval(checkLiveDataChanges, POLL_INTERVAL_MS);
    window.addEventListener("focus", checkLiveDataChanges);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkLiveDataChanges();
    });
  }

  syncVersion();
  startLiveDataRefresh();
})();