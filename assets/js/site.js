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
    var footer = document.querySelector('.site-footer');
    function update() {
      var footerVisible = false;
      if (footer) {
        footerVisible = footer.getBoundingClientRect().top < window.innerHeight;
      }
      nav.classList.toggle('is-visible', window.scrollY > 300 && !footerVisible);

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

  /* Home hero — Dual Slider */
  function dualSliderHero() {
    var section = document.querySelector('.dsh-hero');
    if (!section) return;

    var TRANSITION_SPEED = 1100;
    var WIPE_SAME = false;

    var LEFT_POS = [
      { desktop: 'center 40%', mobile: 'center 30%' },
      { desktop: 'center 55%', mobile: 'center 45%' },
      { desktop: 'center 35%', mobile: 'center 40%' },
      { desktop: 'center 45%', mobile: 'center 35%' }
    ];
    var RIGHT_POS = [
      { desktop: 'center 45%', mobile: 'center 40%' },
      { desktop: 'center 50%', mobile: 'center 45%' },
      { desktop: 'center 40%', mobile: 'center 35%' },
      { desktop: 'center 55%', mobile: 'center 50%' }
    ];

    var mqMobile = window.matchMedia('(max-width: 860px)');
    var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    var sides = ['left', 'right'].map(function (name) {
      return {
        name: name,
        positions: name === 'left' ? LEFT_POS : RIGHT_POS,
        layers: Array.prototype.slice.call(document.querySelectorAll('.dsh-layer[data-side="' + name + '"]')),
        active: 0,
        timer: null
      };
    });

    function applyPositions() {
      var isMobile = mqMobile.matches;
      sides.forEach(function (side) {
        side.layers.forEach(function (layer, i) {
          layer.style.objectPosition = isMobile ? side.positions[i].mobile : side.positions[i].desktop;
        });
      });
    }

    function resetLayerStyles(side) {
      side.layers.forEach(function (layer, i) {
        var isActive = i === side.active;
        layer.style.transition = 'none';
        layer.style.clipPath = 'inset(0px)';
        layer.style.transform = 'translate(0%, 0%)';
        layer.style.opacity = isActive ? '1' : '0';
        layer.style.zIndex = isActive ? '2' : '1';
      });
    }

    function crossfadeStep(side) {
      var next = (side.active + 1) % side.layers.length;
      side.layers.forEach(function (layer, i) {
        layer.style.transition = 'opacity 900ms ease';
        layer.style.opacity = i === next ? '1' : '0';
        layer.style.zIndex = i === next ? '2' : '1';
        layer.style.transform = 'translate(0%, 0%)';
      });
      side.active = next;
      side.timer = setTimeout(function () { crossfadeStep(side); }, 4000);
    }

    function slideStep(side) {
      var count = side.layers.length;
      var current = side.active;
      var next = (current + 1) % count;
      var outgoing = side.layers[current];
      var incoming = side.layers[next];
      
      var isMobile = mqMobile.matches;
      var transformProperty = isMobile ? 'translateX' : 'translateY';
      
      var outTranslate = side.name === 'left' ? '100%' : '-100%';
      var inTranslate  = side.name === 'left' ? '-100%' : '100%';

      incoming.style.transition = 'none';
      incoming.style.clipPath = 'inset(0px)';
      incoming.style.transform = transformProperty + '(' + inTranslate + ')';
      incoming.style.zIndex = '3';
      incoming.style.opacity = '1';
      
      outgoing.style.transition = 'none';
      outgoing.style.transform = transformProperty + '(0%)';
      outgoing.style.zIndex = '2';
      outgoing.style.opacity = '1';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var trans = 'transform ' + TRANSITION_SPEED + 'ms cubic-bezier(.65,0,.35,1)';
          incoming.style.transition = trans;
          outgoing.style.transition = trans;
          
          incoming.style.transform = transformProperty + '(0%)';
          outgoing.style.transform = transformProperty + '(' + outTranslate + ')';
        });
      });

      side.timer = setTimeout(function () {
        outgoing.style.zIndex = '1';
        outgoing.style.opacity = '0';
        incoming.style.zIndex = '2';
        side.active = next;
        side.timer = setTimeout(function () { slideStep(side); }, 5000);
      }, TRANSITION_SPEED + 40);
    }

    function start() {
      sides.forEach(function (side) { clearTimeout(side.timer); });

      var reduced = mqReduced.matches;
      sides.forEach(resetLayerStyles);
      applyPositions();

      var stepFn = reduced ? crossfadeStep : slideStep;
      var initialDelay = reduced ? 4000 : 2600;
      sides.forEach(function (side) {
        side.timer = setTimeout(function () { stepFn(side); }, initialDelay);
      });
    }

    mqMobile.addEventListener('change', applyPositions);
    mqReduced.addEventListener('change', start);

    start();

    window.addEventListener('beforeunload', function () {
      sides.forEach(function (side) { clearTimeout(side.timer); });
    });
  }

  header();
  menu();
  activeNav();
  sectionNav();
  carousel();
  jobModal();
  backToTop();
  dualSliderHero();
}());
