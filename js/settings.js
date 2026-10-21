/* Kiosk dashboard: Settings, a menu folder of what can be changed on the
 * kiosk itself: the theme and whether the accent follows the light, and
 * the dashboard's version. Theme opens the list of every theme, in the room
 * menu's look (rows on the Spot, cards on the Show): the one on screen
 * marked, the one config.js gives this kiosk said to be the default.
 * Picking one switches to it at once and leaves the list open, to try
 * another. The kiosk keeps what is set (js/theme.js); js/menu.js shows the
 * entries. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { cap, toast } = K;
  const { pickTheme, themeNow, defaultTheme, setFollow, followsLight } = K;

  const THEMES = window.KIOSK_THEMES || {};
  const nameOf = (key) => (THEMES[key] && THEMES[key].name) || cap(key);
  const iconOf = (key) => (THEMES[key] && THEMES[key].icon) || 'palette-outline';
  // The version index.html asks this file at: a release sets every ?v= to it.
  const version = new URL(document.currentScript.src).searchParams.get('v') || '';

  // The folder's entries as they stand. Theme bears the icon of the theme on
  // screen; Follow the light is on or off, and a tap turns it over. A mono
  // theme keeps its own colour: the entry is faded and a tap says so.
  // Version tells which release this kiosk runs, to say in a bug report.
  function settingsItems() {
    const now = themeNow(), mono = !!(THEMES[now] || {}).mono, on = followsLight();
    return [
      { name: 'Theme', icon: iconOf(now), state: nameOf(now), opens: { name: 'Theme', list: themeItems } },
      { name: 'Follow the light', icon: 'eyedropper-variant', state: mono ? `Not with ${nameOf(now)}` : on ? 'On' : 'Off', on: on && !mono, idle: mono, stay: true,
        pick: () => (mono ? toast(`${nameOf(now)} keeps its own colour`) : setFollow(!on)) },
      { name: 'Version', icon: 'information-outline', state: version, stay: true, pick: () => toast(`Kiosk dashboard ${version}`) },
    ];
  }
  function themeItems() {
    const now = themeNow(), own = defaultTheme();
    return Object.keys(THEMES).map((key) => ({ name: nameOf(key), icon: iconOf(key), state: key === own ? 'Default' : '', current: key === now, stay: true, pick: () => pickTheme(key) }));
  }

  Object.assign(K, { settingsItems });
})();
