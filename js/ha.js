/* Home Assistant connection for the kiosk page.
 * Signs in with the session Kiosk Satellite seeds into localStorage
 * (hassTokens, the same store the Home Assistant frontend uses) or with a
 * normal Home Assistant login when there is none, then keeps a WebSocket
 * subscribed to just the entities the page shows. The page is served by
 * Home Assistant itself (/local/), so Home Assistant is at the page's own
 * origin: no address is ever taken from a link or a stored session.
 * No dependencies.
 *
 *   HA.start(entityIds)                 connect and subscribe
 *   HA.add(entityIds)                   subscribe to more (a group's members, once known)
 *   HA.states[entityId]                 {state, attributes, last_changed}
 *   HA.onChange(fn)                     fn(Set of changed entity ids)
 *   HA.onStatus(fn)                     fn({kind, text, action, icon}) or fn(null)
 *   HA.call(domain, service, data, target) -> Promise
 *   HA.request(msg)                     any other WebSocket command -> Promise of its result
 */
window.HA = (() => {
  'use strict';
  const t = window.KIOSK_I18N;

  const params = new URLSearchParams(location.search);
  const ORIGIN = location.origin;
  const CLIENT_ID = ORIGIN + '/'; // what the Home Assistant frontend uses too

  const states = Object.create(null);
  const changeFns = [];
  const statusFns = [];
  let status = null;

  function emitStatus(s) {
    status = s;
    for (const fn of statusFns) fn(s);
  }
  function emitChange(ids) {
    for (const fn of changeFns) fn(ids);
  }

  /* --------------------------------------------------------------- auth */
  let tokens = null;

  // The session lives where the Home Assistant frontend keeps its own,
  // hassTokens: Kiosk Satellite seeds it, a login here fills it.
  function loadTokens() {
    try {
      const t = JSON.parse(localStorage.getItem('hassTokens') || 'null');
      return t && t.access_token ? t : null;
    } catch (_) { return null; }
  }
  function saveTokens(t) { localStorage.setItem('hassTokens', JSON.stringify(t)); }
  async function tokenRequest(body) {
    const r = await fetch(ORIGIN + '/auth/token', { method: 'POST', body: new URLSearchParams({ client_id: CLIENT_ID, ...body }) });
    if (!r.ok) throw new Error('token request failed: ' + r.status);
    const j = await r.json();
    return { ...j, expires: Date.now() + (j.expires_in || 1800) * 1000, hassUrl: ORIGIN, clientId: CLIENT_ID };
  }
  async function refresh(t) {
    const n = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
    const fresh = { ...t, ...n, refresh_token: t.refresh_token };
    saveTokens(fresh);
    return fresh;
  }
  function pageUrl() {
    const keep = new URLSearchParams();
    for (const [k, v] of params) if (k !== 'code' && k !== 'state') keep.set(k, v);
    const q = keep.toString();
    return ORIGIN + location.pathname + (q ? '?' + q : '');
  }
  async function ensureTokens() {
    const code = params.get('code');
    if (code) {
      const t = await tokenRequest({ grant_type: 'authorization_code', code });
      saveTokens(t);
      history.replaceState(null, '', pageUrl());
      return t;
    }
    return loadTokens();
  }
  function signIn() {
    location.href = ORIGIN + '/auth/authorize?' + new URLSearchParams({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: pageUrl(), state: 'kiosk',
    });
  }
  function needSignIn() {
    emitStatus({ kind: 'error', text: t('signIn'), action: signIn, icon: 'home-assistant' });
  }

  /* ----------------------------------------------------------- websocket */
  let ws = null, msgId = 0, backoff = 1000, retryTimer = null, authRetried = false;
  let watched = []; // entity ids subscribed to; each batch is its own subscription
  const subIds = new Set();
  const pending = new Map();

  function send(msg) {
    msg.id = ++msgId;
    return new Promise((resolve, reject) => {
      pending.set(msg.id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });
  }
  // Signed in: the subscriptions go out with auth_ok. Home Assistant drops
  // a connection that sends anything else before it.
  const ready = () => !!ws && ws.readyState === 1 && subIds.size > 0;
  function request(msg) {
    if (!ready()) return Promise.reject(new Error('not connected'));
    return send({ ...msg });
  }
  function call(domain, service, data, target) {
    const msg = { type: 'call_service', domain, service, service_data: data || {} };
    if (target) msg.target = typeof target === 'string' ? { entity_id: target } : target;
    return request(msg).catch((e) => { console.warn('call_service failed', domain, service, e); throw e; });
  }

  function scheduleReconnect(text) {
    if (retryTimer) return;
    emitStatus({ kind: '', text: text || t('reconnecting'), icon: 'wifi-off' });
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, backoff);
    backoff = Math.min(backoff * 2, 30000);
  }

  async function connect() {
    if (!tokens) { needSignIn(); return; }
    // A login's token lasts half an hour: renew it before it runs out, as
    // Home Assistant counts a token it refuses as a failed login (a
    // notification, and a step toward a ban). Kiosk Satellite's session has
    // no refresh token and lasts for years.
    if (tokens.refresh_token && tokens.expires && tokens.expires < Date.now() + 60000) {
      try { tokens = await refresh(tokens); } catch (_) { /* try the old token, HA will say if it is dead */ }
    }
    for (const p of pending.values()) p.reject(new Error('reconnect'));
    pending.clear();
    subIds.clear();
    const url = ORIGIN.replace(/^http/, 'ws') + '/api/websocket';
    try { ws = new WebSocket(url); } catch (_) { scheduleReconnect(); return; }
    ws.onopen = () => emitStatus({ kind: '', text: t('connecting'), icon: 'home-assistant' });
    ws.onclose = () => { ws = null; scheduleReconnect(); };
    ws.onerror = () => { /* onclose follows */ };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.type === 'auth_required') { ws.send(JSON.stringify({ type: 'auth', access_token: tokens.access_token })); return; }
      if (m.type === 'auth_ok') { onAuthOk(); return; }
      if (m.type === 'auth_invalid') { onAuthInvalid(); return; }
      if (m.type === 'result') {
        const p = pending.get(m.id);
        if (p) { pending.delete(m.id); if (m.success) p.resolve(m.result); else p.reject(m.error || new Error('failed')); }
        return;
      }
      if (m.type === 'event' && subIds.has(m.id)) applyEvent(m.event);
    };
  }

  function onAuthOk() {
    backoff = 1000;
    authRetried = false;
    subscribe(watched);   // first: what the end of the status sets off (the favourites) asks Home Assistant at once
    emitStatus(null);
  }
  function subscribe(ids) {
    const id = ++msgId;
    subIds.add(id);
    pending.set(id, { resolve() {}, reject(e) { console.warn('subscribe failed', e); } });
    ws.send(JSON.stringify({ id, type: 'subscribe_entities', entity_ids: ids }));
  }
  // Entities discovered while running (the members of a light group): kept
  // for reconnects, and subscribed to right away when connected.
  function add(entityIds) {
    const fresh = [...new Set(entityIds)].filter((id) => id && !watched.includes(id));
    if (!fresh.length) return;
    watched = watched.concat(fresh);
    if (ready()) subscribe(fresh);
  }

  async function onAuthInvalid() {
    if (tokens && tokens.refresh_token && !authRetried) {
      authRetried = true;
      try {
        tokens = await refresh(tokens);
        return; // the socket closes; the reconnect uses the new token
      } catch (_) { /* fall through */ }
    }
    if (tokens && tokens.refresh_token) {
      // A login done by hand that no longer works: start over.
      localStorage.removeItem('hassTokens');
      tokens = null;
      if (ws) ws.onclose = null;
      needSignIn();
      return;
    }
    // A seeded session (no refresh token) that HA refused: the token Kiosk
    // Satellite holds is wrong or revoked. Keep retrying slowly, say why.
    if (ws) ws.onclose = null;
    backoff = 30000;
    emitStatus({ kind: 'error', text: t('tokenRefused'), action: signIn, icon: 'alert-circle-outline' });
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, backoff);
  }

  // subscribe_entities sends compressed states: a = added, c = changed, r = removed.
  function applyEvent(ev) {
    if (!ev) return;
    const changed = new Set();
    if (ev.a) for (const [id, c] of Object.entries(ev.a)) {
      states[id] = { state: c.s, attributes: c.a || {}, last_changed: c.lc, last_updated: c.lu || c.lc };
      changed.add(id);
    }
    if (ev.c) for (const [id, c] of Object.entries(ev.c)) {
      const st = states[id];
      if (!st) continue;
      const plus = c['+'];
      if (plus) {
        if ('s' in plus) st.state = plus.s;
        if (plus.a) Object.assign(st.attributes, plus.a);
        if (plus.lc) st.last_changed = plus.lc;
        if (plus.lu) st.last_updated = plus.lu;
      }
      const minus = c['-'];
      if (minus && minus.a) for (const k of minus.a) delete st.attributes[k];
      changed.add(id);
    }
    if (ev.r) for (const id of ev.r) { delete states[id]; changed.add(id); }
    if (changed.size) emitChange(changed);
  }

  /* ---------------------------------------------------------------- api */
  async function start(entityIds) {
    watched = [...new Set(entityIds)].filter(Boolean);
    emitStatus({ kind: '', text: t('connecting'), icon: 'home-assistant' });
    try { tokens = await ensureTokens(); } catch (e) { console.warn(e); tokens = loadTokens(); }
    connect();
    addEventListener('online', () => {
      if (!ws && retryTimer) { clearTimeout(retryTimer); retryTimer = null; backoff = 1000; connect(); }
    });
  }

  return {
    states, start, add, call, request,
    onChange(fn) { changeFns.push(fn); },
    onStatus(fn) { statusFns.push(fn); if (status !== undefined) fn(status); },
  };
})();
