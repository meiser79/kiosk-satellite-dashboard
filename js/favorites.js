/* Kiosk dashboard: Music Assistant favourites. A menu folder's `favorites`
 * are the Music Assistant favourites of those kinds, played on the player of
 * the room this kiosk belongs to. They come first in the folder, before its
 * own items, their covers for icons; the Spot's ring takes as many as it has
 * room for, the first by name. With more than one kind (radios, playlists,
 * albums), a switch at the top of the screen picks the one shown, and the page remembers it. Home Assistant
 * hands them over (Music Assistant's Get library action, on the instance the
 * room's player comes from) once connected, and again whenever a folder of
 * them opens: one starred in Music Assistant shows up the next time. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, HA, t, el, esc, icon } = K;
  const { pressFx } = K;

  const FAVORITES = {
    radio: { name: t('radios'), icon: 'radio', none: t('noRadios') },
    playlist: { name: t('playlists'), icon: 'playlist-music', none: t('noPlaylists') },
    album: { name: t('albums'), icon: 'album', none: t('noAlbums') },
  };
  const favorites = {};   // kind -> { items } as Music Assistant last said, or { failed: true }
  let favKind = null, entryAsked = null;   // the kind picked last; the instance's config entry (a Promise)
  // The player of the room this kiosk belongs to, where the favourites play.
  const homePlayer = () => ((CFG.rooms || {})[K.home] || {}).player || '';
  function favoriteKinds(folder) {
    const kinds = [].concat(folder.favorites || []);
    for (const k of kinds) if (!Object.hasOwn(FAVORITES, k)) console.warn(`config.js: favorites can be 'radio', 'playlist' and 'album'; "${k}" is left out`);
    return [...new Set(kinds.filter((k) => Object.hasOwn(FAVORITES, k)))];
  }
  const kindIn = (folder) => (folder.favorites.includes(favKind) ? favKind : folder.favorites[0]);
  // What a folder holds: its favourites of the kind picked, then its items;
  // `most` of them in all, at most.
  function folderItems(folder, most = Infinity) {
    if (!folder.favorites.length) return folder.items;
    const kind = kindIn(folder), got = (favorites[kind] && favorites[kind].items) || [];
    const room = Math.max(0, most - folder.items.length);
    return [...got.slice(0, room).map((f) => ({ name: f.name, icon: FAVORITES[kind].icon, cover: f.image, uri: f.uri, type: f.media_type || kind })), ...folder.items];
  }
  // The switch between the kinds, when there are more than one, and a line in the
  // favourites' place while there are none to show. Picking another kind
  // redraws the folder. Three kinds' names do not fit at the top of the
  // Spot's round screen: there the switch shows their icons.
  function favoritesBar(folder, redraw) {
    if (!folder.favorites.length) return null;
    const kind = kindIn(folder), got = favorites[kind];
    const bar = el('div', 'fav-bar');
    if (folder.favorites.length > 1) {
      const icons = K.shape === 'round' && folder.favorites.length > 2;
      const sw = el('div', 'fav-switch' + (icons ? ' icons' : ''));
      for (const k of folder.favorites) {
        const b = el('button', k === kind ? 'on' : '', icons ? icon(FAVORITES[k].icon) : esc(FAVORITES[k].name));
        b.setAttribute('aria-label', FAVORITES[k].name);
        b.setAttribute('aria-pressed', String(k === kind));
        pressFx(b);
        b.addEventListener('click', () => { if (k !== kindIn(folder)) { favKind = k; redraw(); } });
        sw.appendChild(b);
      }
      bar.appendChild(sw);
    }
    const note = !got ? t('loading') : got.failed ? t('maNoAnswer') : got.items.length ? '' : FAVORITES[kind].none;
    if (note) bar.appendChild(el('div', 'fav-note', esc(note)));
    return bar.childElementCount ? bar : null;
  }
  // Asks Music Assistant for the favourites of these kinds, and redraws the
  // folder on screen when they have changed. When it does not answer, the
  // ones it gave last time stay.
  function loadFavorites(kinds) {
    if (!homePlayer()) return;
    for (const kind of kinds || []) {
      musicAssistant()
        .then((entry) => HA.request({ type: 'call_service', domain: 'music_assistant', service: 'get_library', return_response: true,
          service_data: { config_entry_id: entry, media_type: kind, favorite: true, order_by: 'name', limit: 50 } }))
        .then((r) => ({ items: ((r && r.response && r.response.items) || []).filter((f) => f && f.uri && f.name) }),
          (e) => { console.warn(`Music Assistant favourites (${kind}):`, e); return favorites[kind] && favorites[kind].items ? favorites[kind] : { failed: true }; })
        .then((now) => {
          if (JSON.stringify(now) === JSON.stringify(favorites[kind])) return;
          favorites[kind] = now;
          K.redrawFavorites(kind);
        });
    }
  }
  // The Music Assistant instance (its config entry) the room's player comes
  // from. Asked once, and again after a failure.
  function musicAssistant() {
    if (!entryAsked) {
      const player = homePlayer();
      entryAsked = HA.request({ type: 'config/entity_registry/get', entity_id: player }).then((e) => {
        if (!e || e.platform !== 'music_assistant' || !e.config_entry_id) throw new Error(`config.js: ${player} is not a Music Assistant player`);
        return e.config_entry_id;
      });
      entryAsked.catch(() => { entryAsked = null; });
    }
    return entryAsked;
  }

  Object.assign(K, { homePlayer, favoriteKinds, folderItems, favoritesBar, loadFavorites });
})();
