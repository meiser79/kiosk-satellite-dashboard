/* Kiosk dashboard: the media card. Artwork, title, transport, volume and
 * source chips for a media player, shown while cfg.showWhen matches (or
 * always). Compact on small screens. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { states, el, esc, icon, cap, matches, stateText, setText, setClass } = K;
  const { watch, hold, held, call, pressFx, makeSlider } = K;

  const F = { PAUSE: 1, VOLUME_SET: 4, PREV: 16, NEXT: 32, TURN_ON: 128, TURN_OFF: 256, VOLUME_STEP: 1024, SELECT_SOURCE: 2048, PLAY: 16384 };
  function makeMedia(m, compact) {
    const node = el('div', 'media' + (compact ? ' compact' : ''));
    node.innerHTML = `<div class="media-art">${icon(m.icon || 'television')}<img alt=""></div>`
      + `<div class="media-info"><div class="media-title"></div><div class="media-sub"></div></div>`
      + `<div class="media-transport"></div><div class="media-volume" hidden></div><div class="media-sources hscroll" hidden></div>`;
    const art = node.querySelector('.media-art'), img = node.querySelector('img');
    img.referrerPolicy = 'no-referrer';   // the artwork may come from the streaming service: the page's address stays home
    const title = node.querySelector('.media-title'), sub = node.querySelector('.media-sub');
    const transport = node.querySelector('.media-transport');
    const volWrap = node.querySelector('.media-volume'), sources = node.querySelector('.media-sources');
    const btn = (cls, ic, svc, data) => {
      const b = el('button', 'media-btn ' + cls, icon(ic));
      pressFx(b);
      b.addEventListener('click', () => call('media_player', typeof svc === 'function' ? svc() : svc, data || {}, m.entity));
      transport.appendChild(b);
      return b;
    };
    const prev = btn('prev', 'skip-previous', 'media_previous_track');
    const play = btn('play', 'play', 'media_play_pause');
    const next = btn('next', 'skip-next', 'media_next_track');
    const volDown = btn('vol', 'volume-low', 'volume_down');
    const volUp = btn('vol', 'volume-high', 'volume_up');
    const pwr = btn('pwr', 'power', () => (states[m.entity] && ['off', 'standby'].includes(states[m.entity].state) ? 'turn_on' : 'turn_off'));
    const vol = makeSlider({ label: 'Volume', labelIcon: 'volume-medium', format: (v) => v + '%', onCommit: (v, final) => { if (final) hold(m.entity + ':vol', v); call('media_player', 'volume_set', { volume_level: v / 100 }, m.entity); } });
    volWrap.appendChild(vol.el);
    let sourceKey = '', lastArt = null;
    img.addEventListener('error', () => art.classList.remove('has-art'));
    img.addEventListener('load', () => art.classList.add('has-art'));
    const ids = [m.entity].concat(m.showWhen && m.showWhen.entity ? [m.showWhen.entity] : []);
    node.hidden = true; // until showWhen first matches, which then fades it in
    watch(ids, () => {
      const visible = matches(m.showWhen, m.entity);
      if (node.hidden === visible) {
        node.hidden = !visible;
        if (visible) requestAnimationFrame(() => node.classList.add('show'));
        else node.classList.remove('show');
        if (node.onvisibility) node.onvisibility(visible);
      }
      const st = states[m.entity];
      const a = st ? st.attributes : {};
      const off = !st || ['off', 'unavailable', 'unknown', 'standby'].includes(st.state);
      const feats = a.supported_features || 0;
      setClass(node, 'off', off);
      setText(title, a.media_title || (off ? stateText(st) : (a.app_name || a.source || cap(st.state))));
      setText(sub, a.media_artist || a.media_series_title || a.media_album_name || (a.media_title ? (a.app_name || a.source || '') : ''));
      const pic = a.entity_picture || null;
      if (pic !== lastArt) { lastArt = pic; if (pic) img.src = pic; else { img.removeAttribute('src'); art.classList.remove('has-art'); } }
      const playHtml = icon(st && st.state === 'playing' ? 'pause' : 'play');
      if (play.innerHTML !== playHtml) play.innerHTML = playHtml;
      prev.hidden = !(feats & F.PREV); next.hidden = !(feats & F.NEXT);
      play.hidden = !(feats & (F.PLAY | F.PAUSE));
      const hasVolSet = !!(feats & F.VOLUME_SET) && !compact;
      volWrap.hidden = !hasVolSet;
      volDown.hidden = volUp.hidden = hasVolSet || !(feats & F.VOLUME_STEP);
      pwr.hidden = !(feats & (F.TURN_ON | F.TURN_OFF));
      if (hasVolSet) { const h = held(m.entity + ':vol'); vol.set(h != null ? h : Math.round((a.volume_level || 0) * 100)); }
      const list = (feats & F.SELECT_SOURCE) && Array.isArray(a.source_list) && !compact ? a.source_list : null;
      sources.hidden = !list;
      if (list) {
        const key = list.join('\u0000');
        if (key !== sourceKey) {
          sourceKey = key;
          sources.innerHTML = '';
          for (const s of list) {
            const c = el('button', 'chip sm', `<span class="name">${esc(s)}</span>`);
            c.dataset.source = s;
            pressFx(c);
            c.addEventListener('click', () => call('media_player', 'select_source', { source: s }, m.entity));
            sources.appendChild(c);
          }
        }
        for (const c of sources.children) setClass(c, 'on', c.dataset.source === a.source);
      }
    });
    return node;
  }

  Object.assign(K, { makeMedia });
})();
