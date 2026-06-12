(() => {
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/TownGG/towngg-portfolio@main/";
  const MANAGED_DIRS = [
    "assets/images/gallery-all-compressed/",
    "assets/images/gallery-featured-compressed/"
  ];

  function pathFromSrc(src) {
    try {
      const url = new URL(src, window.location.href);
      return url.pathname.replace(/^\//, "").split("?")[0];
    } catch (error) {
      return String(src || "").replace(/^\.\//, "").split("?")[0];
    }
  }

  function managed(src) {
    const path = pathFromSrc(src);
    return MANAGED_DIRS.some((dir) => path.startsWith(dir));
  }

  function bustedLocal(src) {
    const url = new URL(src, window.location.href);
    url.searchParams.set("imgv", Date.now().toString());
    return url.toString();
  }

  function cdnUrl(src) {
    return `${CDN_BASE}${encodeURI(pathFromSrc(src))}?imgv=${Date.now()}`;
  }

  function setup(img) {
    if (!img || img.dataset.galleryFallbackReady === "true") return;
    const original = img.getAttribute("src") || img.src;
    if (!managed(original)) return;
    img.dataset.galleryFallbackReady = "true";
    img.dataset.galleryOriginalSrc = original;
    img.addEventListener("error", () => {
      const step = Number(img.dataset.galleryFallbackStep || "0");
      img.dataset.galleryFallbackStep = String(step + 1);
      if (step === 0) {
        img.src = bustedLocal(img.dataset.galleryOriginalSrc);
      } else if (step === 1) {
        img.src = cdnUrl(img.dataset.galleryOriginalSrc);
      }
    });
  }

  function scan(root = document) {
    root.querySelectorAll?.("img").forEach(setup);
  }

  window.addEventListener("DOMContentLoaded", () => {
    scan();
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.("img")) setup(node);
          scan(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
