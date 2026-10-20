// Checks of the menu: a room without a Music Assistant player, rings of one to ten buttons.
import { sleep, check, openPage, ROOT_ITEMS, text, has, insideRim, load } from './harness.mjs';

// 8. A room without a Music Assistant player: its kiosks get no favourites. The Music folder keeps only the Music
//    Assistant page on the Show, and has nothing left for the Spot. A player that is not Music Assistant's: the
//    folder says Music Assistant did not answer.
export async function noPlayer() {
  const noPlayer = `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => { delete c.rooms.bedroom.player; v = c; } }); })();`;
  const p = await openPage(480, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: noPlayer });
  await load(p, 'device=Echo+Spot+Bedroom');
  check((await p.eval(`[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`)) === ROOT_ITEMS.replace(',Music', ''), 'spot, no player in the bedroom: no Music folder at all');
  await p.close();
  const q = await openPage(960, 480);
  await q.s('Page.addScriptToEvaluateOnNewDocument', { source: noPlayer });
  await load(q, 'device=Echo+Show+5+Bedroom');
  await q.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  const cardNames = `[...document.querySelectorAll('#folder-menu .room-card .room-name')].map((e) => e.textContent).join()`;
  check((await q.eval(cardNames)) === 'Back,Music Assistant' && !(await has(q, '#folder-menu .fav-bar')), 'show 5, no player: the Music folder keeps only the Music Assistant page, no switch');
  await q.close();
  const r = await openPage(960, 480);
  await r.s('Page.addScriptToEvaluateOnNewDocument', { source: noPlayer.replace('delete c.rooms.bedroom.player', "c.rooms.bedroom.player = 'media_player.apple_tv'") });
  await load(r, 'device=Echo+Show+5+Bedroom');
  await r.tapSel('#menu .menu-item[aria-label="Music"]');
  check(await r.waitFor(`(document.querySelector('#folder-menu .fav-note') || {}).textContent === 'Music Assistant did not answer'`) && (await r.eval(cardNames)) === 'Back,Music Assistant' && await has(r, '#folder-menu .fav-switch'),
    'show 5, the Apple TV as the player: the folder says Music Assistant did not answer, under the switch');
  await r.close();
}

// 9. Rings of one to ten buttons on the Spot (ten folders in the menu, the k-th holding k items): the fewer the
//    buttons, the larger, their names too. Each ring in the middle, inside the rim and clear of the tab's touch
//    area, its buttons 30% of a button apart, every name in its button; a short ring keeps close to the middle.
export async function ringSizes() {
  const NAMES = ['Now playing', 'Screensaver', 'Intercom', 'Cameras', 'Find my phone', 'Music Assistant', 'Thermostat', 'Shopping list', 'Calendar', 'Weather'];
  const tenFolders = `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    const names = ${JSON.stringify(NAMES)};
    c.menu.items = names.map((name, j) => ({ name, icon: 'apps', items: names.slice(0, j + 1).map((n) => ({ name: n, icon: 'apps', link: 'ks://intercom' })) }));
    v = c; } }); })();`;
  const ringNow = `(() => { const c = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width }; };
    const items = [...document.querySelectorAll('#menu .ring-item')], cs = items.map(c), mid = c(document.querySelector('#menu .ring-close'));
    const near = (a) => Math.min(...cs.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
    return { n: cs.length, d: cs[0].d, mid, same: cs.every((a) => Math.abs(a.d - cs[0].d) < 0.5), apart: cs.length > 1 ? Math.min(...cs.map((a) => near(a) - a.d)) : 1e9,
      inner: Math.min(...cs.map((a) => Math.hypot(a.x - mid.x, a.y - mid.y) - a.d / 2 - mid.d / 2)), low: Math.max(...cs.map((a) => a.y + a.d / 2)),
      tab: document.getElementById('menu-handle').getBoundingClientRect().top, font: parseFloat(getComputedStyle(items[0]).fontSize),
      fits: items.every((e) => { const l = e.querySelector('.item-label'), t = document.createRange(); t.selectNodeContents(l); return l.scrollHeight <= l.clientHeight + 1 && t.getBoundingClientRect().width <= l.getBoundingClientRect().width + 0.5; }) }; })()`;   // the text's own width: scrollWidth rounds
  const p = await openPage(480, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: tenFolders });
  await load(p, 'device=Echo+Spot+Bedroom');
  const rem = await p.eval(`parseFloat(getComputedStyle(document.documentElement).fontSize)`);
  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(400);
  const rings = { 10: { ...(await p.eval(ringNow)), rim: await insideRim(p, '#menu .ring-item') } };   // the first ring: the ten folders
  await p.shot('spot-menu-ten.png');
  for (let k = 1; k <= 9; k++) {
    await p.tapSel(`#menu .ring-item:nth-child(${k})`); await sleep(450);
    rings[k] = { ...(await p.eval(ringNow)), rim: await insideRim(p, '#menu .ring-item') };
    if (k === 4) await p.shot('spot-menu-four.png');
    await p.tapSel('#menu .ring-close'); await sleep(450);
  }
  const all = Object.entries(rings).map(([k, r]) => ({ k: +k, ...r })), bad = (f) => all.filter((r) => !f(r)).map((r) => r.k).join() || 'none';
  const sizes = all.map((r) => r.d.toFixed(0)).join(' ');
  check(all.every((r) => r.n === r.k && r.same), `spot: rings of one to ten buttons, all of a ring the same size (wrong: ${bad((r) => r.n === r.k && r.same)})`);
  check(all.every((r, j) => !j || r.d <= all[j - 1].d + 0.5) && rings[1].d === rings[4].d && rings[4].d > 110 && rings[6].d > 95 && rings[10].d >= 4 * rem, `spot: the fewer the buttons, the larger: 7rem up to four, still a finger's width at ten (${sizes})`);
  check(all.every((r, j) => !j || r.font <= all[j - 1].font) && rings[1].font > 15 && all.every((r) => r.font >= 10), `the names shrink with their buttons, never under 10px (${all.map((r) => r.font.toFixed(1)).join(' ')})`);
  check(all.every((r) => Math.abs(r.mid.x - 240) < 2 && Math.abs(r.mid.y - 240) < 2 && r.rim), `every ring sits in the middle of the screen, inside the rim (wrong: ${bad((r) => Math.abs(r.mid.x - 240) < 2 && Math.abs(r.mid.y - 240) < 2 && r.rim)})`);
  check(all.every((r) => r.low <= r.tab - 0.9 * rem), `every ring stops short of the tab's touch area (wrong: ${bad((r) => r.low <= r.tab - 0.9 * rem)})`);
  check(all.every((r) => r.apart >= 0.28 * r.d), `the buttons stand 30% of a button apart (wrong: ${bad((r) => r.apart >= 0.28 * r.d)})`);
  check(all.every((r) => r.inner >= 0.9 * rem) && all.filter((r) => r.k <= 3).every((r) => r.inner <= 1.1 * rem), `a short ring keeps 1rem from the middle button, the others no nearer (wrong: ${bad((r) => r.inner >= 0.9 * rem && (r.k > 3 || r.inner <= 1.1 * rem))})`);
  check(all.every((r) => r.fits), `every name fits in its button, two lines at most (wrong: ${bad((r) => r.fits)})`);
  await p.close();
}
