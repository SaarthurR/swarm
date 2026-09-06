/* swarm · run console.
   The page is one surface whose state advances with scroll. Every panel below
   computes from RUN, the recorded run this page replays. Nothing here talks to
   a network and nothing pretends to.

   The engine publishes --sc-p (0..1) per act. This file reads it and drives the
   bespoke parts: the roster, the maps, the ledger, and the cross-check that
   takes back an answer the page already gave you. */

(function () {
  'use strict';

  ScrollCraft.mount(document.body);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The recorded run. `t` is that run's own clock, which is what the elapsed
     field reads out; `agents` is how many sub-agents that phase held. */
  var RUN = [
    { phase: 'dispatch', t: 0,    agents: 9, led: 'run started · 9 agents dispatched' },
    { phase: 'ingest',   t: 160,  agents: 4, led: 'context ingested · 6 sources' },
    { phase: 'map',      t: 370,  agents: 5, led: '6 areas mapped · 2 hubs flagged' },
    { phase: 'diagnose', t: 621,  agents: 2, led: 'cause: pool exhausted · unverified', mark: 'claim' },
    { phase: 'refute',   t: 842,  agents: 2, led: 'cross-check running' },
    { phase: 'fix',      t: 1334, agents: 3, led: '2 units fixed · 1 refused, shared hub' },
    { phase: 'verify',   t: 1865, agents: 4, led: '6 checks green · sweep clean' },
    { phase: 'ship',     t: 2088, agents: 1, led: '3 pull requests opened, stacked' },
    { phase: 'close',    t: 2214, agents: 0, led: 'run closed · learnings written' }
  ];

  var acts = [].slice.call(document.querySelectorAll('[data-run]'));
  var railItems = [].slice.call(document.querySelectorAll('#railList li'));
  var fPhase = document.getElementById('fPhase');
  var fAgents = document.getElementById('fAgents');
  var fElapsed = document.getElementById('fElapsed');
  var ledgerList = document.getElementById('ledgerList');
  var verdict = document.getElementById('verdict');
  var vState = document.getElementById('vState');
  var vlog = [].slice.call(document.querySelectorAll('#vlog li'));

  var counters = [
    { out: document.getElementById('rosterN'), rows: '#roster li' },
    { out: document.getElementById('mapN'),    rows: '#files li' },
    { out: document.getElementById('checkN'),  rows: '#checks li' }
  ];

  /* ── the ledger ──────────────────────────────────────────────────
     Kept as data and re-rendered, because act 5 does not append to it, it
     goes back and edits a line that is already there. */

  var ledger = [];
  var lastLedger = '';

  function clock(s) {
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function renderLedger() {
    var key = ledger.map(function (l) { return l.t + l.text + (l.struck ? 'x' : '') + (l.fresh ? 'f' : ''); }).join('|');
    if (key === lastLedger) return;
    lastLedger = key;
    ledgerList.textContent = '';
    ledger.slice(-4).forEach(function (l) {
      var li = document.createElement('li');
      if (l.struck) li.className = 'struck';
      else if (l.fresh) li.className = 'fresh';
      else if (l.hit) li.className = 'hit';
      var t = document.createElement('span');
      t.textContent = 't+' + clock(l.t);
      li.appendChild(t);
      li.appendChild(document.createTextNode(l.text));
      ledgerList.appendChild(li);
    });
  }

  /* ── progress ────────────────────────────────────────────────── */

  function pOf(el) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue('--sc-p'));
    return isNaN(v) ? 0 : v;
  }

  var lastPhase = -1;
  var refuted = false;
  var replaying = false;   /* the challenge button owns the panel while true */
  var manual = false;      /* ...and keeps it until the act leaves the screen */

  function setRefuted(on) {
    if (on === refuted) return;
    refuted = on;
    document.body.classList.toggle('is-refuted', on);
    if (verdict) verdict.textContent = on ? 'refuted' : 'checking';
    if (vState) vState.textContent = on ? 'verdict returned' : 'reading the evidence';
  }

  function frame() {
    var vh = innerHeight, mid = scrollY + vh * 0.5;
    var current = 0;

    for (var i = 0; i < acts.length; i++) {
      var el = acts[i], p = pOf(el);
      var box = el.getBoundingClientRect();
      var top = box.top + scrollY;
      if (mid >= top && mid < top + box.height) current = i;

      /* progressive rows. A row is a dim slot until its own threshold, so a
         pinned stage is never an empty frame while it slides in. */
      var live = (box.top < vh * 1.25) && (box.bottom > -vh * 0.25);
      var held = (replaying || manual) && el.dataset.run === 'refute';
      if (held && !live) { manual = false; held = replaying; }
      if (live && !held) {
        var rows = el.querySelectorAll('[data-at]');
        for (var j = 0; j < rows.length; j++) {
          rows[j].classList.toggle('is-on', p >= parseFloat(rows[j].dataset.at));
        }
      }

      if (el.dataset.run === 'refute' && !replaying && !manual) setRefuted(p >= 0.58);
    }

    /* the run's own readouts */
    var step = RUN[current], next = RUN[current + 1] || step;
    var el2 = acts[current], b2 = el2.getBoundingClientRect();
    var within = Math.min(1, Math.max(0, (scrollY + vh * 0.5 - (b2.top + scrollY)) / Math.max(b2.height, 1)));
    fPhase.textContent = refuted && step.phase === 'refute' ? 'diagnose · reopened' : step.phase;
    fAgents.textContent = step.agents;
    fElapsed.textContent = clock(step.t + (next.t - step.t) * within);

    for (var r = 0; r < railItems.length; r++) {
      railItems[r].classList.toggle('now', r === current);
      railItems[r].classList.toggle('done', r < current);
    }
    /* on a phone the rail is a horizontal strip, so the active phase has to be
       brought into view or the reader loses their place in it */
    if (current !== lastPhase) {
      lastPhase = current;
      var rail = document.querySelector('.rail'), item = railItems[current];
      if (rail && item && rail.scrollWidth > rail.clientWidth) {
        rail.scrollLeft = item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2;
      }
    }

    /* ledger: everything up to the current phase has happened */
    ledger.length = 0;
    for (var k = 0; k <= current; k++) {
      ledger.push({ t: RUN[k].t, text: RUN[k].led, hit: k === current });
    }
    if (refuted) {
      for (var m = 0; m < ledger.length; m++) {
        if (RUN[m] && RUN[m].mark === 'claim') ledger[m].struck = true;
      }
      ledger.push({ t: 902, text: 'refuted · diagnosis reopened' });
      ledger.push({ t: 1043, text: 'cause: retry re-enters before the write commits', fresh: true });
    }
    ledger.sort(function (a, b) { return a.t - b.t; });
    renderLedger();

    for (var c = 0; c < counters.length; c++) {
      var cc = counters[c];
      if (!cc.out) continue;
      cc.out.textContent = document.querySelectorAll(cc.rows + '.is-on').length;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── the signature move, on demand ───────────────────────────────
     Same cross-check the scroll drives, run again from the top so a visitor
     can watch the page take its answer back a second time. */

  var challenge = document.getElementById('challenge');
  if (challenge) {
    challenge.addEventListener('click', function () {
      if (replaying) return;
      replaying = true; manual = true;
      challenge.disabled = true;
      setRefuted(false);
      vlog.forEach(function (li) { li.classList.remove('is-on'); });
      if (verdict) verdict.classList.remove('is-on');
      var note = document.querySelector('.vnote');
      if (note) note.classList.remove('is-on');
      if (vState) vState.textContent = 'fresh context · reading';

      var gap = reduce ? 60 : 340;
      vlog.forEach(function (li, n) {
        setTimeout(function () { li.classList.add('is-on'); }, gap * (n + 1));
      });
      setTimeout(function () {
        if (verdict) verdict.classList.add('is-on');
        if (note) note.classList.add('is-on');
        setRefuted(true);
        replaying = false;
        challenge.disabled = false;
      }, gap * (vlog.length + 1));
    });
  }

  /* ── close: copy, and compose the prompt ─────────────────────── */

  function toClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  var copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      toClipboard(copyBtn.dataset.copy);
      var was = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = was; }, 1600);
    });
  }

  var cmd = document.getElementById('cmd');
  var goalIn = document.getElementById('goalIn');
  var cmdOut = document.getElementById('cmdOut');
  if (cmd) {
    cmd.addEventListener('submit', function (e) {
      e.preventDefault();
      var goal = (goalIn.value || goalIn.placeholder).trim().replace(/^swarm[:,]?\s*/i, '');
      var line = 'swarm: ' + goal + ' Do not stop until it is verified production ready.';
      cmdOut.textContent = line;
      cmdOut.classList.add('ready');
      toClipboard(line).then(function () {
        cmdOut.textContent = line + '\n\ncopied · paste it into Claude Code or Cursor';
      });
    });
  }
})();
