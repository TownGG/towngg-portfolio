(() => {
  const root = document.documentElement;
  root.classList.add("motion-ready");

  const progress = document.querySelector("[data-story-progress]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compactMotion = window.matchMedia("(max-width: 760px)").matches;
  const motionScale = compactMotion ? 0.48 : 1;

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

  const once = (trigger, start = "top 78%") => ({
    trigger,
    start,
    once: true,
    toggleActions: "play none none none"
  });

  const clearMotionProps = "transform,opacity,visibility,clipPath,filter";

  /* Hero: slow cinematic reveal. */
  const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTimeline
    .from("[data-hero-image]", { scale: 1.16, duration: 1.7, ease: "power2.out" }, 0)
    .from("[data-hero-copy]", { y: 44 * motionScale, opacity: 0, duration: .9, stagger: .12 }, .2)
    .from(".scroll-cue", { y: 16 * motionScale, opacity: 0, duration: .7 }, 1.05);

  gsap.to("[data-hero-image]", {
    yPercent: compactMotion ? 5 : 12,
    scale: compactMotion ? 1.06 : 1.1,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".cassilia-orbit.orbit-a", {
    rotation: compactMotion ? 24 : 70,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".cassilia-orbit.orbit-b", {
    rotation: compactMotion ? -32 : -95,
    ease: "none",
    scrollTrigger: {
      trigger: ".cassilia-hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  /* Character profile: photographs unfold like memories from different universes. */
  const identityTimeline = gsap.timeline({
    scrollTrigger: once(".identity-photo-stack", "top 76%")
  });
  identityTimeline
    .from(".identity-photo-main", {
      autoAlpha: 0,
      y: 68 * motionScale,
      scale: .9,
      duration: .95,
      ease: "power3.out",
      clearProps: clearMotionProps
    })
    .from(".identity-photo-a", {
      autoAlpha: 0,
      x: -92 * motionScale,
      y: 34 * motionScale,
      rotation: -11,
      scale: .84,
      duration: .78,
      ease: "back.out(1.12)",
      clearProps: clearMotionProps
    }, "-=.48")
    .from(".identity-photo-b", {
      autoAlpha: 0,
      x: 92 * motionScale,
      y: -28 * motionScale,
      rotation: 10,
      scale: .84,
      duration: .78,
      ease: "back.out(1.12)",
      clearProps: clearMotionProps
    }, "-=.64");

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
    xPercent: compactMotion ? -10 : -25,
    ease: "none",
    scrollTrigger: {
      trigger: ".identity-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  /* Temerius: a slow background push and a diagonal blade-like reveal. */
  gsap.to(".sword-bg img", {
    xPercent: compactMotion ? -2 : -7,
    scale: compactMotion ? 1.08 : 1.16,
    ease: "none",
    scrollTrigger: {
      trigger: ".sword-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.from(".sword-detail-shot", {
    autoAlpha: 0,
    x: 100 * motionScale,
    y: 42 * motionScale,
    rotation: compactMotion ? 0 : 2.5,
    clipPath: "polygon(28% 0, 100% 0, 100% 100%, 0 100%)",
    duration: 1.05,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".sword-detail-shot", "top 82%")
  });

  gsap.fromTo(".whisper-field span",
    { opacity: .03, x: 24 * motionScale },
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

  /* Terminus: alternating combat frames enter from opposing directions. */
  gsap.from(".terminus-main-shot", {
    autoAlpha: 0,
    x: -110 * motionScale,
    y: 24 * motionScale,
    scale: .94,
    duration: .9,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".terminus-gallery", "top 80%")
  });

  gsap.from(".terminus-secondary-shot", {
    autoAlpha: 0,
    x: 110 * motionScale,
    y: 36 * motionScale,
    scale: .94,
    duration: .9,
    delay: .18,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".terminus-gallery", "top 80%")
  });

  gsap.from(".terminus-battle-strip figure", {
    autoAlpha: 0,
    x: (index) => (index % 2 === 0 ? -76 : 76) * motionScale,
    y: 28 * motionScale,
    scale: .92,
    duration: .72,
    stagger: .13,
    ease: "power2.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".terminus-battle-strip", "top 84%")
  });

  gsap.to(".battle-line", {
    xPercent: compactMotion ? -12 : -30,
    ease: "none",
    scrollTrigger: {
      trigger: ".terminus-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  /* Unity: image resolves from blur instead of flying like a normal card. */
  gsap.fromTo(".unity-section .story-photo-bg img",
    {
      scale: compactMotion ? 1.08 : 1.18,
      filter: `blur(${compactMotion ? 7 : 15}px) brightness(.34) saturate(.55)`
    },
    {
      scale: 1.02,
      filter: "blur(0px) brightness(.72) saturate(.82)",
      duration: 1.45,
      ease: "power2.out",
      scrollTrigger: once(".unity-section", "top 78%")
    }
  );

  gsap.to(".unity-ring", {
    rotation: compactMotion ? 48 : 135,
    scale: compactMotion ? 1.03 : 1.08,
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

  /* Soul link: two universes move toward one another and the companion frame follows. */
  gsap.from(".soul-left", {
    xPercent: compactMotion ? -3 : -10,
    opacity: .28,
    scrollTrigger: {
      trigger: ".soul-section",
      start: "top bottom",
      end: "center center",
      scrub: true
    }
  });

  gsap.from(".soul-right", {
    xPercent: compactMotion ? 3 : 10,
    opacity: .28,
    scrollTrigger: {
      trigger: ".soul-section",
      start: "top bottom",
      end: "center center",
      scrub: true
    }
  });

  gsap.from(".soul-companion-shot", {
    autoAlpha: 0,
    x: 82 * motionScale,
    y: 42 * motionScale,
    scale: .86,
    duration: .88,
    ease: "back.out(1.08)",
    clearProps: clearMotionProps,
    scrollTrigger: once(".soul-companion-shot", "top 88%")
  });

  gsap.fromTo(".soul-bridge span",
    { scale: .55, boxShadow: "0 0 20px 4px rgba(242, 209, 141, .18)" },
    {
      scale: 1.35,
      boxShadow: "0 0 56px 18px rgba(242, 209, 141, .46)",
      repeat: compactMotion ? 2 : 5,
      yoyo: true,
      duration: .9,
      ease: "sine.inOut",
      scrollTrigger: {
        trigger: ".soul-section",
        start: "top 75%",
        toggleActions: "play none none none"
      }
    }
  );

  /* Allies: quick tactical cuts after the text establishes their relationship. */
  gsap.from(".relationship-gallery figure", {
    autoAlpha: 0,
    x: (index) => (index % 2 === 0 ? -88 : 88) * motionScale,
    y: 22 * motionScale,
    scale: .95,
    duration: .68,
    stagger: .12,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".relationship-gallery", "top 84%")
  });

  /* Lives across universes: staggered portrait wall. */
  gsap.from(".legacy-intro-gallery figure", {
    autoAlpha: 0,
    y: (index) => (index % 2 === 0 ? 72 : -48) * motionScale,
    rotation: (index) => (index % 2 === 0 ? -3 : 3) * motionScale,
    scale: .9,
    duration: .8,
    stagger: .09,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".legacy-intro-gallery", "top 82%")
  });

  /* Constellation: soft memory-photo reveal. */
  gsap.from(".constellation-chapter .legacy-media-grid figure", {
    autoAlpha: 0,
    y: 48 * motionScale,
    scale: .96,
    filter: "blur(8px)",
    duration: .88,
    stagger: .1,
    ease: "power2.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".constellation-chapter", "top 78%")
  });

  /* Power Fist: main image lands with impact; equipment variants snap in around it. */
  const powerTimeline = gsap.timeline({
    scrollTrigger: once(".power-media-grid", "top 80%")
  });
  powerTimeline
    .from(".power-media-grid .legacy-media-main", {
      autoAlpha: 0,
      x: -82 * motionScale,
      y: 34 * motionScale,
      scale: .82,
      rotation: compactMotion ? 0 : -1.5,
      filter: "brightness(1.35) contrast(1.12)",
      duration: .78,
      ease: "expo.out",
      clearProps: clearMotionProps
    })
    .from(".power-media-grid figure:not(.legacy-media-main)", {
      autoAlpha: 0,
      x: (index) => (index % 2 === 0 ? 68 : -46) * motionScale,
      y: (index) => (index % 3 === 0 ? 42 : -24) * motionScale,
      scale: .88,
      duration: .64,
      stagger: .085,
      ease: "back.out(1.12)",
      clearProps: clearMotionProps
    }, "-=.38");

  /* Mantis: sharper diagonal entries to echo the blade silhouette. */
  gsap.from(".mantis-media-grid figure", {
    autoAlpha: 0,
    x: (index) => (index % 2 === 0 ? -94 : 94) * motionScale,
    y: (index) => (index % 2 === 0 ? 52 : -38) * motionScale,
    rotation: (index) => (index % 2 === 0 ? -4 : 4) * motionScale,
    clipPath: (index) => index % 2 === 0
      ? "polygon(16% 0, 100% 0, 84% 100%, 0 100%)"
      : "polygon(0 0, 84% 0, 100% 100%, 16% 100%)",
    scale: .92,
    duration: .78,
    stagger: .1,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".mantis-chapter", "top 80%")
  });

  /* Casual life: calm upward drift with no aggressive rotation. */
  gsap.from(".casual-chapter .legacy-media-grid figure", {
    autoAlpha: 0,
    y: (index) => (54 + index * 8) * motionScale,
    scale: .96,
    duration: .9,
    stagger: .12,
    ease: "power2.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".casual-chapter", "top 80%")
  });

  /* Connected mods: orderly card reveal rather than cinematic chaos. */
  gsap.from(".cassilia-mod-card", {
    autoAlpha: 0,
    y: 48 * motionScale,
    scale: .97,
    duration: .68,
    stagger: .08,
    ease: "power2.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".cassilia-mod-grid", "top 84%")
  });

  gsap.to(".ownership-sword", {
    xPercent: compactMotion ? -6 : -16,
    rotation: compactMotion ? 0 : -2,
    ease: "none",
    scrollTrigger: {
      trigger: ".ownership-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  /* Finale: the image recedes while each sentence arrives in sequence. */
  gsap.from(".finale-copy > p, .finale-copy > h2, .finale-copy > .chapter-actions", {
    autoAlpha: 0,
    y: 42 * motionScale,
    duration: .78,
    stagger: .12,
    ease: "power3.out",
    clearProps: clearMotionProps,
    scrollTrigger: once(".finale-copy", "top 78%")
  });

  gsap.to(".finale-photo-bg img", {
    scale: compactMotion ? .98 : .94,
    ease: "none",
    scrollTrigger: {
      trigger: ".finale-section",
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
