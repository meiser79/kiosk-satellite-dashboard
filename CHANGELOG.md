# Changelog

What changes from one release to the next, for the person at the kiosk and the one
writing `config.js`. Each release on
[GitHub](https://github.com/sylvertom/kiosk-satellite-dashboard/releases) comes with a
zip of the files to copy to Home Assistant ([Updating](docs/setup.md#updating)).

## Unreleased

### Added

- **Calling a kiosk**: a menu item `ks://intercom` with `items: true` lists the other kiosks on
  Kiosk Satellite's intercom, named after their rooms, and a tap calls one straight away,
  without the *Call a kiosk* sheet. A kiosk without a room in `devices`, such as an Echo
  Dot, takes the name and icon of its area in Home Assistant; `devices` can give it an
  icon of its own: `'Echo Dot': { icon: 'speaker' }`. A kiosk that cannot take a call
  shows faded. Replace
  a hand-written folder of `ks://intercom/<id>` links with
  `{ name: 'Intercom', icon: 'account-voice', link: 'ks://intercom', items: true }`.
- **German**: the page speaks English or German, the kiosk's own language unless
  `language: 'en'` or `language: 'de'` in your `config.js` says otherwise: the status,
  the menus, Settings, the detail panel, the events' days and months and Home Assistant's
  states. Write the names in `config.js` in the same language
  ([Language](docs/configuration.md#language)).
- **More icons**: some 200 more Material Design Icons to use in `config.js` without
  fetching them, such as `bed-king-outline`, `radiator`, `window-shutter`, `robot-vacuum`
  and `solar-power` ([Icons](docs/configuration.md#icons)).
- **Albums**: Music Assistant favourites can be albums too: add `'album'` to a folder's
  `favorites` in your `config.js` (`favorites: ['radio', 'playlist', 'album']`). With three
  kinds the Spot's switch shows their icons ([Music Assistant
  favourites](docs/configuration.md#music-assistant-favourites)).
- **Covers and thermostats**: a room's `covers` (shutters, blinds, awnings, curtains, a
  garage door) and `climate` (a heating, an air conditioner) in your `config.js` are tiles
  after the lights: a tap opens, closes or stops a cover, or turns a thermostat on or off;
  a drag across the tile sets the position or the target temperature; the panel has Open,
  Stop and Close and the tilt, or the modes and presets
  ([Rooms](docs/configuration.md#rooms)).
- **Fans**: a room's `fans` in your `config.js` are tiles after the thermostats: a tap
  turns one on or off, a drag across the tile sets its speed in the fan's own steps; the
  panel has the speed and chips for its preset modes, oscillation and direction
  ([Rooms](docs/configuration.md#rooms)).
- **Tiles shown when**: a light, cover, thermostat or fan in your `config.js` takes a
  `showWhen`, like a sensor's: its tile shows only while it holds, for example only while
  the projector is on ([Shown when](docs/configuration.md#shown-when)).
- **Icons alone on the Spot's menu**: `menu: { labels: false }` in your `config.js` leaves
  the names off the ring's buttons, which take the size of the main light's power button;
  the favourites keep theirs ([Menu](docs/configuration.md#menu)).
- **Satellite themes**: `satellite` and `satellite-light`, Kiosk Satellite's own look,
  dark and light, so the dashboard matches the app around it: its teal, flat charcoal
  or warm paper, large rounded cards and its typeface, Rubik
  ([gallery](docs/theme-gallery.md#satellite)).

### Changed

- **Tiles**: on the Echo Show they lie across, two to a row: the icon, beside it the name
  and under that the state, the tile filled from the left as far as its level. A drag
  across a tile sets its level (the pill at the bottom is gone), a long-press opens its
  panel (the dots in its corner are gone). They are less tall, and a name has room. On
  the Spot the strip's round buttons are such tiles too, two side by side inside the
  round screen, and a drag across one sets its level as on the Show; a swipe on the dots
  under them, or a tap beside them, brings the next two.
- **No arrows on the menu's folders**: Music, Settings and Find my phone open as before,
  without the small arrow in their corner.
- **Lights apart on the Show**: in a room with covers, thermostats or fans as well, the light
  tiles sit under the dial (a small ring beside the name) and above the media card, the
  others beside them, their rows on the same lines.
- **Echo Show 8**: laid out as the Show 5, larger: the page scales with the width of a
  Show as well as its height, so the dial and the tiles share the screen alike.

## 1.3.0 - 2026-10-26

### Added

- **Gradient backgrounds**: `background`, the theme's or a room's, can be a colour the
  page draws as a gradient instead of a picture, with nothing to load: a colour of yours
  (`'#5b3fd1'`), `'accent'`, or `'complement'`, the accent's opposite on the colour
  wheel, so that it stands out (the dark theme's amber on blue). With `followLight` the
  last two change with the room's light ([Theme](docs/configuration.md#theme)).

## 1.2.0 - 2026-10-23

### Added

- **Events**: a room's `events` shows what its Home Assistant calendars hold, for the rest
  of today, the next 7 or 30 days, or the next ones: how many among the sensors, and a
  list that a swipe scrolls through, a line above the main light on the Spot, a tile
  first among the lights on the Show. A tap shows them all, with a button to Kiosk
  Satellite's calendar. To have it, add `events: { calendars: ['calendar.x'] }` to a room
  in your `config.js` ([Events](docs/configuration.md#events),
  [#1](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/1)).

## 1.1.0 - 2026-10-21

### Added

- **Settings** in the kiosk's menu: pick the theme (it switches at once), turn Follow the
  light on or off, and see which version the kiosk runs. The kiosk keeps the choice. To
  have it, add `{ name: 'Settings', icon: 'cog-outline', settings: true }` to `menu` in
  your `config.js` ([Settings](docs/configuration.md#settings)).
- **Alerts**: `alerts` lists values of the house that every room shows first in its
  header, in the warning colour, while they need attention, such as the front door left
  open. On the Spot an alert has the row to itself
  ([Alerts](docs/configuration.md#alerts),
  [#3](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/3)).
- **showWhen on sensors**: a sensor can show only while a state holds, such as the CO2
  level above 1000 ppm: one state or a list, any but some, above or below a number, of
  its own entity or another's. The media card's `showWhen` takes the same forms
  ([Shown when](docs/configuration.md#shown-when)).
- Each release comes with a zip of the files to copy to Home Assistant.

### Changed

- Setup: the page goes into Kiosk Satellite as a custom page, picked like any dashboard,
  instead of through its remote API
  ([Setup](docs/setup.md#3-make-it-the-kiosks-start-page),
  [#2](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/2)).
- Echo Show: the menu on the right sits in the height under the clock, which a long menu
  reached on the Show 5.

## 1.0.0 - 2026-10-20

The first public release.
