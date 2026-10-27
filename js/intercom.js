/* Kiosk dashboard: the intercom's kiosks. A menu item with the link
 * ks://intercom and `items: true` is a folder of the other kiosks Kiosk
 * Satellite's intercom knows, a tap calling one straight away
 * (ks://intercom/<id>), without the Call a kiosk sheet. The kiosks of the
 * rooms come first, in the room menu's order, each named after its room in
 * config.js, with the room's icon (js/areas.js); then the kiosks devices
 * gives no room, named after their area in Home Assistant (the one of their
 * ESPHome device), with its icon, by name; then the rest, by device name. Where two
 * would take one name, each keeps its device name. An icon in a kiosk's entry
 * in devices goes over all of these. One that
 * cannot take a call now (offline, intercom off, Do not disturb) shows
 * faded, with why on the Show's card. A kiosk listed twice under one name
 * (an old entry Kiosk Satellite's fleet still keeps) shows once. Kiosk
 * Satellite tells the page of its kiosks only when something changes, so the
 * page keeps the last list on the kiosk and starts from it. Until it has
 * one, and where this kiosk's own intercom is off, the item opens the sheet
 * as its link says. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, KS, t, lookup, slug } = K;
  const { roomIcon, deviceArea, onAreas } = K;

  const KEPT = 'kiosk.intercom';
  // Which of two entries under one name to show: the one most ready for a call.
  const RANK = ['ready', 'dnd', 'off', 'key', 'tls', 'unknown', 'unreachable', 'offline'];
  const rank = (k) => { const i = RANK.indexOf(k.status); return i < 0 ? RANK.length : i; };
  // Why a kiosk cannot take a call, by Kiosk Satellite's status.
  const WHY = { off: 'kioskOff', dnd: 'kioskDnd', offline: 'kioskOffline', unreachable: 'kioskUnreachable', key: 'kioskKey', tls: 'kioskTls', unknown: 'kioskChecking' };
  let roster = read();   // { enabled, self, kiosks: [{ id, name, status, statusText }] } as Kiosk Satellite said last, or null

  function read() {
    try { const r = JSON.parse(localStorage.getItem(KEPT)); return r && Array.isArray(r.kiosks) ? r : null; } catch (_) { return null; }
  }
  function keep(r) { try { localStorage.setItem(KEPT, JSON.stringify(r)); } catch (_) { /* not kept: the next page waits for Kiosk Satellite again */ } }

  // A menu item that lists the intercom's kiosks.
  const isIntercom = (it) => it.items === true && /^ks:\/\/intercom\/*$/.test(String(it.link || ''));

  onAreas(() => K.redrawIntercom());

  // The other kiosks as items: the rooms' first, then the areas', then the
  // rest; none while the list is unknown or this kiosk's intercom is off.
  function intercomItems() {
    if (!roster || roster.enabled === false) return [];
    const self = roster.self && roster.self.id, selfName = slug((roster.self && roster.self.name) || '');
    const byName = new Map();
    for (const k of roster.kiosks) {
      if (!k.id || k.id === self || (selfName && slug(k.name) === selfName)) continue;
      const was = byName.get(slug(k.name));
      if (!was || rank(k) < rank(was)) byName.set(slug(k.name), k);
    }
    const others = [...byName.values()], rooms = CFG.rooms || {}, order = Object.keys(rooms);
    const entry = (k) => { const d = lookup(CFG.devices, k.name); return d && typeof d === 'object' ? d : { room: d }; };   // its line in devices
    const roomOf = (k) => (rooms[entry(k).room] ? entry(k).room : null);
    // Each kiosk's room in config.js, else its area in Home Assistant: a name, an icon, a place in the list.
    const where = (k) => {
      const key = roomOf(k), area = !key && deviceArea(k.name);
      if (key) return { name: rooms[key].title, icon: roomIcon(key), place: order.indexOf(key) };
      if (area) return { name: area.name, icon: area.icon, place: order.length };
      return { name: '', icon: '', place: order.length + 1 };
    };
    const found = others.map((k) => ({ k, at: where(k) }));
    const shared = (name) => found.filter((f) => f.at.name === name).length > 1;
    return found.map(({ k, at }) => ({
      name: at.name && !shared(at.name) ? at.name : k.name,
      icon: entry(k).icon || at.icon || 'account-voice',
      link: 'ks://intercom/' + encodeURIComponent(k.id),
      idle: k.status !== 'ready',
      state: k.status === 'ready' ? undefined : WHY[k.status] ? t(WHY[k.status]) : k.statusText,
      place: at.place,
    })).sort((a, b) => a.place - b.place || a.name.localeCompare(b.name));
  }

  // Kiosk Satellite's intercom changed: a call, a kiosk found or lost, one
  // checked again. Only a change of the kiosks redraws the menu: all of it
  // when the item turns from a link into a folder or back.
  function followIntercom(status) {
    if (!status || !Array.isArray(status.kiosks)) return;
    const now = {
      enabled: status.enabled !== false,
      self: { id: status.self && status.self.id, name: status.self && status.self.name },
      kiosks: status.kiosks.map((k) => ({ id: String(k.id || ''), name: String(k.name || ''), status: k.status, statusText: k.statusText })),
    };
    if (JSON.stringify(now) === JSON.stringify(roster)) return;
    const had = intercomItems().length > 0;
    roster = now;
    keep(now);
    if ((intercomItems().length > 0) !== had) K.buildMenu(); else K.redrawIntercom();
  }
  if (KS) addEventListener('kiosksatellite:intercom', (e) => followIntercom(e.detail));

  Object.assign(K, { isIntercom, intercomItems });
})();
