/* Kiosk dashboard: the room views. One per room: a header (the title, which
 * opens the room menu, the sensors, the modes and on the wide screens a
 * clock), the main slot, the light tiles, the media card and the room's
 * events. On the Spot the dial is the rim of the screen and the lights are
 * a strip. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, t, root, states, el, esc, icon, clamp, isLight, isOn, setText, setClass, warn } = K;
  const { watch, shownPct, setBrightness, followLight, showWallpaper, pressFx, attachSwipe, closeOverlay } = K;
  const { makeSensor, sensorShown, sensorIds, makeChip, RIM_R, makeDial, makeBar, makeTile, makeCoverTile, makeClimateTile, makeFanTile, makeMedia, eventsOf, makeEventsChip, makeEventsList } = K;

  const views = {};
  const fits = [];   // each header's fitting of its modes
  let activeKey = null;

  function buildView(key, room, canSwitch) {
    const shape = K.shape;
    const view = el('section', 'view');
    view.dataset.room = key;
    let i = 0;
    const rise = (node) => { node.classList.add('rise'); node.style.setProperty('--i', i++); return node; };

    // header: the title (opens the room menu), the modes, sensors, the clock (not on the round screen)
    const top = el('header', 'top');
    const title = el('h1', 'title');
    const name = el(canSwitch ? 'button' : 'span', 'title-btn', `<span>${esc(room.title || key)}</span>` + (canSwitch ? icon('chevron-down') : ''));
    if (canSwitch) {
      name.setAttribute('aria-label', t('changeRoom'));
      pressFx(name);
      name.addEventListener('click', () => K.openRoomMenu());
    }
    title.appendChild(name);
    top.appendChild(rise(title));
    // The house's alerts come first, in every room, each while its showWhen
    // holds (its own entity on, unless said). On the round screen the room's
    // own values step aside meanwhile.
    const alerts = (CFG.alerts || []).map((a) => ({ showWhen: {}, ...a, alert: true }));
    const values = alerts.concat(room.sensors || []);
    const sensors = el('div', 'sensors');
    sensors.append(...values.map(makeSensor));
    // after the room's values, how many events it has (js/events.js)
    const events = eventsOf(room);
    const chip = events && events.chip ? sensors.appendChild(makeEventsChip(events)) : null;
    sensors.hidden = true;
    const fillRow = () => {   // the row goes with its last value
      sensors.hidden = !values.some(sensorShown) && !(chip && !chip.hidden);
      setClass(sensors, 'alerting', alerts.some(sensorShown));
    };
    watch(values.flatMap(sensorIds), fillRow);
    if (chip) chip.onvisibility = fillRow;
    top.appendChild(rise(sensors));
    const modes = el('div', 'modes');
    for (const c of room.modes || []) modes.appendChild(makeChip(c));
    modes.hidden = !modes.children.length;
    top.appendChild(rise(modes));
    // Modes whose names do not fit show their icons alone. The room they get
    // depends on the rest of the header (a sensor value arriving, a resize)
    // and on the theme's typeface (js/theme.js fits them again after a switch).
    const fit = () => {
      modes.classList.remove('icons');
      setClass(modes, 'icons', [...modes.querySelectorAll('.name')].some((n) => n.scrollWidth > n.clientWidth));
    };
    new ResizeObserver(fit).observe(modes);
    fits.push(fit);
    if (shape !== 'round') top.appendChild(rise(el('time', 'clock')));
    view.appendChild(top);
    // the list of the room's events: on the Spot a line above the main
    // light, on the wide screens a tile first among the lights (below)
    const list = events && events.lines ? rise(makeEventsList(events)) : null;
    if (list && shape === 'round') view.appendChild(list);
    setClass(view, 'with-events', !!list);

    // controls column: the main slot and the media card. The slot shows one
    // light at a time: the room's main light (the group), and on the Spot,
    // one swipe after another, each of the room's lights. The end of the
    // screensaver brings back the main light.
    const controls = el('div', 'controls');
    const main = el('div', 'main');
    const choices = !(room.main && room.main.entity) ? []
      : [room.main, ...(shape === 'round' ? (room.lights || []).filter((l) => isLight(l.entity)) : [])]
        .filter((c, j, all) => all.findIndex((d) => d.entity === c.entity) === j);
    const bars = choices.map((c, j) => main.appendChild(makeBar(c, j ? '' : 'group')));
    let shown = 0, paintRim = () => {};
    const current = () => choices[shown];
    // `side` is where the new light comes from: 1 the right, -1 the left, 0 in
    // place. One a swipe has already brought in part way carries on from there.
    const show = (j, side = 0) => {
      if (j === shown) return;
      const from = bars[shown], to = bars[j];
      if (!to.classList.contains('peek')) {
        to.style.transition = 'none';
        to.style.setProperty('--side', side);
        void to.offsetWidth; // start from that side, not from where it last left
        to.style.transition = '';
      }
      from.style.setProperty('--side', -side);
      from.classList.remove('current');
      to.classList.add('current');
      shown = j;
      paintRim();
      if (activeKey === key) followLight(current().entity);   // the accent takes its colour
    };
    if (bars.length) {
      bars[0].classList.add('current');
      controls.appendChild(rise(main));
    }
    if (shape === 'round' && bars.length > 1) {
      const next = (dir) => (shown + dir + bars.length) % bars.length;
      const step = (dir) => show(next(dir), dir);
      // A drag pulls the light shown aside and the one it leads to (.peek) in
      // alongside, a light's width behind; the stylesheet dims and shrinks
      // each by its distance from the middle (--away).
      let peek = null;
      const place = (bar, x, w) => {
        bar.style.setProperty('--x', `${x}px`);
        bar.style.setProperty('--away', Math.min(Math.abs(x) / w, 1).toFixed(3));
      };
      attachSwipe(main, {
        onDrag: (dx) => {
          const dir = dx < 0 ? 1 : -1, w = bars[shown].offsetWidth;
          if (peek !== bars[next(dir)]) {
            if (peek) peek.classList.remove('peek');
            peek = bars[next(dir)];
            peek.classList.add('peek');
          }
          peek.style.setProperty('--side', dir); // where it goes back to if the swipe falls short
          place(bars[shown], dx, w);
          place(peek, dx + dir * w, w);
        },
        onEnd: (dir) => {
          for (const bar of bars) { bar.style.removeProperty('--x'); bar.style.removeProperty('--away'); }
          if (dir) step(dir);
          peek.classList.remove('peek');
          peek = null;
        },
      });
      // faint arrows either side say it swipes; a tap on one steps too
      main.classList.add('swipes');
      for (const dir of [-1, 1]) {
        const arrow = el('button', 'main-arrow', icon(dir < 0 ? 'chevron-left' : 'chevron-right'));
        arrow.dataset.dir = String(dir);
        arrow.setAttribute('aria-label', t(dir < 0 ? 'previousLight' : 'nextLight'));
        pressFx(arrow);
        arrow.addEventListener('click', () => step(dir));
        main.appendChild(arrow);
      }
    }

    let media = null;
    if (room.media && room.media.entity) {
      media = makeMedia(room.media, shape === 'round' || root.classList.contains('density-compact'));
      if (shape !== 'round') {
        controls.appendChild(rise(media));
        media.onvisibility = (v) => setClass(controls, 'with-media', v); // the main card makes room
      }
    }
    view.appendChild(controls);

    // the tiles, the lights' then the covers', the thermostats' and the fans': a grid,
    // or on the round screen a strip of tiles (the media card at its end)
    // that scrolls two tiles at a time
    const lights = el('div', 'lights');
    const tiles = [...(room.lights || []).map(makeTile), ...(room.covers || []).map(makeCoverTile), ...(room.climate || []).map(makeClimateTile), ...(room.fans || []).map(makeFanTile)].map(rise);
    if (shape === 'round') {
      lights.append(...tiles);
      if (media) lights.appendChild(media);
      // The tiles shown, in pairs: the first of each marked; a last one
      // without a pair comes to rest beside the one before it, not beside the
      // card. Again whenever a tile's showWhen shows or hides it.
      const pairUp = () => {
        const shown = tiles.filter((t) => !t.hidden);
        tiles.forEach((t) => { setClass(t, 'pair', shown.indexOf(t) % 2 === 0); setClass(t, 'alone', !!media && shown.length % 2 === 1 && t === shown[shown.length - 1]); });
        requestAnimationFrame(() => updateDots());
      };
      // A dot for each place the strip comes to rest: each pair of tiles
      // (and the card) in the middle, as far as the strip goes. A drag across
      // a tile sets its level, so the dots move the strip: a swipe on them
      // brings the next pair or the one before, a tap on a dot its pair, a
      // tap either side of them the pair on that side.
      const dots = el('div', 'dots');
      view.appendChild(dots);
      let rests = [], near = 0;
      const goTo = (j) => { j = clamp(j, 0, rests.length - 1); lights.scrollTo({ left: rests[j], behavior: 'smooth' }); };
      attachSwipe(dots, { onDrag: () => {}, onEnd: (dir) => { if (dir) goTo(near + dir); } });
      dots.addEventListener('click', (e) => {
        const dot = e.target.closest('span'), box = dots.getBoundingClientRect();
        goTo(dot ? [...dots.children].indexOf(dot) : near + (e.clientX < box.left + box.width / 2 ? -1 : 1));
      });
      const updateDots = () => {
        const box = lights.getBoundingClientRect(), max = lights.scrollWidth - lights.clientWidth;
        rests = [];
        // the room either side of a pair: where the first tile sits with the strip at its start
        const first = lights.querySelector('.tile'), pad = first ? first.getBoundingClientRect().left - box.left + lights.scrollLeft : 0;
        for (const c of lights.children) {
          const align = getComputedStyle(c).scrollSnapAlign;
          if (c.hidden || align === 'none') continue;
          const r = c.getBoundingClientRect(), left = r.left - box.left + lights.scrollLeft;
          const x = clamp(align.startsWith('start') ? left - pad : align.startsWith('end') ? left + r.width + pad - box.width : left + (r.width - box.width) / 2, 0, max);
          if (!rests.some((y) => Math.abs(y - x) < 2)) rests.push(x);
        }
        dots.hidden = rests.length < 2;
        if (dots.children.length !== rests.length) dots.innerHTML = rests.map(() => '<span></span>').join('');
        near = rests.reduce((b, x, j) => (Math.abs(x - lights.scrollLeft) < Math.abs(rests[b] - lights.scrollLeft) ? j : b), 0);
        [...dots.children].forEach((d, j) => setClass(d, 'on', j === near));
      };
      if (media) media.onvisibility = () => requestAnimationFrame(updateDots);
      pairUp();
      new MutationObserver(pairUp).observe(lights, { attributes: true, attributeFilter: ['hidden'], subtree: true });
      let t = null;
      lights.addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(() => { t = null; updateDots(); }); }, { passive: true });
      new ResizeObserver(updateDots).observe(lights);
    } else {
      // When the room has covers, thermostats or fans too, its light tiles
      // go under the dial, above the media card, the ring small beside the
      // name; the grid beside holds the others.
      // As a tile's showWhen shows or hides it, the lights move back beside
      // the dial when they or the others have none left to show.
      const own = (room.lights || []).length, ownTiles = tiles.slice(0, own), others = tiles.slice(own);
      if (list) lights.appendChild(list);
      lights.append(...tiles);
      if (own && others.length) {
        const side = el('div', 'lights');
        side.hidden = true;
        controls.insertBefore(side, media);
        // the grid beside starts on the line of the first light tiles, for their rows to line up
        new ResizeObserver(() => view.style.setProperty('--beside', `${side.offsetTop - controls.offsetTop}px`)).observe(main);   // both grids' own edges alike
        // more tiles than show fade out at the foot, until scrolled to the last
        const more = () => setClass(side, 'more', side.scrollTop + side.clientHeight < side.scrollHeight - 2);
        side.addEventListener('scroll', more, { passive: true });
        new ResizeObserver(more).observe(side);
        let apart = false;
        const arrange = () => {
          const shown = (t) => !t.hidden, now = ownTiles.some(shown) && others.some(shown);
          if (now === apart) return;
          apart = now;
          if (apart) side.append(...ownTiles);
          else others[0].before(...ownTiles);   // back first in the grid beside, after the events
          side.hidden = !apart;
          setClass(controls, 'with-lights', apart);
          setClass(view, 'lights-left', apart);
        };
        arrange();
        new MutationObserver(arrange).observe(view, { attributes: true, attributeFilter: ['hidden'], subtree: true });
      }
    }
    view.appendChild(lights);
    // The stylesheet gives a room without modes, or with nothing but its main slider, more room.
    setClass(view, 'no-modes', modes.hidden);
    setClass(view, 'solo', !tiles.length && !media && !(list && shape !== 'round'));

    // the Spot's dial is the rim of the screen and follows the main slot
    if (shape === 'round' && bars.length) {
      const pct = (f) => clamp(Math.round(f * 100), 1, 100);
      const rim = makeDial('rim', {
        r: RIM_R,
        onPreview: (f) => rim.paint(pct(f)),
        onCommit: (f) => setBrightness(current().entity, pct(f)),
        onHold: (pid) => K.openPopover(current(), pid),
      });
      view.appendChild(rim.el);
      paintRim = () => {
        const st = states[current().entity];
        rim.paint(isOn(st) ? shownPct(current().entity) : 0);
        setClass(rim.el, 'off', !isOn(st));
      };
      watch(choices.map((c) => c.entity), paintRim);
    }
    views[key] = { el: view, room, restore: () => show(0), light: () => (bars.length ? current().entity : null) };
    return view;
  }

  function showView(key) {
    const v = views[key];
    if (!v) { warn(`config.js: there is no room "${key}"`); return; }
    closeOverlay();
    if (activeKey === key) return;
    for (const [k, o] of Object.entries(views)) setClass(o.el, 'active', k === key);
    activeKey = key;
    followLight(v.light());
    showWallpaper(v.room);
    document.title = v.room.title ? `${v.room.title} · Kiosk` : 'Kiosk';
  }
  const activeRoom = () => activeKey;

  /* -------------------------------------------------------------- clock */
  // 24 hours, on the wide screens only (the round view has none).
  function startClock() {
    const nodes = [...document.querySelectorAll('.clock')];
    if (!nodes.length) return;
    let timer = null;
    const tick = () => {
      const now = new Date(), pad = (n) => String(n).padStart(2, '0');
      const text = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      for (const n of nodes) setText(n, text);
      clearTimeout(timer);
      timer = setTimeout(tick, 60050 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    };
    tick();
    // A sleeping kiosk pauses its timers: catch up when the screen comes back.
    document.addEventListener('visibilitychange', tick);
    addEventListener('kiosksatellite:screenon', tick);
  }

  const fitHeaders = () => fits.forEach((fit) => fit());

  Object.assign(K, { views, buildView, showView, activeRoom, startClock, fitHeaders });
})();
