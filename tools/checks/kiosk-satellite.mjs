// Checks inside Kiosk Satellite, with a stand-in for its bridge.
import { check, openPage, ROOT_ITEMS, has, menuOpen, load, sleep } from './harness.mjs';

// 3. Inside Kiosk Satellite (a stand-in for its bridge): Now playing shows only while its player has something
//    loaded, on the Spot's ring and on the Show's rail.
export async function insideKioskSatellite() {
  const ks = (state) => `window.kioskSatellite = { platform: 'kiosksatellite', version: 'test', getDeviceInfo: () => Promise.resolve({}),
    getKioskState: () => Promise.resolve({ screenOn: true, mediaPlayer: { state: '${state}', title: '', artist: '', source: '', nowPlayingShown: false } }) };`;
  const tell = (p, state) => p.eval(`dispatchEvent(new CustomEvent('kiosksatellite:kiosk-state', { detail: { mediaPlayer: { state: '${state}' } } })), true`);
  const p = await openPage(480, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: ks('idle') });
  await load(p, 'device=Echo+Spot+Bedroom');
  const ring = `[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`;
  const REST = ROOT_ITEMS.replace('Now playing,', '');
  check(await p.waitFor(`${ring} === '${REST}'`), 'in Kiosk Satellite, no Now playing while its player is idle');
  await tell(p, 'playing');
  check(await p.waitFor(`${ring} === '${ROOT_ITEMS}'`), 'Now playing comes back once something plays');
  await p.tapSel('#menu-handle');
  await tell(p, 'idle');
  check(await p.waitFor(`${ring} === '${REST}'`) && await menuOpen(p), 'and goes when the player stops, even with the menu open');
  await p.close();
  const q = await openPage(960, 480);
  await q.s('Page.addScriptToEvaluateOnNewDocument', { source: ks('paused') });
  await load(q, 'device=Echo+Show+5+Bedroom');
  const rail = `[...document.querySelectorAll('#menu .menu-item')].map((e) => e.getAttribute('aria-label')).join()`;
  check(await q.waitFor(`${rail} === '${ROOT_ITEMS}'`), 'show: a paused player keeps Now playing on the rail');
  await tell(q, 'idle');
  check(await q.waitFor(`${rail} === '${REST}'`), 'show: an idle one takes it off the rail');
  await q.close();
}

