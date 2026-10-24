/* Kiosk dashboard: the room menu. Opened by a tap on the room title: a card
 * for every room, the current one marked, with how many lights it has on
 * and a power button that turns them off; last, a card that turns off every
 * light. Picking a room switches to it; turning lights off leaves the menu
 * open. On the Spot the cards are the rows of a list that scrolls; on the
 * wide screens, a grid. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { HA, t, $, states, el, esc, icon, isLight, isOn, groupMembers, setText, setClass } = K;
  const { watch, call, pressFx, armIdle, dim, undim, showView, activeRoom } = K;

  /* -------------------------------------------------------- room lights */
  // A room's lights are its main light and its light tiles. When the main
  // light is a group, how many are on is what it says under its name ("3 on":
  // the members of its group that are on). When Home Assistant does not list
  // its members (a Zigbee2MQTT group, a template light), the main light stands
  // for the room's own tiles: those that are on, or one while it alone is on.
  // A tile that is another room's main light (the kitchen's lights shown in
  // the living room) counts in that room only. The power button turns off what
  // the room counts: the group's members, or the main light and its own tiles.
  let allRooms = [];   // every room, set as the menu is built
  const mainOf = (room) => (room.main && isLight(room.main.entity) ? room.main.entity : null);
  function roomLights(room) {
    return [...new Set([room.main, ...(room.lights || [])].filter((c) => c && isLight(c.entity)).map((c) => c.entity))];
  }
  function ownTiles(room) {
    const main = mainOf(room), others = new Set(allRooms.filter((r) => r !== room).map(mainOf));
    return roomLights(room).filter((id) => id !== main && !others.has(id));
  }
  function countedLights(room) {
    const main = mainOf(room), members = main && groupMembers(states[main]);
    return members || [...(main ? [main] : []), ...ownTiles(room)];
  }
  function lightsOn(room) {
    const main = mainOf(room), members = main && groupMembers(states[main]);
    if (members) return members.filter((id) => isOn(states[id])).length;
    return ownTiles(room).filter((id) => isOn(states[id])).length || (main && isOn(states[main]) ? 1 : 0);
  }
  const onText = (n) => (n ? t('lightsOn', { n }) : t('lightsOff'));
  // Calls update when one of a room's lights changes, the members of its group included once known.
  function watchRoom(room, update) {
    let membersWatched = false;
    const run = () => {
      const members = room.main && groupMembers(states[room.main.entity]);
      if (members && !membersWatched) { membersWatched = true; watch(members, run); HA.add(members); }
      update();
    };
    watch(roomLights(room), run);
  }
  const lightsOff = (ids) => { if (ids.length) call('light', 'turn_off', {}, { entity_id: ids }); };

  /* ---------------------------------------------------------- room menu */
  const roomMenuEl = $('room-menu');
  let roomMenu = null, roomMenuOpen = false;

  function buildRoomMenu(rooms) {
    const entries = Object.entries(rooms);
    allRooms = Object.values(rooms);
    const everyLight = [...new Set(entries.flatMap(([, room]) => roomLights(room)))];
    const total = () => entries.reduce((n, [, room]) => n + lightsOn(room), 0);
    const card = (name, label, ic, pick) => {
      const node = el('div', 'room-card');
      node.innerHTML = `<button class="room-go" aria-label="${esc(label)}"><span class="room-icon">${icon(ic)}</span>`
        + `<span class="room-text"><span class="room-name">${esc(name)}</span><span class="room-state"></span></span></button>`;
      const go = node.querySelector('.room-go');
      pressFx(go);
      go.addEventListener('click', pick);
      return node;
    };
    const nodes = entries.map(([key, room]) => {
      const name = room.title || key;
      const node = card(name, name, room.icon || 'home-outline', () => showView(key));
      const off = el('button', 'room-off', icon('power'));
      off.setAttribute('aria-label', t('roomOff', { room: name }));
      pressFx(off);
      off.addEventListener('click', () => lightsOff(countedLights(room)));
      node.appendChild(off);
      const stateEl = node.querySelector('.room-state');
      watchRoom(room, () => { const n = lightsOn(room); off.hidden = !n; setText(stateEl, onText(n)); });
      return node;
    });
    const allOff = card(t('allOff'), t('allOffLabel'), 'power', () => lightsOff(everyLight));
    allOff.classList.add('all-off');
    const allOffState = allOff.querySelector('.room-state');
    for (const [, room] of entries) watchRoom(room, () => { const n = total(); setClass(allOff, 'idle', !n); setText(allOffState, onText(n)); });
    const list = el('div', 'rooms');
    list.style.setProperty('--cols', Math.min(4, nodes.length + 1));
    list.append(...nodes, allOff);
    roomMenuEl.appendChild(list);
    roomMenu = { keys: entries.map(([key]) => key), nodes, list };
  }
  function openRoomMenu() {
    if (!roomMenu || roomMenuOpen) return;
    roomMenuOpen = true;
    const current = roomMenu.keys.indexOf(activeRoom());
    roomMenu.nodes.forEach((node, j) => setClass(node, 'current', j === current));
    roomMenu.list.scrollTop = 0;
    roomMenuEl.hidden = false;
    requestAnimationFrame(() => setClass(roomMenuEl, 'open', roomMenuOpen));
    dim(closeRoomMenu);
  }
  function closeRoomMenu() {
    if (!roomMenuOpen) return;
    roomMenuOpen = false;
    roomMenuEl.classList.remove('open');
    setTimeout(() => { if (!roomMenuOpen) roomMenuEl.hidden = true; }, 250);
    undim(closeRoomMenu);
  }
  roomMenuEl.addEventListener('pointerdown', armIdle);

  Object.assign(K, { buildRoomMenu, openRoomMenu });
})();
