(() => {
  const root = document.documentElement;
  root.classList.add("motion-ready");

  const progress = document.querySelector("[data-story-progress]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateProgress() {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.width = `${ratio * 100}%`;
  }

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  const revealBlocks = document.querySelectorAll(".reveal-block");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

  revealBlocks.forEach((block) => revealObserver.observe(block));

  if (reducedMotion || !window.gsap || !window.ScrollTrigger) {
    revealBlocks.forEach((block) => block.classList.add("is-visible"));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTimeline
    .from("[data-hero-image]", { scale: 1.16, duration: 1.7, ease: "power2.out" }, 0)
    .from("[data-hero-copy]", { y: 44, opacity: 0, duration: .9, stagger: .12 }, .2)
    .from(".scroll-cue", { y: 16, opacity: 0, duration: .7 }, 1.05);

  gsap.to("[data-hero-image]", {
    yPercent: 12,
    scale: 1.1,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".cassilia-orbit.orbit-a", {
    rotation: 70,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".cassilia-orbit.orbit-b", {
    rotation: -95,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  const roles = Array.from(document.querySelectorAll("[data-role]"));
  if (roles.length) {
    const identity = ScrollTrigger.create({
      trigger: "[data-identity-stage]",
      start: "top 70%",
      end: "bottom 25%",
      scrub: true,
      onUpdate: (self) => {
        const index = Math.min(roles.length - 1, Math.floor(self.progress * roles.length));
        roles.forEach((role, roleIndex) => role.classList.toggle("is-current", roleIndex === index));
      }
    });
    window.addEventListener("pagehide", () => identity.kill(), { once: true });
  }

  gsap.to(".identity-marquee", {
    xPercent: -25,
    ease: "none",
    scrollTrigger: {
      trigger: ".identity-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".sword-bg img", {
    xPercent: -7,
    scale: 1.16,
    ease: "none",
    scrollTrigger: {
      trigger: ".sword-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.fromTo(".whisper-field span",
    { opacity: .03, x: 24 },
    {
      opacity: .35,
      x: 0,
      stagger: .16,
      scrollTrigger: {
        trigger: ".sword-section",
        start: "top 55%",
        end: "bottom 35%",
        scrub: true
      }
    }
  );

  gsap.to(".battle-line", {
    xPercent: -30,
    ease: "none",
    scrollTrigger: {
      trigger: ".terminus-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".unity-ring", {
    rotation: 135,
    scale: 1.08,
    ease: "none",
    scrollTrigger: {
      trigger: ".unity-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.fromTo(".unity-copy",
    { opacity: .15, scale: .92 },
    {
      opacity: 1,
      scale: 1,
      scrollTrigger: {
        trigger: ".unity-section",
        start: "top 62%",
        end: "center center",
        scrub: true
      }
    }
  );

  gsap.fromTo(".soul-bridge span",
    { scale: .55, boxShadow: "0 0 20px 4px rgba(242, 209, 141, .18)" },
    {
      scale: 1.35,
      boxShadow: "0 0 56px 18px rgba(242, 209, 141, .46)",
      repeat: 5,
      yoyo: true,
      duration: .9,
      ease: "sine.inOut",
      scrollTrigger: {
        trigger: ".soul-section",
        start: "top 75%",
        toggleActions: "play none none reverse"
      }
    }
  );

  gsap.from(".soul-left", {
    xPercent: -8,
    scrollTrigger: {
      trigger: ".soul-section",
      start: "top bottom",
      end: "center center",
      scrub: true
    }
  });

  gsap.from(".soul-right", {
    xPercent: 8,
    scrollTrigger: {
      trigger: ".soul-section",
      start: "top bottom",
      end: "center center",
      scrub: true
    }
  });

  gsap.to(".mantis-suit", {
    yPercent: -6,
    rotation: -7,
    ease: "none",
    scrollTrigger: {
      trigger: ".mantis-chapter",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".mantis-blade", {
    yPercent: 7,
    rotation: 8,
    ease: "none",
    scrollTrigger: {
      trigger: ".mantis-chapter",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".ownership-sword", {
    xPercent: -16,
    rotation: -2,
    ease: "none",
    scrollTrigger: {
      trigger: ".ownership-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".finale-glow", {
    scale: 1.18,
    opacity: .45,
    ease: "none",
    scrollTrigger: {
      trigger: ".finale-section",
      start: "top bottom",
      end: "center center",
      scrub: true
    }
  });

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
