/* Kiosk dashboard: live states and service calls. Widgets watch the
 * entities they show and are redrawn, in one frame, when Home Assistant
 * says one of them changed; a value the user just set stays on screen until
 * Home Assistant answers. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { HA, states, pctOf, toast } = K;

  /* -------------------------------------------------------- optimistic */
  // Keep a value the user set on screen until Home Assistant answers with the
  // entity's next state (or for a moment, should it not), so that controls do
  // not jump back while a call is in flight. Keys are an entity id, or
  // "<entity>:<what>" for one of its attributes.
  const holds = new Map();
  function hold(key, value) { holds.set(key, { value, until: Date.now() + 2500 }); }
  function held(key) {
    const h = holds.get(key);
    if (!h) return null;
    if (h.until < Date.now()) { holds.delete(key); return null; }
    return h.value;
  }
  function release(entity) {
    for (const key of holds.keys()) if (key === entity || key.startsWith(entity + ':')) holds.delete(key);
  }
  function shownPct(entity) {
    const h = held(entity);
    return h != null ? h : pctOf(states[entity]);
  }

  /* ------------------------------------------------------------ widgets */
  const widgets = new Map(); // entity id -> Set of update functions
  const allWidgets = new Set();
  let dirty = new Set(), flushQueued = false, flushAll = false;
  function watch(ids, update) {
    allWidgets.add(update);
    for (const id of [].concat(ids)) {
      if (!id) continue;
      if (!widgets.has(id)) widgets.set(id, new Set());
      widgets.get(id).add(update);
    }
  }
  function render(ids) {
    if (ids) for (const id of ids) dirty.add(id); else flushAll = true;
    if (flushQueued) return;
    flushQueued = true;
    requestAnimationFrame(() => {
      flushQueued = false;
      const fns = new Set();
      if (flushAll) for (const fn of allWidgets) fns.add(fn);
      else for (const id of dirty) { const s = widgets.get(id); if (s) for (const fn of s) fns.add(fn); }
      dirty = new Set(); flushAll = false;
      for (const fn of fns) fn();
      K.updatePopover();
    });
  }
  HA.onChange((ids) => { for (const id of ids) release(id); render(ids); });

  /* ----------------------------------------------------------- services */
  // A call Home Assistant did not take: say so, and show again what it last
  // said of the entities, in place of the values held for them.
  const call = (domain, service, data, target) => HA.call(domain, service, data, target).catch(() => {
    toast('Home Assistant did not answer');
    const ids = [].concat(typeof target === 'string' ? target : (target && target.entity_id) || []);
    for (const id of ids) release(id);
    if (ids.length) render(ids);
  });
  const toggle = (entity) => call('homeassistant', 'toggle', {}, entity);
  const turn = (entity, on) => call('homeassistant', on ? 'turn_on' : 'turn_off', {}, entity);
  const lightOn = (entity, data) => call('light', 'turn_on', data, entity);
  const setBrightness = (entity, pct) => { hold(entity, pct); lightOn(entity, { brightness_pct: pct }); };

  Object.assign(K, { hold, held, shownPct, watch, render, call, toggle, turn, lightOn, setBrightness });
})();
