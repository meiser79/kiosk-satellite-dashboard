/* Kiosk dashboard: covers, a room's `covers`: shutters, blinds, awnings,
 * curtains, a garage door. A tile like a light's: a tap opens a closed
 * cover, closes an open one and stops one on its way; its pill sets the
 * position when the cover can take one (100% open, 0% closed) and says it;
 * lit while the cover is open. Its icon shows it open or closed, after its
 * kind (Home Assistant's device class) unless config.js gives one. A
 * long-press (or the dots) opens its panel: Open, Stop and Close, its
 * position, and the tilt of slats that turn. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { t, states, el, icon, clamp, hasValue, isUnavailable, stateText, setText, setClass, setVar } = K;
  const { watch, hold, held, call, makeSlider, tileFrame } = K;

  const F = { OPEN: 1, CLOSE: 2, POSITION: 4, STOP: 8, TILT: 128 };   // a cover's supported_features
  // Its icons by kind, closed then open.
  const ICONS = {
    shutter: ['window-shutter', 'window-shutter-open'], blind: ['blinds', 'blinds-open'], shade: ['roller-shade-closed', 'roller-shade'],
    curtain: ['curtains-closed', 'curtains'], awning: ['awning-outline', 'awning-outline'], garage: ['garage', 'garage-open'],
    window: ['window-closed', 'window-open'], door: ['door-closed', 'door-open'], gate: ['gate', 'gate-open'],
  };
  const features = (st) => (st && st.attributes.supported_features) || 0;
  const moving = (st) => !!st && (st.state === 'opening' || st.state === 'closing');
  const isOpen = (st) => hasValue(st) && st.state !== 'closed';
  // Where it stands, 0 (closed) to 100 (open): the one just set, until Home Assistant answers.
  function position(cfg) {
    const h = held(cfg.entity + ':pos'), st = states[cfg.entity];
    if (h != null) return h;
    const p = st && st.attributes.current_position;
    return p != null ? p : isOpen(st) ? 100 : 0;
  }
  function iconOf(cfg, st) {
    const [closed, open] = ICONS[st && st.attributes.device_class] || ICONS.shutter;
    return isOpen(st) ? cfg.iconOpen || cfg.icon || open : cfg.icon || closed;
  }
  const run = (cfg, service, data = {}) => call('cover', service, data, cfg.entity);
  // A tap: stop it on its way, else open it or close it.
  function tap(cfg) {
    const st = states[cfg.entity];
    if (moving(st) && features(st) & F.STOP) run(cfg, 'stop_cover');
    else run(cfg, isOpen(st) ? 'close_cover' : 'open_cover');
  }
  function setPosition(cfg, p) { hold(cfg.entity + ':pos', p); run(cfg, 'set_cover_position', { position: p }); }

  // The tile is built before Home Assistant has said what the cover can do:
  // its pill slides once it says the cover takes a position, and otherwise
  // says its state, full while it is open.
  function makeCoverTile(cfg) {
    const pct = (f) => clamp(Math.round(f * 100), 0, 100);
    const sliding = () => !!(features(states[cfg.entity]) & F.POSITION);
    const { node, iconEl, stateEl, extraEl } = tileFrame(cfg, {
      icon: iconOf(cfg, null), tap: () => tap(cfg), open: (pid) => openCover(cfg, pid),
      slide: {
        onPreview: (f) => { if (sliding()) paint(pct(f)); },
        onCommit: (f, final) => { if (final && sliding()) setPosition(cfg, pct(f)); },
      },
    });
    const paint = (p) => { setVar(node, '--p', (p / 100).toFixed(4)); setText(stateEl, `${p}%`); };
    let shownIcon = null;
    watch([cfg.entity], () => {
      const st = states[cfg.entity], slides = sliding() && hasValue(st);
      setClass(node, 'on', isOpen(st));
      setClass(node, 'unavailable', isUnavailable(st));
      const ic = iconOf(cfg, st);
      if (ic !== shownIcon) { shownIcon = ic; iconEl.innerHTML = icon(ic); }
      if (slides) paint(position(cfg));
      else { setVar(node, '--p', isOpen(st) ? 1 : 0); setText(stateEl, stateText(st, cfg)); }
      setText(extraEl, slides && moving(st) ? `· ${stateText(st)}` : '');
    });
    return node;
  }

  // The panel: Open, Stop and Close at the bottom (those the cover has), its
  // position, and the tilt of its slats; the line under its name says how it
  // stands.
  function openCover(cfg, pointerId) {
    const st0 = states[cfg.entity], f = features(st0);
    const actions = [[F.OPEN, 'open', 'arrow-up', 'open_cover'], [F.STOP, 'stop', 'stop', 'stop_cover'], [F.CLOSE, 'shut', 'arrow-down', 'close_cover']]
      .filter(([bit]) => !st0 || f & bit).map(([, name, ic, service]) => ({ name: t(name), icon: ic, run: () => run(cfg, service) }));
    let parts = null;
    K.openPanel({
      icon: iconOf(cfg, st0), name: cfg.name || (st0 && st0.attributes.friendly_name) || cfg.entity, actions,
      update: (body, line, card) => {
        const st = states[cfg.entity], a = st ? st.attributes : {};
        if (!parts) {
          parts = {};
          if (f & F.POSITION) {
            const main = body.appendChild(el('div', 'pop-main'));
            parts.pos = makeSlider({ big: true, min: 0, max: 100, label: t('position'), labelIcon: iconOf(cfg, st), format: (v) => v + '%', onCommit: (v, final) => { if (final) setPosition(cfg, v); } });
            main.appendChild(parts.pos.el);
          }
          if (f & F.TILT) {
            const pane = body.appendChild(el('div', 'light-controls')).appendChild(el('div', 'pane'));
            parts.tilt = makeSlider({ min: 0, max: 100, label: t('tilt'), format: (v) => v + '%', onCommit: (v, final) => { if (final) { hold(cfg.entity + ':tilt', v); run(cfg, 'set_cover_tilt_position', { tilt_position: v }); } } });
            pane.appendChild(parts.tilt.el);
          }
        }
        const p = position(cfg);
        setText(line, f & F.POSITION && hasValue(st) && !moving(st) ? `${stateText(st)} · ${p}%` : stateText(st, cfg));
        setClass(card, 'off', !isOpen(st));
        if (parts.pos) parts.pos.set(p);
        if (parts.tilt) { const h = held(cfg.entity + ':tilt'); parts.tilt.set(h != null ? h : a.current_tilt_position || 0); }
      },
    }, pointerId);
  }

  Object.assign(K, { makeCoverTile, openCover });
})();
