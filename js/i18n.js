/* Kiosk dashboard: the page's own words, in English and German. The
 * language is ?lang= in the address (to try one), else `language` in
 * config.js ('en' or 'de'), else the kiosk's own: German when its browser
 * asks for German, English otherwise. What config.js names (rooms, lights,
 * modes, menu items) shows as written there. Loaded before js/ha.js, whose
 * status pill speaks too; js/core.js hands t on to the others.
 *
 *   t(key)               the text, in the page's language (English when German has none)
 *   t(key, { n, ... })   with {n} and the other names filled in; a text that
 *                        counts has one form for 1 and another for the rest
 *   t.list(key)          a list: the days of the week, the months, the themes' names
 *   t.state(state)       a Home Assistant state, as the kiosk says it ("Playing", "Wiedergabe")
 *   t.lang               'en' or 'de' */
window.KIOSK_I18N = (() => {
  'use strict';

  const TEXT = {
    en: {
      // the status pill (js/ha.js, js/main.js)
      signIn: 'Tap to sign in to Home Assistant',
      connecting: 'Connecting…',
      reconnecting: 'Reconnecting…',
      tokenRefused: 'Home Assistant refused the kiosk token',
      noConfig: 'No config.js: copy config.example.js to config.js and edit it',
      noAnswer: 'Home Assistant did not answer',
      // the fixed parts of the page (index.html)
      kioskMenu: 'Kiosk menu', menu: 'Menu', rooms: 'Rooms', menuFolder: 'Menu folder', close: 'Close', back: 'Back',
      // states and controls
      unavailable: 'Unavailable',
      onOff: 'On or off', on: 'On', off: 'Off',
      membersOn: '{pct}% · {n} on',
      details: 'Details',
      volume: 'Volume',
      brightness: 'Brightness',
      white: 'White', colour: 'Colour', effects: 'Effects', more: 'More', lights: 'Lights',
      temperature: 'Temperature', hue: 'Hue', saturation: 'Saturation',
      // the room view and the room menu
      changeRoom: 'Change room', previousLight: 'Previous light', nextLight: 'Next light',
      lightsOn: { one: '{n} light on', other: '{n} lights on' },
      lightsOff: 'Lights off',
      roomOff: 'Turn off the lights in {room}',
      allOff: 'All lights off', allOffLabel: 'Turn off every light',
      // the menu
      opensInApp: 'Opens in Kiosk Satellite',
      radios: 'Radios', playlists: 'Playlists', albums: 'Albums',
      loading: 'Loading…',
      maNoAnswer: 'Music Assistant did not answer',
      noRadios: 'No favourite radios in Music Assistant',
      noPlaylists: 'No favourite playlists in Music Assistant',
      noAlbums: 'No favourite albums in Music Assistant',
      // Settings
      theme: 'Theme', followLight: 'Follow the light', version: 'Version', default: 'Default',
      themes: {},   // the names of themes without one in themes/themes.js: their key, capitalised
      notWith: 'Not with {theme}', ownColour: '{theme} keeps its own colour', dashboard: 'Kiosk dashboard {version}',
      // the rooms' events
      today: 'Today', tomorrow: 'Tomorrow', now: 'Now', allDay: 'All day',
      chipDay: 'today', chipWeek: 'this week', chipMonth: 'this month', chipAll: 'upcoming',
      titleDay: 'Today', titleWeek: 'Next 7 days', titleMonth: 'Next 30 days', titleAll: 'Upcoming',
      noneDay: 'No events today', noneWeek: 'No events this week', noneMonth: 'No events this month', noneAll: 'No upcoming events',
      events: { one: '{n} event', other: '{n} events' },
      calendarNoAnswer: 'The calendar did not answer',
      openCalendar: 'Open calendar',
      date: '{day} {month}', dayDate: '{weekday} {day} {month}',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    de: {
      signIn: 'Tippen, um bei Home Assistant anzumelden',
      connecting: 'Verbinde…',
      reconnecting: 'Verbinde erneut…',
      tokenRefused: 'Home Assistant hat das Kiosk-Token abgelehnt',
      noConfig: 'Keine config.js: config.example.js nach config.js kopieren und anpassen',
      noAnswer: 'Home Assistant hat nicht geantwortet',
      kioskMenu: 'Kiosk-Menü', menu: 'Menü', rooms: 'Räume', menuFolder: 'Menüordner', close: 'Schließen', back: 'Zurück',
      unavailable: 'Nicht verfügbar',
      onOff: 'Ein oder aus', on: 'An', off: 'Aus',
      membersOn: '{pct}% · {n} an',
      details: 'Details',
      volume: 'Lautstärke',
      brightness: 'Helligkeit',
      white: 'Weiß', colour: 'Farbe', effects: 'Effekte', more: 'Mehr', lights: 'Lichter',
      temperature: 'Farbtemperatur', hue: 'Farbton', saturation: 'Sättigung',
      changeRoom: 'Raum wechseln', previousLight: 'Vorheriges Licht', nextLight: 'Nächstes Licht',
      lightsOn: { one: '{n} Licht an', other: '{n} Lichter an' },
      lightsOff: 'Lichter aus',
      roomOff: 'Lichter in {room} ausschalten',
      allOff: 'Alle Lichter aus', allOffLabel: 'Alle Lichter ausschalten',
      opensInApp: 'Öffnet sich in Kiosk Satellite',
      radios: 'Radiosender', playlists: 'Playlists', albums: 'Alben',
      loading: 'Lädt…',
      maNoAnswer: 'Music Assistant hat nicht geantwortet',
      noRadios: 'Keine Lieblingssender in Music Assistant',
      noPlaylists: 'Keine Lieblings-Playlists in Music Assistant',
      noAlbums: 'Keine Lieblingsalben in Music Assistant',
      theme: 'Design', followLight: 'Dem Licht folgen', version: 'Version', default: 'Standard',
      themes: { dark: 'Dunkel', light: 'Hell' },
      notWith: 'Nicht mit {theme}', ownColour: '{theme} behält die eigene Farbe', dashboard: 'Kiosk-Dashboard {version}',
      today: 'Heute', tomorrow: 'Morgen', now: 'Jetzt', allDay: 'Ganztägig',
      chipDay: 'heute', chipWeek: 'diese Woche', chipMonth: 'diesen Monat', chipAll: 'demnächst',
      titleDay: 'Heute', titleWeek: 'Nächste 7 Tage', titleMonth: 'Nächste 30 Tage', titleAll: 'Demnächst',
      noneDay: 'Heute keine Termine', noneWeek: 'Diese Woche keine Termine', noneMonth: 'Diesen Monat keine Termine', noneAll: 'Keine anstehenden Termine',
      events: { one: '{n} Termin', other: '{n} Termine' },
      calendarNoAnswer: 'Der Kalender hat nicht geantwortet',
      openCalendar: 'Kalender öffnen',
      date: '{day}. {month}', dayDate: '{weekday} {day}. {month}',
      weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    },
  };
  // Home Assistant's states as a kiosk in that language says them. One not
  // listed shows as Home Assistant gives it, its first letter a capital.
  const STATES = {
    de: {
      on: 'An', off: 'Aus', home: 'Zuhause', not_home: 'Abwesend', away: 'Abwesend',
      open: 'Offen', closed: 'Geschlossen', opening: 'Öffnet', closing: 'Schließt',
      locked: 'Verriegelt', unlocked: 'Entriegelt', locking: 'Verriegelt…', unlocking: 'Entriegelt…', jammed: 'Blockiert',
      playing: 'Wiedergabe', paused: 'Pausiert', idle: 'Untätig', standby: 'Standby', buffering: 'Puffert',
      heat: 'Heizen', cool: 'Kühlen', heat_cool: 'Heizen/Kühlen', auto: 'Automatisch', dry: 'Entfeuchten', fan_only: 'Nur Lüfter',
      heating: 'Heizt', cooling: 'Kühlt', drying: 'Entfeuchtet',
      cleaning: 'Reinigt', docked: 'Angedockt', returning: 'Kehrt zurück', charging: 'Lädt', discharging: 'Entlädt', error: 'Fehler',
      armed_home: 'Scharf (Zuhause)', armed_away: 'Scharf (Abwesend)', armed_night: 'Scharf (Nacht)', armed_vacation: 'Scharf (Urlaub)',
      disarmed: 'Unscharf', arming: 'Wird scharf geschaltet', triggered: 'Ausgelöst', pending: 'Ausstehend',
      above_horizon: 'Über dem Horizont', below_horizon: 'Unter dem Horizont',
      active: 'Aktiv', detected: 'Erkannt', clear: 'Frei', problem: 'Problem', low: 'Niedrig', normal: 'Normal', high: 'Hoch',
      sunny: 'Sonnig', 'clear-night': 'Klare Nacht', cloudy: 'Bewölkt', partlycloudy: 'Teilweise bewölkt', fog: 'Nebel',
      rainy: 'Regnerisch', pouring: 'Starkregen', snowy: 'Schnee', 'snowy-rainy': 'Schneeregen', hail: 'Hagel',
      lightning: 'Gewitter', 'lightning-rainy': 'Gewitter mit Regen', windy: 'Windig', 'windy-variant': 'Windig und bewölkt', exceptional: 'Außergewöhnlich',
    },
  };

  // The language: the address's, config.js's, then the kiosk's own.
  const LANGS = Object.keys(TEXT);
  const own = (window.KIOSK_CONFIG || {}).language;
  const pick = (code) => String(code || '').toLowerCase().split(/[-_]/)[0];
  if (own && !LANGS.includes(pick(own))) console.warn(`config.js: language can be ${LANGS.map((c) => `'${c}'`).join(' or ')}; "${own}" is not one`);
  const lang = [new URLSearchParams(location.search).get('lang'), own, ...(navigator.languages || [navigator.language])]
    .map(pick).find((c) => LANGS.includes(c)) || 'en';
  document.documentElement.lang = lang;

  const words = TEXT[lang];
  const raw = (key) => (Object.hasOwn(words, key) ? words[key] : TEXT.en[key]);
  function t(key, vars) {
    let s = raw(key);
    if (s == null) { console.warn(`js/i18n.js: no text "${key}"`); return key; }
    if (typeof s === 'object') s = vars && vars.n === 1 ? s.one : s.other;
    return vars ? s.replace(/\{(\w+)\}/g, (m, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : m)) : s;
  }
  t.list = (key) => raw(key) || [];
  t.state = (state) => {
    const s = String(state);
    const own = (STATES[lang] || {})[s];
    return own || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s);
  };
  t.lang = lang;
  return t;
})();
