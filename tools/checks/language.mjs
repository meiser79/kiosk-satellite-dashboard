// Checks of the page's language: German asked for in the address, in config.js and by the kiosk's browser, English
// otherwise. The page's own words in German (the events' days and months among them), what config.js names as
// written there. The page's clock at 10:00 on Wednesday 21 October 2026, as in the events' checks.
import { sleep, check, openPage, load, setClock, text, lightsOn, tapTab, insideRim, RING_FITS } from './harness.mjs';

const TODAY = 'Ganztägig Bins out,Jetzt Stand-up,12:30 Lunch with Sam,18:00 Swimming lesson';
const lines = (p, sel) => p.eval(`[...document.querySelectorAll(${JSON.stringify(sel + ' .event')})].map((e) => (e.querySelector('.ev-time') ? e.querySelector('.ev-time').textContent + ' ' + e.querySelector('.ev-title').textContent : e.textContent)).join()`);
const panel = (p) => p.eval(`[...document.querySelectorAll('#pop-body > *')].map((e) => e.classList.contains('events-day') ? '# ' + e.textContent : [...e.querySelectorAll('.ev-time, .ev-title, .ev-where')].map((s) => s.textContent).join(' ')).join('|')`);
const panelOpen = `!document.getElementById('popover').hidden && document.getElementById('popover').classList.contains('show')`;
const label = (p, sel) => p.eval(`(document.querySelector(${JSON.stringify(sel)}) || { getAttribute: () => '' }).getAttribute('aria-label')`);
const lang = (p) => p.eval(`document.documentElement.lang`);
// A page whose config.js is changed as it loads: `change` is the body of a function of the configuration, c.
async function withConfig(width, height, change) {
  const p = await openPage(width, height);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    ${change}; v = c; } }); })();` });
  return p;
}

// 21. German on the Spot (?lang=de): the events' line and count, the main light's state, the room list, Settings'
// ring, the names of the page's fixed parts; the names config.js gives as written there.
export async function germanSpot() {
  const p = await openPage(480, 480);
  await setClock(p, 10);
  await load(p, 'device=Echo+Spot+Bedroom&lang=de');
  check(await lang(p) === 'de', 'german, spot: ?lang=de, the page says it is in German');
  const LINE = '.view.active .events';
  check(await p.waitFor(`document.querySelectorAll('${LINE} .event').length === 4`) && await lines(p, LINE) === TODAY,
    `german, spot: the events' line says Ganztägig and Jetzt (got ${await lines(p, LINE)})`);
  check(await label(p, '.view.active .events-chip') === '4 Termine heute', `german, spot: the count is 4 Termine heute (got ${await label(p, '.view.active .events-chip')})`);
  const state = await text(p, '.view.active .main .bar.current .state');
  check(/^(\d+% · \d+ an|Aus)$/.test(state) && (await text(p, '.view.active .main .bar.current .name')) === 'All lights', `german, spot: the main light's state in German, its name as config.js gives it (got ${state})`);
  check(await label(p, '.view.active .title-btn') === 'Raum wechseln' && await label(p, '#menu-handle') === 'Menü' && await label(p, '.view.active .main-arrow[data-dir="1"]') === 'Nächstes Licht',
    'german, spot: the title, the menu tab and the arrows named in German');

  await p.tapSel('.view.active .title-btn');
  await p.waitFor(`document.getElementById('room-menu').classList.contains('open')`);
  await sleep(400);
  const cards = await p.eval(`[...document.querySelectorAll('#room-menu .room-card')].map((c) => [c.querySelector('.room-name').textContent, c.querySelector('.room-state').textContent])`);
  const on = await lightsOn(), say = (n) => (n ? `${n} ${n > 1 ? 'Lichter' : 'Licht'} an` : 'Lichter aus');
  check(cards.map((c) => c[0]).join() === 'Bedroom,Living room,Office,Alle Lichter aus' && cards.map((c) => c[1]).join() === [...on, on.reduce((a, b) => a + b)].map(say).join(),
    `german, spot: the room list says how many lights are on in German (got ${cards.map((c) => c.join(': ')).join(', ')})`);
  await p.shot('spot-german-rooms.png');
  await p.eval(`Kiosk.closeOverlay(), true`);
  await sleep(400);

  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  await p.tapSel('#menu .ring-item[aria-label="Settings"]');
  await sleep(350);
  const ring = await p.eval(`[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`);
  check(ring === 'Design,Dem Licht folgen,Version' && await label(p, '#menu .ring-close') === 'Zurück', `german, spot: Settings' ring in German, Back in the middle Zurück (got ${ring})`);
  await p.shot('spot-german-settings.png');

  await p.close();

  // A Spot whose Music item has all three kinds: a switch of their icons, named in German for a screen reader,
  // inside the rim; Alben brings the albums.
  const m = await withConfig(480, 480, `c.menu.items.find((i) => i.name === 'Music' && i.shape === 'round').favorites = ['radio', 'playlist', 'album']`);
  await load(m, 'device=Echo+Spot+Living+Room&lang=de');
  await m.tapSel('#menu-handle');
  await m.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  await m.tapSel('#menu .ring-item[aria-label="Music"]');
  await m.waitFor(`!!document.querySelector('#menu .fav-switch')`);
  await sleep(350);
  const kinds = await m.eval(`[...document.querySelectorAll('#menu .fav-switch button')].map((b) => b.getAttribute('aria-label') + (b.textContent ? '!' : '')).join()`);
  check(kinds === 'Radiosender,Playlists,Alben' && await m.eval(`document.querySelectorAll('#menu .fav-switch button .icon').length === 3`) && await insideRim(m, '#menu .fav-switch'),
    `german, spot: three kinds, a switch of their icons named in German, inside the rim (got ${kinds})`);
  await m.tapSel('#menu .fav-switch button:nth-child(3)');
  check(await m.waitFor(`[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join() === 'Abbey Road,Kind of Blue,Random Access Memories'`) && await m.eval(RING_FITS), 'german, spot: Alben brings the favourite albums, inside the rim');
  await m.shot('spot-german-albums.png');
  await m.close();
}

