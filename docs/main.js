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

  /* ── the run: a camera flying down a corridor of stations ──
     Stations, gate rings and agent motes all sit at a fixed translateZ inside
     .lane. Moving the lane moves the whole world, so every layer parallaxes off
     a single transform and the per-frame work stays down to opacity writes. */

  var journey = document.getElementById('journey');
  var lane = document.getElementById('lane');
  var hudTicks = Array.prototype.slice.call(document.getElementById('hudRail').children);
  var hudNow = document.getElementById('hudNow');
  var stations = Array.prototype.slice.call(journey.querySelectorAll('.station'));
  var rings = Array.prototype.slice.call(journey.querySelectorAll('.ring'));

  stations.forEach(function (station) {
    station.surface = station.querySelector('.station-inner');
  });

  var SPAN = 820;          // z gap between stations, mirrored as --span in the css
  var START = -860;
  var TRAVEL = (stations.length - 1) * SPAN + 880;
  var shownPhase = '';

  /* Agent motes fill the space between stations, so the corridor has volume
     instead of being eight cards on an empty track. Positions are written once;
     per frame they only get hidden as they pass the camera, because an element
     at positive z relative to the viewer blows up to fill the screen. */
  var motes = [];
  (function seedMotes() {
    var host = document.getElementById('motes');
    if (!host || reduced) return;

    var depth = stations.length * SPAN;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < 64; i++) {
      var el = document.createElement('i');
      var mz = -(Math.random() * depth + 140);
      var angle = Math.random() * Math.PI * 2;
      var spread = 320 + Math.random() * 520;

      el.style.setProperty('--mx', Math.round(Math.cos(angle) * spread) + 'px');
      el.style.setProperty('--my', Math.round(Math.sin(angle) * spread * 0.5) + 'px');
      el.style.setProperty('--mz', Math.round(mz) + 'px');
      // brighter than they were on paper: a violet dot on void needs the lift
      el.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);

      motes.push({ el: el, z: mz, hidden: false });
      frag.appendChild(el);
    }
    host.appendChild(frag);
  })();

  /* One station carries the frame at a time, and the window is sized so a
     fading station is fully gone before the next one is worth seeing.
     A part-faded card is a translucent white card: let two overlap and the far
     one reads straight through the near one's surface. Depth of field would not
     help, since blur is a grouping property and drops the station out of the
     corridor's preserve-3d context. Distance is carried by the tunnel, the gate
     rings and the motes instead, which are all thin enough to overlap safely. */
  function alphaFor(z) {
    if (z < -820 || z > 20) return 0;
    if (z < -300) return (z + 820) / 520;   // arrives
    if (z <= -200) return 1;                // owns the frame
    return 1 - (z + 200) / 220;             // clears before it swamps the copy
  }

  function ringAlpha(z) {
    if (z < -1700 || z > 60) return 0;
    if (z < -940) return 0.75 * (z + 1700) / 760;
    if (z <= -260) return 0.75;
    return 0.75 * (1 - (z + 260) / 320);
  }

  function flyThrough() {
    var rect = journey.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    if (travel <= 0) return;

    var p = Math.min(1, Math.max(0, -rect.top / travel));
    var cam = START + p * TRAVEL;

    lane.style.setProperty('--cam', cam.toFixed(1));
    // a slow bank, so the camera reads as flown rather than railed
    lane.style.setProperty('--roll', (Math.sin(p * Math.PI * 2.4) * 1.15).toFixed(3));

    var best = 0;
    var bestAlpha = -1;

    stations.forEach(function (station, i) {
      var a = alphaFor(cam - i * SPAN);
      // Fade the inner surface, never the station itself: see the note on
      // .station in styles.css. No depth-of-field blur either, since `filter`
      // breaks the depth sort the same way. Perspective scale plus opacity
      // carries the distance on its own.
      station.surface.style.opacity = a.toFixed(3);
      // is-live drives that station's diagram. It arms early so the diagram is
      // already drawing as the station resolves, and holds until the station is
      // nearly gone: without the gap between the two thresholds the diagram
      // would blank out again while the card is still plainly on screen.
      // Dropping it rewinds the draw, so scrolling back up replays each phase.
      if (a > 0.6) station.classList.add('is-live');
      else if (a < 0.22) station.classList.remove('is-live');
      if (a > bestAlpha) { bestAlpha = a; best = i; }
    });

    rings.forEach(function (ring, i) {
      ring.style.opacity = ringAlpha(cam - i * SPAN + 410).toFixed(3);
    });

    motes.forEach(function (mote) {
      var gone = cam + mote.z > -90;
      if (gone !== mote.hidden) {
        mote.hidden = gone;
        mote.el.style.visibility = gone ? 'hidden' : 'visible';
      }
    });

    hudTicks.forEach(function (tick, i) { tick.classList.toggle('on', i <= best); });

    var label = stations[best].querySelector('.station-n').textContent;
    if (label !== shownPhase) {
      shownPhase = label;
      hudNow.textContent = label;
    }
  }

  function syncJourney() {
    // Stacked mode uses the same station elements, so hand them back whatever
    // the corridor left on them: clear the inline fade and mark every diagram
    // live, since nothing is going to fly past to trigger them.
    if (reduced || stacked.matches) {
      stations.forEach(function (station) {
        station.surface.style.opacity = '';
        station.classList.add('is-live');
      });
      return;
    }
    flyThrough();
  }

  /* ── the page itself as a flight path ──────────────────────
     Every section is a waypoint. While a section sits in the reading band its
     transform is cleared outright, so settled type composites crisply; outside
     that band it banks off to the side and back into depth. The corridor is
     deliberately not a waypoint: transforming it would make it the containing
     block for its own sticky stage and kill the pin. */

  var waypoints = Array.prototype.slice.call(document.querySelectorAll('[data-waypoint]'));
  var worldPlanes = Array.prototype.slice.call(document.querySelectorAll('.world .grid-plane'));

  var SHIFT = 15;   // vw of lateral travel at full departure
  var TURN = 7;     // degrees of bank
  var PUSH = 300;   // px pushed back into depth

  function flyPage() {
    var vh = window.innerHeight;

    worldPlanes.forEach(function (plane) {
      plane.style.setProperty('--floor', (window.scrollY * 0.22).toFixed(1));
    });

    waypoints.forEach(function (el) {
      var r = el.getBoundingClientRect();
      // Measured against the reading band rather than centre to centre: a
      // section taller than the viewport has to stay square the whole time it
      // is being read, and its centre is nowhere near the middle of the screen.
      var ahead = Math.min(1, Math.max(0, (r.top - vh * 0.16) / vh));
      var behind = Math.min(1, Math.max(0, (vh * 0.84 - r.bottom) / vh));
      var d = ahead - behind;

      if (d === 0) {
        el.style.transform = '';
        return;
      }

      // Linear on purpose. An eased curve flattens the travel across exactly
      // the range that is still on screen, so the motion only really happens
      // once the section has already left. The band above is what keeps the
      // settle calm, so the ramp does not need to do that job twice.
      // The bank turns each section back toward the centre of the frame, the
      // way a panel on a corridor wall stays facing you as you pass it. Turning
      // the other way reads as the page peeling away from the reader.
      el.style.transform =
        'perspective(1400px) translate3d(' + (d * SHIFT).toFixed(2) + 'vw, 0, ' +
        (-Math.abs(d) * PUSH).toFixed(1) + 'px) rotateY(' + (d * TURN).toFixed(2) + 'deg)';
    });
  }

  function syncPage() {
    if (reduced || stacked.matches) {
      waypoints.forEach(function (el) { el.style.transform = ''; });
      return;
    }
    flyPage();
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
    var RADIUS = 215;
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
      // narrow screens have no room beside the copy, so the field moves into
      // the empty band above the headline instead of sitting behind it
      cx = w < 900 ? w * 0.5 : w * 0.75;
      cy = w < 900 ? h * 0.24 : h * 0.5;
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

      var coreX = cx + pointerX * 26;
      var coreY = cy + pointerY * 18;

      // edges from the core to the agents nearest the camera
      ctx.lineWidth = 1;
      pts.forEach(function (p, i) {
        if (p.z > -60 || i % 3 !== 0) return;
        var a = 0.11 * (1 - (p.z + RADIUS) / (RADIUS * 2));
        ctx.strokeStyle = 'rgba(140, 147, 216, ' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(coreX, coreY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });

      // aerial perspective, inverted for the void: near agents burn bright,
      // far ones sink back toward black, which is what reads as depth here.
      pts.forEach(function (p, i) {
        var depth = 1 - (p.z + RADIUS) / (RADIUS * 2);
        var radius = Math.max(0.6, agents[i].s * p.scale * 1.5);
        ctx.fillStyle = i % 5 === 0
          ? 'rgba(255, 255, 255, ' + (0.05 + depth * 0.55).toFixed(3) + ')'
          : 'rgba(140, 147, 216, ' + (0.06 + depth * 0.72).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // The core is the brand mark and the only place chroma is allowed: the
      // page chrome stays achromatic so the rendered scene carries all of it.
      // Two offset rim arcs give the cyan-to-magenta edge without a blur glow.
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(96, 214, 226, 0.55)';
      ctx.beginPath();
      ctx.arc(coreX - 1.5, coreY - 1.5, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(198, 112, 210, 0.45)';
      ctx.beginPath();
      ctx.arc(coreX + 1.5, coreY + 1.5, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#8C93D8';
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

  function sync() {
    syncPage();
    syncJourney();
  }

  if (lenis) {
    lenis.on('scroll', sync);
  } else {
    // Lenis comes off a CDN. If it did not load, the scroll-driven work still
    // needs a source of scroll events or the whole page freezes flat.
    window.addEventListener('scroll', sync, { passive: true });
  }
  window.addEventListener('resize', sync, { passive: true });
  stacked.addEventListener('change', sync);
  sync();
})();
