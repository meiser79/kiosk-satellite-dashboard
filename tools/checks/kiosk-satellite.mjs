// Checks inside Kiosk Satellite, with a stand-in for its bridge.
import { check, openPage, ROOT_ITEMS, has, menuOpen, load } from './harness.mjs';

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
