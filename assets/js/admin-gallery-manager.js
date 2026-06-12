(() => {
  const LIST_ENDPOINT = "/api/admin/gallery-list";
  const DELETE_ENDPOINT = "/api/admin/gallery-delete";
  const STORAGE_KEY = "towngg_admin_upload_key";
  const RAW_REPO_BASE = "https://raw.githubusercontent.com/TownGG/towngg-portfolio/main/";

  const typeInput = document.querySelector("[data-manager-type]");
  const refreshButton = document.querySelector("[data-manager-refresh]");
  const grid = document.querySelector("[data-manager-grid]");
  const status = document.querySelector("[data-manager-status]");

  if (!typeInput || !grid || !status) return;

  let images = [];

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

  const normalizePath = (image) => String(image || "").replace(/^\.\//, "");

  const cacheBustedImage = (image) => {
    const path = normalizePath(image);
    const joiner = image.includes("?") ? "&" : "?";
    return `${image}${joiner}adminPreview=${Date.now()}`;
  };

  const rawImage = (image) => `${RAW_REPO_BASE}${encodeURI(normalizePath(image))}`;

  const setStatus = (type, title, message) => {
    const icon = type === "success" ? "✓" : type === "error" ? "!" : "↻";
    status.className = `upload-log admin-manager-status is-${type}`;
    status.innerHTML = `
      <span class="upload-status-icon">${icon}</span>
      <div class="upload-status-body">
        <strong class="upload-status-title">${escapeHtml(title)}</strong>
        <span class="upload-status-message">${escapeHtml(message)}</span>
      </div>
    `;
  };

  const request = async (endpoint, body = {}) => {
    const key = getAdminKey();
    if (!key) throw new Error("Admin key is not remembered on this device. Log in again and enable Remember key before using Image Management.");

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

  const visibleImages = () => images.filter((item) => item.type === typeInput.value);

  const render = () => {
    const list = visibleImages();
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state">No images found for this category.</div>';
      return;
    }

    grid.innerHTML = list.map((item) => `
      <article class="admin-image-card" data-image-card="${escapeHtml(item.image)}" data-image-type="${escapeHtml(item.type)}">
        <div class="admin-image-thumb">
          <img src="${escapeHtml(cacheBustedImage(item.image))}" data-raw-src="${escapeHtml(rawImage(item.image))}" alt="${escapeHtml(item.alt)}" loading="lazy">
          <span class="admin-image-tag">${escapeHtml(item.typeLabel)}</span>
        </div>
        <div class="admin-image-body">
          <strong>${escapeHtml(item.filename)}</strong>
          <span>${escapeHtml(item.alt || "No alt text")}</span>
          <button class="button admin-danger-button" type="button" data-delete-image="${escapeHtml(item.image)}" data-delete-type="${escapeHtml(item.type)}">Delete</button>
        </div>
      </article>
    `).join("");
  };

  const loadImages = async () => {
    setStatus("idle", "Loading images", "Reading current gallery records...");
    try {
      const result = await request(LIST_ENDPOINT);
      images = Array.isArray(result.images) ? result.images : [];
      render();
      const count = visibleImages().length;
      setStatus("success", "Images loaded", `${count} image(s) available in ${typeInput.options[typeInput.selectedIndex].text}.`);
    } catch (error) {
      setStatus("error", "Load failed", error.message);
    }
  };

  const deleteImage = async (type, image) => {
    const filename = image.split("/").pop();
    const ok = window.confirm(`Delete this image?\n\n${filename}\n\nThis will remove both the image file and its gallery JSON record.`);
    if (!ok) return;

    setStatus("idle", "Deleting image", filename);
    try {
      await request(DELETE_ENDPOINT, { type, image });
      images = images.filter((item) => !(item.type === type && item.image === image));
      render();
      setStatus("success", "Delete successful", `${filename} was removed from the repository and gallery data.`);
    } catch (error) {
      setStatus("error", "Delete failed", error.message);
    }
  };

  refreshButton?.addEventListener("click", loadImages);
  typeInput.addEventListener("change", () => {
    render();
    setStatus("idle", "Category changed", `${visibleImages().length} image(s) shown.`);
  });

  grid.addEventListener("error", (event) => {
    const image = event.target.closest("img[data-raw-src]");
    if (!image || image.dataset.rawFallbackUsed === "true") return;
    image.dataset.rawFallbackUsed = "true";
    image.src = `${image.dataset.rawSrc}?adminPreview=${Date.now()}`;
  }, true);

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-image]");
    if (!button) return;
    deleteImage(button.dataset.deleteType, button.dataset.deleteImage);
  });
})();
