(() => {
  const LIST_ENDPOINT = "/api/admin/community-list";
  const SAVE_ENDPOINT = "/api/admin/community-save";
  const DELETE_ENDPOINT = "/api/admin/community-delete";
  const DRAFT_ENDPOINT = "/api/admin/community-draft";
  const STORAGE_KEY = "towngg_admin_upload_key";
  const LAST_MOD_KEY = "towngg_community_last_mod";
  const LAST_PLATFORM_KEY = "towngg_community_last_platform";

  const root = document.querySelector("[data-community-ops]");
  if (!root) return;

  root.innerHTML = `
    <div class="community-quick-shell">
      <div class="community-ops-toolbar community-quick-toolbar">
        <div class="community-ops-title">
          <div class="eyebrow">TownGG Quick Reply</div>
          <h2>Community Ops</h2>
          <p>Paste a player comment, generate a Chinese reading note and a safe English reply, then paste the copied reply back on Nexus or Reddit.</p>
        </div>
        <div class="community-ops-actions">
          <button class="button primary" type="button" data-community-generate-main>Generate Reply</button>
          <button class="button" type="button" data-community-clear-main>Clear</button>
          <button class="button" type="button" data-community-refresh>Load History</button>
        </div>
      </div>

      <div class="community-quick-layout">
        <section class="community-quick-input">
          <div class="community-quick-meta">
            <label class="admin-field">
              <span>Platform</span>
              <select data-community-platform>
                <option value="nexus">Nexus Mods</option>
                <option value="reddit">Reddit</option>
              </select>
            </label>
            <label class="admin-field">
              <span>Mod Name</span>
              <input type="text" data-community-mod placeholder="Cassilia's Power Fist">
            </label>
          </div>
          <label class="admin-field community-comment-field">
            <span>Player Comment</span>
            <textarea data-community-raw placeholder="Paste the player comment here..."></textarea>
          </label>
          <div class="community-editor-actions">
            <button class="button primary" type="button" data-community-generate-main>Generate Reply</button>
            <button class="button" type="button" data-community-clear-main>Clear</button>
            <span class="community-status-line" data-community-status>Ready.</span>
          </div>
        </section>

        <section class="community-quick-result" data-community-result>
          <div class="community-detail-empty">
            <div>
              <div class="eyebrow">AI Result</div>
              <h2>Paste a comment</h2>
              <p>The English reply will be copied automatically after generation.</p>
            </div>
          </div>
        </section>
      </div>

      <section class="community-history-panel">
        <div class="community-history-header">
          <div>
            <div class="eyebrow">History</div>
            <h2>Saved Player Comments</h2>
            <p>Tick Featured to show a comment in the homepage Player Voices section.</p>
          </div>
          <span data-community-count>0 comments</span>
        </div>
        <div class="community-history-list" data-community-history>
          <div class="empty-state">History is not loaded yet.</div>
        </div>
      </section>
    </div>
  `;

  const platformInput = root.querySelector("[data-community-platform]");
  const modInput = root.querySelector("[data-community-mod]");
  const rawInput = root.querySelector("[data-community-raw]");
  const resultBox = root.querySelector("[data-community-result]");
  const statusLine = root.querySelector("[data-community-status]");
  const historyList = root.querySelector("[data-community-history]");
  const countLabel = root.querySelector("[data-community-count]");
  const generateButtons = root.querySelectorAll("[data-community-generate-main]");
  const clearButtons = root.querySelectorAll("[data-community-clear-main]");
  const refreshButton = root.querySelector("[data-community-refresh]");

  let messages = [];
  let selectedId = "";

  try {
    const lastMod = localStorage.getItem(LAST_MOD_KEY) || "";
    const lastPlatform = localStorage.getItem(LAST_PLATFORM_KEY) || "nexus";
    if (modInput) modInput.value = lastMod;
    if (platformInput) platformInput.value = lastPlatform;
  } catch (error) {}

  const getAdminKey = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  };

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const platformLabel = (platform) => platform === "reddit" ? "REDDIT" : "NEXUS";

  const setStatus = (message, type = "idle") => {
    if (!statusLine) return;
    statusLine.textContent = message || "";
    statusLine.className = `community-status-line is-${type}`;
  };

  const request = async (endpoint, body = {}) => {
    const key = getAdminKey();
    if (!key) {
      throw new Error("Admin key is not remembered on this device. Log in again and enable Remember key.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key
      },
      body: JSON.stringify(body)
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || `Request failed with HTTP ${response.status}.`);
    }
    return result;
  };

  const compactQuote = (text) => {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > 150 ? `${value.slice(0, 147)}...` : value;
  };

  const selectedMessage = () => messages.find((message) => message.id === selectedId) || messages[0] || null;

  const renderResult = () => {
    if (!resultBox) return;
    const message = selectedMessage();
    if (!message) {
      resultBox.innerHTML = `
        <div class="community-detail-empty">
          <div>
            <div class="eyebrow">AI Result</div>
            <h2>Paste a comment</h2>
            <p>The English reply will be copied automatically after generation.</p>
          </div>
        </div>
      `;
      return;
    }

    const replyChinese = message.replyChinese || message.replyTranslation || message.aiSummary || "Chinese reply note will appear here after generation.";
    resultBox.innerHTML = `
      <div class="community-result-header">
        <div>
          <div class="eyebrow">${escapeHtml(platformLabel(message.platform))} Reply</div>
          <h2>${escapeHtml(message.modName || "Community Comment")}</h2>
        </div>
        <button class="button mini" type="button" data-community-copy-reply>Copy English Reply</button>
      </div>
      <div class="community-detail-grid">
        <div class="community-content-box">
          <span>Player Comment · Chinese</span>
          <p>${escapeHtml(message.translatedContent || message.aiSummary || "No Chinese translation yet.")}</p>
        </div>
        <div class="community-content-box community-reply-box">
          <span>English Reply · Auto Copied</span>
          <textarea data-community-reply-text>${escapeHtml(message.replyDraft || "")}</textarea>
        </div>
        <div class="community-content-box">
          <span>Reply Chinese Reference</span>
          <p>${escapeHtml(replyChinese)}</p>
        </div>
      </div>
    `;
  };

  const renderHistory = () => {
    if (!historyList) return;
    if (countLabel) countLabel.textContent = `${messages.length} comment${messages.length === 1 ? "" : "s"}`;

    if (!messages.length) {
      historyList.innerHTML = '<div class="empty-state">No saved player comments yet.</div>';
      return;
    }

    historyList.innerHTML = messages.map((message) => {
      const featured = message.replyStatus === "featured";
      const active = message.id === selectedId;
      return `
        <article class="community-history-card ${active ? "is-active" : ""}" data-community-id="${escapeHtml(message.id)}">
          <label class="community-featured-toggle" title="Show on homepage Player Voices">
            <input type="checkbox" data-community-featured ${featured ? "checked" : ""}>
            <span>Featured</span>
          </label>
          <button class="community-history-main" type="button" data-community-open>
            <strong>“${escapeHtml(compactQuote(message.originalContent || "No content"))}”</strong>
            <span>${escapeHtml(platformLabel(message.platform))} · ${escapeHtml(message.modName || "Unlinked Mod")}</span>
          </button>
          <select class="community-platform-select" data-community-platform-change aria-label="Platform">
            <option value="nexus" ${message.platform === "nexus" ? "selected" : ""}>Nexus</option>
            <option value="reddit" ${message.platform === "reddit" ? "selected" : ""}>Reddit</option>
          </select>
          <button class="button mini community-danger-button" type="button" data-community-delete>Delete</button>
        </article>
      `;
    }).join("");
  };

  const render = () => {
    renderResult();
    renderHistory();
  };

  const loadMessages = async () => {
    setStatus("Loading history...");
    try {
      const result = await request(LIST_ENDPOINT);
      messages = Array.isArray(result.messages) ? result.messages : [];
      if (selectedId && !messages.some((item) => item.id === selectedId)) selectedId = messages[0]?.id || "";
      if (!selectedId && messages.length) selectedId = messages[0].id;
      render();
      setStatus(`Loaded ${messages.length} comment(s).`, "success");
    } catch (error) {
      setStatus(error.message, "error");
      render();
    }
  };

  const saveMessage = async (payload) => {
    const result = await request(SAVE_ENDPOINT, payload);
    messages = Array.isArray(result.messages) ? result.messages : messages;
    selectedId = result.message?.id || selectedId;
    render();
    return result.message;
  };

  const copyReply = async (text) => {
    const value = String(text || "").trim();
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      return false;
    }
  };

  const generateQuickReply = async () => {
    const originalContent = String(rawInput?.value || "").trim();
    const platform = platformInput?.value || "nexus";
    const modName = String(modInput?.value || "").trim() || "TownGG Mod";

    if (!originalContent) {
      setStatus("Paste a player comment first.", "error");
      rawInput?.focus();
      return;
    }

    try {
      localStorage.setItem(LAST_MOD_KEY, modName);
      localStorage.setItem(LAST_PLATFORM_KEY, platform);
    } catch (error) {}

    setStatus("Saving comment and generating reply...");
    try {
      const saved = await saveMessage({
        platform,
        modName,
        originalContent,
        replyStatus: "new"
      });
      selectedId = saved.id;

      const drafted = await request(DRAFT_ENDPOINT, { id: saved.id });
      messages = Array.isArray(drafted.messages) ? drafted.messages : messages;
      const message = drafted.message || messages.find((item) => item.id === saved.id) || saved;
      selectedId = message.id;
      render();

      const copied = await copyReply(message.replyDraft);
      setStatus(copied ? "Reply generated and English reply copied. Go back and press Ctrl+V." : "Reply generated. Browser blocked auto-copy; use Copy English Reply.", copied ? "success" : "error");
    } catch (error) {
      setStatus(error.message, "error");
    }
  };

  generateButtons.forEach((button) => button.addEventListener("click", generateQuickReply));
  refreshButton?.addEventListener("click", loadMessages);
  clearButtons.forEach((button) => button.addEventListener("click", () => {
    if (rawInput) rawInput.value = "";
    selectedId = "";
    renderResult();
    setStatus("Input cleared.");
    rawInput?.focus();
  }));

  resultBox?.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-community-copy-reply]")) return;
    const replyText = String(resultBox.querySelector("[data-community-reply-text]")?.value || selectedMessage()?.replyDraft || "").trim();
    const copied = await copyReply(replyText);
    setStatus(copied ? "English reply copied. Go back and press Ctrl+V." : "Browser blocked copy. Select the reply manually.", copied ? "success" : "error");
  });

  historyList?.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-community-id]");
    if (!card) return;
    const id = card.dataset.communityId;
    const message = messages.find((item) => item.id === id);
    if (!message) return;

    if (event.target.closest("[data-community-open]")) {
      selectedId = id;
      render();
      return;
    }

    if (event.target.closest("[data-community-delete]")) {
      if (!window.confirm("Delete this saved comment?")) return;
      setStatus("Deleting comment...");
      try {
        const result = await request(DELETE_ENDPOINT, { id });
        messages = Array.isArray(result.messages) ? result.messages : [];
        selectedId = messages[0]?.id || "";
        render();
        setStatus("Comment deleted.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    }
  });

  historyList?.addEventListener("change", async (event) => {
    const card = event.target.closest("[data-community-id]");
    if (!card) return;
    const id = card.dataset.communityId;
    const message = messages.find((item) => item.id === id);
    if (!message) return;

    try {
      if (event.target.matches("[data-community-featured]")) {
        const featured = event.target.checked;
        setStatus(featured ? "Adding to homepage Player Voices..." : "Removing from homepage Player Voices...");
        await saveMessage({
          ...message,
          replyStatus: featured ? "featured" : (message.replyDraft ? "drafted" : "new")
        });
        setStatus(featured ? "Featured on homepage." : "Removed from homepage.", "success");
        return;
      }

      if (event.target.matches("[data-community-platform-change]")) {
        setStatus("Updating platform...");
        await saveMessage({ ...message, platform: event.target.value });
        setStatus("Platform updated.", "success");
      }
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  loadMessages();
})();
