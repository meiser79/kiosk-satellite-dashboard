// Checks of a room's music card: the living room's, on the Echo Show 8 (1280×800), as Kiosk Satellite lays an Echo
// Show 8 out (960×600), on the Show 5 and on the Echo Spot.
import { check, openPage, mockReaches, mockSet, lastCall, RADIOS, PLAYLISTS, PODCASTS, AUDIOBOOKS, has, load, changeRoom, setLibrary, sleep } from './harness.mjs';

const names = (p) => p.eval(`[...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`);
const shown = (p, sel) => p.eval(`(() => { const e = document.querySelector('.view.active ' + ${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`);
const box = (p, sel) => p.eval(`(() => { const r = document.querySelector('.view.active ' + ${JSON.stringify(sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);

// 21. The living room's music card under the dial: its favourites while the player plays nothing, a tap plays one there,
//     then what plays, with pause, next and the volume; pausing brings the favourites back. It steps aside for the
//     media card. On the Spot, a place of its own in the strip.
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

  // The kinds' names across the Show 8's card while they fit (four of them); five do not, even at 1280×800, nor
  // four in the Show 5's narrow column: their icons there, named for a screen reader, inside the card. Podcasts and
  // Audiobooks bring theirs.
  const five = ['radio', 'playlist', 'album', 'podcast', 'audiobook'];
  const kindsSwitch = (p) => p.eval(`(() => { const s = document.querySelector('.view.active .music .fav-switch'), c = document.querySelector('.view.active .music-favs').getBoundingClientRect(), r = s.getBoundingClientRect();
    return { labels: [...s.children].map((b) => b.getAttribute('aria-label')).join(), names: [...s.children].map((b) => b.textContent).join(), icons: s.querySelectorAll('.icon').length, inside: r.left >= c.left && r.right <= c.right }; })()`);
  for (const [w, h, kinds] of [[960, 600, five.slice(0, 4)], [1280, 800, five], [960, 600, five]]) {
    const k8 = await openPage(w, h), names = kinds.length < 5, labels = 'Radios,Playlists,Albums,Podcasts,Audiobooks'.split(',').slice(0, kinds.length).join();
    await changeRoom(k8, 'living', { music: kinds, media: null });
    await load(k8, 'device=Echo+Show+8+Living+Room');
    await k8.waitFor(`document.querySelectorAll('.view.active .music-fav').length > 0`);
    await sleep(300);
    const s8 = await kindsSwitch(k8);
    check(s8.labels === labels && s8.inside && (names ? s8.names === labels : s8.icons === 5),
      `show 8 at ${w}×${h}: ${kinds.length} kinds ${names ? 'by name' : 'as icons'}, inside the card (got ${names ? s8.names : s8.icons + ' icons'})`);
    await k8.close();
  }
  const k5 = await openPage(960, 480);
  await changeRoom(k5, 'bedroom', { music: five });
  await load(k5, 'room=bedroom');
  await k5.waitFor(`document.querySelectorAll('.view.active .music-fav').length > 0`);
  await sleep(300);
  const s5 = await kindsSwitch(k5);
  check(s5.labels === 'Radios,Playlists,Albums,Podcasts,Audiobooks' && s5.icons === 5 && s5.inside, `show 5: five kinds in the narrow column, their icons named for a screen reader, inside the card (got ${s5.labels}, ${s5.icons} icons)`);
  await k5.tapSel('.view.active .music .fav-switch button:nth-child(4)');
  check(await k5.waitFor(`${JSON.stringify(PODCASTS)} === [...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`), 'show 5: Podcasts brings the favourite podcasts into the card');
  await k5.tapSel('.view.active .music .fav-switch button:nth-child(5)');
  check(await k5.waitFor(`${JSON.stringify(AUDIOBOOKS)} === [...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`), 'show 5: Audiobooks brings the favourite audiobooks into the card');
  await k5.shot('show5-music-podcasts.png');
  await k5.close();

  // The Spot: the card at the end of the strip, in the media card's place and of its size, hidden while the media card
  // shows; inside the rim and clear of the dots, its last dot brings it. The favourites as on the Show; while one
  // plays, the compact media card in their place (no volume), pausing brings them back.
  const s = await openPage(480, 480);
  await load(s, 'device=Echo+Spot+Living+Room');
  check(await s.waitFor(`document.querySelectorAll('.view.active .lights > .music .music-fav').length === 7`) && await s.eval(`document.querySelector('.view.active .lights > :last-child').classList.contains('music')`) && (await names(s)) === RADIOS,
    `spot: the music card at the end of the strip, the favourite radios in it (got ${await names(s)})`);
  await s.eval(`(() => { const d = document.querySelectorAll('.view.active > .dots span'); d[d.length - 1].click(); return true; })()`);
  await sleep(800);
  const sc = await s.eval(`(() => { const v = document.querySelector('.view.active'), m = v.querySelector('.lights > .music'), r = m.getBoundingClientRect(), k = parseFloat(getComputedStyle(m.querySelector('.music-favs')).borderTopLeftRadius), o = k * (1 - Math.SQRT1_2);
    const pts = [[r.left, r.top + k], [r.left + o, r.top + o], [r.left + k, r.top], [r.left, r.bottom - k], [r.left + o, r.bottom - o], [r.left + k, r.bottom]].flatMap(([x, y]) => [[x, y], [480 - x, y]]);
    const d = v.querySelector(':scope > .dots span.on').getBoundingClientRect(), dots = v.querySelectorAll(':scope > .dots span');
    return { rim: pts.every(([x, y]) => Math.hypot(x - 240, y - 240) < 240 * (50 - 3.6) / 50), mid: Math.abs(r.left + r.width / 2 - 240) < 2, clear: r.bottom <= d.top, last: dots[dots.length - 1].classList.contains('on'), sw: [...m.querySelectorAll('.fav-switch button')].map((b) => b.textContent).join() }; })()`);
  check(sc.rim && sc.mid && sc.clear && sc.last && sc.sw === 'Radios,Playlists', `spot: its dot brings the card to the middle, inside the rim, clear of the dots, the switch by name (${JSON.stringify(sc)})`);
  await s.shot('spot-music.png');
  const cardBox = () => s.eval(`(() => { const r = document.querySelector('.view.active .lights > :is(.media, .music):not([hidden])').getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; })()`);
  const musicBox = await cardBox();
  await mockSet('input_boolean.projector', 'on');
  check(await s.waitFor(`document.querySelector('.view.active .lights > .music').hidden && !document.querySelector('.view.active .lights > .media').hidden`), 'spot: the music card steps aside while the media card shows');
  await s.eval(`(() => { const d = document.querySelectorAll('.view.active > .dots span'); d[d.length - 1].click(); return true; })()`);
  await sleep(800);
  const mediaBox = await cardBox();
  check(['t', 'b', 'l', 'r'].every((k) => Math.abs(mediaBox[k] - musicBox[k]) < 1), `spot: the media card in the music card's place, of its size (${JSON.stringify(musicBox)}, ${JSON.stringify(mediaBox)})`);
  await mockSet('input_boolean.projector', 'off');
  check(await s.waitFor(`!document.querySelector('.view.active .lights > .music').hidden && document.querySelector('.view.active .lights > .media').hidden`), 'spot: and back once it goes');
  await s.eval(`(() => { const d = document.querySelectorAll('.view.active > .dots span'); d[d.length - 1].click(); return true; })()`);
  await sleep(800);
  await s.tapSel('.view.active .music .fav-switch button:nth-child(2)');
  check(await s.waitFor(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Playlists'`) && (await names(s)) === PLAYLISTS, `spot: Playlists shows the playlists (got ${await names(s)})`);
  await s.tapSel('.view.active .music .fav-switch button:nth-child(1)');
  await s.waitFor(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Radios'`);
  await s.tapSel('.view.active .music-fav:nth-child(2)');
  const sCall = await lastCall();
  check(sCall.service === 'play_media' && sCall.target.entity_id === 'media_player.living_room_speakers' && sCall.data.media_id === 'library://radio/1'
    && await s.waitFor(`(document.querySelector('.view.active .music .media-title') || {}).textContent === 'FIP'`) && !(await shown(s, '.music-favs')),
    `spot: a tap on FIP plays it on the living room's player, the card shows what plays (got ${JSON.stringify(sCall)})`);
  check(await s.eval(`document.querySelector('.view.active .music .media').classList.contains('compact')`) && await shown(s, '.music .media-btn.play') && !(await shown(s, '.music .media-volume'))
    && await s.eval(`(() => { const m = document.querySelector('.view.active .lights > .music').getBoundingClientRect(), d = document.querySelector('.view.active > .dots span').getBoundingClientRect(); return m.bottom <= d.top; })()`),
    'spot: while it plays, the compact media card, pause and next, no volume, still clear of the dots');
  await s.shot('spot-music-playing.png');
  await s.tapSel('.view.active .music .media-btn.play');
  check(await mockReaches((st) => st['media_player.living_room_speakers'].s === 'paused') && await s.waitFor(`!document.querySelector('.view.active .music-favs').hidden`), 'spot: pause, and the favourites come back');
  await s.close();

  // No favourite podcasts: the line that says so in the strip's place, the card as tall as with the radios.
  await setLibrary({ podcast: [] });
  const np = await openPage(480, 480);
  await changeRoom(np, 'living', { music: ['radio', 'podcast'] });
  await load(np, 'device=Echo+Spot+Living+Room');
  await np.waitFor(`document.querySelectorAll('.view.active .lights > .music .music-fav').length === 7`);
  const cardH = () => np.eval(`document.querySelector('.view.active .lights > .music').getBoundingClientRect().height`);
  await np.eval(`(() => { const d = document.querySelectorAll('.view.active > .dots span'); d[d.length - 1].click(); return true; })()`);
  await sleep(800);
  const withRadios = await cardH();
  await np.tapSel('.view.active .music .fav-switch button:nth-child(2)');
  check(await np.waitFor(`(document.querySelector('.view.active .music .music-note') || {}).textContent === 'No favourite podcasts in Music Assistant'`) && Math.abs(await cardH() - withRadios) < 1,
    `spot: no favourite podcasts, a line in the strip's place, the card as tall as with the radios (${withRadios.toFixed(0)}px, then ${(await cardH()).toFixed(0)}px)`);
  await np.shot('spot-music-none.png');
  await np.close();
  await setLibrary(null);
  const n = await openPage(1280, 800);
  await changeRoom(n, 'living', { player: null });
  await load(n, 'device=Echo+Show+8+Living+Room');
  check(!(await has(n, '.music')), 'show 8, music but no player: no card');
  await n.close();
}
