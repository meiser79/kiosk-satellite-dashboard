/* Kiosk dashboard: Home Assistant's areas. A room of config.js without an
 * icon of its own takes the icon of its area: the one its `area` names (the
 * area's id or name), else the one whose id is the room's key, else the one
 * named like the room's title. A kiosk shows in the menu's intercom folder
 * with the area of its ESPHome device, where Kiosk Satellite shows up in
 * Home Assistant, by the kiosk's device name. Home Assistant lists them once
 * the page is connected, and again after every reconnect; until then a room
 * keeps its default icon. An area's icon the page does not carry
 * (js/icons.js) is left out. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, ICONS, HA, slug } = K;

  let areas = [];            // [{ area_id, name, icon }] as Home Assistant listed them
  let byDevice = new Map();  // a device's name -> its area
  const changed = [];        // what to redraw once they come

  // An icon of Home Assistant's (mdi:sofa) the page can draw, or ''.
  const drawable = (name) => { const key = String(name || '').replace(/^mdi:/, ''); return Object.hasOwn(ICONS, key) ? key : ''; };

  // A room's area: by its `area`, its key, or its title.
  function roomArea(key) {
    const room = (CFG.rooms || {})[key] || {};
    const by = (want, of) => want && areas.find((a) => slug(of(a)) === slug(want));
    return room.area
      ? by(room.area, (a) => a.area_id) || by(room.area, (a) => a.name) || null
      : by(key, (a) => a.area_id) || by(room.title, (a) => a.name) || null;
  }
  // A room's icon: its own, else its area's, else ''.
  function roomIcon(key) {
    const room = (CFG.rooms || {})[key] || {}, area = !room.icon && roomArea(key);
    return room.icon || (area ? drawable(area.icon) : '');
  }
  // The area of a kiosk's device, by the kiosk's device name: { name, icon }, or null.
  function deviceArea(name) {
    const area = byDevice.get(slug(name));
    return area ? { name: area.name, icon: drawable(area.icon) } : null;
  }
  const onAreas = (fn) => changed.push(fn);

  // Asked for only where something shows them: a room without an icon, or
  // the intercom's folder. A device of ESPHome goes before another
  // integration's device of the same name, such as an Echo's own.
  function loadAreas() {
    const roomsWant = Object.values(CFG.rooms || {}).some((r) => r && !r.icon);
    const kiosksWant = ((CFG.menu && CFG.menu.items) || []).some((it) => it && it.items === true && /^ks:\/\/intercom\/*$/.test(String(it.link || '')));
    if (!roomsWant && !kiosksWant) return;
    Promise.all([HA.request({ type: 'config/area_registry/list' }), kiosksWant ? HA.request({ type: 'config/device_registry/list' }) : []]).then(([list, devices]) => {
      const byId = new Map((list || []).map((a) => [a.area_id, a]));
      const esphome = (d) => (d.identifiers || []).some((i) => i && i[0] === 'esphome');
      const now = new Map(), seen = new Set();
      for (const d of [...(devices || [])].sort((a, b) => esphome(b) - esphome(a))) {
        const area = byId.get(d.area_id);
        for (const n of [d.name, d.name_by_user].filter(Boolean).map(slug)) {
          if (seen.has(n)) continue;
          seen.add(n);
          if (area) now.set(n, area);
        }
      }
      if (JSON.stringify([list, [...now]]) === JSON.stringify([areas, [...byDevice]])) return;
      areas = list || [];
      byDevice = now;
      for (const fn of changed) fn();
    }, (e) => console.warn('The areas in Home Assistant:', e));
  }
  HA.onStatus((s) => { if (!s) loadAreas(); });

  Object.assign(K, { roomIcon, deviceArea, onAreas });
})();
