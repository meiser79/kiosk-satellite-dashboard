/* Kiosk dashboard: the controls of a room view. Sensors and mode chips for
 * the header, the brightness dial, the main control (the room's light group)
 * and the tiles: their frame, and the light tiles (js/covers.js and
 * js/climate.js make the others). */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { t, states, el, esc, icon, clamp, isLight, isOn, isUnavailable, hasValue, matches, stateText, lightRgb, lightLabel, groupMembers, setText, setClass, setVar, HA } = K;
  const { watch, shownPct, call, toggle, setBrightness, pressFx, attachPress, attachTrack } = K;

  // A read-only value for the header. It is left out while it has none, or
  // while its showWhen does not hold. An alert is in the warning colour.
  const sensorShown = (s) => hasValue(states[s.entity]) && matches(s.showWhen, s.entity);
  const sensorIds = (s) => [s.entity].concat(s.showWhen && s.showWhen.entity ? [s.showWhen.entity] : []);
  function makeSensor(s) {
    const node = el('span', 'sensor' + (s.alert ? ' alert' : ''));
    watch(sensorIds(s), () => {
      const st = states[s.entity];
      node.hidden = !sensorShown(s);
      const on = isOn(st);
      const num = st && st.state !== '' && !isNaN(parseFloat(st.state));
      const text = num ? parseFloat(st.state).toFixed(s.digits ?? 0) + (s.unit || '') : stateText(st, s);
      setClass(node, 'on', on && !!(s.on || s.iconOff));
      const html = icon(on || !s.iconOff ? s.icon : s.iconOff) + `<span>${esc(text)}</span>`;
      if (node.innerHTML !== html) node.innerHTML = html;
    });
    return node;
  }

  // A mode chip: toggles an entity, or runs one script to turn on and another to turn off.
  function makeChip(c) {
    const node = el('button', 'chip', `${icon(c.icon || 'toggle-switch-outline')}<span class="name">${esc(c.name || c.entity)}</span>`);
    node.setAttribute('aria-label', c.name || c.entity);   // the name may show as the icon alone
    let pendingUntil = 0;
    attachPress(node, {
      onTap: () => {
        if (c.turnOn || c.turnOff) {
          const on = isOn(states[c.entity]);
          const script = on ? c.turnOff : c.turnOn;
          if (!script) return;
          pendingUntil = Date.now() + 4000;
          node.classList.add('pending');
          setTimeout(() => { node.classList.remove('pending'); }, 4000);
          call('script', 'turn_on', {}, script);
        } else toggle(c.entity);
      },
      onHold: (pid) => K.openPopover(c, pid),
    });
    watch([c.entity], () => {
      const st = states[c.entity];
      setClass(node, 'on', isOn(st));
      setClass(node, 'unavailable', isUnavailable(st));
      if (pendingUntil && Date.now() < pendingUntil) { node.classList.remove('pending'); pendingUntil = 0; }
    });
    return node;
  }

  /* --------------------------------------------------------------- dial */
  // A brightness arc: 300° from 7 o'clock round to 5 o'clock, a knob at its
  // end, the gap at the bottom. The same SVG is the gauge in the main card
  // and, scaled to the whole screen, the rim of the Spot. Dragging along
  // the arc sets the level by angle; a tap on it jumps there. The knob is
  // drawn around its own centre, a radius of one (a theme can give it
  // another shape: css/view.css). A groove under the track and a shine
  // along the level stay hidden unless a theme shows them.
  const ARC = { start: 120, sweep: 300, r: 46 }; // degrees clockwise from 3 o'clock; radius in the 100-unit box
  const KNOB = 'M -1 0 A 1 1 0 0 0 1 0 A 1 1 0 0 0 -1 0 Z';
  // The rim runs along the edge of the round screen: half its stroke (3.6,
  // .dial.rim in css/round.css) inside the 50-unit radius of the box.
  const RIM_R = 50 - 3.6 / 2;
  function arcPath(r) {
    const pt = (deg) => { const a = (deg * Math.PI) / 180; return `${(50 + r * Math.cos(a)).toFixed(3)} ${(50 + r * Math.sin(a)).toFixed(3)}`; };
    return `M ${pt(ARC.start)} A ${r} ${r} 0 1 1 ${pt(ARC.start + ARC.sweep)}`;
  }
  function makeDial(cls, { r = ARC.r, onPreview, onCommit, onHold }) {
    const node = el('div', 'dial ' + cls);
    const d = arcPath(r);
    node.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">`
      + `<defs><linearGradient id="dial-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" class="dial-grad-a"/><stop offset="1" class="dial-grad-b"/></linearGradient></defs>`
      + `<path class="dial-hit" d="${d}"/><path class="dial-groove" d="${d}"/><path class="dial-track" d="${d}" pathLength="1"/>`
      + `<path class="dial-fill" d="${d}" pathLength="1"/><path class="dial-shine" d="${d}" pathLength="1"/>`
      + `<g class="dial-knob"><g transform="translate(${50 + r} 50)"><path class="knob" d="${KNOB}"/></g></g></svg>`;
    // where the finger is, as a fraction of the arc; the gap at the bottom counts for the nearer end
    const frac = (e) => {
      const r = node.getBoundingClientRect();
      const deg = ((Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI - ARC.start + 720) % 360;
      return deg <= ARC.sweep ? deg / ARC.sweep : deg < ARC.sweep + (360 - ARC.sweep) / 2 ? 1 : 0;
    };
    attachTrack(node.querySelector('.dial-hit'), { frac, onPreview, onCommit, onHold, onTap: (e) => onCommit(frac(e), true) });
    return { el: node, paint: (p) => setVar(node, '--p', (p / 100).toFixed(4)) };
  }

  /* ------------------------------------------------------- main control */
  // The main control: a light group (or one light). On the wide screens it
  // is the dial alone, with the light's icon, name and state in the middle
  // as a button that toggles; dragging across it dims too. On the Spot a
  // power button beside the name and state; a tap toggles there too, and
  // only the rim of the screen dims (see buildView in js/view.js).
  function makeBar(cfg, extraCls) {
    const node = el('div', 'bar' + (extraCls ? ' ' + extraCls : ''));
    const text = `<span class="bar-text"><span class="name">${esc(cfg.name || cfg.entity)}</span><span class="state"></span></span>`;
    const pct = (f) => clamp(Math.round(f * 100), 1, 100);
    let dial = null, stateEl = null;
    const paint = (p) => { setVar(node, '--p', (p / 100).toFixed(4)); if (dial) dial.paint(p); };
    const act = {
      onPreview: (f) => { const p = pct(f); paint(p); setText(stateEl, `${p}%`); },
      onCommit: (f) => setBrightness(cfg.entity, pct(f)),
      onHold: (pid) => K.openPopover(cfg, pid),
    };
    if (K.shape === 'round') {
      node.innerHTML = `<button class="power" aria-label="${esc(t('onOff'))}">${icon('power')}</button>` + text;
      const power = node.querySelector('.power');
      pressFx(power);
      power.addEventListener('click', () => toggle(cfg.entity));
      attachPress(node, { onTap: () => toggle(cfg.entity), onHold: act.onHold, ignore: '.power' });
    } else {
      dial = makeDial('gauge', act);
      dial.el.insertAdjacentHTML('beforeend', `<button class="dial-centre" aria-label="${esc(t('onOff'))}"><span class="bar-icon">${icon(cfg.icon || 'lightbulb-group')}</span>${text}</button>`);
      node.appendChild(dial.el);
      pressFx(node.querySelector('.dial-centre'));
      attachTrack(node, { ...act, onTap: (e) => { if (e.target.closest('.dial-centre')) toggle(cfg.entity); }, ignore: '.dial-hit' });
    }
    stateEl = node.querySelector('.state');
    node.addEventListener('contextmenu', (e) => e.preventDefault());
    let membersWatched = false;
    const update = () => {
      const st = states[cfg.entity];
      const on = isOn(st);
      const p = shownPct(cfg.entity);
      setClass(node, 'off', !on);
      setClass(node, 'on', on);
      setClass(node, 'unavailable', isUnavailable(st));
      paint(p);
      // a group: follow its members too, to say how many are on
      const members = groupMembers(st);
      if (members && !membersWatched) { membersWatched = true; watch(members, update); HA.add(members); }
      const n = members ? members.filter((id) => isOn(states[id])).length : null;
      setText(stateEl, !on ? stateText(st) : n != null ? t('membersOn', { pct: p, n }) : lightLabel(st, cfg));
    };
    watch([cfg.entity], update);
    return node;
  }

  /* -------------------------------------------------------------- tiles */
  // A tile's frame, whatever it controls (a light, a cover, a thermostat):
  // its icon, its name, under it its state with a word after it, and behind
  // them a fill as far as its level (--p). A tap runs `tap`, a
  // long-press `open`. When the tile `slide`s, a drag across it sets the
  // level where the finger is (onPreview and onCommit of a fraction), on the
  // Spot as on the Show; on the Show a swipe up or down scrolls the tiles.
  function tileFrame(cfg, { icon: ic, tap, open, slide }) {
    const node = el('div', 'tile' + (slide ? ' slides' : ''));
    node.innerHTML = `<span class="tile-fill"></span><span class="tile-icon">${icon(ic)}</span>`
      + `<span class="tile-text"><span class="tile-name">${esc(cfg.name || cfg.entity)}</span></span>`
      + '<span class="tile-line"><span class="tile-state"></span><span class="tile-extra"></span></span>';
    if (slide) attachTrack(node, { ...slide, onTap: tap, onHold: open, lock: true });
    else attachPress(node, { onTap: tap, onHold: open });
    return { node, iconEl: node.querySelector('.tile-icon'), stateEl: node.querySelector('.tile-state'), extraEl: node.querySelector('.tile-extra') };
  }

  // A light tile: a tap toggles, a drag across it sets its brightness.
  // Another entity among the lights (a switch, a fan) toggles too and says
  // its state.
  function makeTile(cfg) {
    const light = isLight(cfg.entity);
    const pct = (f) => clamp(Math.round(f * 100), 1, 100);
    const { node, stateEl, extraEl } = tileFrame(cfg, {
      icon: cfg.icon || 'lightbulb-outline', tap: () => toggle(cfg.entity), open: (pid) => K.openPopover(cfg, pid),
      slide: light && { onPreview: (f) => paint(pct(f)), onCommit: (f) => setBrightness(cfg.entity, pct(f)) },
    });
    const paint = (p) => { setVar(node, '--p', (p / 100).toFixed(4)); if (light) setText(stateEl, `${p}%`); };
    watch([cfg.entity], () => {
      const st = states[cfg.entity];
      const on = isOn(st);
      setClass(node, 'on', on);
      setClass(node, 'unavailable', isUnavailable(st));
      const rgb = lightRgb(st);
      setVar(node, '--tile-rgb', rgb ? rgb.join(', ') : 'var(--accent-rgb)');
      if (light) paint(on ? shownPct(cfg.entity) : 0);
      if (!light || !on) setText(stateEl, stateText(st, cfg));
      const fx = light && on && st.attributes.effect;
      setText(extraEl, fx && fx !== 'None' && fx !== 'Solid' ? `· ${fx}` : '');
    });
    return node;
  }

  Object.assign(K, { makeSensor, sensorShown, sensorIds, makeChip, RIM_R, makeDial, makeBar, tileFrame, makeTile });
})();
