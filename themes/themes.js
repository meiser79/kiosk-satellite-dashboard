// Kiosk dashboard: the themes. config.js picks one by name (theme.name), a
// kiosk can have its own (devices), and ?theme=<name> in the address tries
// one. Each theme starts from the dark or the light palette of css/base.css
// (`scheme`) and may bring files of its own, from its folder next to this
// one: a stylesheet that changes the palette and the shapes, a script that
// moves a scene behind the rooms (Kiosk.addScene in js/theme.js). A
// `mono` theme has one colour, its accent, for every light as well: the
// accent of config.js and followLight do not apply. docs/themes.md says how
// to make one. After editing a theme's file, bump its ?v= here.
window.KIOSK_THEMES = {
  dark: { scheme: 'dark' },
  light: { scheme: 'light' },
  nord: { scheme: 'dark', files: ['nord/theme.css?v=1.0.0'] },
  eink: { scheme: 'light', mono: true, files: ['eink/theme.css?v=1.0.0'] },
  crt: { scheme: 'dark', mono: true, files: ['crt/theme.css?v=1.0.0'] },
  handheld: { scheme: 'light', mono: true, files: ['handheld/theme.css?v=1.0.0'] },
  xp: { scheme: 'light', files: ['xp/theme.css?v=1.0.0'] },
  aqua: { scheme: 'light', files: ['aqua/theme.css?v=1.0.0'] },
  steampunk: { scheme: 'dark', files: ['steampunk/theme.css?v=1.0.0'] },
  starship: { scheme: 'dark', files: ['starship/theme.css?v=1.0.0'] },
  matrix: { scheme: 'dark', mono: true, files: ['matrix/theme.css?v=1.0.0', 'matrix/rain.js?v=1.0.0'] },
  synthwave: { scheme: 'dark', files: ['synthwave/theme.css?v=1.0.0', 'synthwave/scene.js?v=1.0.0'] },
};
