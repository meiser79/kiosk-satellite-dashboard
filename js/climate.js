/* Kiosk dashboard: thermostats, a room's `climate`: a heating, an air
 * conditioner, a heat pump. A tile like a light's: a tap turns it on or
 * off; its pill sets the target temperature and says it, the room's own
 * after its name; lit while it is on, orange while it heats and blue while
 * it cools. A long-press (or the dots) opens its panel: the target
 * temperature, its modes (heat, cool, auto, off…) and its presets (eco,
 * comfort, away…), as Home Assistant lists them. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { t, states, el, esc, clamp, hasValue, isUnavailable, stateText, setText, setClass, setVar } = K;
  const { watch, hold, held, call, pressFx, makeSlider, tileFrame } = K;

  const F = { TARGET: 1, RANGE: 2, PRESET: 16, OFF: 128, ON: 256 };   // a thermostat's supported_features
  const HEAT = '255, 138, 61', COOL = '90, 169, 230';   // its colour while it heats, or cools
  const features = (st) => (st && st.attributes.supported_features) || 0;
  const isOn = (st) => hasValue(st) && st.state !== 'off';
  const deg = (v) => (v == null || isNaN(v) ? '–' : `${Math.round(v * 10) / 10}°`);
  const colour = (st) => {
    const action = st && st.attributes.hvac_action;
    return action === 'heating' || action === 'preheating' ? HEAT : action === 'cooling' ? COOL : 'var(--accent-rgb)';
  };
  // The temperatures it takes: Home Assistant's, or a heating's usual.
  function limits(st) {
    const a = st ? st.attributes : {};
    return { min: a.min_temp ?? 7, max: a.max_temp ?? 35, step: a.target_temp_step || 0.5 };
  }
  // The target: the one just set, until Home Assistant answers.
  function target(cfg) {
    const h = held(cfg.entity + ':temp'), st = states[cfg.entity];
    return h != null ? h : st ? st.attributes.temperature : null;
  }
  const run = (cfg, service, data = {}) => call('climate', service, data, cfg.entity);
  function setTarget(cfg, v) { hold(cfg.entity + ':temp', v); run(cfg, 'set_temperature', { temperature: v }); }
  // On or off: with its own turn_on and turn_off when it has them, else by
  // its mode (off, or the first of the others).
  function power(cfg) {
    const st = states[cfg.entity], f = features(st), modes = (st && st.attributes.hvac_modes) || [];
    if (isOn(st)) { if (f & F.OFF) run(cfg, 'turn_off'); else run(cfg, 'set_hvac_mode', { hvac_mode: 'off' }); return; }
    const mode = modes.find((m) => m !== 'off');
    if (f & F.ON) run(cfg, 'turn_on');
    else if (mode) run(cfg, 'set_hvac_mode', { hvac_mode: mode });
  }

  // The tile is built before Home Assistant has said what the thermostat can
  // do: its pill slides once it says it takes a target temperature (and
  // while it is on), and otherwise says its state.
  function makeClimateTile(cfg) {
    const sliding = () => !!(features(states[cfg.entity]) & F.TARGET);
    const at = (f) => { const { min, max, step } = limits(states[cfg.entity]); return clamp(Number((Math.round((min + f * (max - min)) / step) * step).toFixed(2)), min, max); };
    const { node, stateEl, extraEl } = tileFrame(cfg, {
      icon: cfg.icon || 'thermostat', tap: () => power(cfg), open: (pid) => openClimate(cfg, pid),
      slide: {
        onPreview: (f) => { if (sliding()) paint(at(f)); },
        onCommit: (f, final) => { if (final && sliding()) setTarget(cfg, at(f)); },
      },
    });
    const paint = (v) => {
      const { min, max } = limits(states[cfg.entity]);
      setVar(node, '--p', clamp((v - min) / (max - min), 0, 1).toFixed(4));
      setText(stateEl, deg(v));
    };
    watch([cfg.entity], () => {
      const st = states[cfg.entity], on = isOn(st), a = st ? st.attributes : {};
      setClass(node, 'on', on);
      setClass(node, 'unavailable', isUnavailable(st));
      setVar(node, '--tile-rgb', colour(st));
      if (on && sliding() && target(cfg) != null) paint(target(cfg));
      else {
        setVar(node, '--p', 0);
        setText(stateEl, on && a.target_temp_low != null ? `${deg(a.target_temp_low)}–${deg(a.target_temp_high)}` : stateText(st, cfg));
      }
      setText(extraEl, hasValue(st) && a.current_temperature != null ? `· ${deg(a.current_temperature)}` : '');
    });
    return node;
  }

  // The panel: the target temperature, then a row of chips for its modes and
  // one for its presets, the one it is in marked. The line under its name
  // says what it is doing and the room's temperature.
  function openClimate(cfg, pointerId) {
    const st0 = states[cfg.entity], f = features(st0), a0 = st0 ? st0.attributes : {};
    let parts = null;
    K.openPanel({
      icon: cfg.icon || 'thermostat', name: cfg.name || a0.friendly_name || cfg.entity, actions: [],
      update: (body, line, card) => {
        const st = states[cfg.entity], a = st ? st.attributes : {};
        if (!parts) {
          parts = { rows: [] };
          if (f & F.TARGET) {
            const { min, max, step } = limits(st0);
            parts.temp = makeSlider({ big: true, min, max, step, label: t('target'), labelIcon: 'thermometer', format: deg, onCommit: (v, final) => { if (final) setTarget(cfg, v); } });
            body.appendChild(el('div', 'pop-main')).appendChild(parts.temp.el);
          }
          const box = body.appendChild(el('div', 'light-controls'));
          // a row of chips: what it holds, the attribute it shows, the service and the field that set it
          const row = (label, list, key, service, field) => {
            if (!Array.isArray(list) || !list.length) return;
            const control = box.appendChild(el('div', 'pane')).appendChild(el('div', 'control', `<div class="control-label">${esc(label)}</div>`));
            const wrap = control.appendChild(el('div', 'wrap'));
            for (const v of list) {
              const c = el('button', 'chip sm', `<span class="name">${esc(t.state(v))}</span>`);
              c.dataset.v = v;
              pressFx(c);
              c.addEventListener('click', () => { hold(`${cfg.entity}:${key}`, v); run(cfg, service, { [field]: v }); });
              wrap.appendChild(c);
            }
            parts.rows.push({ wrap, key });
          };
          row(t('mode'), a0.hvac_modes, 'mode', 'set_hvac_mode', 'hvac_mode');
          if (f & F.PRESET) row(t('preset'), a0.preset_modes, 'preset', 'set_preset_mode', 'preset_mode');
        }
        const now = { mode: st && st.state, preset: a.preset_mode };
        for (const { wrap, key } of parts.rows) {
          const h = held(`${cfg.entity}:${key}`), cur = h != null ? h : now[key];
          for (const c of wrap.children) setClass(c, 'on', c.dataset.v === cur);
        }
        if (parts.temp && target(cfg) != null) parts.temp.set(target(cfg));
        const doing = a.hvac_action && a.hvac_action !== 'off' ? t.state(a.hvac_action) : stateText(st, cfg);
        setText(line, a.current_temperature != null && hasValue(st) ? `${doing} · ${deg(a.current_temperature)}` : doing);
        setClass(card, 'off', !isOn(st));
        setVar(card, '--tile-rgb', colour(st));
      },
    }, pointerId);
  }

  Object.assign(K, { makeClimateTile, openClimate });
})();
