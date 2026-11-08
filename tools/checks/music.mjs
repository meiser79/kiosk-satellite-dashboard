// Checks of a room's music card: the living room's, on the Echo Show 8 (1280×800) and as Kiosk Satellite lays an Echo
// Show 8 out (960×600).
import { check, openPage, mockReaches, lastCall, RADIOS, PLAYLISTS, PODCASTS, has, load, changeRoom, setLibrary, sleep } from './harness.mjs';

const names = (p) => p.eval(`[...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`);
const shown = (p, sel) => p.eval(`(() => { const e = document.querySelector('.view.active ' + ${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`);
const box = (p, sel) => p.eval(`(() => { const r = document.querySelector('.view.active ' + ${JSON.stringify(sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);

// 21. The living room's music card under the dial: its favourites while the player plays nothing, a tap plays one there,
//     then what plays, with pause, next and the volume; pausing brings the favourites back. It steps aside for the
//     media card, and the Spot has none.
export async function musicShow8() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  check(await p.waitFor(`document.querySelectorAll('.view.active .music-fav').length === 7`) && (await names(p)) === RADIOS, `show 8: the music card lists the favourite radios (got ${await names(p)})`);
  // The living room's covers, thermostat and fan take the grid beside, so its lights are under the dial, the card under them.
  const [dial, card, controls, lights] = [await box(p, '.main'), await box(p, '.music'), await box(p, '.controls'), await box(p, '.controls > .lights')];
  check(lights.t >= dial.b && card.t >= lights.b - 1 && Math.abs(card.l - controls.l) < 1 && Math.abs(card.r - controls.r) < 1 && card.b <= 800,
    `show 8: the dial, its lights, then the card across the column (dial ${dial.h.toFixed(0)}px, card ${card.h.toFixed(0)}px)`);
  check(await p.eval(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Radios'`) && await p.waitFor(`document.querySelectorAll('.view.active .music-fav.with-cover').length === 5`)
    && await p.eval(`(() => { const s = document.querySelector('.view.active .music-strip'); return s.scrollWidth > s.clientWidth; })()`),
  'show 8: the switch on Radios, the five covers there are, more than the card shows at once');
  await p.shot('show8-music.png');

  // Playlists, then back to the radios.
  await p.tapSel('.view.active .music .fav-switch button:nth-child(2)');
  check(await p.waitFor(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Playlists'`) && (await names(p)) === PLAYLISTS, `show 8: Playlists shows the playlists (got ${await names(p)})`);
  await p.tapSel('.view.active .music .fav-switch button:nth-child(1)');

  // A tap plays one on the room's player, a toast says so, and the card shows what plays.
  await p.tapSel('.view.active .music-fav:nth-child(2)');
  const call = await lastCall();
  check(call.domain === 'music_assistant' && call.service === 'play_media' && call.target.entity_id === 'media_player.living_room_speakers' && call.data.media_id === 'library://radio/1' && call.data.media_type === 'radio'
    && await p.waitFor(`document.getElementById('toast').textContent === 'FIP'`), `show 8: a tap on FIP plays it on the living room's player, a toast says so (got ${JSON.stringify(call)})`);
  check(await p.waitFor(`(document.querySelector('.view.active .music .media-title') || {}).textContent === 'FIP'`) && await shown(p, '.music .media') && !(await shown(p, '.music-favs')),
    'show 8: while it plays, the card shows what plays in the favourites\' place');
  const playing = await box(p, '.music');
  check(Math.abs(playing.h - card.h) < 1 && Math.abs((await box(p, '.main')).h - dial.h) < 1 && await shown(p, '.music .media-btn.play') && await shown(p, '.music .media-btn.next') && await shown(p, '.music .media-volume')
    && !(await shown(p, '.music .media-btn.prev')) && !(await shown(p, '.music .media-btn.pwr')), 'show 8: as tall as the favourites, the dial unmoved; pause, next and the volume');
  await p.shot('show8-music-playing.png');
  await p.dragTo('.view.active .music .media-volume .slider', 0.8);
  check(await mockReaches((st) => Math.abs(st['media_player.living_room_speakers'].a.volume_level - 0.8) < 0.06), 'show 8: the card\'s slider sets the player\'s volume');
  await p.tapSel('.view.active .music .media-btn.play');
  check(await mockReaches((st) => st['media_player.living_room_speakers'].s === 'paused') && await p.waitFor(`!document.querySelector('.view.active .music-favs').hidden`) && (await names(p)) === RADIOS,
    'show 8: pause, and the favourites come back');

  // The media card takes the column: the music card steps aside until it goes.
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await p.waitFor(`!document.querySelector('.view.active .controls > .media').hidden`) && !(await shown(p, '.music')), 'show 8: with the Apple TV\'s card on, no music card');
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await p.waitFor(`document.querySelector('.view.active .music').getBoundingClientRect().height > 0`), 'show 8: and back once it goes');
  await p.close();

  // On an Echo Show 8 as Kiosk Satellite lays it out: the dial, three lights and the card all fit.
  const q = await openPage(960, 600);
  await changeRoom(q, 'living', { lights: [{ entity: 'light.living_room', name: 'Living room' }, { entity: 'light.dining_room', name: 'Dining room' }, { entity: 'light.kitchen', name: 'Kitchen' }] });
  await load(q, 'device=Echo+Show+8+Living+Room');
  const [d, l, c] = [await box(q, '.main'), await box(q, '.controls > .lights'), await box(q, '.music')];
  check(l.t >= d.b && c.t >= l.b - 1 && c.b <= 600 - 10 && await q.eval(`(() => { const g = document.querySelector('.view.active .controls > .lights'); return g.scrollHeight <= g.clientHeight + 1; })()`),
    `show 8 at 960×600: the dial, the three lights under it and the card, all in view (lights ${l.t.toFixed(0)}–${l.b.toFixed(0)}px, card ${c.t.toFixed(0)}–${c.b.toFixed(0)}px)`);
  await q.shot('show8-960-music.png');
  await q.close();

  // Without a media card, with the room's events and three kinds, none of them playlists: the light tiles still right
  // under the dial and the card under them, the events' tile as tall as without the card; the switch where it was
  // when Playlists shows a line in the strip's place.
  const living = (music) => ({ media: null, music, events: { calendars: ['calendar.family'], period: 'day' } });
  const boxes = (p) => p.eval(`(() => { const v = document.querySelector('.view.active'), r = (s) => { const e = v.querySelector(s); if (!e) return null; const { top, bottom, height } = e.getBoundingClientRect(); return { t: top, b: bottom, h: height }; };
    return { dial: r('.main'), lights: r('.controls > .lights'), card: r('.music'), events: r(':scope > .lights > .events'), sw: r('.music .fav-switch') }; })()`);
  await setLibrary({ playlist: [] });
  const w = await openPage(960, 600);
  await changeRoom(w, 'living', living(['radio', 'album', 'playlist']));
  await load(w, 'device=Echo+Show+8+Living+Room');
  await w.waitFor(`document.querySelectorAll('.view.active .music-fav').length > 0`);
  await sleep(300);
  const a = await boxes(w);
  check(a.lights.t >= a.dial.b && a.lights.t - a.dial.b < 20 && a.card.t >= a.lights.b - 1 && a.card.b <= 600,
    `show 8 without a media card: the light tiles right under the dial, the card under them (dial ${a.dial.b.toFixed(0)}px, lights ${a.lights.t.toFixed(0)}–${a.lights.b.toFixed(0)}px, card ${a.card.t.toFixed(0)}px)`);
  await w.tapSel('.view.active .music .fav-switch button:nth-child(3)');
  check(await w.waitFor(`!!document.querySelector('.view.active .music .music-note')`), 'show 8: no favourite playlists, a line in the strip\'s place');
  const e = await boxes(w);
  check(Math.abs(e.sw.t - a.sw.t) < 1, `show 8: the switch stays at the top of the card (${a.sw.t.toFixed(0)}px, then ${e.sw.t.toFixed(0)}px)`);
  await w.shot('show8-960-music-events.png');
  await w.close();
  const x = await openPage(960, 600);
  await changeRoom(x, 'living', living(null));
  await load(x, 'device=Echo+Show+8+Living+Room');
  await x.waitFor(`document.querySelectorAll('.view.active .events .event').length > 0`);
  await sleep(300);
  const b = await boxes(x);
  check(!b.card && Math.abs(b.events.h - a.events.h) < 1 && Math.abs(b.lights.t - a.lights.t) < 1,
    `show 8: the events' tile as tall with the card as without (${a.events.h.toFixed(0)}px, ${b.events.h.toFixed(0)}px without)`);
  await x.close();
  await setLibrary(null);

  // All four kinds: their names across the Show 8's card; in the Show 5's narrow column, where the names do not fit,
  // their icons, named for a screen reader, inside the card. Podcasts brings the podcasts there.
  const four = ['radio', 'playlist', 'album', 'podcast'];
  const kindsSwitch = (p) => p.eval(`(() => { const s = document.querySelector('.view.active .music .fav-switch'), c = document.querySelector('.view.active .music-favs').getBoundingClientRect(), r = s.getBoundingClientRect();
    return { labels: [...s.children].map((b) => b.getAttribute('aria-label')).join(), names: [...s.children].map((b) => b.textContent).join(), icons: s.querySelectorAll('.icon').length, inside: r.left >= c.left && r.right <= c.right }; })()`);
  const k8 = await openPage(960, 600);
  await changeRoom(k8, 'living', { music: four });
  await load(k8, 'device=Echo+Show+8+Living+Room');
  await k8.waitFor(`document.querySelectorAll('.view.active .music-fav').length > 0`);
  await sleep(300);
  const s8 = await kindsSwitch(k8);
  check(s8.names === 'Radios,Playlists,Albums,Podcasts' && s8.inside, `show 8: four kinds by name across the card (got ${s8.names})`);
  await k8.close();
  const k5 = await openPage(960, 480);
  await changeRoom(k5, 'bedroom', { music: four });
  await load(k5, 'room=bedroom');
  await k5.waitFor(`document.querySelectorAll('.view.active .music-fav').length > 0`);
  await sleep(300);
  const s5 = await kindsSwitch(k5);
  check(s5.labels === 'Radios,Playlists,Albums,Podcasts' && s5.icons === 4 && s5.inside, `show 5: four kinds in the narrow column, their icons named for a screen reader, inside the card (got ${s5.labels}, ${s5.icons} icons)`);
  await k5.tapSel('.view.active .music .fav-switch button:nth-child(4)');
  check(await k5.waitFor(`${JSON.stringify(PODCASTS)} === [...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`), 'show 5: Podcasts brings the favourite podcasts into the card');
  await k5.shot('show5-music-podcasts.png');
  await k5.close();

  // The Spot has no music card; a room's music without a player is left out.
  const s = await openPage(480, 480);
  await load(s, 'device=Echo+Spot+Living+Room');
  check(!(await has(s, '.music')), 'spot: no music card');
  await s.close();
  const n = await openPage(1280, 800);
  await changeRoom(n, 'living', { player: null });
  await load(n, 'device=Echo+Show+8+Living+Room');
  check(!(await has(n, '.music')), 'show 8, music but no player: no card');
  await n.close();
}
