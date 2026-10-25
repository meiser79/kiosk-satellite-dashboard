/* Kiosk dashboard: the popover, a light's controls, opened by a long press
 * (or the room's events, js/events.js, opened by a tap on them, and a
 * cover's, a thermostat's or a fan's, js/covers.js, js/climate.js and js/fans.js).
 * Wide screens: a card with the light's icon, name and state, a close
 * button and Off / On buttons. The Spot has no card: the controls stand on
 * the menus' dark backdrop in a column that keeps inside the circle, the
 * name alone at the top, a power button before the brightness slider, and
 * the tab at the bottom closes it, as it closes the menus. Both sets of
 * buttons are built; the stylesheet hides the ones a shape does not use. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { HA, t, $, states, COLOR_MODES, reducedMotion, el, esc, icon, cap, domain, isLight, isOn, stateText, lightRgb, lightLabel, hsToRgb, setText, setClass, setVar } = K;
  const { hold, held, shownPct, call, toggle, turn, lightOn, setBrightness, pressFx, makeSlider, views } = K;

  const pop = $('popover'), popCard = pop.querySelector('.popover'), popBody = $('pop-body');
  let popCfg = null, popParts = null, popTimer = null;

  const SWATCHES = [[0, 100], [30, 100], [55, 100], [120, 90], [180, 90], [220, 100], [275, 100], [320, 90]];
  const TEMP_GRADIENT = 'linear-gradient(90deg, #ff9a3c 0%, #ffc777 30%, #fff4e0 55%, #dce8ff 80%, #bcd2ff 100%)';
  const HUE_GRADIENT = 'linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

  function openPopover(cfg, pointerId) {
    popCfg = cfg;
    popParts = {};
    const st = states[cfg.entity];
    const a = st ? st.attributes : {};
    $('pop-icon').innerHTML = icon(cfg.icon || 'lightbulb-outline');
    $('pop-name').textContent = cfg.name || a.friendly_name || cfg.entity;
    popBody.innerHTML = '';

    const power = el('button', 'pop-power', icon('power'));
    power.setAttribute('aria-label', t('onOff'));
    pressFx(power);
    power.addEventListener('click', () => toggle(cfg.entity));
    const main = el('div', 'pop-main');
    main.appendChild(power);
    popBody.appendChild(main);
    if (isLight(cfg.entity)) {
      const bright = makeSlider({ big: true, min: 1, label: t('brightness'), labelIcon: 'brightness-6', format: (v) => v + '%', onCommit: (v) => setBrightness(cfg.entity, v) });
      main.appendChild(bright.el);
      popParts.bright = bright;
      popParts.controls = makeLightControls(cfg);
      popBody.appendChild(popParts.controls.el);
    }

    const old = popCard.querySelector('.pop-actions');
    if (old) old.remove();
    const actions = el('div', 'pop-actions', `<button data-s="off">${esc(t('off'))}</button><button data-s="on">${esc(t('on'))}</button>`);
    actions.querySelector('[data-s="off"]').addEventListener('click', () => turn(cfg.entity, false));
    actions.querySelector('[data-s="on"]').addEventListener('click', () => turn(cfg.entity, true));
    popCard.appendChild(actions);
    popParts.actions = actions;

    showPopover(pointerId);
  }
  // The panel for something other than a light, the room's events
  // (js/events.js), a cover or a thermostat: an icon and a name at the top,
  // and under them what update(body, line, card) puts there, on opening and
  // on every redraw (card: to mark it off). Its buttons at the bottom (a
  // name, or an icon named for a screen reader, and what it runs) show on
  // the Spot too. A long-press that opens it passes its finger (pointerId).
  function openPanel({ icon: ic, name, actions, update }, pointerId) {
    popCfg = { panel: true };
    popParts = { update };
    $('pop-icon').innerHTML = icon(ic);
    $('pop-name').textContent = name;
    $('pop-state').textContent = '';
    popBody.innerHTML = '';
    setClass(popCard, 'off', false);
    setVar(popCard, '--tile-rgb', 'var(--accent-rgb)');
    const old = popCard.querySelector('.pop-actions');
    if (old) old.remove();
    if (actions.length) {
      const row = el('div', 'pop-actions panel-actions');
      for (const a of actions) {
        const b = el('button', a.icon ? 'icon-only' : '', a.icon ? icon(a.icon) : esc(a.name));
        if (a.icon) b.setAttribute('aria-label', a.name);
        pressFx(b);
        b.addEventListener('click', a.run);
        row.appendChild(b);
      }
      popCard.appendChild(row);
    }
    showPopover(pointerId);
  }
  function showPopover(pointerId) {
    clearTimeout(popTimer);
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add('show'));
    if (pointerId != null) armOverlay(pointerId);
    updatePopover();
  }
  function updatePopover() {
    if (!popCfg) return;
    if (popCfg.panel) { popParts.update(popBody, $('pop-state'), popCard); return; }
    const st = states[popCfg.entity];
    const on = isOn(st);
    setText($('pop-state'), isLight(popCfg.entity) ? lightLabel(st, popCfg) : stateText(st, popCfg));
    setClass(popCard, 'off', !on);
    const rgb = lightRgb(st);
    setVar(popCard, '--tile-rgb', rgb ? rgb.join(', ') : 'var(--accent-rgb)');
    if (popParts.bright) popParts.bright.set(on ? shownPct(popCfg.entity) : 0);
    if (popParts.controls) popParts.controls.update();
    for (const b of popParts.actions.querySelectorAll('button')) setClass(b, 'on', on === (b.dataset.s === 'on'));
  }

  // The controls of a light, in tabs for what it supports: White (colour
  // temperature), Colour, Effects, More (the entities listed under
  // `controls` in the config), Lights (members of a group). Built from the
  // light's current attributes; update() follows its state.
  function makeLightControls(cfg) {
    const entity = cfg.entity;
    const a = states[entity] ? states[entity].attributes : {};
    const node = el('div', 'light-controls');
    const parts = { tabs: {}, panes: {}, controls: [] };
    const modes = a.supported_color_modes || [];
    const tabs = [];
    if (modes.includes('color_temp')) tabs.push({ key: 'temp', name: t('white'), icon: 'white-balance-sunny' });
    if (modes.some((m) => COLOR_MODES.includes(m))) tabs.push({ key: 'color', name: t('colour'), icon: 'palette' });
    if (Array.isArray(a.effect_list) && a.effect_list.length) tabs.push({ key: 'fx', name: t('effects'), icon: 'auto-fix' });
    if (Array.isArray(cfg.controls) && cfg.controls.length) tabs.push({ key: 'more', name: t('more'), icon: 'tune-variant' });
    if (Array.isArray(a.entity_id) && a.entity_id.length) tabs.push({ key: 'members', name: t('lights'), icon: 'lightbulb-group-outline' });

    const select = (key) => {
      for (const [k, b] of Object.entries(parts.tabs)) setClass(b, 'active', k === key);
      for (const [k, pane] of Object.entries(parts.panes)) pane.hidden = k !== key;
    };
    if (tabs.length > 1) {
      const bar = el('div', 'tabs');
      for (const t of tabs) {
        const b = el('button', 'tab', icon(t.icon) + `<span>${esc(t.name)}</span>`);
        b.addEventListener('click', () => select(t.key));
        bar.appendChild(b);
        parts.tabs[t.key] = b;
      }
      node.appendChild(bar);
    }
    for (const t of tabs) {
      const pane = el('div', 'pane');
      pane.hidden = true;
      buildPane(t.key, pane, cfg, a, parts);
      node.appendChild(pane);
      parts.panes[t.key] = pane;
    }
    if (tabs.length) select(preferredTab(tabs, a));

    const update = () => {
      const st = states[entity], at = st ? st.attributes : {};
      if (parts.temp) { const h = held(entity + ':k'); parts.temp.set(h != null ? h : (at.color_temp_kelvin || parts.temp.value || 3000)); }
      if (parts.color) {
        const h = held(entity + ':hs');
        const hs = h || (COLOR_MODES.includes(at.color_mode) && at.hs_color ? at.hs_color : null);
        if (hs) parts.color.set(Math.round(hs[0]), Math.round(hs[1]));
        for (const b of parts.color.sw.children) setClass(b, 'active', !!hs && Math.abs(Number(b.dataset.h) - hs[0]) < 4 && Math.abs(Number(b.dataset.s) - hs[1]) < 6);
      }
      if (parts.fx) { const h = held(entity + ':fx'); const cur = h || at.effect; for (const c of parts.fx.children) setClass(c, 'on', c.dataset.fx === cur); }
      if (parts.members) for (const c of parts.members.children) setClass(c, 'on', isOn(states[c.dataset.id]));
      for (const c of parts.controls) {
        const cst = states[c.id];
        if (c.kind === 'select') { const h = held(c.id); const cur = h != null ? h : cst && cst.state; for (const o of c.row.children) setClass(o, 'on', o.dataset.opt === cur); }
        else if (c.kind === 'number') { const h = held(c.id); const v = h != null ? h : parseFloat(cst && cst.state); if (!isNaN(v)) c.slider.set(v); }
        else setClass(c.chip, 'on', isOn(cst));
      }
    };
    update();
    return { el: node, tabs, update };
  }
  function preferredTab(tabs, a) {
    if (a.color_mode === 'color_temp' && tabs.some((t) => t.key === 'temp')) return 'temp';
    if (COLOR_MODES.includes(a.color_mode) && tabs.some((t) => t.key === 'color')) return 'color';
    return tabs[0].key;
  }
  function buildPane(key, pane, cfg, a, parts) {
    const entity = cfg.entity;
    if (key === 'temp') {
      const min = a.min_color_temp_kelvin || 2000, max = a.max_color_temp_kelvin || 6500;
      const s = makeSlider({ min, max, step: 50, gradient: TEMP_GRADIENT, label: t('temperature'), format: (v) => v + 'K', onCommit: (v) => { hold(entity + ':k', v); lightOn(entity, { color_temp_kelvin: v }); } });
      pane.appendChild(s.el);
      parts.temp = s;
    }
    if (key === 'color') {
      let h = 30, sat = 100;
      const send = () => { hold(entity + ':hs', [h, sat]); lightOn(entity, { hs_color: [h, sat] }); };
      const satEl = makeSlider({ min: 0, max: 100, gradient: 'linear-gradient(90deg, #fff 0%, #f00 100%)', label: t('saturation'), format: (v) => v + '%', onCommit: (v) => { sat = v; send(); } });
      const hueEl = makeSlider({ min: 0, max: 360, gradient: HUE_GRADIENT, label: t('hue'), format: (v) => v + '°', onPreview: (v) => { h = v; paintSat(); }, onCommit: (v) => { h = v; paintSat(); send(); } });
      const paintSat = () => satEl.el.style.setProperty('--grad', `linear-gradient(90deg, #fff 0%, rgb(${hsToRgb(h, 100).join(',')}) 100%)`);
      paintSat();
      const sw = el('div', 'swatches');
      for (const [sh, ss] of SWATCHES) {
        const b = el('button', 'swatch');
        b.style.background = `rgb(${hsToRgb(sh, ss).join(',')})`;
        b.dataset.h = sh; b.dataset.s = ss;
        pressFx(b);
        b.addEventListener('click', () => { h = sh; sat = ss; hueEl.set(h); satEl.set(sat); paintSat(); send(); });
        sw.appendChild(b);
      }
      pane.appendChild(hueEl.el); pane.appendChild(satEl.el); pane.appendChild(sw);
      parts.color = { hueEl, satEl, sw, set(nh, ns) { h = nh; sat = ns; hueEl.set(h); satEl.set(sat); paintSat(); } };
    }
    if (key === 'fx') {
      const wrap = el('div', 'wrap');
      for (const fx of a.effect_list) {
        const c = el('button', 'chip sm', `<span class="name">${esc(fx)}</span>`);
        c.dataset.fx = fx;
        pressFx(c);
        c.addEventListener('click', () => { hold(entity + ':fx', fx); lightOn(entity, { effect: fx }); });
        wrap.appendChild(c);
      }
      pane.appendChild(wrap);
      parts.fx = wrap;
    }
    if (key === 'more') {
      const prefix = String(cfg.name || '').toLowerCase();
      for (const id of cfg.controls) {
        const cst = states[id], ca = cst ? cst.attributes : {};
        let label = ca.friendly_name || id.split('.')[1].replace(/_/g, ' ');
        if (prefix && label.toLowerCase().startsWith(prefix)) label = label.slice(prefix.length).trim();
        label = cap(label);
        const d = domain(id);
        if (d === 'select' || d === 'input_select') {
          const group = el('div', 'control', `<div class="control-label">${esc(label)}</div>`);
          const row = el('div', 'hscroll');
          for (const o of ca.options || []) {
            const c = el('button', 'chip sm', `<span class="name">${esc(o)}</span>`);
            c.dataset.opt = o;
            pressFx(c);
            c.addEventListener('click', () => { hold(id, o); call(d, 'select_option', { option: o }, id); });
            row.appendChild(c);
          }
          group.appendChild(row);
          pane.appendChild(group);
          parts.controls.push({ id, kind: 'select', row });
        } else if (d === 'number' || d === 'input_number') {
          const s = makeSlider({ min: ca.min ?? 0, max: ca.max ?? 100, step: ca.step || 1, label, format: (v) => `${Math.round(v * 100) / 100}${ca.unit_of_measurement ? ' ' + ca.unit_of_measurement : ''}`, onCommit: (v) => { hold(id, v); call(d, 'set_value', { value: v }, id); } });
          pane.appendChild(s.el);
          parts.controls.push({ id, kind: 'number', slider: s });
        } else {
          const c = el('button', 'chip', icon(ca.icon || 'toggle-switch-outline') + `<span class="name">${esc(label)}</span>`);
          pressFx(c);
          c.addEventListener('click', () => toggle(id));
          pane.appendChild(c);
          parts.controls.push({ id, kind: 'toggle', chip: c });
        }
      }
    }
    if (key === 'members') {
      HA.add(a.entity_id);
      const wrap = el('div', 'wrap');
      for (const id of a.entity_id) {
        const mcfg = findLightCfg(id);
        const c = el('button', 'chip sm', icon(mcfg.icon || 'lightbulb-outline') + `<span class="name">${esc(mcfg.name || (states[id] && states[id].attributes.friendly_name) || id)}</span>`);
        c.dataset.id = id;
        pressFx(c);
        c.addEventListener('click', () => toggle(id));
        wrap.appendChild(c);
      }
      pane.appendChild(wrap);
      parts.members = wrap;
    }
  }
  function findLightCfg(id) {
    for (const v of Object.values(views)) for (const l of v.room.lights || []) if (l.entity === id) return l;
    return {};
  }
  // The finger that long-pressed is still down, and Chromium fires its tap
  // where the finger lifts: keep the popover from taking that release.
  function armOverlay(pointerId) {
    pop.classList.add('arming');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      setTimeout(() => pop.classList.remove('arming'), 80);
    };
    const release = (e) => { if (pointerId == null || e.pointerId === pointerId) finish(); };
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    setTimeout(finish, 3000);
  }
  function closePopover() {
    if (!popCfg) return;
    popCfg = null;
    pop.classList.remove('show');
    popTimer = setTimeout(() => { if (!popCfg) pop.hidden = true; }, reducedMotion ? 0 : 220);
  }
  pop.addEventListener('click', (e) => { if (e.target === pop) closePopover(); });
  $('pop-close').innerHTML = icon('close');
  $('pop-close').addEventListener('click', closePopover);
  const popTab = $('pop-tab');
  popTab.innerHTML = icon('chevron-down');
  pressFx(popTab);
  popTab.addEventListener('click', closePopover);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  Object.assign(K, { openPopover, openPanel, updatePopover, closePopover });
})();
