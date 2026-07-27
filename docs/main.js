/* swarm landing page
   Lenis owns scroll position. Everything reactive hangs off its rAF-driven "scroll"
   event or IntersectionObserver, so there is no window scroll listener anywhere. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;

  /* ── smooth scroll ─────────────────────────────────────── */

  if (!reduced && typeof Lenis === 'function') {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });

    window.lenis = lenis;

    var raf = function (time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* in-page links, offset for the fixed nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -66 });
      } else {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  /* ── nav glass ─────────────────────────────────────────── */

  var nav = document.getElementById('nav');
  var sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
  document.body.prepend(sentinel);

  new IntersectionObserver(function (entries) {
    nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
  }).observe(sentinel);

  /* ── reveal on enter ───────────────────────────────────── */

  var revealables = document.querySelectorAll('.reveal');

  if (reduced) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    revealables.forEach(function (el) { revealer.observe(el); });
  }

  /* ── the run: scroll-scrubbed phase track ──────────────── */

  var run = document.getElementById('run');
  var steps = Array.prototype.slice.call(run.querySelectorAll('.step'));
  var ticks = Array.prototype.slice.call(run.querySelectorAll('.rail-ticks li'));
  var fill = run.querySelector('.rail-fill');
  var stacked = window.matchMedia('(max-width: 860px)');
  var active = -1;

  function setActive(index) {
    if (index === active) return;
    active = index;
    steps.forEach(function (step, i) { step.classList.toggle('is-active', i === index); });
    ticks.forEach(function (tick, i) {
      tick.classList.toggle('is-active', i === index);
      tick.classList.toggle('is-past', i < index);
    });
  }

  function showAll() {
    steps.forEach(function (step) { step.classList.add('is-active'); });
  }

  function scrub() {
    var rect = run.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    if (travel <= 0) return;

    var p = Math.min(1, Math.max(0, -rect.top / travel));
    fill.style.setProperty('--p', p.toFixed(4));
    setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 1.02)));
  }

  function sync() {
    if (reduced || stacked.matches) {
      showAll();
      return;
    }
    scrub();
  }

  if (reduced || stacked.matches) {
    showAll();
  } else {
    setActive(0);
  }

  if (lenis) {
    lenis.on('scroll', sync);
  }
  window.addEventListener('resize', sync, { passive: true });
  stacked.addEventListener('change', function () {
    active = -1;
    sync();
  });
  sync();

  /* ── copy the install command ──────────────────────────── */

  document.querySelectorAll('.copy').forEach(function (button) {
    var label = button.textContent;
    var timer;

    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      clearTimeout(timer);

      var done = function (message, ok) {
        button.textContent = message;
        button.classList.toggle('is-done', ok);
        timer = setTimeout(function () {
          button.textContent = label;
          button.classList.remove('is-done');
        }, 2000);
      };

      if (!navigator.clipboard) {
        done('Copy manually', false);
        return;
      }

      navigator.clipboard.writeText(text).then(
        function () { done('Copied', true); },
        function () { done('Copy manually', false); }
      );
    });
  });
})();