// 3b. The intercom's kiosks (a stand-in for Kiosk Satellite's intercom events): the Intercom item (ks://intercom,
//     items: true) opens the Call a kiosk sheet until Kiosk Satellite names them, then is a folder of one item per
//     other kiosk: the rooms' (by their device names where a room has more than one), then the others by their
//     area in Home Assistant (the mock's registries), then the rest; the ones that cannot take a call faded; a tap
//     calls one. The list is kept across a reload and follows a change with the folder open; where
//     this kiosk's intercom is off, the item opens the sheet again.
export async function intercomKiosks() {
  const ks = `window.kioskSatellite = { platform: 'kiosksatellite', version: 'test', getDeviceInfo: () => Promise.resolve({}),
    getKioskState: () => Promise.resolve({ screenOn: true, mediaPlayer: { state: 'playing' } }) };`;
  // The ks:// link a tap followed. Chrome has no app for it, and its tab takes no more touches: it is closed.
  const follows = async (p, tap) => { await tap(); await sleep(300); const link = p.leftFor(); await p.close(); return link; };
  const kiosk = (id, name, status = 'ready') => ({ id, name, status, statusText: status, address: '10.0.0.9', port: 2324 });
  const roster = (over = {}, enabled = true) => ({ enabled, state: 'idle', self: { id: 'spot-bed', name: 'Echo Spot Bedroom' },
    kiosks: [kiosk('spot-bed', 'Echo Spot Bedroom'), kiosk('show-bed', 'Echo Show 5 Bedroom'), kiosk('spot-liv', 'Echo Spot Living Room'),
      kiosk('show-liv', 'Echo Show 8 Living Room', 'dnd'), kiosk('spot-kit', 'Echo Spot Kitchen'), kiosk('spot-off', 'Echo Spot Office', 'offline'),
      kiosk('tab 1', 'Garage Tablet'), kiosk('dot-hall', 'Echo Dot Hall'), kiosk('dot-kit', 'Echo Dot Kitchen'), kiosk('pixel', 'Pixel 9a'), kiosk('old-tab', 'Garage Tablet', 'offline'), kiosk('old-spot', 'Echo Spot Bedroom', 'offline')].map((k) => ({ ...k, ...(over[k.id] || {}) })) });
  const tell = (p, status) => p.eval(`dispatchEvent(new CustomEvent('kiosksatellite:intercom', { detail: ${JSON.stringify(status)} })), true`);
  const NAMES = 'Bedroom,Echo Show 8 Living Room,Echo Spot Kitchen,Echo Spot Living Room,Office,Garage,Hall,Kitchen,Pixel 9a';   // the rooms' in their order, the areas', the rest
  const ring = `[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`;
  const faded = `[...document.querySelectorAll('#menu .ring-item.idle')].map((e) => e.textContent).join()`;
  const openMenu = async (p) => {
    await p.tapSel('#menu-handle');
    await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  };
  const openIntercom = async (p) => { await openMenu(p); await p.tapSel(`#menu .ring-item[aria-label="Intercom"]`); await sleep(300); };
  const isFolder = (p) => p.eval(`document.querySelector('#menu .ring-item[aria-label="Intercom"]').classList.contains('folder')`);
  const tapNamed = async (p, name) => {
    const r = await p.eval(`(() => { const e = [...document.querySelectorAll('#menu .ring-item')].find((b) => b.textContent === ${JSON.stringify(name)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (r) { await p.tap(r.x, r.y); await sleep(300); }
    return !!r;
  };

  const spot = async () => { const p = await openPage(480, 480); await p.s('Page.addScriptToEvaluateOnNewDocument', { source: ks }); await load(p, 'device=Echo+Spot+Bedroom'); return p; };
  const iconOf = (p, name) => p.eval(`(() => { const e = [...document.querySelectorAll('#menu .ring-item')].find((b) => b.textContent === ${JSON.stringify(name)}); return e ? e.querySelector('svg path').getAttribute('d') : ''; })()`);

  let p = await spot();
  await p.eval(`localStorage.removeItem('kiosk.intercom'), true`);   // a kiosk Kiosk Satellite has not yet named any to
  await load(p, 'device=Echo+Spot+Bedroom');
  await openMenu(p);
  check(!(await isFolder(p)), 'intercom: before Kiosk Satellite names its kiosks, the Intercom item is a link');
  check((await follows(p, () => p.tapSel(`#menu .ring-item[aria-label="Intercom"]`))) === 'ks://intercom', 'intercom: and opens the Call a kiosk sheet');

  p = await spot();
  await openMenu(p);
  await tell(p, roster());
  check(await p.waitFor(`document.querySelector('#menu .ring-item[aria-label="Intercom"]').classList.contains('folder')`) && await menuOpen(p), 'intercom: once they are named, a folder, the menu open meanwhile');
  await p.tapSel(`#menu .ring-item[aria-label="Intercom"]`);
  await sleep(300);
  check(await p.waitFor(`${ring} === '${NAMES}'`), 'intercom: the other kiosks, the rooms\' first by room or device name, then by their area in Home Assistant (ESPHome\'s device before an Alexa one of the same name), then the rest; the kiosk itself and old entries under a name left out');
  check((await p.eval(faded)) === 'Echo Show 8 Living Room,Office', 'intercom: the ones in Do not disturb and offline faded');
  const icons = async (names) => { const out = []; for (const [n, i] of names) out.push((await iconOf(p, n)) === (await p.eval(`KIOSK_ICONS[${JSON.stringify(i)}]`))); return out.every(Boolean); };
  check(await icons([['Office', 'desk'], ['Kitchen', 'countertop'], ['Hall', 'speaker'], ['Garage', 'account-voice'], ['Pixel 9a', 'account-voice']]),
    'intercom: a room\'s icon, an area\'s, the one devices gives, and the intercom\'s for an area icon the page does not carry and a kiosk Home Assistant does not know');
  await p.shot('spot-intercom.png');
  await load(p, 'device=Echo+Spot+Bedroom');
  await openIntercom(p);
  check(await p.waitFor(`${ring} === '${NAMES}'`), 'intercom: the kiosk keeps the list across a reload, before Kiosk Satellite says anything');
  await tell(p, roster({ 'show-liv': { status: 'ready' } }));
  check(await p.waitFor(`${faded} === 'Office'`), 'intercom: one out of Do not disturb comes back, the folder open');
  await tell(p, roster({}, false));
  check(await p.waitFor(`${ring}.split(',').includes('Intercom')`) && !(await isFolder(p)), 'intercom: where this kiosk\'s intercom is off, the item is a link again');
  await tell(p, roster());
  check(await p.waitFor(`${ring}.split(',').includes('Intercom')`) && await isFolder(p), 'intercom: and a folder once it is on');
  await p.tapSel(`#menu .ring-item[aria-label="Intercom"]`);
  await sleep(300);
  check((await follows(p, () => tapNamed(p, 'Bedroom'))) === 'ks://intercom/show-bed', 'intercom: a tap calls that kiosk straight away');
  p = await spot();
  await openIntercom(p);
  await p.waitFor(`${ring}.split(',').includes('Garage')`);
  check((await follows(p, () => tapNamed(p, 'Garage'))) === 'ks://intercom/tab%201', 'intercom: a kiosk named after its area calls by its id');

  const q = await openPage(960, 480);
  await q.s('Page.addScriptToEvaluateOnNewDocument', { source: ks });
  await load(q, 'device=Echo+Show+5+Bedroom');
  await tell(q, { ...roster(), self: { id: 'show-bed', name: 'Echo Show 5 Bedroom' } });
  await q.tapSel('#menu .menu-item[aria-label="Intercom"]');
  await sleep(400);
  await q.waitFor(`[...document.querySelectorAll('#folder-menu .room-name')].some((e) => e.textContent === 'Kitchen')`);
  const cards = await q.eval(`[...document.querySelectorAll('#folder-menu .room-card')].map((c) => [c.querySelector('.room-name').textContent, (c.querySelector('.room-state') || {}).textContent || '', c.classList.contains('idle')])`);
  check(cards.map((c) => c[0]).join() === 'Back,Bedroom,Echo Show 8 Living Room,Echo Spot Kitchen,Echo Spot Living Room,Office,Garage,Hall,Kitchen,Pixel 9a',
    'show 5: the Intercom folder\'s cards, the Show itself left out and the Spot in its room named after it');
  check(JSON.stringify(cards.filter((c) => c[2]).map((c) => c[1])) === JSON.stringify(['Do not disturb', 'Offline']), 'show 5: a faded card says why');
  await q.shot('show-intercom.png');
  await q.eval(`localStorage.removeItem('kiosk.intercom'), true`);
  await q.close();
}
