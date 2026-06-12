(() => {
  function enhanceNoteCards() {
    document.querySelectorAll(".note-card").forEach((card) => {
      const link = card.querySelector(".note-link");
      if (!link) return;
      card.classList.add("is-clickable");
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", link.textContent ? `${link.textContent}: ${card.querySelector("h3")?.textContent || "Open log"}` : "Open log");

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

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => window.setTimeout(enhanceNoteCards, 250));
  } else {
    window.setTimeout(enhanceNoteCards, 250);
  }
})();
