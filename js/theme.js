/* Kiosk dashboard: the theme. One of themes/themes.js, dark or light, with
 * its files and the scene it may move behind the rooms; the accent colour,
 * which can take the colour of the light the dial controls (the room's
 * main light on the Show, the light in the main slot on the Spot); and a
 * picture behind the rooms, faded toward the theme's colour so that text
 * on it stays legible. Settings in the menu (js/settings.js) can change
 * the theme and following the light on the kiosk itself, which keeps them. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, params, root, $, el, states, reducedMotion, clamp, setClass, setVar, hexToRgb, kelvinRgb, relLum, lightRgb, isOn } = K;
  const { watch } = K;

  const theme = CFG.theme || {};
  const THEMES = window.KIOSK_THEMES || {};
  let base = null;   // the accent of config.js; without one, the theme's
  let current = 'dark', configured = 'dark', switches = 0;   // the theme on screen; the one config.js gives this kiosk; switches asked for

  // What Settings set on this kiosk, kept in its browser's storage. A
  // setting that matches config.js is not kept, so that a later change of
  // config.js reaches the kiosk again.
  const KEPT = { theme: 'kiosk.theme', follow: 'kiosk.followLight' };
  function kept(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function keep(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) { /* not kept: the page changes all the same */ } }

  // The theme: ?theme= in the address, else the one picked in Settings,
  // else the kiosk's own (devices in config.js), else theme.name. A name
  // themes/themes.js does not list gives the dark theme; a theme picked in
  // Settings and since removed, the one config.js gives. Every room's
  // picture starts loading too, so that a change of room finds its own
  // ready. Resolves once the theme's files and fonts have loaded (or
  // failed), so that the page shows in its theme.
  function applyTheme(own) {
    configured = known(own || theme.name || 'dark');
    const picked = kept(KEPT.theme);
    if (picked && !Object.hasOwn(THEMES, picked)) keep(KEPT.theme, null);
    for (const room of [null, ...Object.values(CFG.rooms || {})]) layerFor(imageOf(room));
    return setTheme(known(params.get('theme') || (Object.hasOwn(THEMES, picked) ? picked : '') || configured));
  }
  function known(name) {
    if (Object.hasOwn(THEMES, name)) return name;
    console.warn(`themes/themes.js has no theme "${name}": the dark theme instead`);
    return 'dark';
  }
  // A theme picked in Settings: the page switches to it and the kiosk keeps
  // it, unless it is the one config.js gives.
  function pickTheme(name) {
    if (!Object.hasOwn(THEMES, name)) return Promise.resolve();
    keep(KEPT.theme, name === configured ? null : name);
    return setTheme(name);
  }
  // Switches to a theme. Its files and fonts load first, each file once (a
  // theme picked again finds them there); then the page changes over in one
  // step, the last theme's stylesheets set aside and the accent without a
  // fade, and its scene, if it has one, takes the last one's place. It
  // waits 3 s at most for the files: on a slow kiosk the scene starts when
  // its script comes. A theme picked meanwhile wins.
  function setTheme(name) {
    const ticket = ++switches;
    const { files = [] } = THEMES[name] || {};
    for (const [node, owner] of sheets) if (owner === name) node.disabled = false;   // its fonts come back with it
    const loaded = Promise.all(files.map((file) => loadFile(file, name))).then(loadFonts);
    const enough = new Promise((resolve) => setTimeout(resolve, 3000));
    return Promise.race([loaded, enough]).then(() => {
      if (ticket !== switches) return;
      const { scheme, mono } = THEMES[name] || {};
      current = name;
      root.classList.add('theme-loading');
      for (const [node, owner] of sheets) node.disabled = owner !== name;
      root.dataset.theme = name;
      root.dataset.scheme = scheme === 'light' ? 'light' : 'dark';
      setClass(root, 'mono', !!mono);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = root.dataset.scheme === 'light' ? '#f3f1ec' : '#000000';
      base = mono ? null : hexToRgb(theme.accent);
      paintAccent();
      getComputedStyle(root).getPropertyValue('--accent-rgb');   // the theme's accent in place, before fades come back
      root.classList.remove('theme-loading');
      if (shown) { runScene(); K.fitHeaders(); }   // the header's modes, in the theme's typeface
      else requestAnimationFrame(() => { shown = true; runScene(); });   // once the page shows (js/main.js, as this resolves): the layer has its size
    });
  }
  // A theme's stylesheet or script, from its folder. One that does not load
  // is asked for again the next time its theme is picked.
  const fetched = new Map(), sheets = new Map(), scripts = new Map();   // a file -> its loading; a stylesheet, a script -> its theme
  function loadFile(file, name) {
    if (!fetched.has(file)) {
      fetched.set(file, new Promise((resolve) => {
        const css = /\.css(\?|$)/.test(file);
        const node = document.createElement(css ? 'link' : 'script');
        if (css) { node.rel = 'stylesheet'; node.href = 'themes/' + file; sheets.set(node, name); } else { node.src = 'themes/' + file; scripts.set(node, name); }
        node.onload = resolve;
        node.onerror = () => {
          console.warn(`themes/themes.js: themes/${file} did not load`);
          fetched.delete(file); sheets.delete(node); scripts.delete(node); node.remove();
          resolve();
        };
        document.head.appendChild(node);
      }));
    }
    return fetched.get(file);
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
  // Following the light, the accent is the colour of the light the dial
  // controls while it is on: its colour, or for white light the tint of its
  // temperature. Off, or a light without a colour, gives back the accent of
  // config.js, or the theme's. The stylesheet fades from one to the next.
  // followLight in config.js sets it, Settings may change it on the kiosk;
  // a mono theme never follows.
  const keptFollow = kept(KEPT.follow);
  let follow = keptFollow === 'on' || (keptFollow !== 'off' && !!theme.followLight);
  let followed = null;
  const watched = new Set();
  function followLight(entity) {
    followed = entity || null;
    if (followed && !watched.has(followed)) { watched.add(followed); watch([followed], paintAccent); }
    paintAccent();
  }
  function paintAccent() {
    const st = follow && !(THEMES[current] || {}).mono ? states[followed] : null;
    const a = isOn(st) ? st.attributes : {};
    const rgb = lightRgb(st) || (a.color_mode === 'color_temp' && a.color_temp_kelvin ? kelvinRgb(a.color_temp_kelvin) : null);
    setAccent(rgb ? accentOf(rgb) : base);
  }
  // Following the light, as Settings sets it on this kiosk.
  function setFollow(on) {
    follow = !!on;
    keep(KEPT.follow, follow === !!theme.followLight ? null : follow ? 'on' : 'off');
    paintAccent();
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
  // layer is emptied after). The page keeps it for its theme, so that the
  // theme picked again starts it afresh. It runs while its theme is on
  // screen and the page in sight, and stops while the page is hidden, to
  // spare the kiosk; when the device asks for less motion, it is told to
  // stay still. One that fails leaves the theme's usual background. On a
  // slow kiosk the page may show before the script has come: the scene
  // starts when it comes.
  const sceneHost = $('scene');
  const scenes = {};   // theme -> its scene, once its script has run
  let stopScene = null, running = null, shown = false;   // the scene's theme while it runs; shown: the page is on screen, in its theme
  function addScene(start) {
    const name = scripts.get(document.currentScript) || current;
    scenes[name] = start;
    if (name === current && shown) runScene();
  }
  function runScene() {
    const start = scenes[current] || null, run = !!start && shown && !document.hidden;
    if (stopScene && (!run || running !== current)) {
      stopScene();
      stopScene = running = null;
      sceneHost.textContent = '';
    }
    setClass(sceneHost, 'on', !!start);   // shown first, so that the scene finds its layer's size
    if (run && !stopScene) {
      try { stopScene = start(sceneHost, { still: reducedMotion }) || (() => {}); running = current; } catch (e) { console.warn('the theme\'s scene failed:', e); scenes[current] = null; sceneHost.textContent = ''; }
    }
    setClass(sceneHost, 'on', !!scenes[current]);
    setClass(app, 'with-scene', !!scenes[current]);
  }
  document.addEventListener('visibilitychange', runScene);

  const themeNow = () => current, defaultTheme = () => configured, followsLight = () => follow;

  Object.assign(K, { applyTheme, pickTheme, themeNow, defaultTheme, followLight, setFollow, followsLight, showWallpaper, addScene });
})();
