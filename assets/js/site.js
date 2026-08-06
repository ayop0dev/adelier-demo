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

    function updateVisibility() {
      nav.classList.toggle('is-visible', window.scrollY > 300);
    }
    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
        if (visible) {
          var match = pairs.find(function (p) { return p.section === visible.target; });
          if (match) setActive(match);
        }
      }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.3, 0.6] });
      pairs.forEach(function (p) { io.observe(p.section); });
    }
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



  /* Editorial panoramic slider — magnetic scroll snap + active caption sync */
  function editorialSlider() {
    var sliders = document.querySelectorAll('[data-editorial-slider]');
    if (!sliders.length) return;

    sliders.forEach(function (slider) {
      var track = slider.querySelector('[data-slider-track]');
      var slides = Array.prototype.slice.call(slider.querySelectorAll('[data-slider-slide]'));
      if (!track || !slides.length) return;

      function updateActive() {
        var trackRect = track.getBoundingClientRect();
        var trackCenter = trackRect.left + trackRect.width / 2;
        var closestSlide = slides[0];
        var minDistance = Infinity;

        slides.forEach(function (slide) {
          var slideRect = slide.getBoundingClientRect();
          var slideCenter = slideRect.left + slideRect.width / 2;
          var dist = Math.abs(slideCenter - trackCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestSlide = slide;
          }
        });

        slides.forEach(function (s) {
          s.classList.toggle('is-active', s === closestSlide);
        });
      }

      var ticking = false;
      track.addEventListener('scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            updateActive();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      slides.forEach(function (slide) {
        slide.addEventListener('click', function () {
          slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
      });

      updateActive();
    });
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
}());
