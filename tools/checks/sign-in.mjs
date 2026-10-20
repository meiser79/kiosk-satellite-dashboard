// Checks of signing in, and of a page without its configuration.
import { BASE, check, openPage, connected, sleep, tokenLife, dropConnections, authLog } from './harness.mjs';

// 10. No session: the page offers a login (a token in the address does not count), the login round-trip
//    signs it in. Its token renewed before it runs out, and when Home Assistant refuses it. Then a refused
//    kiosk token.
export async function signIn() {
  const p = await openPage(960, 480);
  await p.goto(`${BASE}/index.html?room=bedroom`);
  await p.waitFor("document.getElementById('app') !== null");
  await p.eval(`localStorage.clear(), true`);
  await p.goto(`${BASE}/index.html?room=bedroom`);
  check(await p.waitFor(`!document.getElementById('status').hidden && document.getElementById('status').textContent.includes('sign in')`), 'without a session the status offers to sign in');
  await p.shot('show5-signin.png');
  await p.goto('about:blank'); // a hash-only change would not reload the page
  await p.goto(`${BASE}/index.html?room=bedroom#token=mock-fragment`);
  check(await p.waitFor(`document.getElementById('status').textContent.includes('sign in')`) && await p.eval(`localStorage.length === 0`), 'a token in the address is ignored');
  await tokenLife(2);   // a login's tokens last two seconds, not half an hour
  await p.tapSel('#status');
  check(await p.waitFor(connected, 8000), 'login round-trip connects');
  const t = JSON.parse(await p.eval(`localStorage.getItem('hassTokens')`));
  check(t && t.refresh_token === 'mock-refresh' && t.clientId === BASE + '/', 'tokens stored in the frontend format');
  check(!(await p.eval('location.search')).includes('code='), 'code removed from the address');
  // Its token has run out when the connection drops (Home Assistant restarting): the page renews it before
  // signing in again, so that Home Assistant refuses nothing (it counts a refused token as a failed login).
  await sleep(2500);
  const signIns = (await authLog()).length;
  await dropConnections();
  await sleep(300);
  const back = await p.waitFor(connected, 8000), since = (await authLog()).slice(signIns);
  check(back && since.length > 0 && since.every((a) => a.ok), `a login's token that has run out is renewed before the page signs in again (sign-ins since the drop: ${since.map((a) => (a.ok ? 'ok' : 'refused')).join() || 'none'}${back ? '' : ', not connected'})`);
  await tokenLife(1800);
  // A login's token Home Assistant refuses although it has not run out (revoked): renewed, the page connects.
  await p.eval(`localStorage.setItem('hassTokens', JSON.stringify({ access_token: 'revoked', refresh_token: 'mock-refresh', expires: Date.now() + 1e10, hassUrl: location.origin, clientId: location.origin + '/' })), true`);
  await p.goto(`${BASE}/index.html?room=bedroom`);
  check(await p.waitFor(connected, 8000) && (await p.eval(`JSON.parse(localStorage.getItem('hassTokens')).access_token`)).startsWith('mock-'), 'a login token Home Assistant refuses is renewed, and the page connects');
  await p.eval(`localStorage.setItem('hassTokens', JSON.stringify({ access_token: 'bad', expires: Date.now() + 1e10 })), true`);
  await p.goto(`${BASE}/index.html?room=bedroom`);
  check(await p.waitFor(`document.getElementById('status').textContent.includes('refused')`), 'a refused kiosk token is reported');
  await p.close();
}

// 11. No config.js (a stand-in that drops the configuration): the page says how to make one.
export async function noConfig() {
  const p = await openPage(960, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => undefined, set: () => {} });` });
  await p.goto(`${BASE}/index.html?room=bedroom`);
  check(await p.waitFor(`!document.getElementById('status').hidden && document.getElementById('status').textContent.includes('copy config.example.js to config.js') && document.getElementById('app').hidden`), 'without config.js the page says to copy config.example.js');
  await p.close();
}