// 22. German on the Show: the light panel's tabs and buttons, the week's events under German days and months.
export async function germanShow() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room&lang=de');
  await p.tapSel('.view.active .tile:nth-child(4) .tile-more');
  await p.waitFor(`!document.getElementById('popover').hidden`);
  const tabs = await p.eval(`[...document.querySelectorAll('#popover .tabs .tab')].map((t) => t.textContent).join()`);
  const buttons = await p.eval(`[...document.querySelectorAll('#popover .pop-actions button')].map((b) => b.textContent).join()`);
  check(tabs === 'Farbe,Effekte,Mehr' && buttons === 'Aus,An', `german, show: the panel's tabs and buttons in German (got ${tabs}; ${buttons})`);
  await tapTab(p, 'Farbe');
  const sliders = await p.eval(`[...document.querySelectorAll('#popover .pane:not([hidden]) .label, #popover .pop-main .label')].map((e) => e.textContent).join('|')`);
  check(/Helligkeit/.test(sliders) && /Farbton/.test(sliders) && /Sättigung/.test(sliders), `german, show: the sliders named in German (got ${sliders})`);
  await p.shot('show8-german-popover.png');
  await p.close();

  const w = await withConfig(1280, 800, `c.rooms.bedroom.events = { calendars: ['calendar.family', { entity: 'calendar.work', color: '#5aa9e6' }], period: 'week', max: 5, lines: { wide: 4 }, chip: false }`);
  await setClock(w, 10);
  await load(w, 'device=Echo+Show+5+Bedroom&lang=de');
  const TILE = '.view.active .lights > .events';
  await w.waitFor(`document.querySelectorAll('${TILE} .event').length === 5`);
  check(await lines(w, TILE) === `${TODAY},Do 08:30 Dentist`, `german, show: a later day's event says its day in German (got ${await lines(w, TILE)})`);
  await w.tapSel(TILE);
  await w.waitFor(panelOpen);
  await sleep(400);
  const week = await panel(w);
  check(await text(w, '#pop-name') === 'Nächste 7 Tage' && await text(w, '#pop-state') === '7 Termine'
    && week === '# Heute|Ganztägig Bins out|09:30–10:15 Stand-up|12:30–13:30 Lunch with Sam Café Lumière|18:00–19:00 Swimming lesson|# Morgen|08:30–09:00 Dentist|# Fr 23. Okt|14:00–16:00 Quarterly review Room 4|# Sa 24. Okt|19:30–22:00 Dinner at Alex\'s',
  `german, show: the week's events under German days and months (got ${await text(w, '#pop-name')}, ${await text(w, '#pop-state')}: ${week})`);
  await w.shot('show8-german-events.png');
  await w.close();
}

// 23. Which language: the kiosk's own browser asking for German, config.js's language, ?lang= over both, English
// otherwise and for a language the page does not speak.
export async function whichLanguage() {
  const p = await openPage(480, 480);
  await p.goto('about:blank');
  const userAgent = await p.eval('navigator.userAgent');
  await p.s('Emulation.setUserAgentOverride', { userAgent, acceptLanguage: 'de-DE,de' });
  await load(p, 'device=Echo+Spot+Bedroom');
  check(await lang(p) === 'de' && await label(p, '#menu-handle') === 'Menü', 'language: a kiosk whose browser asks for German gets German');
  await load(p, 'device=Echo+Spot+Bedroom&lang=en');
  check(await lang(p) === 'en' && await label(p, '#menu-handle') === 'Menu', 'language: ?lang=en over the browser\'s German');
  await p.s('Emulation.setUserAgentOverride', { userAgent, acceptLanguage: 'fr-FR,fr' });
  await load(p, 'device=Echo+Spot+Bedroom');
  check(await lang(p) === 'en', 'language: a browser asking for French gets English');
  await p.close();

  const c = await withConfig(480, 480, `c.language = 'de'`);
  await load(c, 'device=Echo+Spot+Bedroom');
  check(await lang(c) === 'de' && await label(c, '.view.active .title-btn') === 'Raum wechseln', 'language: config.js\'s language: \'de\' gives German');
  await load(c, 'device=Echo+Spot+Bedroom&lang=en');
  check(await lang(c) === 'en', 'language: ?lang=en over config.js\'s German');
  await c.close();
}
