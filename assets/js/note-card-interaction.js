(() => {
  const enhancedCards = new WeakSet();

  function enhanceNoteCards(root = document) {
    root.querySelectorAll(".note-card").forEach((card) => {
      if (enhancedCards.has(card)) return;
      const link = card.querySelector(".note-link");
      if (!link) return;

      enhancedCards.add(card);
      card.classList.add("is-clickable");
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", card.querySelector("h3")?.textContent || "Open log");

      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button, input, select, textarea")) return;
        window.location.href = link.href;
      });

      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        window.location.href = link.href;
      });
    });
  }

  function boot() {
    enhanceNoteCards();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(".note-card")) {
            enhanceNoteCards(node.parentElement || document);
            return;
          }
          if (node.querySelector(".note-card")) enhanceNoteCards(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
