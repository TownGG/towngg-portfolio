(() => {
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.86;
  const UPLOAD_ENDPOINT = "/api/admin/gallery-upload";
  const AUTH_ENDPOINT = "/api/admin/auth-check";
  const STORAGE_KEY = "towngg_admin_upload_key";

  const body = document.body;
  const loginScreen = document.querySelector("[data-admin-login-screen]");
  const loginForm = document.querySelector("[data-admin-login-form]");
  const loginAdminKeyInput = document.querySelector("[data-login-admin-key]");
  const rememberAdminKeyInput = document.querySelector("[data-remember-admin-key]");
  const loginMessage = document.querySelector("[data-login-message]");
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

  const writeLog = (message) => {
    if (!uploadLog) return;
    uploadLog.textContent = message;
  };

  const writeLoginMessage = (message) => {
    if (!loginMessage) return;
    loginMessage.textContent = message;
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

  const verifyAdminKey = async (key) => {
    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key
      },
      body: JSON.stringify({ check: true })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || `Admin key check failed with HTTP ${response.status}.`);
    }
    return result;
  };

  const updateAdminKeyState = () => {
    if (!adminKeyState) return;
    adminKeyState.textContent = rememberedKeyLoaded ? "Remembered on this device" : "Session only";
  };

  const unlockAdmin = (key, remembered = false) => {
    sessionAdminKey = key;
    rememberedKeyLoaded = remembered;
    body?.classList.remove("is-locked");
    loginScreen?.classList.add("is-hidden");
    if (adminShell) adminShell.hidden = false;
    writeLoginMessage("");
    updateAdminKeyState();
    writeLog(remembered ? "Admin key verified from this browser. Ready." : "Admin key verified. Ready.");
  };

  const lockAdmin = () => {
    sessionAdminKey = "";
    rememberedKeyLoaded = false;
    body?.classList.add("is-locked");
    loginScreen?.classList.remove("is-hidden");
    if (adminShell) adminShell.hidden = true;
    if (loginAdminKeyInput) loginAdminKeyInput.value = "";
    updateAdminKeyState();
  };

  const bootAdminGate = async () => {
    const rememberedKey = getStoredAdminKey();
    if (!rememberedKey) {
      lockAdmin();
      return;
    }

    writeLoginMessage("Checking remembered key...");
    try {
      await verifyAdminKey(rememberedKey);
      unlockAdmin(rememberedKey, true);
    } catch (error) {
      clearStoredAdminKey();
      lockAdmin();
      writeLoginMessage("Remembered key is invalid or Worker route is not ready. Please log in again.");
    }
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

  const sanitizePart = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

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
      return type === "concept"
        ? `${cleanPrefix} concept artwork`
        : `${cleanPrefix} in-game screenshot`;
    }

    return type === "concept" ? "TownGG concept artwork" : "TownGG in-game screenshot";
  };

  const makeOutputName = (type, prefix, index) => {
    const base = type === "concept" ? "concept" : "screenshot";
    const cleanPrefix = sanitizePart(prefix);
    const sequence = String(index + 1).padStart(3, "0");
    return [base, cleanPrefix, getDateStamp(), sequence].filter(Boolean).join("_") + ".jpg";
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
      previewList.innerHTML = pendingFiles.map((item, index) => `
        <article class="preview-item">
          <div class="preview-thumb"><img src="${item.previewUrl}" alt=""></div>
          <div class="preview-meta">
            <strong>${item.outputName}</strong>
            <span>Original: ${item.originalName}</span>
            <span>${item.width}x${item.height} | ${formatBytes(item.originalSize)} → ${formatBytes(item.compressedSize)}</span>
            <span>Alt: ${item.alt}</span>
          </div>
          <button class="preview-remove" type="button" data-remove-index="${index}" aria-label="Remove ${item.outputName}">×</button>
        </article>
      `).join("");
    }

    if (fileCount) fileCount.textContent = `${pendingFiles.length} file${pendingFiles.length === 1 ? "" : "s"}`;
    if (totalSize) totalSize.textContent = formatBytes(pendingFiles.reduce((sum, item) => sum + item.compressedSize, 0));
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    writeLog(`Processing ${files.length} image(s)...`);

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        pendingFiles.push({
          originalName: file.name,
          outputName: file.name,
          alt: "",
          ...compressed
        });
      } catch (error) {
        writeLog(error.message);
      }
    }

    renderPreview();
    writeLog(`Ready. ${pendingFiles.length} compressed image(s) waiting for upload.`);
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = loginAdminKeyInput?.value.trim() || "";
    if (!key) return;

    writeLoginMessage("Checking admin key...");

    try {
      await verifyAdminKey(key);
      const shouldRemember = Boolean(rememberAdminKeyInput?.checked);
      if (shouldRemember) {
        setStoredAdminKey(key);
      } else {
        clearStoredAdminKey();
      }
      unlockAdmin(key, shouldRemember);
    } catch (error) {
      clearStoredAdminKey();
      writeLoginMessage(`Login failed: ${error.message}`);
    }
  });

  lockAdminButton?.addEventListener("click", () => {
    lockAdmin();
  });

  forgetAdminKeyButton?.addEventListener("click", () => {
    clearStoredAdminKey();
    sessionAdminKey = "";
    rememberedKeyLoaded = false;
    writeLog("Saved admin key removed from this browser. Please log in again.");
    lockAdmin();
  });

  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });

  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("is-dragging");
  });

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

  [uploadTypeInput, prefixInput, customAltInput].forEach((input) => {
    input?.addEventListener("input", renderPreview);
    input?.addEventListener("change", renderPreview);
  });

  altModeInput?.addEventListener("change", () => {
    if (customAltWrap) customAltWrap.hidden = altModeInput.value !== "custom";
    renderPreview();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    refreshNames();

    const adminKey = getAdminKey();
    if (!adminKey) {
      writeLog("Admin Key is required. Please log in again.");
      lockAdmin();
      return;
    }

    if (!pendingFiles.length) {
      writeLog("No images selected.");
      return;
    }

    writeLog("Preparing upload payload...");

    try {
      const files = [];
      for (const item of pendingFiles) {
        files.push({
          filename: item.outputName,
          mime: "image/jpeg",
          alt: item.alt,
          base64: await readBlobAsBase64(item.blob)
        });
      }

      const payload = {
        type: uploadTypeInput?.value || "screenshots",
        prefix: prefixInput?.value || "",
        altMode: altModeInput?.value || "auto",
        files
      };

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Upload API failed with HTTP ${response.status}. Worker may not be deployed yet.`);
      }

      writeLog(JSON.stringify(result, null, 2));
    } catch (error) {
      writeLog(`Upload not completed.\n${error.message}`);
    }
  });

  bootAdminGate();
  renderPreview();
})();
