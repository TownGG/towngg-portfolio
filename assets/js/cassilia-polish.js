(() => {
  const image = (number) => `./assets/images/gallery-all-compressed/screenshot_20260729_${String(number).padStart(3, '0')}.jpg`;

  const setImage = (selector, number, alt = '') => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.src = image(number);
    if (alt) target.alt = alt;
  };

  const addBackground = (selector, number, alt = '') => {
    const section = document.querySelector(selector);
    if (!section || section.querySelector(':scope > .story-photo-bg')) return;
    const layer = document.createElement('div');
    layer.className = 'story-photo-bg';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `<img src="${image(number)}" alt="${alt}" loading="lazy">`;
    section.prepend(layer);
  };

  const filmstripMarkup = (numbers, caption) => {
    const strip = document.createElement('div');
    strip.className = 'scene-filmstrip reveal-block';
    strip.dataset.caption = caption;
    strip.innerHTML = numbers.map((number) => (
      `<figure><img src="${image(number)}" alt="Cassilia story scene" loading="lazy"></figure>`
    )).join('');
    return strip;
  };

  const galleryMarkup = (numbers, label) => {
    const gallery = document.createElement('div');
    gallery.className = 'story-gallery reveal-block';
    gallery.setAttribute('aria-label', label);
    gallery.innerHTML = numbers.map((number) => (
      `<figure><img src="${image(number)}" alt="Cassilia story gallery scene" loading="lazy"></figure>`
    )).join('');
    return gallery;
  };

  /* Narrative sections use clean, text-free screenshots from the new gallery upload. */
  setImage('.cassilia-hero-media img', 8, 'Cassilia story opening scene');
  setImage('.identity-portrait img', 9, 'Cassilia portrait');
  setImage('.sword-bg img', 10, 'Temerius story scene');
  setImage('.terminus-gallery .shot-wide img', 11, 'Cassilia at the forgotten temple');
  setImage('.terminus-gallery .shot-tall img', 12, 'Cassilia during the first encounter');
  setImage('.soul-left img', 14, 'The player universe');
  setImage('.soul-right img', 15, 'Cassilia in another universe');

  addBackground('.unity-section', 13);
  addBackground('.relationship-section', 16);
  addBackground('.ownership-section', 29);
  addBackground('.finale-section', 32);

  const identity = document.querySelector('.identity-section');
  if (identity && !identity.nextElementSibling?.classList.contains('scene-filmstrip')) {
    identity.after(filmstripMarkup([17, 18, 19], 'Fragments from lives before the Unity'));
  }

  const terminus = document.querySelector('.terminus-section');
  if (terminus && !terminus.nextElementSibling?.classList.contains('scene-filmstrip')) {
    terminus.after(filmstripMarkup([20, 21, 22], 'The temple · The battle · The crossing'));
  }

  const relationship = document.querySelector('.relationship-section');
  if (relationship && !relationship.nextElementSibling?.classList.contains('scene-filmstrip')) {
    relationship.after(filmstripMarkup([23, 24, 25], 'A connection carried across universes'));
  }

  const legacy = document.querySelector('.legacy-section');
  if (legacy && !legacy.nextElementSibling?.classList.contains('story-gallery')) {
    legacy.after(galleryMarkup([26, 27, 28, 30, 31, 34], 'Cassilia life archive'));
  }

  const ownership = document.querySelector('.ownership-section');
  if (ownership && !ownership.nextElementSibling?.classList.contains('story-gallery')) {
    ownership.after(galleryMarkup([35, 36, 37, 38, 39, 40], 'Cassilia across the Settled Systems'));
  }

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.content = image(8);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.cassilia-hero-media img', {
    yPercent: 7,
    scale: 1.06,
    ease: 'none',
    scrollTrigger: {
      trigger: '.cassilia-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  document.querySelectorAll('.story-photo-bg img').forEach((photo) => {
    gsap.fromTo(photo,
      { yPercent: -4, scale: 1.06 },
      {
        yPercent: 5,
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: photo.closest('section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  });

  document.querySelectorAll('.scene-filmstrip figure, .story-gallery figure').forEach((card, index) => {
    gsap.from(card, {
      y: 38 + (index % 3) * 12,
      opacity: 0,
      duration: .8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 88%'
      }
    });
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
