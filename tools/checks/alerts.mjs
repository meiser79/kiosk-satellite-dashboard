// Checks of what shows only while it matters: a sensor's showWhen, and the house's alerts, in every room, in the
// warning colour, with the row to themselves on the Spot.
import { sleep, check, openPage, load, mockSet, insideRim, setClock } from './harness.mjs';

const ALERT = '.view.active .sensor.alert';
// The row of the room on screen: the values shown, in order, and whether an alert has it.
const row = (p) => p.eval(`(() => { const r = document.querySelector('.view.active .sensors');
  return { hidden: r.hidden, alerting: r.classList.contains('alerting'), shown: [...r.querySelectorAll('.sensor')].filter((s) => s.offsetWidth).map((s) => s.textContent).join() }; })()`);
const danger = `getComputedStyle(document.querySelector('${ALERT}')).color === (() => { const t = document.createElement('i'); t.style.color = 'var(--danger)'; document.querySelector('.view.active .sensors').append(t); const c = getComputedStyle(t).color; t.remove(); return c; })()`;

// 17. On the Spot: the front door opened shows its alert, alone in the row, in every room; closed or unavailable,
// the room's own values again (and its events' count: four at 10:00). showWhen's forms.
export async function alertsSpot() {
  const p = await openPage(480, 480);
  await setClock(p, 10);
  await load(p, 'device=Echo+Spot+Bedroom');
  await p.waitFor(`!document.querySelector('.view.active .events-chip').hidden`);
  let r = await row(p);
  check(r.shown === '19.4°,48%,Present,4' && !r.alerting && await p.eval(`document.querySelector('${ALERT}').hidden`), `spot: the front door closed, no alert: the room's own values (got ${r.shown})`);
  await mockSet('binary_sensor.front_door', 'on');
  check(await p.waitFor(`!document.querySelector('${ALERT}').hidden`), 'spot: the front door opened: its alert shows');
  r = await row(p);
  check(r.shown === 'Front door open' && r.alerting, `spot: alone in the row, the room's values stepping aside (got ${r.shown})`);
  check(await p.eval(danger) && await p.eval(`document.querySelector('.view.active .sensors .sensor') === document.querySelector('${ALERT}')`), 'spot: first, in the theme\'s warning colour');
  check(await insideRim(p, '.view.active .sensors .sensor'), 'spot: inside the rim');
  check(await p.eval(`[...document.querySelectorAll('.view .sensor.alert')].every((s) => !s.hidden) && document.querySelectorAll('.view').length === 3`), 'spot: and in every room');
  await p.shot('spot-alert.png');
  await mockSet('binary_sensor.front_door', 'unavailable');
  check(await p.waitFor(`document.querySelector('${ALERT}').hidden`) && (await row(p)).shown === '19.4°,48%,Present,4', 'spot: unavailable, it goes, and the room\'s values come back');
  await mockSet('binary_sensor.front_door', 'on');
  await p.waitFor(`!document.querySelector('${ALERT}').hidden`);
  await mockSet('binary_sensor.front_door', 'off');
  check(await p.waitFor(`document.querySelector('${ALERT}').hidden`) && !(await row(p)).alerting, 'spot: closed again, it goes');

  // showWhen's forms, on the front door (off) and the living room's CO2 (640 ppm)
  const forms = await p.eval(`(() => { const m = Kiosk.matches, door = 'binary_sensor.front_door', co2 = 'sensor.living_room_co2';
    return [m(undefined, door), !m({}, door), m({ state: 'off' }, door), m({ state: ['open', 'off'] }, door), !m({ not: 'off' }, door), m({ not: ['on', 'idle'] }, door),
      m({ above: 600 }, co2), !m({ above: 640 }, co2), m({ below: 700 }, co2), m({ above: 600, below: 700 }, co2), !m({ above: 600 }, door),
      m({ entity: co2, below: 1000 }, door), !m({}, 'sensor.nowhere')]; })()`);
  check(forms.every(Boolean), `spot: showWhen: no condition, a state ('on' unless said, or a list), any state but some, above, below, another entity, a missing one (got ${forms})`);
  await p.close();
}

// 18. On the Show: the living room's CO2 only above 1000 ppm, in the muted colour of a value; the alert first in the
// header, beside the room's values, clear of the modes.
export async function alertsShow() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  check((await row(p)).shown === '21.8°,44%,Away', 'show 8: CO2 at 640 ppm is not shown');
  await mockSet('sensor.living_room_co2', '1250');
  check(await p.waitFor(`document.querySelectorAll('.view.active .sensor:not([hidden])').length === 4`) && (await row(p)).shown === '21.8°,44%,Away,1250 ppm', 'show 8: above 1000 ppm, it shows, last');
  check(await p.eval(`getComputedStyle(document.querySelector('.view.active .sensor:last-child')).color === getComputedStyle(document.querySelector('.view.active .sensors')).color`), 'show 8: as a value, not an alert');
  await mockSet('sensor.living_room_co2', '1000');
  check(await p.waitFor(`document.querySelectorAll('.view.active .sensor:not([hidden])').length === 3`), 'show 8: at 1000 ppm, not above, it goes');
  await mockSet('sensor.living_room_co2', '640');
  await p.close();

  const q = await openPage(960, 480);
  await setClock(q, 10);
  await load(q, 'device=Echo+Show+5+Bedroom');
  await mockSet('binary_sensor.front_door', 'on');
  check(await q.waitFor(`!document.querySelector('${ALERT}').hidden`), 'show 5: the front door opened: its alert shows');
  await sleep(300);
  const r = await row(q);
  check(r.shown === 'Front door open,19.4°,48%,Present,4 today' && await q.eval(danger), `show 5: first, beside the room's values and its events, in the warning colour (got ${r.shown})`);
  check(await q.eval(`(() => { const s = document.querySelector('.view.active .sensors').getBoundingClientRect(), m = document.querySelector('.view.active .modes').getBoundingClientRect();
    return s.right <= m.left && [...document.querySelectorAll('.view.active .sensor')].every((e) => e.getBoundingClientRect().right <= s.right + 0.5); })()`), 'show 5: the row clear of the modes, all of it in view');
  await q.shot('show5-alert.png');
  // every theme draws it in its warning colour
  const off = [];
  for (const theme of Object.keys(await q.eval(`KIOSK_THEMES`))) {
    await load(q, `device=Echo+Show+5+Bedroom&theme=${theme}`);
    await q.waitFor(`!document.querySelector('${ALERT}').hidden`);
    if (!(await q.eval(danger))) off.push(theme);
    if (theme === 'xp') await q.shot('show5-alert-xp.png');
  }
  check(!off.length, `show 5: every theme draws the alert in its warning colour (not: ${off})`);
  await mockSet('binary_sensor.front_door', 'off');
  await q.close();
}
