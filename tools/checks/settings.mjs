// Checks of Settings in the menu: following the light turned off and on, the list of themes, a theme switched in
// place as it would show on a fresh page, its scene, and what the kiosk keeps.
import { readFileSync } from 'node:fs';
import { sleep, check, openPage, RING_FITS, failPictures, slowFile, load } from './harness.mjs';
import { ACCENT, accent, near } from './theme.mjs';

// The version index.html asks js/settings.js at, which Settings says.
const VERSION = readFileSync(new URL('../../index.html', import.meta.url), 'utf8').match(/js\/settings\.js\?v=([^"]+)"/)[1];

// What Settings keeps on the kiosk: none of it, for the checks that follow.
const forget = (p) => p.eval(`localStorage.removeItem('kiosk.theme'), localStorage.removeItem('kiosk.followLight'), true`);
const keptNow = (p) => p.eval(`({ theme: localStorage.getItem('kiosk.theme'), follow: localStorage.getItem('kiosk.followLight') })`);
const theme = (p) => p.eval(`document.documentElement.dataset.theme`);
const ringNames = `[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`;
const cardNames = `[...document.querySelectorAll('#folder-menu .room-card .room-name')].map((e) => e.textContent).join()`;
// A card of the folder on screen, by name: its classes and the line under its name.
const card = (p, name) => p.eval(`(() => { const c = [...document.querySelectorAll('#folder-menu .room-card')].find((e) => e.querySelector('.room-name').textContent === ${JSON.stringify(name)});
  return c ? { cls: c.className, state: (c.querySelector('.room-state') || {}).textContent || '' } : null; })()`);
// Taps a card by name, the list first scrolled to show it in its middle (the Spot's list and the Show's grid scroll).
async function tapCard(p, name) {
  const at = await p.eval(`(() => { const c = [...document.querySelectorAll('#folder-menu .room-card')].find((e) => e.querySelector('.room-name').textContent === ${JSON.stringify(name)}); if (!c) return null;
    const list = c.parentElement, l = list.getBoundingClientRect(); let b = c.getBoundingClientRect();
    if (b.top < l.top + l.height * 0.25 || b.bottom > l.top + l.height * 0.7) { list.scrollTop += b.top - l.top - (l.height - b.height) / 2; b = c.getBoundingClientRect(); }
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  if (!at) throw new Error('no card ' + name);
  await sleep(100);
  await p.tap(at.x, at.y);
  await sleep(300);
}
const folderOpen = (p) => p.eval(`!document.getElementById('folder-menu').hidden && document.getElementById('folder-menu').classList.contains('open')`);
// Which scene the layer behind the rooms shows: Synthwave's purple sky or Matrix's green rain, by the colour of
// what is drawn.
const sceneLooks = (p) => p.eval(`(() => { const s = document.getElementById('scene'), c = s.querySelector('canvas'); if (!c) return 'none'; if (s.querySelectorAll('canvas').length > 1) return 'two';
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let g = 0, b = 0;
  for (let i = 0; i < d.length; i += 16) { g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; }
  return b > g * 1.2 ? 'synthwave' : g > b * 1.2 ? 'matrix' : 'unclear'; })()`);

// 15. Settings on the Spot: a ring of three in the menu, Version saying the version; following the light turned off and on again; the list of
// themes in the room list's place, a theme switched in place, the list left open; scenes kept for their theme; Back;
// what the kiosk keeps across a reload; a mono theme and following the light.
export async function settingsSpot() {
  const p = await openPage(480, 480);
  await load(p, 'device=Echo+Spot+Bedroom');
  await forget(p);
  await load(p, 'device=Echo+Spot+Bedroom');
  // the pink strip in the main slot: the accent follows it
  await p.tapSel('.view.active .main-arrow[data-dir="1"]');
  await p.tapSel('.view.active .main-arrow[data-dir="1"]');
  check(near(await accent(p), 340), 'spot: following the light, the pink strip gives a pink accent');
  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  await p.tapSel('#menu .ring-item[aria-label="Settings"]');
  await sleep(350);
  const ring = await p.eval(`(() => { const items = [...document.querySelectorAll('#menu .ring-item')], mid = document.querySelector('#menu .ring-close');
    return { names: items.map((e) => e.textContent).join(), back: mid.classList.contains('back'), follow: items[1] && items[1].className + ' ' + items[1].getAttribute('aria-pressed'),
      themeIcon: items[0] && items[0].querySelector('svg path').getAttribute('d') === KIOSK_ICONS['weather-night'], themeMore: !document.querySelector('#menu .more') }; })()`);
  check(ring.names === 'Theme,Follow the light,Version' && ring.back, `spot: Settings opens a ring of Theme, Follow the light and Version, Back in the middle (got ${ring.names})`);
  check(ring.themeIcon && ring.themeMore && /\bon\b/.test(ring.follow) && ring.follow.endsWith('true'), `spot: Theme bears the dark theme's icon and no arrow, Follow the light is on, as config.js says (got ${ring.follow})`);
  check(await p.eval(RING_FITS), 'spot: the three inside the rim, apart, their names in their buttons');
  await p.shot('spot-settings.png');
  await p.tapSel('#menu .ring-item[aria-label="Version"]');
  check(await p.waitFor(`document.getElementById('toast').textContent === 'Kiosk dashboard ${VERSION}'`) && await p.eval(`document.getElementById('menu').classList.contains('open')`),
    `spot: a tap on Version says the dashboard's version, ${VERSION}, the ring still open`);
  await p.tapSel('#menu .ring-item[aria-label="Follow the light"]');
  await sleep(300);
  let a = await accent(p);
  check(a === ACCENT && await p.eval(`document.getElementById('menu').classList.contains('open') && !document.querySelector('#menu .ring-item[aria-label="Follow the light"]').classList.contains('on')`),
    `spot: a tap turns it off: the theme's accent again, the ring still open (got ${a})`);
  check((await keptNow(p)).follow === 'off', 'spot: and the kiosk keeps it off');
  await load(p, 'device=Echo+Spot+Bedroom');
  await p.tapSel('.view.active .main-arrow[data-dir="1"]');
  await p.tapSel('.view.active .main-arrow[data-dir="1"]');
  check(await accent(p) === ACCENT, 'spot: reloaded, it is still off: the pink strip leaves the theme\'s accent');
  await p.tapSel('#menu-handle');
  await sleep(300);
  await p.tapSel('#menu .ring-item[aria-label="Settings"]');
  await sleep(350);
  await p.tapSel('#menu .ring-item[aria-label="Follow the light"]');
  check(near(await accent(p), 340) && (await keptNow(p)).follow === null, 'spot: on again, pink again, and nothing kept: config.js says the same');

  // the list of themes
  await p.tapSel('#menu .ring-item[aria-label="Theme"]');
  await sleep(400);
  const names = await p.eval(`Object.entries(KIOSK_THEMES).map(([k, t]) => t.name || k.charAt(0).toUpperCase() + k.slice(1)).join()`);
  check(await folderOpen(p) && !(await p.eval(`document.getElementById('menu').classList.contains('open')`)) && await p.eval(cardNames) === 'Back,' + names,
    `spot: Theme opens the list of every theme in the room list's place, Back first, the ring closed (got ${await p.eval(cardNames)})`);
  let dark = await card(p, 'Dark');
  check(/\bcurrent\b/.test(dark.cls) && dark.state === 'Default' && (await p.eval(`document.querySelectorAll('#folder-menu .room-card.current').length`)) === 1, 'spot: the dark theme is marked, and said to be the default');
  check(await p.eval(`(() => { const r = document.querySelector('#folder-menu .room-card.current').getBoundingClientRect(); return r.top > 60 && r.bottom < 420 && r.width > 250; })()`), 'spot: the list shows it, rows as wide as the room list\'s');
  await p.shot('spot-settings-themes.png');
  await tapCard(p, 'Nord');
  check(await p.waitFor(`document.documentElement.dataset.theme === 'nord'`), 'spot: Nord switches the page to it');
  await sleep(300);
  const nord = await card(p, 'Nord');
  check(await folderOpen(p) && /\bcurrent\b/.test(nord.cls) && !/\bcurrent\b/.test((await card(p, 'Dark')).cls), 'spot: the list stays open, the mark on Nord now');
  check(await accent(p) !== ACCENT && (await keptNow(p)).theme === 'nord', 'spot: the pink strip still gives the accent, and the kiosk keeps Nord');
  await p.shot('spot-settings-nord.png');
  // Matrix: its scene runs, and it is mono: Follow the light does not apply
  await tapCard(p, 'Matrix');
  check(await p.waitFor(`document.documentElement.dataset.theme === 'matrix' && document.documentElement.classList.contains('mono') && document.getElementById('app').classList.contains('with-scene')`), 'spot: Matrix, a mono theme with a scene');
  await sleep(1500);
  check(await sceneLooks(p) === 'matrix', `spot: its rain falls behind the list (got ${await sceneLooks(p)})`);
  await tapCard(p, 'Synthwave');
  await p.waitFor(`document.documentElement.dataset.theme === 'synthwave'`);
  await sleep(600);
  check(await sceneLooks(p) === 'synthwave' && !(await p.eval(`document.documentElement.classList.contains('mono')`)), `spot: Synthwave's grid takes the rain's place (got ${await sceneLooks(p)})`);
  await tapCard(p, 'Dark');
  await p.waitFor(`document.documentElement.dataset.theme === 'dark'`);
  await sleep(300);
  check(await p.eval(`(() => { const s = document.getElementById('scene'); return !s.children.length && !s.classList.contains('on') && !document.getElementById('app').classList.contains('with-scene'); })()`), 'spot: the dark theme stops it and empties its layer');
  check((await keptNow(p)).theme === null, 'spot: the dark theme, which config.js gives, is not kept');
  await tapCard(p, 'Matrix');
  await p.waitFor(`document.documentElement.dataset.theme === 'matrix'`);
  await sleep(1500);
  check(await sceneLooks(p) === 'matrix' && await p.eval(`document.querySelectorAll('script[src*="matrix/rain.js"]').length === 1 && document.querySelectorAll('link[href*="matrix/theme.css"]').length === 1`),
    'spot: Matrix again: its rain falls again, its files loaded once');
  check(await p.eval(`[...document.querySelectorAll('link[href^="themes/"]')].every((l) => l.disabled === !l.getAttribute('href').startsWith('themes/matrix/'))`), 'spot: only its own stylesheet applies, the others set aside');
  // Back (scrolled to, at the top of the list): the Settings ring again; Follow the light faded, with Matrix
  await tapCard(p, 'Back');
  await sleep(400);
  check(await p.eval(ringNames) === 'Theme,Follow the light,Version' && await p.eval(`document.getElementById('menu').classList.contains('open') && document.querySelector('#menu .ring-close').classList.contains('back')`) && await p.waitFor(`document.getElementById('folder-menu').hidden`),
    'spot: Back brings Settings\' ring back, the list gone');
  check(await p.eval(`(() => { const f = document.querySelector('#menu .ring-item[aria-label="Follow the light"]'); return f.classList.contains('idle') && !f.classList.contains('on') && document.querySelector('#menu .ring-item[aria-label="Theme"] svg path').getAttribute('d') === KIOSK_ICONS.pill; })()`),
    'spot: with Matrix, Follow the light is faded and Theme bears Matrix\'s icon');
  await p.tapSel('#menu .ring-item[aria-label="Follow the light"]');
  check(await p.waitFor(`document.getElementById('toast').textContent === 'Matrix keeps its own colour'`) && (await keptNow(p)).follow === null, 'spot: a tap on it says Matrix keeps its own colour, and changes nothing');
  await p.shot('spot-settings-matrix.png');
  await load(p, 'device=Echo+Spot+Bedroom');
  check(await theme(p) === 'matrix' && await p.waitFor(`document.getElementById('app').classList.contains('with-scene')`), 'spot: reloaded, the kiosk shows Matrix still');
  await load(p, 'device=Echo+Spot+Bedroom&theme=nord');
  check(await theme(p) === 'nord', 'spot: theme=nord in the address wins over it');
  // a theme picked, then another before the first one's files have come: the last one wins
  await forget(p);
  await slowFile('/themes/matrix/rain.js', 2500);
  await load(p, 'device=Echo+Spot+Bedroom');
  await p.tapSel('#menu-handle');
  await sleep(300);
  await p.tapSel('#menu .ring-item[aria-label="Settings"]');
  await sleep(350);
  await p.tapSel('#menu .ring-item[aria-label="Theme"]');
  await sleep(400);
  await tapCard(p, 'Matrix');
  await tapCard(p, 'Synthwave');
  await sleep(3500);
  check(await theme(p) === 'synthwave' && !(await p.eval(`document.documentElement.classList.contains('mono')`)) && await sceneLooks(p) === 'synthwave' && (await keptNow(p)).theme === 'synthwave',
    `spot: Matrix, then Synthwave before Matrix's rain has come: Synthwave, its own scene alone (got ${await theme(p)}, ${await sceneLooks(p)})`);
  await slowFile('/themes/matrix/rain.js', 0);
  // a kept theme since taken out of themes/themes.js: the one config.js gives, and it is no longer kept
  await p.eval(`localStorage.setItem('kiosk.theme', 'gone'), true`);
  await load(p, 'device=Echo+Spot+Bedroom');
  check(await theme(p) === 'dark' && (await keptNow(p)).theme === null, 'spot: a kept theme that is no longer listed gives the dark theme, and is forgotten');
  // the office's Spot has the light theme of its own: that one is its default
  await load(p, 'device=Echo+Spot+Office');
  await p.tapSel('#menu-handle');
  await sleep(300);
  await p.tapSel('#menu .ring-item[aria-label="Settings"]');
  await sleep(350);
  await p.tapSel('#menu .ring-item[aria-label="Theme"]');
  await sleep(400);
  const light = await card(p, 'Light');
  check(/\bcurrent\b/.test(light.cls) && light.state === 'Default' && (await card(p, 'Dark')).state === '', 'spot, office: its own light theme is marked and is its default');
  await tapCard(p, 'Dark');
  await p.waitFor(`document.documentElement.dataset.theme === 'dark'`);
  check((await keptNow(p)).theme === 'dark', 'spot, office: the dark theme is kept there');
  await forget(p);
  await p.close();
}

// The look of the page, to tell a theme switched in place from the same theme on a fresh page: the tokens, how the
// header, a tile, the menu and the room's title are drawn, the fonts, the scene's layer, the header's modes.
const LOOK = `(() => { const h = document.documentElement, cs = (sel) => getComputedStyle(document.querySelector(sel)), root = getComputedStyle(h);
  const pick = (s, props) => props.map((k) => s.getPropertyValue(k)).join(' | ');
  return { theme: h.dataset.theme, scheme: h.dataset.scheme, mono: h.classList.contains('mono'),
    tokens: pick(root, ['--accent-rgb', '--on-accent', '--bg', '--bg-2', '--surface', '--surface-solid', '--border', '--text', '--muted', '--r', '--r-pill', '--font', '--font-title']),
    body: pick(getComputedStyle(document.body), ['font-family', 'color', 'background-image']),
    title: pick(cs('.view.active .title-btn'), ['font-family', 'font-size', 'color', 'text-transform', 'letter-spacing']),
    tile: pick(cs('.view.active .tile'), ['background-color', 'background-image', 'border-radius', 'border-top-color', 'box-shadow']),
    chip: pick(cs('.view.active .chip'), ['background-color', 'border-radius', 'color', 'font-family']),
    rail: pick(cs('#menu .menu-panel'), ['background-color', 'border-radius']),
    modes: document.querySelector('.view.active .modes').classList.contains('icons'),
    scene: document.getElementById('scene').classList.contains('on') + ' ' + document.getElementById('app').classList.contains('with-scene'),
    fonts: [...document.fonts].filter((f) => f.status !== 'loaded').map((f) => f.family + ' ' + f.status).join() }; })()`;

// 16. Settings on the Show: a grid of Theme, Follow the light and Version, the list of themes in its place and Back from
// it; then every theme switched in place, which looks as it does on a fresh page.
export async function settingsShow() {
  failPictures(true);   // the theme's own background, not the rooms' pictures
  const p = await openPage(960, 480);
  await load(p, 'device=Echo+Show+5+Bedroom');
  await forget(p);
  await load(p, 'device=Echo+Show+5+Bedroom');
  await p.tapSel('#menu .menu-item[aria-label="Settings"]');
  await sleep(400);
  const theme0 = await card(p, 'Theme'), follow0 = await card(p, 'Follow the light');
  check(await folderOpen(p) && await p.eval(cardNames) === 'Back,Theme,Follow the light,Version' && await p.eval(`document.querySelector('#menu .menu-item[aria-label="Settings"]').classList.contains('active')`),
    `show 5: Settings on the rail opens Back, Theme, Follow the light and Version, its button marked (got ${await p.eval(cardNames)})`);
  const version0 = await card(p, 'Version');
  check(theme0.state === 'Dark' && follow0.state === 'On' && /\bon\b/.test(follow0.cls) && version0.state === VERSION,
    `show 5: they say the theme on screen, that following the light is on, and the version (got ${theme0.state}, ${follow0.state}, ${version0.state})`);
  await p.shot('show5-settings.png');
  await tapCard(p, 'Follow the light');
  const follow1 = await card(p, 'Follow the light');
  check(await folderOpen(p) && follow1.state === 'Off' && !/\bon\b/.test(follow1.cls) && (await keptNow(p)).follow === 'off', 'show 5: a tap turns it off, the folder still open');
  await tapCard(p, 'Follow the light');
  check((await card(p, 'Follow the light')).state === 'On' && (await keptNow(p)).follow === null, 'show 5: and on again');
  await tapCard(p, 'Theme');
  const names = await p.eval(`Object.entries(KIOSK_THEMES).map(([k, t]) => t.name || k.charAt(0).toUpperCase() + k.slice(1)).join()`);
  check(await p.eval(cardNames) === 'Back,' + names && /\bcurrent\b/.test((await card(p, 'Dark')).cls) && await p.eval(`document.querySelector('#menu .menu-item[aria-label="Settings"]').classList.contains('active')`),
    'show 5: Theme puts the list of themes in Settings\' place, the dark one marked, the rail button still marked');
  check(await p.eval(`(() => { const rail = document.querySelector('#menu .menu-panel').getBoundingClientRect().left; return [...document.querySelectorAll('#folder-menu .room-card')].every((c) => { const r = c.getBoundingClientRect(); return r.right <= rail - 12 && r.left >= 0; }); })()`),
    'show 5: the cards clear of the rail');
  await p.shot('show5-settings-themes.png');
  await tapCard(p, 'Light');
  check(await p.waitFor(`document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.scheme === 'light'`) && await folderOpen(p), 'show 5: Light switches the page to it, the list still open');
  await sleep(300);
  check(/\bcurrent\b/.test((await card(p, 'Light')).cls), 'show 5: the mark on Light now');
  await p.shot('show5-settings-light.png');
  await p.tapSel('#folder-menu .room-card.back .room-go');
  await sleep(300);
  check(await p.eval(cardNames) === 'Back,Theme,Follow the light,Version' && (await card(p, 'Theme')).state === 'Light' && await folderOpen(p), 'show 5: Back brings Settings back, Theme saying Light');
  await p.tapSel('#folder-menu .room-card.back .room-go');
  check(await p.waitFor(`document.getElementById('folder-menu').hidden`) && !(await p.eval(`document.querySelector('#menu .menu-item[aria-label="Settings"]').classList.contains('active')`)), 'show 5: Back again closes it');

  // every theme switched in place looks as on a fresh page
  const all = Object.keys(await p.eval(`KIOSK_THEMES`));
  await load(p, 'device=Echo+Show+5+Bedroom');
  await p.tapSel('#menu .menu-item[aria-label="Settings"]');
  await sleep(400);
  await tapCard(p, 'Theme');
  const live = {};
  for (const name of all) {
    await tapCard(p, (await p.eval(`(KIOSK_THEMES[${JSON.stringify(name)}].name || '')`)) || name.charAt(0).toUpperCase() + name.slice(1));
    await p.waitFor(`document.documentElement.dataset.theme === ${JSON.stringify(name)}`);
    await sleep(900);   // colours that fade, as on a tap
    live[name] = await p.eval(LOOK);
  }
  await forget(p);
  for (const name of all) {
    await load(p, `device=Echo+Show+5+Bedroom&theme=${name}`);
    await sleep(300);
    const fresh = await p.eval(LOOK), diff = Object.keys(fresh).filter((k) => fresh[k] !== live[name][k]);
    check(!diff.length, `show 5, ${name}: switched in place, it looks as on a fresh page${diff.length ? ` (${diff.map((k) => `${k}: ${live[name][k]} instead of ${fresh[k]}`).join('; ')})` : ''}`);
  }
  failPictures(false);
  await p.close();
}
