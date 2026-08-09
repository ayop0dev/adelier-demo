/*
  Frontend Prototype V1 — shared behavior.
  No framework, no build step (docs/03-execution/05-PROTOTYPE-V1-DECISIONS.md §11).
*/
(function () {
  'use strict';

  var focusable = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])';

  /* Header — scroll background swap + hide-on-scroll-down / reveal-on-scroll-up.
     Not permanently fixed (V1 Decisions §6 Header). */
  function header() {
    var el = document.querySelector('[data-header]');
    if (!el) return;

    var lastY = window.scrollY;
    var ticking = false;
    var HIDE_AFTER = el.offsetHeight;

    function update() {
      var y = window.scrollY;
      el.classList.toggle('is-scrolled', y > 8);

      var menuOpen = document.body.classList.contains('mobile-nav-open');
      if (!menuOpen) {
        if (y > lastY && y > HIDE_AFTER) {
          el.classList.add('is-hidden');
        } else if (y < lastY) {
          el.classList.remove('is-hidden');
        }
      }
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* Mobile / tablet fullscreen nav — focus trap, Esc, resize-close (spec §5 Header D-005). */
  function menu() {
    var trigger = document.querySelector('[data-menu-trigger]');
    var nav = document.querySelector('[data-mobile-nav]');
    var close = document.querySelector('[data-menu-close]');
    if (!trigger || !nav || !close) return;

    var previouslyFocused;

    function open() {
      previouslyFocused = document.activeElement;
      nav.classList.add('is-open');
      nav.removeAttribute('inert');
      nav.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mobile-nav-open');
      var first = nav.querySelector(focusable);
      if (first) first.focus({ preventScroll: true });
    }

    function shut() {
      nav.classList.remove('is-open');
      nav.setAttribute('aria-hidden', 'true');
      nav.setAttribute('inert', '');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-nav-open');
      if (previouslyFocused) previouslyFocused.focus({ preventScroll: true });
    }

    trigger.addEventListener('click', open);
    close.addEventListener('click', shut);
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', shut); });

    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { shut(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(nav.querySelectorAll(focusable));
      if (!items.length) return;
      var firstEl = items[0];
      var lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1280) shut();
    });
  }

  /* Active nav item — matches the current document against nav link hrefs (spec §5 D-007). */
  function activeNav() {
    var links = document.querySelectorAll('.site-header__nav-link, .mobile-nav__link');
    var here = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach(function (link) {
      var target = link.getAttribute('href').split('/').pop();
      if (target === here) link.setAttribute('aria-current', 'page');
    });
  }

  /* In-page section navigation — scrollspy, independent of the main Header nav
     (V1 Decisions §6 "In-page section navigation"). */
  function sectionNav() {
    var nav = document.querySelector('[data-section-nav]');
    if (!nav) return;
    var pairs = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')).map(function (link) {
      return { link: link, section: document.querySelector(link.getAttribute('href')) };
    }).filter(function (p) { return p.section; });

    function setActive(pair) {
      pairs.forEach(function (p) { p.link.removeAttribute('aria-current'); });
      pair.link.setAttribute('aria-current', 'location');
    }

    pairs.forEach(function (p) { p.link.addEventListener('click', function () { setActive(p); }); });

    /* Scroll-position marker (not IntersectionObserver): a ratio-based
       observer never reliably fires for a very tall pinned section (like the
       editorial slider's scroll runway) — its intersectionRatio, measured
       against its own huge area, stays under any reasonable threshold for
       almost its entire scroll range. Checking which section's box currently
       contains a fixed viewport marker works uniformly regardless of a
       section's height. */
    function update() {
      nav.classList.toggle('is-visible', window.scrollY > 300);

      var markerY = window.innerHeight * 0.3;
      var current = null;
      pairs.forEach(function (p) {
        var r = p.section.getBoundingClientRect();
        if (r.top <= markerY && r.bottom > markerY) current = p;
      });
      if (current) setActive(current);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }, { passive: true });
    update();
  }

  /* Testimonials carousel — manual prev/next + dots, autoplay disabled (spec §5 Carousel, D-088). */
  function carousel() {
    var root = document.querySelector('[data-carousel]');
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-dot]'));
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var i = 0;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, idx) { s.classList.toggle('is-active', idx === i); });
      dots.forEach(function (d, idx) { d.classList.toggle('is-active', idx === i); });
    }

    if (prev) prev.addEventListener('click', function () { show(i - 1); });
    if (next) next.addEventListener('click', function () { show(i + 1); });
    dots.forEach(function (d, idx) { d.addEventListener('click', function () { show(idx); }); });
  }

  /* Careers — static job detail modal (spec §5 Modal; V1 Decisions Careers). */
  function jobModal() {
    var modal = document.querySelector('[data-job-modal]');
    if (!modal) return;
    var titleEl = modal.querySelector('[data-job-modal-title]');
    var closeBtn = modal.querySelector('[data-job-modal-close]');
    var backdrop = modal.querySelector('[data-job-modal-backdrop]');
    var opener;

    function open(title) {
      opener = document.activeElement;
      if (titleEl) titleEl.textContent = title;
      modal.classList.add('is-open');
      modal.removeAttribute('inert');
      document.body.classList.add('mobile-nav-open');
      closeBtn.focus();
    }

    function shut() {
      modal.classList.remove('is-open');
      modal.setAttribute('inert', '');
      document.body.classList.remove('mobile-nav-open');
      if (opener) opener.focus();
    }

    document.querySelectorAll('[data-job-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { open(btn.dataset.jobOpen); });
    });
    closeBtn.addEventListener('click', shut);
    if (backdrop) backdrop.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) shut();
    });
  }

  /* Static forms — no backend in V1; inline confirmation only (spec §5 Forms D-054). */
  function forms() {
    document.querySelectorAll('[data-static-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = form.querySelector('[data-form-status]');
        if (status) {
          status.textContent = 'Thank you — your message has been prepared for review.';
          status.dataset.state = 'success';
          status.classList.remove('visually-hidden');
        }
      });
    });
    document.querySelectorAll('a[aria-disabled="true"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); });
    });
  }

  /* Back to top — appears after 600px of scroll, desktop only (spec §5 Footer D-017). */
  function backToTop() {
    var btn = document.querySelector('[data-back-to-top]');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }



  /* Editorial panoramic slider — pinned, scroll-driven horizontal showcase.
     The section's own height equals exactly the pixel distance the track
     needs to travel (1:1 with scroll — no dead runway either side). The pin
     is driven manually (fixed while progress is 0–1, absolute to the
     section's own top/bottom outside that) rather than via CSS
     position:sticky, which would cost a full extra viewport-height of dead
     scroll while it releases. */
  function editorialSlider() {
    var sliders = document.querySelectorAll('[data-editorial-slider]');
    if (!sliders.length) return;

    sliders.forEach(function (root) {
      var sticky = root.querySelector('[data-slider-sticky]');
      var track = root.querySelector('[data-slider-track]');
      var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slider-slide]'));
      var dotsWrap = root.querySelector('[data-slider-dots]');
      if (!sticky || !track || !slides.length) return;

      var dots = slides.map(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'editorial-slider__dot';
        b.setAttribute('aria-label', 'Go to image ' + (i + 1) + ' of ' + slides.length);
        if (dotsWrap) dotsWrap.appendChild(b);
        return b;
      });

      var status = document.createElement('span');
      status.className = 'visually-hidden';
      status.setAttribute('aria-live', 'polite');
      root.appendChild(status);

      sticky.setAttribute('tabindex', '0');
      sticky.setAttribute('role', 'group');
      sticky.setAttribute('aria-roledescription', 'carousel');
      sticky.setAttribute('aria-label', 'Visual showcase — use arrow keys to browse');

      /* Tap-to-reveal the overlay on touch devices (no hover state to rely
         on) — CSS handles real mouse hover on its own. */
      slides.forEach(function (s) {
        s.addEventListener('click', function () {
          s.classList.toggle('is-revealed');
        });
      });

      var maxTravel = 0;
      var runway = 0;
      var lastAnnounced = -1;

      function measure() {
        maxTravel = Math.max(0, track.scrollWidth - sticky.clientWidth);
        runway = maxTravel;
        root.style.height = Math.max(runway, 1) + 'px';
      }

      function progress() {
        if (runway <= 0) return 0;
        var top = root.getBoundingClientRect().top;
        return Math.min(1, Math.max(0, -top / runway));
      }

      function updatePinState() {
        var rect = root.getBoundingClientRect();
        if (rect.top > 0) {
          sticky.classList.remove('is-pinned', 'is-past');
        } else if (rect.bottom > 0) {
          sticky.classList.add('is-pinned');
          sticky.classList.remove('is-past');
        } else {
          sticky.classList.add('is-past');
          sticky.classList.remove('is-pinned');
        }
      }

      /* Fraction of progress, at each end, spent fading the whole pinned
         scene in/out — softens the handoff into and out of the next
         section instead of a hard cut the instant the pin releases. */
      var FADE_ZONE = 0.08;

      function apply(p) {
        updatePinState();
        track.style.transform = 'translate3d(' + (-p * maxTravel) + 'px,0,0)';

        var fadeOut = p > 1 - FADE_ZONE ? Math.max(0, (1 - p) / FADE_ZONE) : 1;
        var fadeIn = p < FADE_ZONE ? Math.max(0, p / FADE_ZONE) : 1;
        sticky.style.opacity = Math.min(fadeOut, fadeIn);

        var idxFloat = p * (slides.length - 1);
        var nearest = Math.round(idxFloat);

        slides.forEach(function (s, i) {
          s.classList.toggle('is-active', i === nearest);
        });

        dots.forEach(function (d, i) {
          var activeness = Math.max(0, 1 - Math.abs(idxFloat - i));
          d.style.setProperty('--dot-activeness', activeness.toFixed(3));
          d.classList.toggle('is-active', i === nearest);
        });

        if (nearest !== lastAnnounced) {
          lastAnnounced = nearest;
          status.textContent = 'Image ' + (nearest + 1) + ' of ' + slides.length;
        }
      }

      function goToIndex(i) {
        var target = Math.min(slides.length - 1, Math.max(0, i));
        var p = slides.length > 1 ? target / (slides.length - 1) : 0;
        var top = window.scrollY + root.getBoundingClientRect().top + p * runway;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }

      var ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          apply(progress());
          ticking = false;
        });
      }

      var resizeTimer;
      function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          measure();
          apply(progress());
        }, 150);
      }

      dots.forEach(function (d, i) {
        d.addEventListener('click', function () { goToIndex(i); });
      });

      sticky.addEventListener('keydown', function (e) {
        var current = Math.round(progress() * (slides.length - 1));
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          goToIndex(current + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          goToIndex(current - 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          goToIndex(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          goToIndex(slides.length - 1);
        }
      });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);

      measure();
      apply(progress());
    });
  }

  /* Home hero — split-panel crossfade. Panels take turns advancing to the
     next image, then the trailing panel catches up before the next turn. */
  function heroSplit() {
    var section = document.querySelector('.hero-split');
    if (!section) return;

    var leftLayers = Array.prototype.slice.call(section.querySelectorAll('.hero-split__panel--a .hero-split__layer'));
    var rightLayers = Array.prototype.slice.call(section.querySelectorAll('.hero-split__panel--b .hero-split__layer'));
    var count = leftLayers.length;
    if (!count) return;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var holdComplete = reducedMotion ? 4400 : 3400;
    var holdHybrid = reducedMotion ? 3200 : 2600;
    var state = { leftIdx: 0, rightIdx: 0, turn: 'left' };

    function applyActive(layers, activeIdx) {
      layers.forEach(function (img, i) {
        var active = i === activeIdx;
        img.style.opacity = active ? '1' : '0';
        img.style.transform = active ? 'scale(1)' : 'scale(1.045)';
      });
    }

    function render() {
      applyActive(leftLayers, state.leftIdx);
      applyActive(rightLayers, state.rightIdx);
    }

    function step() {
      if (state.leftIdx === state.rightIdx) {
        if (state.turn === 'left') {
          state.leftIdx = (state.leftIdx + 1) % count;
        } else {
          state.rightIdx = (state.rightIdx + 1) % count;
        }
        render();
        setTimeout(step, holdHybrid);
      } else {
        if (state.turn === 'left') {
          state.rightIdx = state.leftIdx;
          state.turn = 'right';
        } else {
          state.leftIdx = state.rightIdx;
          state.turn = 'left';
        }
        render();
        setTimeout(step, holdComplete);
      }
    }

    setTimeout(step, holdComplete);
  }

  header();
  menu();
  activeNav();
  sectionNav();
  carousel();
  jobModal();
  forms();
  backToTop();
  editorialSlider();
  heroSplit();
}());
