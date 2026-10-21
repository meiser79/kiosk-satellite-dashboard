/* Kiosk dashboard for Kiosk Satellite: the shared toolbox.
 * The page is a handful of plain scripts that index.html loads in order (no
 * build step, no dependencies), sharing one global, window.Kiosk. This file
 * creates it with what the others use: the configuration, small helpers for
 * the DOM and for Home Assistant states, colours and the toast. Each file
 * after it adds its own parts to Kiosk; it takes what it needs from the
 * files above it when it loads, and reaches the files below it (not loaded
 * yet) through Kiosk at the time of the call. */
window.Kiosk = (() => {
  'use strict';

  const CFG = window.KIOSK_CONFIG || {};
  const ICONS = window.KIOSK_ICONS || {};
  const HA = window.HA;
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const KS = (window.kioskSatellite && window.kioskSatellite.platform === 'kiosksatellite') ? window.kioskSatellite : null;
  const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];
  const states = HA.states;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ helpers */
  const slug = (s) => String(s || '').toLowerCase().replace(/^ks-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const domain = (id) => String(id || '').split('.')[0];
  const isLight = (id) => domain(id) === 'light';

  function icon(name, cls) {
    const key = String(name || '').replace(/^mdi:/, '');
    const d = Object.hasOwn(ICONS, key) ? ICONS[key] : ICONS['lightbulb-outline'] || '';
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  function lookup(map, name) {
    if (!map || !name) return undefined;
    const key = slug(name);
    for (const k of Object.keys(map)) if (slug(k) === key) return map[k];
    return undefined;
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  // Only touch the DOM when something changed: cheap, and it keeps CSS transitions from restarting.
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
  function setClass(node, cls, on) { if (node.classList.contains(cls) !== !!on) node.classList.toggle(cls, !!on); }
  function setVar(node, name, value) { if (node.style.getPropertyValue(name) !== String(value)) node.style.setProperty(name, value); }

  const isOn = (st) => !!st && st.state === 'on';
  const isUnavailable = (st) => !st || st.state === 'unavailable';
  const hasValue = (st) => !isUnavailable(st) && st.state !== 'unknown';
  const pctOf = (st) => (isOn(st) ? clamp(Math.round(((st.attributes.brightness ?? 255) / 255) * 100), 1, 100) : 0);
  function stateText(st, cfg) {
    if (!st) return '–';
    if (st.state === 'unavailable') return 'Unavailable';
    if (st.state === 'unknown') return '–';
    if (cfg && cfg.on && st.state === 'on') return cfg.on;
    if (cfg && cfg.off && st.state === 'off') return cfg.off;
    return cap(st.state.replace(/_/g, ' '));
  }
  function lightRgb(st) {
    if (!isOn(st)) return null;
    const rgb = st.attributes.rgb_color;
    return rgb && COLOR_MODES.includes(st.attributes.color_mode) ? rgb : null;
  }
  function lightLabel(st, cfg) {
    if (!isOn(st)) return stateText(st, cfg);
    const a = st.attributes;
    const k = a.color_mode === 'color_temp' ? a.color_temp_kelvin : null;
    const fx = a.effect && a.effect !== 'None' && a.effect !== 'Solid' ? a.effect : null;
    return `${pctOf(st)}%` + (k ? ` · ${k}K` : '') + (fx ? ` · ${fx}` : '');
  }
  // Whether a showWhen holds: its entity (or the element's own) in the state
  // given, 'on' unless said (or one of a list), in any but those given with
  // `not`, or above / below a number. No showWhen: always.
  function matches(cond, own) {
    if (!cond) return true;
    const st = states[cond.entity || own];
    if (!st) return false;
    const n = parseFloat(st.state), among = (list) => [].concat(list).includes(st.state);
    if (cond.above != null || cond.below != null) return !isNaN(n) && !(n <= cond.above) && !(n >= cond.below);
    return cond.not != null ? !among(cond.not) : among(cond.state ?? 'on');
  }
  // The members of a light group, once Home Assistant has said who they are.
  const groupMembers = (st) => (st && Array.isArray(st.attributes.entity_id) && st.attributes.entity_id.length > 1 ? st.attributes.entity_id : null);

  /* ------------------------------------------------------------- colour */
  function hexToRgb(hex) {
    const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hsToRgb(h, s) { // h 0..360, s 0..100, full value
    const c = s / 100, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 1 - c;
    const i = Math.floor(h / 60) % 6;
    const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  // The colour of white light at a temperature, near enough for a tint.
  function kelvinRgb(k) {
    const t = clamp(k, 1000, 40000) / 100;
    const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    return [r, g, b].map((v) => Math.round(clamp(v, 0, 255)));
  }
  const relLum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  /* -------------------------------------------------------------- toast */
  // A short line near the bottom of the screen, gone after a moment.
  const toastEl = $('toast');
  let toastTimer = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => { toastEl.hidden = true; }, 300); }, 2200);
  }
  function warn(text) { console.warn(text); toast(text); }

  return {
    CFG, ICONS, HA, params, $, root, KS, COLOR_MODES, states, reducedMotion,
    slug, esc, cap, clamp, domain, isLight, icon, lookup, el, setText, setClass, setVar,
    isOn, isUnavailable, hasValue, pctOf, stateText, lightRgb, lightLabel, matches, groupMembers,
    hexToRgb, hsToRgb, kelvinRgb, relLum, toast, warn,
    // Decided at boot by js/main.js: the arrangement ('round' on the Echo
    // Spot, 'wide' everywhere else) and the room this kiosk belongs to, the
    // one it starts on.
    shape: 'wide',
    home: null,
  };
})();
