(() => {
  const LIST_ENDPOINT = "/api/admin/community-list";
  const SAVE_ENDPOINT = "/api/admin/community-save";
  const DELETE_ENDPOINT = "/api/admin/community-delete";
  const DRAFT_ENDPOINT = "/api/admin/community-draft";
  const REDDIT_REPLY_ENDPOINT = "/api/admin/community-reddit-reply";
  const NEXUS_REPLY_ENDPOINT = "/api/admin/community-nexus-reply";
  const STORAGE_KEY = "towngg_admin_upload_key";

  const root = document.querySelector("[data-community-ops]");
  if (!root) return;

  const inbox = root.querySelector("[data-community-inbox]");
  const detail = root.querySelector("[data-community-detail]");
  const form = root.querySelector("[data-community-form]");
  const statusLine = root.querySelector("[data-community-status]");
  const refreshButton = root.querySelector("[data-community-refresh]");
  const newButton = root.querySelector("[data-community-new]");
  const filters = {
    platform: root.querySelector("[data-community-filter-platform]"),
    status: root.querySelector("[data-community-filter-status]"),
    category: root.querySelector("[data-community-filter-category]"),
    search: root.querySelector("[data-community-filter-search]")
  };
  const kpis = {
    total: root.querySelector("[data-community-kpi-total]"),
    pending: root.querySelector("[data-community-kpi-pending]"),
    reddit: root.querySelector("[data-community-kpi-reddit]"),
    nexus: root.querySelector("[data-community-kpi-nexus]")
  };

  let messages = [];
  let selectedId = "";

  const fields = {
    id: form?.querySelector("[name='id']"),
    platform: form?.querySelector("[name='platform']"),
    modName: form?.querySelector("[name='modName']"),
    authorName: form?.querySelector("[name='authorName']"),
    sourceUrl: form?.querySelector("[name='sourceUrl']"),
    externalMessageId: form?.querySelector("[name='externalMessageId']"),
    commentThreadId: form?.querySelector("[name='commentThreadId']"),
    originalContent: form?.querySelector("[name='originalContent']")
  };

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

  const setStatus = (message, type = "idle") => {
    if (!statusLine) return;
    statusLine.textContent = message || "";
    statusLine.className = `community-status-line is-${type}`;
  };

  const request = async (endpoint, body = {}) => {
    const key = getAdminKey();
    if (!key) {
      throw new Error("Admin key is not remembered on this device. Log in again and enable Remember key before using Community Ops.");
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

  const platformLabel = (platform) => platform === "nexus" ? "Nexus" : "Reddit";
  const statusLabel = (status) => ({
    new: "New",
    drafted: "Drafted",
    sent: "Sent",
    copied: "Copied",
    replied: "Replied",
    ignored: "Ignored",
    needs_review: "Review"
  }[status] || "New");
  const categoryLabel = (category) => ({
    praise: "Praise",
    bug_report: "Bug",
    feature_request: "Request",
    install_question: "Install",
    ai_criticism: "AI Issue",
    lore_discussion: "Lore",
    general: "General"
  }[category] || "General");

  const currentFilters = () => ({
    platform: filters.platform?.value || "all",
    status: filters.status?.value || "all",
    category: filters.category?.value || "all",
    search: String(filters.search?.value || "").trim().toLowerCase()
  });

  const filteredMessages = () => {
    const f = currentFilters();
    return messages.filter((message) => {
      if (f.platform !== "all" && message.platform !== f.platform) return false;
      if (f.status !== "all" && message.replyStatus !== f.status) return false;
      if (f.category !== "all" && message.category !== f.category) return false;
      if (f.search) {
        const haystack = [message.modName, message.authorName, message.originalContent, message.replyDraft].join(" ").toLowerCase();
        if (!haystack.includes(f.search)) return false;
      }
      return true;
    });
  };

  const renderKpis = () => {
    const total = messages.length;
    const pending = messages.filter((item) => !["sent", "replied", "ignored"].includes(item.replyStatus)).length;
    const reddit = messages.filter((item) => item.platform === "reddit").length;
    const nexus = messages.filter((item) => item.platform === "nexus").length;
    if (kpis.total) kpis.total.textContent = total;
    if (kpis.pending) kpis.pending.textContent = pending;
    if (kpis.reddit) kpis.reddit.textContent = reddit;
    if (kpis.nexus) kpis.nexus.textContent = nexus;
  };

  const renderInbox = () => {
    if (!inbox) return;
    const list = filteredMessages();
    if (!list.length) {
      inbox.innerHTML = '<div class="empty-state">No community messages yet.</div>';
      return;
    }

    inbox.innerHTML = list.map((message) => `
      <button class="community-message-card ${message.id === selectedId ? "is-active" : ""}" type="button" data-community-select="${escapeHtml(message.id)}">
        <div class="community-message-meta">
          <span class="community-pill platform-${escapeHtml(message.platform)}">${escapeHtml(platformLabel(message.platform))}</span>
          <span class="community-pill status-${escapeHtml(message.replyStatus || "new")}">${escapeHtml(statusLabel(message.replyStatus))}</span>
          <span class="community-pill">${escapeHtml(categoryLabel(message.category))}</span>
        </div>
        <strong>${escapeHtml(message.modName || "Unlinked Mod")} · ${escapeHtml(message.authorName || "Unknown")}</strong>
        <p>${escapeHtml(message.originalContent || "No content")}</p>
      </button>
    `).join("");
  };

  const selectedMessage = () => messages.find((message) => message.id === selectedId) || null;

  const renderDetail = () => {
    if (!detail) return;
    const message = selectedMessage();
    if (!message) {
      detail.innerHTML = `
        <div class="community-detail-empty">
          <div>
            <div class="eyebrow">Community Ops</div>
            <h2>Select a message</h2>
            <p>Load or add a Reddit / Nexus message, then generate a safe English reply draft.</p>
          </div>
        </div>
      `;
      return;
    }

    const isReddit = message.platform === "reddit";
    const isNexus = message.platform === "nexus";
    const redditDisabled = !isReddit || !message.replyDraft || !message.externalMessageId;
    const nexusDisabled = !isNexus || !message.replyDraft;

    detail.innerHTML = `
      <div class="community-detail-header">
        <div class="eyebrow">${escapeHtml(platformLabel(message.platform))} Message</div>
        <h2>${escapeHtml(message.modName || "Community Message")}</h2>
        <p>${escapeHtml(message.authorName || "Unknown author")}</p>
        <div class="community-detail-meta">
          <span class="community-pill platform-${escapeHtml(message.platform)}">${escapeHtml(platformLabel(message.platform))}</span>
          <span class="community-pill status-${escapeHtml(message.replyStatus || "new")}">${escapeHtml(statusLabel(message.replyStatus))}</span>
          <span class="community-pill">${escapeHtml(categoryLabel(message.category))}</span>
          ${message.sourceUrl ? `<a class="button mini" href="${escapeHtml(message.sourceUrl)}" target="_blank" rel="noopener">Open Source</a>` : ""}
        </div>
      </div>

      <div class="community-detail-grid">
        <div class="community-content-box">
          <span>Original</span>
          <p>${escapeHtml(message.originalContent)}</p>
        </div>
        <div class="community-content-box">
          <span>AI Summary / Translation</span>
          <p>${escapeHtml(message.aiSummary || message.translatedContent || "No AI analysis yet.")}</p>
        </div>
        <div class="community-content-box">
          <span>Reply Draft</span>
          <textarea data-community-draft-text>${escapeHtml(message.replyDraft || "")}</textarea>
        </div>
        <div class="community-draft-actions">
          <button class="button primary" type="button" data-community-generate>Generate Reply</button>
          <button class="button" type="button" data-community-save-draft>Save Draft</button>
          ${isReddit ? `<button class="button primary" type="button" data-community-reddit-reply ${redditDisabled ? "disabled" : ""}>Confirm & Reply to Reddit</button>` : ""}
          ${isNexus ? `<button class="button" type="button" data-community-nexus-try ${nexusDisabled ? "disabled" : ""}>Try Nexus API Reply</button>` : ""}
          ${isNexus ? `<button class="button primary" type="button" data-community-nexus-copy ${nexusDisabled ? "disabled" : ""}>Copy Reply & Open Nexus</button>` : ""}
          <button class="button" type="button" data-community-mark-replied>Mark Replied</button>
          <button class="button community-danger-button" type="button" data-community-delete>Delete</button>
        </div>
      </div>
    `;
  };

  const render = () => {
    renderKpis();
    renderInbox();
    renderDetail();
  };

  const loadMessages = async () => {
    setStatus("Loading community messages...");
    try {
      const result = await request(LIST_ENDPOINT);
      messages = Array.isArray(result.messages) ? result.messages : [];
      if (!selectedId && messages.length) selectedId = messages[0].id;
      if (selectedId && !messages.some((message) => message.id === selectedId)) selectedId = messages[0]?.id || "";
      render();
      setStatus(`Loaded ${messages.length} message(s).`, "success");
    } catch (error) {
      setStatus(error.message, "error");
      render();
    }
  };

  const resetForm = () => {
    form?.reset();
    if (fields.id) fields.id.value = "";
    if (fields.platform) fields.platform.value = "reddit";
    setStatus("New message form ready.");
  };

  const messageFromForm = () => ({
    id: fields.id?.value || "",
    platform: fields.platform?.value || "reddit",
    modName: fields.modName?.value || "",
    authorName: fields.authorName?.value || "",
    sourceUrl: fields.sourceUrl?.value || "",
    externalMessageId: fields.externalMessageId?.value || "",
    commentThreadId: fields.commentThreadId?.value || "",
    originalContent: fields.originalContent?.value || ""
  });

  const saveMessage = async (payload) => {
    const result = await request(SAVE_ENDPOINT, payload);
    messages = Array.isArray(result.messages) ? result.messages : messages;
    selectedId = result.message?.id || selectedId;
    render();
    return result.message;
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Saving message...");
    try {
      const message = await saveMessage(messageFromForm());
      if (fields.id) fields.id.value = message.id;
      setStatus("Message saved.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  newButton?.addEventListener("click", resetForm);
  refreshButton?.addEventListener("click", loadMessages);
  Object.values(filters).forEach((input) => {
    input?.addEventListener("input", renderInbox);
    input?.addEventListener("change", renderInbox);
  });

  inbox?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-community-select]");
    if (!button) return;
    selectedId = button.dataset.communitySelect;
    render();
  });

  detail?.addEventListener("click", async (event) => {
    const message = selectedMessage();
    if (!message) return;

    const draftInput = detail.querySelector("[data-community-draft-text]");
    const draftText = String(draftInput?.value || "").trim();

    try {
      if (event.target.closest("[data-community-generate]")) {
        setStatus("Generating reply draft...");
        const result = await request(DRAFT_ENDPOINT, { id: message.id });
        messages = Array.isArray(result.messages) ? result.messages : messages;
        render();
        setStatus("Reply draft generated.", "success");
        return;
      }

      if (event.target.closest("[data-community-save-draft]")) {
        setStatus("Saving reply draft...");
        await saveMessage({ ...message, replyDraft: draftText, replyStatus: draftText ? "drafted" : message.replyStatus });
        setStatus("Reply draft saved.", "success");
        return;
      }

      if (event.target.closest("[data-community-reddit-reply]")) {
        if (!window.confirm("Send this reply to Reddit now?")) return;
        setStatus("Sending Reddit reply...");
        const result = await request(REDDIT_REPLY_ENDPOINT, { id: message.id, text: draftText });
        messages = Array.isArray(result.messages) ? result.messages : messages;
        render();
        setStatus("Reddit reply sent.", "success");
        return;
      }

      if (event.target.closest("[data-community-nexus-try]")) {
        if (!window.confirm("Try to send this reply through Nexus GraphQL API?")) return;
        setStatus("Trying Nexus API reply...");
        const result = await request(NEXUS_REPLY_ENDPOINT, { id: message.id, text: draftText });
        messages = Array.isArray(result.messages) ? result.messages : messages;
        render();
        setStatus("Nexus API reply sent.", "success");
        return;
      }

      if (event.target.closest("[data-community-nexus-copy]")) {
        await navigator.clipboard.writeText(draftText);
        await saveMessage({ ...message, replyDraft: draftText, replyStatus: "copied" });
        if (message.sourceUrl) window.open(message.sourceUrl, "_blank", "noopener");
        setStatus("Reply copied. Nexus page opened for manual paste.", "success");
        return;
      }

      if (event.target.closest("[data-community-mark-replied]")) {
        await saveMessage({ ...message, replyDraft: draftText || message.replyDraft, replyStatus: "replied", repliedAt: new Date().toISOString() });
        setStatus("Message marked as replied.", "success");
        return;
      }

      if (event.target.closest("[data-community-delete]")) {
        if (!window.confirm("Delete this community message from the admin store?")) return;
        setStatus("Deleting message...");
        const result = await request(DELETE_ENDPOINT, { id: message.id });
        messages = Array.isArray(result.messages) ? result.messages : [];
        selectedId = messages[0]?.id || "";
        render();
        setStatus("Message deleted.", "success");
      }
    } catch (error) {
      setStatus(error.message, "error");
      if (event.target.closest("[data-community-nexus-try]") && message.sourceUrl && draftText) {
        try {
          await navigator.clipboard.writeText(draftText);
          window.open(message.sourceUrl, "_blank", "noopener");
          setStatus(`${error.message} Draft copied and Nexus page opened for manual paste.`, "error");
        } catch (copyError) {
          setStatus(`${error.message} Also failed to copy draft: ${copyError.message}`, "error");
        }
      }
    }
  });

  loadMessages();
})();
