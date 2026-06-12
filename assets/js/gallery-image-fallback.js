(() => {
  const MANAGED_DIRS = [
    "assets/images/gallery-all-compressed/",
    "assets/images/gallery-featured-compressed/"
  ];

  function pathFromSrc(src) {
    try {
      const url = new URL(src, window.location.href);
      return url.pathname.replace(/^\//, "");
    } catch (error) {
      return String(src || "").replace(/^\.\//, "").split("?")[0];
    }
  }

  function managed(src) {
    const path = pathFromSrc(src);
    return MANAGED_DIRS.some((dir) => path.startsWith(dir));
  }

  function bust(src) {
    const url = new URL(src, window.location.href);
    url.searchParams.set("imgv", Date.now().toString());
    return url.toString();
  }

  function setup(img) {
    if (!img || img.dataset.galleryFallbackReady === "true") return;
    if (!managed(img.getAttribute("src") || img.src)) return;
    img.dataset.galleryFallbackReady = "true";
    img.addEventListener("error", () => {
      if (img.dataset.galleryFallbackUsed === "true") return;
      img.dataset.galleryFallbackUsed = "true";
      img.src = bust(img.getAttribute("src") || img.src);
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
