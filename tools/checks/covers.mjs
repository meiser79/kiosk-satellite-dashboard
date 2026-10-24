// Checks of covers and thermostats: the living room's shutter, awning and heating on the Show and on the Spot, the
// tiles' drags and taps, their panels, in English and German; blinds whose slats turn and a garage door that only
// opens and closes, added to the living room for these checks.
import { sleep, check, openPage, load, mockStates, mockReaches, mockSet, lastCall, callLog, text, insideRim } from './harness.mjs';

// A tile of the room on screen, by name, scrolled into view: its selector (nth-child among the tiles).
const tileOf = async (p, name) => {
  const n = await p.eval(`[...document.querySelectorAll('.view.active .lights > *')].findIndex((e) => (e.querySelector('.tile-name') || {}).textContent === ${JSON.stringify(name)}) + 1`);
  if (!n) throw new Error('no tile ' + name);
  const sel = `.view.active .lights > :nth-child(${n})`;
  await p.eval(`document.querySelector('${sel}').scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }), true`);
  await sleep(300);
  return sel;
};
const tile = (p, sel) => p.eval(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); return { on: t.classList.contains('on'), state: t.querySelector('.tile-state').textContent,
  extra: t.querySelector('.tile-extra').textContent, rgb: getComputedStyle(t).getPropertyValue('--tile-rgb').trim(), icon: [...Object.entries(KIOSK_ICONS)].filter(([, d]) => d === t.querySelector('.tile-icon path').getAttribute('d')).map(([k]) => k).join() }; })()`);
const panelOpen = `!document.getElementById('popover').hidden && document.getElementById('popover').classList.contains('show')`;
const actions = (p) => p.eval(`[...document.querySelectorAll('#popover .pop-actions button')].map((b) => b.getAttribute('aria-label') || b.textContent).join()`);
const chips = (p, n) => p.eval(`(() => { const c = document.querySelectorAll('#popover .control')[${n}]; return c ? [...c.querySelectorAll('.chip')].map((e) => e.textContent + (e.classList.contains('on') ? '*' : '')).join() : ''; })()`);
const tapChip = async (p, name) => {
  const r = await p.eval(`(() => { const c = [...document.querySelectorAll('#popover .chip')].find((e) => e.textContent === ${JSON.stringify(name)}); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!r) throw new Error('no chip ' + name);
  await sleep(150);
  await p.tap(r.x, r.y);
  await sleep(300);
};
const closePanel = async (p) => { await p.eval(`Kiosk.closePopover(), true`); await p.waitFor(`document.getElementById('popover').hidden`); };
// A page whose living room has the blinds and the garage door too.
async function withMore(width, height) {
  const p = await openPage(width, height);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    c.rooms.living.covers.push({ entity: 'cover.bedroom_blinds', name: 'Blinds' }, { entity: 'cover.garage_door', name: 'Garage' }); v = c; } }); })();` });
  return p;
}

// 24. On the Show 8: the shutter, the awning and the heating after the lights, no taller than they should be; a tap
// and a drag on each, a cover on its way stopped, their panels.
export async function coversShow() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  const names = await p.eval(`[...document.querySelectorAll('.view.active .lights > .tile .tile-name')].map((e) => e.textContent).join()`);
  check(names === 'Living room,Dining room,Kitchen,TV strip,Shelf strip,Shutter,Awning,Heating', `show 8: the covers and the heating after the lights (got ${names})`);
  check(await p.eval(`!document.querySelector('.view.active .tile button')`), 'show 8: no buttons on the tiles, a long-press opens their panels');
  const tall = await p.eval(`(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize); return Math.max(...[...document.querySelectorAll('.view.active .lights > .tile')].map((e) => e.getBoundingClientRect().height)) / rem; })()`);
  check(tall <= 10.55, `show 8: the tiles 10.5rem tall at most (got ${tall.toFixed(2)}rem)`);

  const SHUTTER = await tileOf(p, 'Shutter'), AWNING = await tileOf(p, 'Awning'), HEATING = await tileOf(p, 'Heating');
  let sh = await tile(p, SHUTTER), aw = await tile(p, AWNING);
  check(sh.on && sh.state === '70%' && sh.icon === 'window-shutter-open', `the shutter, open at 70%: lit, it says so, filled as far, an open shutter's icon (got ${JSON.stringify(sh)})`);
  check(!aw.on && aw.state === '0%' && aw.icon === 'awning-outline', `the awning, closed: not lit, 0%, an awning's icon (got ${JSON.stringify(aw)})`);
  await p.shot('show8-covers.png');

  // a tap opens the closed awning; a drag across the shutter sets its position
  await p.tapSel(`${AWNING} .tile-text`);
  check(await mockReaches((st) => st['cover.terrace_awning'].s === 'open' && st['cover.terrace_awning'].a.current_position === 100) && (await lastCall()).service === 'open_cover',
    'a tap on the closed awning opens it, with cover.open_cover');
  check(await p.waitFor(`(() => { const t = document.querySelector('${AWNING}'); return t.classList.contains('on') && t.querySelector('.tile-state').textContent === '100%'; })()`), 'the awning\'s tile lights up at 100%');
  await p.dragTo(`${SHUTTER}`, 0.4, 0.5, 0.8);
  const pos = (await mockStates())['cover.living_room_shutter'].a.current_position;
  check((await lastCall()).service === 'set_cover_position' && pos >= 33 && pos <= 47, `a drag across the shutter sets its position (got ${pos})`);
  // on its way: the tile says so, a tap stops it
  await mockSet('cover.living_room_shutter', 'closing');
  check(await p.waitFor(`document.querySelector('${SHUTTER} .tile-extra').textContent === '· Closing'`), 'a shutter on its way says so after its name');
  await p.tapSel(`${SHUTTER} .tile-text`);
  check((await lastCall()).service === 'stop_cover' && await mockReaches((st) => st['cover.living_room_shutter'].s === 'open'), 'a tap on it stops it, with cover.stop_cover');

  // the shutter's panel: Open, Stop, Close, its position
  await p.longPressSel(`${SHUTTER} .tile-text`);
  check(await p.waitFor(panelOpen), 'a long-press opens the shutter\'s panel');
  await sleep(300);
  check(await actions(p) === 'Open,Stop,Close' && /^Open · \d+%$/.test(await text(p, '#pop-state')) && await p.eval(`document.querySelector('#popover .pop-main .slider .label').textContent.trim() === 'Position'`),
    `its panel: Open, Stop and Close, its position, the line saying how it stands (got ${await actions(p)}; ${await text(p, '#pop-state')})`);
  await p.shot('show8-cover-panel.png');
  await p.tapSel('#popover .pop-actions button[aria-label="Close"]');
  check(await mockReaches((st) => st['cover.living_room_shutter'].s === 'closed') && (await lastCall()).service === 'close_cover' && await p.waitFor(`document.getElementById('pop-state').textContent === 'Closed · 0%' && document.querySelector('#popover .popover').classList.contains('off')`),
    'Close closes it, the panel stays open and follows');
  await p.dragTo('#popover .pop-main .slider', 0.5, 0.5, 0.1);
  const pos2 = (await mockStates())['cover.living_room_shutter'].a.current_position;
  check(pos2 >= 40 && pos2 <= 60, `the panel's slider sets the position (got ${pos2})`);
  await closePanel(p);

  // the heating: on and heating, orange, its target and the room's temperature after it
  let he = await tile(p, HEATING);
  check(he.on && he.rgb === '255, 138, 61' && he.state === '21.5°' && he.extra === '· 20.5°' && he.icon === 'thermostat',
    `the heating: lit in orange while it heats, its target, the room's temperature after it (got ${JSON.stringify(he)})`);
  await p.dragTo(`${HEATING}`, 0.6, 0.5, 0.3);
  const set = await lastCall(), temp = set.data && set.data.temperature;
  check(set.domain === 'climate' && set.service === 'set_temperature' && temp > 7 && temp < 30 && Math.round(temp * 2) === temp * 2, `a drag across it sets the target, in half degrees (got ${JSON.stringify(set.data)})`);
  await p.tapSel(`${HEATING} .tile-text`);
  check(await mockReaches((st) => st['climate.living_room'].s === 'off') && (await lastCall()).service === 'turn_off', 'a tap turns it off, with climate.turn_off');
  check(await p.waitFor(`(() => { const t = document.querySelector('${HEATING}'); return !t.classList.contains('on') && t.querySelector('.tile-state').textContent === 'Off'; })()`), 'off: not lit, it says Off');

  // its panel: the target, its modes and its presets, the ones it is in marked
  await p.longPressSel(`${HEATING} .tile-text`);
  await p.waitFor(panelOpen);
  await sleep(300);
  check(await chips(p, 0) === 'Off*,Heat,Auto' && await chips(p, 1) === 'Comfort*,Eco,Away,Boost' && await p.eval(`document.querySelector('#popover .pop-main .slider .label').textContent.trim() === 'Target temperature'`) && await actions(p) === '',
    `the heating's panel: the target, its modes and presets, Off and Comfort marked (got ${await chips(p, 0)}; ${await chips(p, 1)})`);
  await tapChip(p, 'Heat');
  check(await mockReaches((st) => st['climate.living_room'].s === 'heat') && (await lastCall()).service === 'set_hvac_mode' && await p.waitFor(`document.querySelector('#popover .control .chip.on').textContent === 'Heat'`), 'Heat sets its mode, the chip follows');
  await tapChip(p, 'Eco');
  check(await mockReaches((st) => st['climate.living_room'].a.preset_mode === 'eco') && (await lastCall()).service === 'set_preset_mode', 'Eco sets its preset');
  check(/ · 20\.5°$/.test(await text(p, '#pop-state')), `the line says what it does and the room's temperature (got ${await text(p, '#pop-state')})`);
  await p.shot('show8-climate-panel.png');
  await closePanel(p);
  await p.close();

  // German: the panels' words
  const g = await openPage(1280, 800);
  await load(g, 'device=Echo+Show+8+Living+Room&lang=de');
  await g.longPressSel(`${await tileOf(g, 'Shutter')} .tile-text`);
  await g.waitFor(panelOpen);
  check(await actions(g) === 'Öffnen,Stopp,Schließen' && /^(Offen|Geschlossen) · \d+%$/.test(await text(g, '#pop-state')), `german: the cover's buttons and state in German (got ${await actions(g)}; ${await text(g, '#pop-state')})`);
  await closePanel(g);
  await g.longPressSel(`${await tileOf(g, 'Heating')} .tile-text`);
  await g.waitFor(panelOpen);
  await sleep(300);
  check(await chips(g, 0) === 'Aus,Heizen*,Automatisch' && await chips(g, 1) === 'Komfort,Eco*,Abwesend,Boost', `german: the heating's modes and presets in German (got ${await chips(g, 0)}; ${await chips(g, 1)})`);
  await closePanel(g);
  await g.close();
}

