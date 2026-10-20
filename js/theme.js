/* Kiosk dashboard: the theme. One of themes/themes.js, dark or light, with
 * its files and the scene it may move behind the rooms; the accent colour,
 * which can take the colour of the light the dial controls (the room's
 * main light on the Show, the light in the main slot on the Spot); and a
 * picture behind the rooms, faded toward the theme's colour so that text
 * on it stays legible. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, params, root, $, el, states, reducedMotion, clamp, setClass, setVar, hexToRgb, kelvinRgb, relLum, lightRgb, isOn } = K;
  const { watch } = K;

  const theme = CFG.theme || {};
  const THEMES = window.KIOSK_THEMES || {};
  let base = null;   // the accent of config.js; without one, the theme's

  // The theme: ?theme= in the address, else the kiosk's own (devices in
  // config.js), else theme.name; a name themes/themes.js does not list
  // gives the dark theme. Then the accent (a mono theme keeps its own, for
  // every light too), and every room's picture, loading from the start so
  // that a change of room finds its own ready. Resolves once the theme's
  // files and fonts have loaded (or failed), so that the page shows in its
  // theme; the accent does not fade in meanwhile.
  function applyTheme(own) {
    const wanted = params.get('theme') || own || theme.name || 'dark';
    const name = Object.hasOwn(THEMES, wanted) ? wanted : 'dark';
    if (name !== wanted) console.warn(`themes/themes.js has no theme "${wanted}": the dark theme instead`);
    const { scheme, mono, files = [] } = THEMES[name] || {};
    root.dataset.theme = name;
    root.dataset.scheme = scheme === 'light' ? 'light' : 'dark';
    setClass(root, 'mono', !!mono);
    root.classList.add('theme-loading');
    if (mono) follow = false;
    base = mono ? null : hexToRgb(theme.accent);
    setAccent(base);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.dataset.scheme === 'light' ? '#f3f1ec' : '#000000';
    for (const room of [null, ...Object.values(CFG.rooms || {})]) layerFor(imageOf(room));
    const loaded = Promise.all(files.map(loadFile)).then(loadFonts);
    const enough = new Promise((resolve) => setTimeout(resolve, 3000));
    return Promise.race([loaded, enough]).then(() => {
      getComputedStyle(root).getPropertyValue('--accent-rgb');   // the theme's accent in place, before fades come back
      root.classList.remove('theme-loading');
      requestAnimationFrame(() => { shown = true; runScene(); });   // once the page shows (js/main.js, as this resolves): the layer has its size
    });
  }
  // A theme's stylesheet or script, from its folder.
  function loadFile(file) {
    return new Promise((resolve) => {
      const css = /\.css(\?|$)/.test(file);
      const node = document.createElement(css ? 'link' : 'script');
      if (css) { node.rel = 'stylesheet'; node.href = 'themes/' + file; } else node.src = 'themes/' + file;
      node.onload = resolve;
      node.onerror = () => { console.warn(`themes/themes.js: themes/${file} did not load`); resolve(); };
      document.head.appendChild(node);
    });
  }
  // The fonts its stylesheet declares, which the browser would otherwise
  // fetch only once text uses them, after the page shows.
  function loadFonts() {
    return Promise.all([...document.fonts].filter((f) => f.status === 'unloaded').map((f) => f.load().catch(() => {})));
  }
  // A colour, or none for the theme's own.
  function setAccent(rgb) {
    if (!rgb) { root.style.removeProperty('--accent-rgb'); root.style.removeProperty('--on-accent'); return; }
    setVar(root, '--accent-rgb', rgb.join(', '));
    setVar(root, '--on-accent', relLum(rgb) > 0.4 ? '#1d1406' : '#ffffff');
  }

  /* ------------------------------------------------------------ accent */
  // With followLight, the accent is the colour of the light the dial
  // controls while it is on: its colour, or for white light the tint of its
  // temperature. Off, or a light without a colour, gives back the accent of
  // config.js, or the theme's. The stylesheet fades from one to the next.
  let follow = !!theme.followLight;   // never with a mono theme (applyTheme)
  let followed = null;
  const watched = new Set();
  function followLight(entity) {
    if (!follow) return;
    followed = entity || null;
    if (followed && !watched.has(followed)) { watched.add(followed); watch([followed], paintAccent); }
    paintAccent();
  }
  function paintAccent() {
    const st = states[followed];
    const a = isOn(st) ? st.attributes : {};
    const rgb = lightRgb(st) || (a.color_mode === 'color_temp' && a.color_temp_kelvin ? kelvinRgb(a.color_temp_kelvin) : null);
    setAccent(rgb ? accentOf(rgb) : base);
  }
  // A light's colour made fit for an accent: its hue, about as colourful
  // (a pale one a little more, so that it still reads; white stays grey),
  // light enough to show on the dark theme and dark enough on the light one.
  function accentOf([r, g, b]) {
    [r, g, b] = [r / 255, g / 255, b / 255];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    const h = !c ? 0 : max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;   // in sixths of the circle
    const chroma = Math.min(c * 1.5, 1);
    const dark = root.dataset.scheme !== 'light';
    const rgbAt = (l) => {
      const k = Math.min(chroma, 1 - Math.abs(2 * l - 1)), x = k * (1 - Math.abs((h % 2) - 1)), m = l - k / 2;
      return [[k, x, 0], [x, k, 0], [0, k, x], [0, x, k], [x, 0, k], [k, 0, x]][Math.floor(h) % 6].map((v) => Math.round((v + m) * 255));
    };
    let l = clamp((max + min) / 2, dark ? 0.55 : 0.42, dark ? 0.72 : 0.6), out = rgbAt(l);
    // a deep blue lightened until it shows on the dark theme, a pale yellow darkened on the light one
    while (dark ? relLum(out) < 0.16 && l < 0.8 : relLum(out) > 0.45 && l > 0.3) out = rgbAt(l += dark ? 0.02 : -0.02);
    return out;
  }

  /* --------------------------------------------------------- wallpaper */
  // The picture behind a room: its own `background`, or the theme's. A veil
  // of the theme's colour covers it, `fade` strong (0 to 1, the room's or
  // the theme's), and on it the stylesheet makes the panels more solid and
  // lifts the text. A picture comes in once it has loaded, crossfading from
  // the last room's: one that does not load leaves the usual background.
  const app = $('app'), paper = $('wallpaper');
  const layers = new Map(), loaded = new Set();   // address -> its layer; the ones that loaded
  let wanted = null, fade = 0.5;
  // A web address or a path on Home Assistant; anything else is ignored.
  function imageOf(room) {
    const src = (room && room.background) || theme.background;
    const s = typeof src === 'string' ? src.trim() : '';
    return s && (!/^[a-z][a-z\d+.-]*:/i.test(s) || /^https?:/i.test(s)) ? s : null;
  }
  function layerFor(url) {
    if (!url || layers.has(url)) return;
    const layer = paper.appendChild(el('div', 'paper'));
    layers.set(url, layer);
    const img = layer.appendChild(el('img'));
    img.alt = '';
    img.referrerPolicy = 'no-referrer';   // the page's address stays home
    img.onload = () => { loaded.add(url); paintWallpaper(); };
    img.onerror = () => console.warn(`config.js: the background ${url} did not load`);
    img.src = url;
  }
  function showWallpaper(room) {
    wanted = imageOf(room);
    const f = Number((room && room.fade) ?? theme.fade ?? 0.5);
    fade = clamp(isNaN(f) ? 0.5 : f, 0, 1);
    layerFor(wanted);
    paintWallpaper();
  }
  function paintWallpaper() {
    const ready = loaded.has(wanted);
    for (const [url, layer] of layers) setClass(layer, 'show', ready && url === wanted);
    if (ready) setVar(layers.get(wanted), '--fade', fade);
    setClass(app, 'with-wallpaper', ready);
  }

  /* ------------------------------------------------------------- scene */
  // A theme's moving background: its script hands addScene a function that
  // fills the layer behind the rooms and returns one that stops it (the
  // layer is emptied after). It runs while the page is in sight and stops
  // while it is hidden, to spare the kiosk; when the device asks for less
  // motion, it is told to stay still. One that fails leaves the theme's
  // usual background. On a slow kiosk the page may show before the script
  // has come (it waits 3 s at most): the scene starts when it comes.
  const sceneHost = $('scene');
  let startScene = null, stopScene = null, shown = false;   // shown: the page is on screen, in its theme
  function addScene(start) { startScene = start; if (shown) runScene(); }
  function runScene() {
    const run = !!startScene && !document.hidden;
    setClass(sceneHost, 'on', !!startScene);   // shown first, so that the scene finds its layer's size
    if (run && !stopScene) {
      try { stopScene = startScene(sceneHost, { still: reducedMotion }) || (() => {}); } catch (e) { console.warn('the theme\'s scene failed:', e); startScene = null; }
    } else if (!run && stopScene) {
      stopScene();
      stopScene = null;
      sceneHost.textContent = '';
    }
    setClass(sceneHost, 'on', !!startScene);
    setClass(app, 'with-scene', !!startScene);
  }
  document.addEventListener('visibilitychange', runScene);

  Object.assign(K, { applyTheme, followLight, showWallpaper, addScene });
})();
