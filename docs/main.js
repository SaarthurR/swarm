/* swarm landing page.
   The engine drives the acts; this file owns the two bespoke bits: rows that
   arrive with scroll, and the cross-check striking out its own earlier answer. */

(function () {
  'use strict';
  ScrollCraft.mount(document.body);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var acts = [].slice.call(document.querySelectorAll('[data-sc-act]'));
  var check = document.getElementById('check');
  var replaying = false, manual = false;

  function pOf(el) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue('--sc-p'));
    return isNaN(v) ? 0 : v;
  }

  function frame() {
    var vh = innerHeight;
    for (var i = 0; i < acts.length; i++) {
      var el = acts[i], box = el.getBoundingClientRect();
      var live = (box.top < vh * 1.25) && (box.bottom > -vh * 0.25);
      var held = (replaying || manual) && el === check;
      if (held && !live) { manual = false; held = replaying; }
      if (!live || held) continue;

      var p = pOf(el);
      var rows = el.querySelectorAll('[data-at]');
      for (var j = 0; j < rows.length; j++) {
        rows[j].classList.toggle('is-on', p >= parseFloat(rows[j].dataset.at));
      }
      if (el === check) document.body.classList.toggle('is-refuted', p >= 0.52);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var again = document.getElementById('again');
  if (again) {
    again.addEventListener('click', function () {
      if (replaying) return;
      replaying = true; manual = true; again.disabled = true;
      document.body.classList.remove('is-refuted');
      var rows = [].slice.call(check.querySelectorAll('[data-at]'));
      rows.forEach(function (r) { r.classList.remove('is-on'); });
      var gap = reduce ? 90 : 620;
      rows.forEach(function (r, n) {
        setTimeout(function () {
          r.classList.add('is-on');
          if (r.classList.contains('row-verdict')) document.body.classList.add('is-refuted');
        }, gap * (n + 1));
      });
      setTimeout(function () { replaying = false; again.disabled = false; }, gap * (rows.length + 1));
    });
  }

  var copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1600);
    });
  }
})();
