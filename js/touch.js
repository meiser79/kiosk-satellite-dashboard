/* Kiosk dashboard: touch. Press feedback, tap and long-press, drags along a
 * track, sideways swipes, and the slider built on them. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { el, esc, icon, clamp, setText } = K;

  function pressFx(target) {
    target.addEventListener('pointerdown', () => target.classList.add('pressed'));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) target.addEventListener(ev, () => target.classList.remove('pressed'));
  }
  // Tap vs long-press (480 ms, no movement). Presses that start inside `ignore` are left alone.
  function attachPress(target, { onTap, onHold, ignore }) {
    let timer = null, x0 = 0, y0 = 0, down = false;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } target.classList.remove('pressed'); down = false; };
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (ignore && e.target.closest && e.target.closest(ignore)) return;
      x0 = e.clientX; y0 = e.clientY; down = true;
      target.classList.add('pressed');
      const pointerId = e.pointerId;
      timer = setTimeout(() => { timer = null; target.classList.remove('pressed'); down = false; if (onHold) onHold(pointerId); }, 480);
    });
    target.addEventListener('pointermove', (e) => {
      if (down && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) cancel();
    });
    target.addEventListener('pointerup', () => { if (down && timer) { cancel(); onTap(); } else cancel(); });
    target.addEventListener('pointercancel', cancel);
    target.addEventListener('pointerleave', cancel);
  }
  // Drag on a track: reports a 0..1 fraction, by default the horizontal
  // position (pass `frac` for another geometry). A plain tap calls onTap with
  // the press event (its target is what was tapped; the release, once the
  // pointer is captured, would name the track itself). With `lock`, a drag
  // that starts up or down is let go, for the page to scroll.
  function attachTrack(target, { onPreview, onCommit, onTap, onHold, ignore, lock, frac: fraction }) {
    let active = false, moved = false, x0 = 0, y0 = 0, last = null, lastSent = 0, pid = null, holdTimer = null, press = null;
    const frac = fraction || ((e) => {
      const r = target.getBoundingClientRect();
      return clamp((e.clientX - r.left) / r.width, 0, 1);
    });
    const clearHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (ignore && e.target.closest && e.target.closest(ignore)) return;
      y0 = e.clientY; press = e;
      active = true; moved = false; x0 = e.clientX; pid = e.pointerId; last = null;
      try { target.setPointerCapture(pid); } catch (_) { /* ignore */ }
      target.classList.add('pressed');
      clearHold();
      if (onHold) holdTimer = setTimeout(() => {
        holdTimer = null;
        if (!active || moved) return;
        active = false;
        target.classList.remove('pressed');
        try { target.releasePointerCapture(pid); } catch (_) { /* ignore */ }
        onHold(pid);
      }, 480);
    });
    target.addEventListener('pointermove', (e) => {
      if (!active) return;
      if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) > 6) {
        clearHold();
        if (lock && Math.abs(e.clientY - y0) > Math.abs(e.clientX - x0)) {   // a scroll, not a drag
          active = false;
          target.classList.remove('pressed');
          try { target.releasePointerCapture(pid); } catch (_) { /* ignore */ }
          return;
        }
        moved = true; target.classList.add('dragging');
      }
      if (!moved) return;
      last = frac(e);
      onPreview(last);
      const now = performance.now();
      if (now - lastSent > 220) { lastSent = now; onCommit(last, false); }
    });
    const end = (e) => {
      clearHold();
      if (!active) return;
      active = false;
      target.classList.remove('pressed', 'dragging');
      try { target.releasePointerCapture(pid); } catch (_) { /* ignore */ }
      if (moved) onCommit(last ?? frac(e), true);
      else if (e.type === 'pointerup' && onTap) onTap(press);
    };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }
  // A sideways swipe across `target` (marked .swiping meanwhile): onDrag(dx)
  // follows the finger, then onEnd(dir) says how it ended: 1 for the next
  // one (swiped to the left past a third of the width, or flicked), -1 for
  // the one before, 0 for neither. Until the finger has moved, taps and
  // long-presses belong to the children (attachPress lets go after 10px,
  // before the swipe takes over); the click a swipe may end with is swallowed.
  function attachSwipe(target, { onDrag, onEnd }) {
    let pid = null, x0 = 0, y0 = 0, t0 = 0, swiping = false, endedAt = -1e9;
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); swiping = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - x0;
      if (!swiping) {
        if (Math.abs(dx) <= 10 || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
        swiping = true;
        x0 += Math.sign(dx) * 10; dx = e.clientX - x0; // start from where it is, without a jump
        try { target.setPointerCapture(pid); } catch (_) { /* ignore */ }
        target.classList.add('swiping');
      }
      onDrag(dx);
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (!swiping) return;
      swiping = false;
      target.classList.remove('swiping');
      endedAt = performance.now();
      const dx = e.clientX - x0, flick = Math.abs(dx) > 30 && Math.abs(dx) / (endedAt - t0) > 0.5;
      onEnd(e.type === 'pointerup' && (Math.abs(dx) > target.clientWidth / 3 || flick) ? (dx < 0 ? 1 : -1) : 0);
    };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    target.addEventListener('click', (e) => { if (performance.now() - endedAt < 400) e.stopPropagation(); }, true);
  }

  // A slider with a label and a value. Fill style (default) or gradient style (a thumb on a colour strip).
  function makeSlider({ cls = '', big = false, min = 0, max = 100, step = 1, gradient = null, label = '', labelIcon = '', format = (v) => String(v), onPreview, onCommit, onTap }) {
    const node = el('div', `slider${big ? ' big' : ''}${gradient ? ' gradient' : ''}${cls ? ' ' + cls : ''}`);
    if (gradient) node.style.setProperty('--grad', gradient);
    node.innerHTML = (gradient ? '<span class="thumb"></span>' : '<span class="fill"></span>') + `<span class="label">${labelIcon ? icon(labelIcon) + ' ' : ''}${esc(label)}</span><span class="value"></span>`;
    const valueEl = node.querySelector('.value');
    let value = min, dragging = false;
    const paint = (v) => {
      const f = max > min ? (v - min) / (max - min) : 0;
      if (gradient) node.style.setProperty('--x', (f * 100).toFixed(2) + '%');
      else node.style.setProperty('--p', f.toFixed(4));
      setText(valueEl, format(v));
    };
    const quant = (f) => { const v = min + f * (max - min); return Math.round(v / step) * step; };
    attachTrack(node, {
      onPreview: (f) => { dragging = true; value = quant(f); paint(value); if (onPreview) onPreview(value); },
      onCommit: (f, final) => { value = quant(f); paint(value); if (final) dragging = false; onCommit(value, final); },
      onTap,
    });
    return {
      el: node,
      get value() { return value; },
      set(v) { if (dragging) return; value = clamp(v, min, max); paint(value); },
    };
  }

  Object.assign(K, { pressFx, attachPress, attachTrack, attachSwipe, makeSlider });
})();
