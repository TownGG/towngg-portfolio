(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const hero = document.querySelector('.cassilia-hero');
  const heroCutout = document.querySelector('[data-cassilia-cutout]');

  if (hero && heroCutout) {
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      heroCutout.style.setProperty('--cutout-x', `${x * 18}px`);
      heroCutout.style.setProperty('--cutout-y', `${y * 10}px`);
      heroCutout.style.setProperty('--cutout-rotate', `${x * 0.7}deg`);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      heroCutout.style.setProperty('--cutout-x', '0px');
      heroCutout.style.setProperty('--cutout-y', '0px');
      heroCutout.style.setProperty('--cutout-rotate', '0deg');
    });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('[data-cassilia-cutout]', {
    yPercent: 8,
    scale: 1.035,
    ease: 'none',
    scrollTrigger: {
      trigger: '.cassilia-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  document.querySelectorAll('[data-cutout-layer]').forEach((layer, index) => {
    gsap.fromTo(layer,
      { yPercent: index % 2 ? 6 : -4, scale: .98 },
      {
        yPercent: index % 2 ? -5 : 6,
        scale: 1.025,
        ease: 'none',
        scrollTrigger: {
          trigger: layer.closest('section, article') || layer,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  });

  gsap.from('.character-profile > div', {
    y: 24,
    opacity: 0,
    duration: .65,
    stagger: .08,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.character-profile',
      start: 'top 82%'
    }
  });
})();
