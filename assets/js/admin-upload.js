(() => {
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.86;
  const API_ENDPOINT = "/api/admin/gallery-upload";
  const LIST_ENDPOINT = "/api/admin/gallery-list";
  const STORAGE_KEY = "towngg_admin_upload_key";

  const body = document.body;
  const loginScreen = document.querySelector("[data-admin-login-screen]");
  const loginForm = document.querySelector("[data-admin-login-form]");
  const loginAdminKeyInput = document.querySelector("[data-login-admin-key]");
  const rememberAdminKeyInput = document.querySelector("[data-remember-admin-key]");
  const adminShell = document.querySelector("[data-admin-shell]");
  const adminKeyState = document.querySelector("[data-admin-key-state]");
  const lockAdminButton = document.querySelector("[data-lock-admin]");
  const forgetAdminKeyButton = document.querySelector("[data-forget-admin-key]");

  const form = document.querySelector("[data-upload-form]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const fileInput = document.querySelector("[data-file-input]");
  const previewList = document.querySelector("[data-preview-list]");
  const fileCount = document.querySelector("[data-file-count]");
  const totalSize = document.querySelector("[data-total-size]");
  const uploadLog = document.querySelector("[data-upload-log]");
  const clearButton = document.querySelector("[data-clear-files]");
  const uploadTypeInput = document.querySelector("[data-upload-type]");
  const prefixInput = document.querySelector("[data-project-prefix]");
  const altModeInput = document.querySelector("[data-alt-mode]");
  const customAltWrap = document.querySelector("[data-custom-alt-wrap]");
  const customAltInput = document.querySelector("[data-custom-alt]");

  let pendingFiles = [];
  let sessionAdminKey = "";
  let rememberedKeyLoaded = false;
  let existingGalleryImages = [];
  let existingGalleryLoaded = false;
  let sequenceOffset = 0;

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const typeLabel = (type) => {
    if (type === "featured") return "Homepage Featured";
    if (type === "concept") return "Concept Art";
    return "In-Game Screenshots";
  };

  const setUploadStatus = (type, title, message) => {
    if (!uploadLog) return;
    const icon = type === "success" ? "✓" : type === "error" ? "!" : "↑";
    uploadLog.className = `upload-log is-${type}`;
    uploadLog.innerHTML = `
      <span class="upload-status-icon">${icon}</span>
      <div class="upload-status-body">
        <strong class="upload-status-title">${escapeHtml(title)}</strong>
        <span class="upload-status-message">${escapeHtml(message)}</span>
      </div>
    `;
  };

  const writeLog = (message) => {
    setUploadStatus("idle", "Status", message);
  };

  const getStoredAdminKey = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  };

  const setStoredAdminKey = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      writeLog("Unable to remember key in this browser.");
    }
  };

  const clearStoredAdminKey = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage cleanup errors.
    }
  };

  const getAdminKey = () => sessionAdminKey || getStoredAdminKey();

  const updateAdminKeyState = () => {
    if (!adminKeyState) return;
    adminKeyState.textContent = rememberedKeyLoaded ? "Remembered on this device" : "Session only";
  };

  const unlockAdmin = (key, remembered = false) => {
    sessionAdminKey = key;
    rememberedKeyLoaded = remembered;
    existingGalleryLoaded = false;
    body?.classList.remove("is-locked");
    loginScreen?.classList.add("is-hidden");
    if (adminShell) adminShell.hidden = false;
    updateAdminKeyState();
    writeLog(remembered ? "Admin key loaded from this browser. Ready." : "Admin session unlocked. Ready.");
  };

  const lockAdmin = () => {
    sessionAdminKey = "";
    rememberedKeyLoaded = false;
    existingGalleryImages = [];
    existingGalleryLoaded = false;
    sequenceOffset = 0;
    body?.classList.add("is-locked");
    loginScreen?.classList.remove("is-hidden");
    if (adminShell) adminShell.hidden = true;
    if (loginAdminKeyInput) loginAdminKeyInput.value = "";
    updateAdminKeyState();
  };

  const bootAdminGate = () => {
    const rememberedKey = getStoredAdminKey();
    if (rememberedKey) {
      unlockAdmin(rememberedKey, true);
      return;
    }
    lockAdmin();
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const sanitizePart = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const getDateStamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  const makeAltText = (type, prefix) => {
    if (altModeInput?.value === "custom" && customAltInput?.value.trim()) {
      return customAltInput.value.trim();
    }

    const cleanPrefix = String(prefix || "")
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

    if (cleanPrefix) {
      if (type === "featured") return `${cleanPrefix} homepage featured artwork`;
      return type === "concept" ? `${cleanPrefix} concept artwork` : `${cleanPrefix} in-game screenshot`;
    }

    if (type === "featured") return "TownGG homepage featured artwork";
    return type === "concept" ? "TownGG concept artwork" : "TownGG in-game screenshot";
  };

  const filenameFromImage = (image) => String(image || "").split("/").pop() || "";

  const filenameStem = (type, prefix) => {
    const base = type === "featured" ? "featured" : type === "concept" ? "concept" : "screenshot";
    const cleanPrefix = sanitizePart(prefix);
    return [base, cleanPrefix, getDateStamp()].filter(Boolean).join("_");
  };

  const sequenceFromFilename = (filename, type, prefix) => {
    const stem = filenameStem(type, prefix);
    const match = filename.match(new RegExp(`^${escapeRegExp(stem)}_(\\d{3})\\.jpg$`, "i"));
    return match ? Number(match[1]) : 0;
  };

  const loadExistingGalleryImages = async (force = false) => {
    if (existingGalleryLoaded && !force) return existingGalleryImages;

    const adminKey = getAdminKey();
    if (!adminKey) return existingGalleryImages;

    const response = await fetch(LIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: JSON.stringify({})
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || `Gallery list API failed with HTTP ${response.status}.`);
    }

    existingGalleryImages = Array.isArray(result.images) ? result.images : [];
    existingGalleryLoaded = true;
    return existingGalleryImages;
  };

  const updateSequenceOffset = async (force = false) => {
    const type = uploadTypeInput?.value || "screenshots";
    const prefix = prefixInput?.value || "";
    const images = await loadExistingGalleryImages(force);
    sequenceOffset = images.reduce((max, item) => {
      if (item?.type && item.type !== type) return max;
      const filename = filenameFromImage(item.path || item.image || "");
      return Math.max(max, sequenceFromFilename(filename, type, prefix));
    }, 0);
  };

  const makeOutputName = (type, prefix, index) => {
    const sequence = String(sequenceOffset + index + 1).padStart(3, "0");
    return `${filenameStem(type, prefix)}_${sequence}.jpg`;
  };

  const loadImage = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to read image: ${file.name}`));
    };
    image.src = url;
  });

  const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image compression failed."));
    }, "image/jpeg", JPEG_QUALITY);
  });

  const compressImage = async (file) => {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#070b12";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    return {
      blob,
      width,
      height,
      originalSize: file.size,
      compressedSize: blob.size,
      previewUrl: URL.createObjectURL(blob)
    };
  };

  const readBlobAsBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(blob);
  });

  const refreshNames = () => {
    const type = uploadTypeInput?.value || "screenshots";
    const prefix = prefixInput?.value || "";
    pendingFiles = pendingFiles.map((item, index) => ({
      ...item,
      outputName: makeOutputName(type, prefix, index),
      alt: makeAltText(type, prefix)
    }));
  };

  const renderPreview = () => {
    refreshNames();

    if (!previewList) return;
    if (!pendingFiles.length) {
      previewList.innerHTML = '<div class="empty-state">No images selected yet.</div>';
    } else {
      previewList.innerHTML = pendingFiles.map((item) => `
        <article class="preview-item">
          <div class="preview-thumb"><img src="${item.previewUrl}" alt=""></div>
          <div class="preview-meta">
            <strong>${item.outputName}</strong>
            <span>Original: ${item.originalName}</span>
            <span>${item.width}x${item.height} | ${formatBytes(item.originalSize)} → ${formatBytes(item.compressedSize)}</span>
            <span>Alt: ${item.alt}</span>
          </div>
          <button class="preview-remove" type="button" data-remove-index="${pendingFiles.indexOf(item)}" aria-label="Remove ${item.outputName}">×</button>
        </article>
      `).join("");
    }

    if (fileCount) fileCount.textContent = `${pendingFiles.length} file${pendingFiles.length === 1 ? "" : "s"}`;
    if (totalSize) totalSize.textContent = formatBytes(pendingFiles.reduce((sum, item) => sum + item.compressedSize, 0));
  };

  const refreshExistingSequenceAndPreview = async (force = false) => {
    try {
      await updateSequenceOffset(force);
    } catch (error) {
      writeLog(`Using local numbering. Could not load existing gallery names: ${error.message}`);
    }
    renderPreview();
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    writeLog(`Processing ${files.length} image(s)...`);

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        pendingFiles.push({ originalName: file.name, outputName: file.name, alt: "", ...compressed });
      } catch (error) {
        setUploadStatus("error", "Image processing failed", error.message);
      }
    }

    await refreshExistingSequenceAndPreview(true);
    writeLog(`${pendingFiles.length} compressed image(s) waiting for upload.`);
  };

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const key = loginAdminKeyInput?.value.trim() || "";
    if (!key) return;

    const shouldRemember = Boolean(rememberAdminKeyInput?.checked);
    if (shouldRemember) setStoredAdminKey(key);
    else clearStoredAdminKey();

    unlockAdmin(key, shouldRemember);
    refreshExistingSequenceAndPreview(true);
  });

  lockAdminButton?.addEventListener("click", lockAdmin);

  forgetAdminKeyButton?.addEventListener("click", () => {
    clearStoredAdminKey();
    sessionAdminKey = "";
    rememberedKeyLoaded = false;
    existingGalleryImages = [];
    existingGalleryLoaded = false;
    sequenceOffset = 0;
    writeLog("Saved admin key removed from this browser. Please log in again.");
    lockAdmin();
  });

  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });

  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-dragging"));

  dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
    addFiles(event.dataTransfer.files);
  });

  fileInput?.addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });

  previewList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-index]");
    if (!button) return;
    const index = Number(button.dataset.removeIndex);
    const [removed] = pendingFiles.splice(index, 1);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    renderPreview();
  });

  clearButton?.addEventListener("click", () => {
    pendingFiles.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    pendingFiles = [];
    renderPreview();
    writeLog("Cleared pending uploads.");
  });

  [uploadTypeInput, prefixInput].forEach((input) => {
    input?.addEventListener("input", () => refreshExistingSequenceAndPreview(false));
    input?.addEventListener("change", () => refreshExistingSequenceAndPreview(false));
  });

  customAltInput?.addEventListener("input", renderPreview);
  customAltInput?.addEventListener("change", renderPreview);

  altModeInput?.addEventListener("change", () => {
    if (customAltWrap) customAltWrap.hidden = altModeInput.value !== "custom";
    renderPreview();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const adminKey = getAdminKey();
    if (!adminKey) {
      setUploadStatus("error", "Upload failed", "Admin Key is required. Please log in again.");
      lockAdmin();
      return;
    }

    if (!pendingFiles.length) {
      writeLog("No images selected.");
      return;
    }

    writeLog("Checking existing filenames...");
    await refreshExistingSequenceAndPreview(true);
    refreshNames();
    writeLog("Uploading images...");

    try {
      const files = [];
      for (const item of pendingFiles) {
        files.push({ filename: item.outputName, mime: "image/jpeg", alt: item.alt, base64: await readBlobAsBase64(item.blob) });
      }

      const uploadType = uploadTypeInput?.value || "screenshots";
      const payload = {
        type: uploadType,
        prefix: prefixInput?.value || "",
        altMode: altModeInput?.value || "auto",
        files
      };

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Upload API failed with HTTP ${response.status}. Worker may not be deployed yet.`);
      }

      const uploadedCount = Array.isArray(result.uploaded) ? result.uploaded.length : files.length;
      existingGalleryLoaded = false;
      pendingFiles.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      pendingFiles = [];
      await refreshExistingSequenceAndPreview(true);
      setUploadStatus("success", "Upload successful", `${uploadedCount} image(s) added to ${typeLabel(uploadType)}. The next upload will continue the filename sequence.`);
    } catch (error) {
      setUploadStatus("error", "Upload failed", error.message);
    }
  });

  bootAdminGate();
  renderPreview();
})();
