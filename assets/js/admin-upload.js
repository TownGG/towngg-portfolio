(() => {
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.86;
  const API_ENDPOINT = "/api/admin/gallery-upload";

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

  const writeLog = (message) => {
    if (!uploadLog) return;
    uploadLog.textContent = message;
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

    const adminKey = document.querySelector("[data-admin-key]")?.value.trim();
    if (!adminKey) {
      writeLog("Admin Key is required.");
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

      const response = await fetch(API_ENDPOINT, {
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

  renderPreview();
})();