// 25. Blinds whose slats turn and a garage door without positions; and on the Spot, the tiles in the strip and a
// cover's panel inside the rim.
export async function coversMore() {
  const p = await withMore(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  await p.eval(`document.querySelector('.view.active .lights').style.maxHeight = '20rem', true`);   // shorter, for there to be more to scroll to
  const before = (await callLog()).length, top0 = await p.eval(`document.querySelector('.view.active .lights').scrollTop`);
  const first = await p.rect('.view.active .lights > .tile:nth-child(3)');
  await p.drag(first.x, first.y + 40, first.x + 8, first.y - 60, 10); await sleep(700);
  check((await callLog()).length === before && await p.eval(`document.querySelector('.view.active .lights').scrollTop`) > top0, 'a swipe up across the tiles scrolls them and sets no light');
  await p.eval(`(() => { const l = document.querySelector('.view.active .lights'); l.style.maxHeight = ''; l.scrollTo({ top: 0, behavior: 'instant' }); return true; })()`);
  const GARAGE = await tileOf(p, 'Garage');
  check(await p.waitFor(`document.querySelector('${GARAGE} .tile-state').textContent === 'Closed'`) && (await tile(p, GARAGE)).icon === 'garage', 'a garage door without positions: it says Closed, a garage\'s icon');
  await p.dragTo(`${GARAGE}`, 0.8, 0.5, 0.2);
  check((await lastCall()).service !== 'set_cover_position', 'a drag across it asks no position of it');
  await p.tapSel(`${GARAGE} .tile-text`);
  check(await mockReaches((st) => st['cover.garage_door'].s === 'open') && await p.waitFor(`(() => { const t = document.querySelector('${GARAGE}'); return t.classList.contains('on') && t.querySelector('.tile-state').textContent === 'Open'; })()`)
    && (await tile(p, GARAGE)).icon === 'garage-open', 'a tap opens it: lit, Open, an open garage\'s icon');
  await p.longPressSel(`${GARAGE} .tile-text`);
  await p.waitFor(panelOpen);
  check(await actions(p) === 'Open,Stop,Close' && !(await p.eval(`!!document.querySelector('#popover .slider')`)), 'its panel: the three buttons, no slider');
  await closePanel(p);
  await p.longPressSel(`${await tileOf(p, 'Blinds')} .tile-text`);
  await p.waitFor(panelOpen);
  await sleep(300);
  const sliders = await p.eval(`[...document.querySelectorAll('#popover .slider .label')].map((e) => e.textContent.trim()).join()`);
  check(sliders === 'Position,Tilt', `blinds whose slats turn: a position and a tilt (got ${sliders})`);
  await p.dragTo('#popover .light-controls .slider', 0.8, 0.5, 0.2);
  const tilt = (await mockStates())['cover.bedroom_blinds'].a.current_tilt_position;
  check((await lastCall()).service === 'set_cover_tilt_position' && tilt >= 70 && tilt <= 90, `the tilt slider turns the slats (got ${tilt})`);
  await closePanel(p);
  await p.close();

  // the Spot: the tiles in the strip, the heating lit in orange; a long-press opens the shutter's panel
  // inside the rim, its buttons too
  const s = await openPage(480, 480);
  await load(s, 'device=Echo+Spot+Living+Room');
  const strip = await s.eval(`[...document.querySelectorAll('.view.active .lights > .tile .tile-name')].map((e) => e.textContent).join()`);
  check(strip.endsWith('Shutter,Awning,Heating'), `spot: the covers and the heating at the end of the strip (got ${strip})`);
  const r = await s.rect(`${await tileOf(s, 'Shutter')} .tile-icon`);
  await s.longPress(r.x, r.y);
  check(await s.waitFor(panelOpen), 'spot: a long-press opens the shutter\'s panel');
  await sleep(400);
  check(await actions(s) === 'Open,Stop,Close' && await s.eval(`document.querySelector('#popover .pop-actions').offsetWidth > 0`) && await insideRim(s, '#popover .pop-actions button, #popover .pop-main .slider, #popover .pop-name'),
    'spot: its buttons and slider shown, inside the rim');
  await s.shot('spot-cover-panel.png');
  await s.close();
}
