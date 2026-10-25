/* Kiosk dashboard: fans, a room's `fans`: a ceiling fan, a tower fan, an air
 * purifier's. A tile like a light's: a tap turns it on or off; a drag across
 * it sets its speed, in the fan's own steps, which it says and fills to (all
 * the way left turns it off); lit while it runs, its preset mode after its
 * speed. A long-press opens its panel: the speed, and chips for its preset
 * modes, its oscillation and its direction, those it has. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { t, states, el, esc, clamp, hasValue, isUnavailable, stateText, setText, setClass, setVar } = K;
  const { watch, hold, held, call, pressFx, makeSlider, tileFrame } = K;

  const F = { SPEED: 1, OSCILLATE: 2, DIRECTION: 4, PRESET: 8 };   // a fan's supported_features
  const features = (st) => (st && st.attributes.supported_features) || 0;
  const isOn = (st) => hasValue(st) && st.state === 'on';
  // Its speed steps, in percent: Home Assistant's, or one in a hundred.
  const step = (st) => (st && st.attributes.percentage_step) || 1;
  const snap = (st, p) => clamp(Math.round(Math.round(p / step(st)) * step(st)), 0, 100);
  // Its speed: the one just set, until Home Assistant answers; none while it is off.
  function speed(cfg) {
    const h = held(cfg.entity + ':speed'), st = states[cfg.entity];
    if (h != null) return h;
    return isOn(st) ? st.attributes.percentage ?? 100 : 0;
  }
  const run = (cfg, service, data = {}) => call('fan', service, data, cfg.entity);
  function setSpeed(cfg, p) { hold(cfg.entity + ':speed', p); run(cfg, 'set_percentage', { percentage: p }); }
  const power = (cfg) => run(cfg, isOn(states[cfg.entity]) ? 'turn_off' : 'turn_on');

  // The tile is built before Home Assistant has said what the fan can do: it
  // slides once Home Assistant says it takes a speed, and otherwise says
  // whether it is on.
  function makeFanTile(cfg) {
    const sliding = () => !!(features(states[cfg.entity]) & F.SPEED);
    const { node, stateEl, extraEl } = tileFrame(cfg, {
      icon: cfg.icon || 'fan', tap: () => power(cfg), open: (pid) => openFan(cfg, pid),
      slide: {
        onPreview: (f) => { if (sliding()) paint(snap(states[cfg.entity], f * 100)); },
        onCommit: (f, final) => { if (final && sliding()) setSpeed(cfg, snap(states[cfg.entity], f * 100)); },
      },
    });
    const paint = (p) => { setVar(node, '--p', (p / 100).toFixed(4)); setText(stateEl, p ? `${p}%` : t('off')); };
    watch([cfg.entity], () => {
      const st = states[cfg.entity], on = isOn(st), preset = on && st.attributes.preset_mode;
      setClass(node, 'on', on);
      setClass(node, 'unavailable', isUnavailable(st));
      if (on && sliding()) paint(speed(cfg));
      else { setVar(node, '--p', on ? 1 : 0); setText(stateEl, stateText(st, cfg)); }
      setText(extraEl, preset ? `· ${t.state(preset)}` : '');
    });
    return node;
  }

  // The panel: Off and On at the bottom, the speed, then a row of chips for
  // its preset modes, one to turn its oscillation on or off and one for its
  // direction, the ones it is in marked. The line under its name says its
  // speed.
  function openFan(cfg, pointerId) {
    const st0 = states[cfg.entity], f = features(st0), a0 = st0 ? st0.attributes : {};
    let parts = null;
    K.openPanel({
      icon: cfg.icon || 'fan', name: cfg.name || a0.friendly_name || cfg.entity,
      actions: [{ name: t('off'), run: () => run(cfg, 'turn_off') }, { name: t('on'), run: () => run(cfg, 'turn_on') }],
      update: (body, line, card) => {
        const st = states[cfg.entity], a = st ? st.attributes : {};
        if (!parts) {
          parts = { rows: [] };
          if (f & F.SPEED) {
            parts.speed = makeSlider({ big: true, min: 0, max: 100, step: step(st0), label: t('speed'), labelIcon: cfg.icon || 'fan', format: (v) => (v ? v + '%' : t('off')), onCommit: (v, final) => { if (final) setSpeed(cfg, v); } });
            body.appendChild(el('div', 'pop-main')).appendChild(parts.speed.el);
          }
          const box = body.appendChild(el('div', 'light-controls'));
          // a row of chips: its label, the values with what each shows and runs, and the one it is in
          const row = (label, values, current) => {
            if (!values.length) return;
            const control = box.appendChild(el('div', 'pane')).appendChild(el('div', 'control', `<div class="control-label">${esc(label)}</div>`));
            const wrap = control.appendChild(el('div', 'wrap'));
            for (const v of values) {
              const c = el('button', 'chip sm', `<span class="name">${esc(v.name)}</span>`);
              c.dataset.v = v.key;
              pressFx(c);
              c.addEventListener('click', v.pick);
              wrap.appendChild(c);
            }
            parts.rows.push({ wrap, current });
          };
          const chosen = (key, attr) => () => { const h = held(`${cfg.entity}:${key}`); return String(h != null ? h : (states[cfg.entity] || { attributes: {} }).attributes[attr]); };
          const pick = (key, service, field, v) => () => { hold(`${cfg.entity}:${key}`, v); run(cfg, service, { [field]: v }); };
          if (f & F.PRESET) row(t('preset'), (a0.preset_modes || []).map((v) => ({ key: v, name: t.state(v), pick: pick('preset', 'set_preset_mode', 'preset_mode', v) })), chosen('preset', 'preset_mode'));
          if (f & F.OSCILLATE) row(t('oscillate'), [false, true].map((v) => ({ key: String(v), name: t(v ? 'on' : 'off'), pick: pick('oscillating', 'oscillate', 'oscillating', v) })), chosen('oscillating', 'oscillating'));
          if (f & F.DIRECTION) row(t('direction'), ['forward', 'reverse'].map((v) => ({ key: v, name: t.state(v), pick: pick('direction', 'set_direction', 'direction', v) })), chosen('direction', 'direction'));
        }
        for (const { wrap, current } of parts.rows) {
          const cur = current();
          for (const c of wrap.children) setClass(c, 'on', c.dataset.v === cur);
        }
        const p = speed(cfg);
        if (parts.speed) parts.speed.set(p);
        setText(line, isOn(st) && f & F.SPEED ? `${stateText(st)} · ${p}%` : stateText(st, cfg));
        setClass(card, 'off', !isOn(st));
      },
    }, pointerId);
  }

  Object.assign(K, { makeFanTile, openFan });
})();
