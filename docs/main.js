/* swarm landing page
   Lenis owns scroll position. Everything reactive hangs off its rAF-driven "scroll"
   event, IntersectionObserver, or pointer events. No window scroll listener anywhere. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var stacked = window.matchMedia('(max-width: 860px)');
  var lenis = null;

  /* ── smooth scroll ─────────────────────────────────────── */

  if (!reduced && typeof Lenis === 'function') {
    lenis = new Lenis({
      duration: 1.15,
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

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -66 });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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

  /* ── reveal, and the counters inside a revealed card ───── */

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var start = performance.now();

    var tick = function (now) {
      var t = Math.min(1, (now - start) / 1400);
      var eased = 1 - Math.pow(1 - t, 4);
      var value = Math.round(target * eased);
      el.textContent = value.toLocaleString('en-US') + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function activate(el) {
    el.classList.add('is-in');
    el.querySelectorAll('[data-count]').forEach(function (counter) {
      if (reduced) {
        counter.textContent = parseFloat(counter.getAttribute('data-count')).toLocaleString('en-US') +
          (counter.getAttribute('data-suffix') || '');
      } else {
        countUp(counter);
      }
    });
  }

  var revealables = document.querySelectorAll('.reveal');

  if (reduced) {
    revealables.forEach(activate);
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        activate(entry.target);
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    revealables.forEach(function (el) { revealer.observe(el); });
  }

  /* ── the journey: a camera flying down a corridor of phases ──
     Panels sit at translateZ(-i * SPACING). The lane moves toward the viewer,
     so each panel arrives, holds the frame, then passes behind the camera. */

  var journey = document.getElementById('journey');
  var lane = document.getElementById('lane');
  var floor = journey.querySelector('.grid-floor');
  var hudFill = document.getElementById('hudFill');
  var hudNow = document.getElementById('hudNow');
  var panels = Array.prototype.slice.call(journey.querySelectorAll('.panel'));

  var SPACING = 780;
  var START = -520;
  var TRAVEL = (panels.length - 1) * SPACING + 980;
  var shownPhase = '';

  function alphaFor(z) {
    if (z < -1750 || z > 430) return 0;
    if (z < -720) return (z + 1750) / 1030;
    if (z <= 130) return 1;
    return 1 - (z - 130) / 300;
  }

  function flyThrough() {
    var rect = journey.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    if (travel <= 0) return;

    var p = Math.min(1, Math.max(0, -rect.top / travel));
    var cam = START + p * TRAVEL;

    lane.style.setProperty('--cam', cam.toFixed(1));
    floor.style.setProperty('--floor', (cam * 0.14).toFixed(1));
    hudFill.style.setProperty('--p', p.toFixed(4));

    var best = 0;
    var bestAlpha = -1;

    panels.forEach(function (panel, i) {
      var a = alphaFor(cam - i * SPACING);
      panel.style.opacity = a.toFixed(3);
      panel.style.filter = a > 0.985 ? 'none' : 'blur(' + ((1 - a) * 6).toFixed(2) + 'px)';
      if (a > bestAlpha) { bestAlpha = a; best = i; }
    });

    var label = panels[best].querySelector('.panel-n').textContent;
    if (label !== shownPhase) {
      shownPhase = label;
      hudNow.textContent = label;
    }
  }

  function syncJourney() {
    if (reduced || stacked.matches) return;
    flyThrough();
  }

  /* ── pointer tilt on cards ─────────────────────────────── */

  if (!reduced && !coarse) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ── hero: a 3d swarm field on canvas ──────────────────── */

  (function swarmField() {
    var canvas = document.getElementById('swarm');
    if (!canvas || reduced) return;

    var ctx = canvas.getContext('2d');
    var agents = [];
    var COUNT = 108;
    var RADIUS = 250;
    var FOCAL = 560;
    var DEPTH = 780;
    var spin = 0;
    var pointerX = 0;
    var pointerY = 0;
    var alive = true;
    var w = 0;
    var h = 0;
    var cx = 0;
    var cy = 0;

    for (var i = 0; i < COUNT; i++) {
      // even-ish distribution on a shell, then pushed out at random radii
      var phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      var r = RADIUS * (0.55 + Math.random() * 0.5);
      agents.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.75,
        z: r * Math.cos(phi),
        s: 0.6 + Math.random() * 1.5,
        drift: 0.4 + Math.random() * 0.9
      });
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w < 900 ? w * 0.5 : w * 0.68;
      cy = h * 0.5;
    }

    function project(a, t) {
      var sy = Math.sin(spin);
      var cyy = Math.cos(spin);
      var x = a.x * cyy - a.z * sy;
      var z = a.x * sy + a.z * cyy;
      var y = a.y + Math.sin(t * 0.0006 * a.drift + a.s) * 12;

      x += pointerX * 26;
      y += pointerY * 18;

      var scale = FOCAL / (DEPTH + z);
      return { x: cx + x * scale, y: cy + y * scale, scale: scale, z: z };
    }

    function frame(t) {
      if (!alive) return;
      spin += 0.0016;
      ctx.clearRect(0, 0, w, h);

      var pts = agents.map(function (a) { return project(a, t); });

      // edges from the core to the agents nearest the camera
      ctx.lineWidth = 1;
      pts.forEach(function (p, i) {
        if (p.z > -60 || i % 3 !== 0) return;
        var a = 0.1 * (1 - (p.z + RADIUS) / (RADIUS * 2));
        ctx.strokeStyle = 'rgba(61, 155, 255, ' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(cx + pointerX * 26, cy + pointerY * 18);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });

      pts.forEach(function (p, i) {
        var depth = 1 - (p.z + RADIUS) / (RADIUS * 2);
        var radius = Math.max(0.6, agents[i].s * p.scale * 1.5);
        ctx.fillStyle = i % 5 === 0
          ? 'rgba(209, 232, 255, ' + (0.25 + depth * 0.6).toFixed(3) + ')'
          : 'rgba(61, 155, 255, ' + (0.16 + depth * 0.62).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // the core
      var coreX = cx + pointerX * 26;
      var coreY = cy + pointerY * 18;
      var glow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 90);
      glow.addColorStop(0, 'rgba(61, 155, 255, 0.32)');
      glow.addColorStop(1, 'rgba(61, 155, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 90, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0A0D12';
      ctx.strokeStyle = 'rgba(61, 155, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#DCEBFF';
      ctx.beginPath();
      ctx.arc(coreX, coreY, 5, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('pointermove', function (e) {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // the field only runs while the hero is on screen
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !alive) { alive = true; requestAnimationFrame(frame); }
      alive = visible;
    }, { threshold: 0 }).observe(canvas);

    requestAnimationFrame(frame);
  })();

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

      if (!navigator.clipboard) { done('Copy manually', false); return; }

      navigator.clipboard.writeText(text).then(
        function () { done('Copied', true); },
        function () { done('Copy manually', false); }
      );
    });
  });

  /* ── wire the scroll-driven parts ──────────────────────── */

  if (lenis) lenis.on('scroll', syncJourney);
  window.addEventListener('resize', syncJourney, { passive: true });
  stacked.addEventListener('change', syncJourney);
  syncJourney();
})();
