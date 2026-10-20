# Configuration

Everything you set up lives in `config.js`, a copy of
[`config.example.js`](../config.example.js) that sits next to `index.html`. It is plain
JavaScript: one object, `window.KIOSK_CONFIG`. The example documents every option next to
its use; this page is the reference.

```js
theme:       { name: 'dark', accent?: '#f2af48', followLight?: true, background?: '<picture>', fade?: 0.5 }
menu:        { items: [{ name, icon, shape?: 'round' | 'wide', link | script | items, favorites? }] }
devices:     { '<Kiosk Satellite device name>': '<room key>' | { room: '<room key>', theme?: '<theme>' } }
defaultRoom: '<room key>'
rooms:       { <key>: { title, icon, sensors, modes, main, lights, media, player, background?, fade? } }
```

The arrangement is not configurable: it follows the screen. A square screen (the round
Echo Spot) gets the round layout, anything else the wide one.

## Theme

`name` is one of the themes in [`themes/themes.js`](../themes/themes.js), `'dark'` when
not set; the [theme gallery](theme-gallery.md) shows them all, and [Themes](themes.md)
says how to make one. Each is dark or
light and has its own accent colour; `accent`, any CSS hex colour, replaces it, except in
a theme of one colour (`eink`, `crt`, `handheld`, `matrix`), which keeps its own and does not
follow the light. A kiosk can have a theme of its own (see [Devices](#devices)).

- **`followLight: true`** gives the accent the colour of the light the dial controls: the
  room's `main` light on the Show, and on the Spot the light in the main slot, whichever
  a swipe has brought there. A white light gives the tint of its temperature (warm
  amber, a paler gold, grey for daylight). While that light is off, or has no colour,
  the accent is `accent`, or the theme's. The colour is adjusted to stay legible: a deep
  blue is lightened on a dark theme, a pale yellow darkened on a light one.
- **`background`** is a picture behind every room: a web address
  (`'https://images.unsplash.com/photo-…?w=1280&q=75'`) or a file of yours in Home
  Assistant's `www/` folder (`'/local/kiosk/wallpaper.jpg'`). A room's own `background`
  replaces it for that room. The pictures load from the start; one that does not load
  leaves the usual background. Around 1280 pixels wide is plenty for an Echo Show 8.
- **`fade`**, from 0 to 1 (0.5 when not set), covers the picture with the theme's own
  colour, dark or light, so that the text on it stays legible: the busier or brighter
  the picture, the higher. A room can have its own. On a picture, the tiles and chips
  are more solid and the text stands out with a soft shadow.

## Devices

Keys are the kiosks' names in Kiosk Satellite (**Settings > Device**), values the room
each one starts on. Matching ignores case, punctuation and a `ks-` prefix: `Echo Spot
Bedroom` and `ks-echo-spot-bedroom` both match. `defaultRoom` is the room shown when the
device is not listed (and in a desktop browser).

A kiosk can also have a theme of its own, over `theme.name`: give it `{ room, theme }`
in place of the room alone.

```js
'Echo Spot Office': { room: 'office', theme: 'light' },
```

The room a kiosk starts on is also the room it *belongs to*: Music Assistant favourites
play on that room's `player`, whichever room is on screen.

## Rooms

The order of `rooms` is the order in the room menu. Each room has:

| Key | What it is |
| --- | --- |
| `title`, `icon` | Shown in the header and in the room menu |
| `sensors` | Small read-only values in the header. One without a value is left out |
| `modes` | Toggle chips in the header: anything with on/off. The header has room for three or four |
| `main` | The room's main light, usually a light group: the dial on the Show, the power button and rim on the Spot. The room menu counts the lights of its group that are on, and its power button turns those off (see *Groups* below) |
| `lights` | Light tiles: tap toggles, long-press (or the dots) opens the detail panel. A room with one light needs no tiles: `main` alone is enough |
| `media` | A media player card, shown while `showWhen` matches (or always) |
| `player` | The Music Assistant player (or group of players) the menu's favourites play on, for the kiosks that belong to this room |
| `background`, `fade` | The room's own picture behind it, and how far it fades, over the theme's (see [Theme](#theme)) |

The entries:

```js
sensors: { entity, icon, unit, digits }
         { entity, icon, iconOff, on: 'Present', off: 'Away' }     // a binary sensor
modes:   { entity, name, icon }
         { entity, name, icon, turnOn: 'script.a', turnOff: 'script.b' }
main, lights: { entity, name, icon, controls?: ['select.x', 'number.y'] }
media:   { entity, name, icon, showWhen?: { entity, state } }
player:  'media_player.x'
```

- **Scripted modes.** A mode with `turnOn` and `turnOff` runs those scripts instead of
  toggling its entity, which then only shows the state. The example's projector works
  this way, and its media card's `showWhen` points at the same entity.
- **WLED.** List the strip's `select.*` and `number.*` entities under `controls` to get
  them in the detail panel's *More* tab (palette, preset, speed, intensity). The light's
  own effects come from Home Assistant on their own.
- **Groups.** When `main` is a light group, the page finds its members by itself, to say
  how many are on; they need not be listed. The room menu counts those members, and a
  room's power button turns them off, leaving on a tile outside the group. Some groups do
  not list their members (a Zigbee2MQTT group, a template light): `main` then stands for
  the room's own tiles, the room menu counts those that are on (one while `main` alone
  is on), and the power button turns off `main` and those tiles.
- **Other rooms' lights.** A tile can be another room's `main` light, such as the
  kitchen's lights shown in the living room: it counts in its own room only, and only
  that room's power button turns it off.

## Menu

The menu is the launcher for the kiosk's own features: a rail of icons on the Show, a
ring of buttons on the Spot. Each item has a `name`, an `icon` and one of:

| Item | Does |
| --- | --- |
| `link: 'ks://now-playing'`, `ks://music-assistant`, `ks://screensaver`, `ks://camera`, `ks://apps`, `ks://intercom`, `ks://alarms` | A Kiosk Satellite feature ([list](https://kiosksatellite.com/docs/dashboard-links/)) |
| `link: 'app://<package>'` | Another Android app |
| `link: '/lovelace/0'` | A page on Home Assistant (the kiosk's own *Dashboard* menu entry brings you back) |
| `link: 'view:living'` | Another room on this page |
| `link: 'https://...'` | Any other web page |
| `script: 'script.find_my_phone'` | Runs the Home Assistant script, and says so in a toast |
| `items: [...]` | A folder of items, one level deep. On the Spot it opens as a ring of its own, *Back* in the middle; on the Show as a grid of cards, *Back* first |
| `favorites: ['radio', 'playlist']` | (on a folder) Your Music Assistant favourites, before the folder's own items |

- `shape: 'round'` keeps an item to the Echo Spot, `shape: 'wide'` to the Echo Show.
- A `ks://now-playing` item shows only while Kiosk Satellite has something to play.
- The Spot's ring holds ten buttons at most.

### Music Assistant favourites

A folder with `favorites` lists your favourite radios and playlists in Music Assistant
(the heart on a station or a playlist), with their covers and, with both kinds, a switch
between them. They play on the room's `player`: the `media_player` entity Music Assistant
creates for the group of speakers in that room (the kiosk itself is one of them once its
Sendspin player is on). The page finds your Music Assistant instance from that player.

- A room without a `player` gets no favourites.
- A `player` that Music Assistant does not provide makes the folder say *Music Assistant
  did not answer*.
- A cover that does not load, for example an `http://` image on an `https://` dashboard,
  leaves the icon in its place.

## Icons

Icon names are [Material Design Icons](https://pictogrammers.com/library/mdi/) names
without the `mdi:` prefix. The page carries only the icons it uses, in `js/icons.js`. To
add one, run `python3 tools/fetch_icons.py sofa-outline ceiling-fan` (it extends the
file) and bump `js/icons.js?v=` in `index.html`. An unknown name shows a light bulb.

## Address parameters

These override the configuration, mostly to try the page in a desktop browser:

| Parameter | Sets |
| --- | --- |
| `device` | Which kiosk to act as, by its Kiosk Satellite name |
| `room` | The room to start on |
| `shape` | `round` or `wide`, whatever the screen |
| `theme` | A theme's name, over the kiosk's own and `theme.name` |
| `ks` | Lets `ks://` and `app://` links navigate outside Kiosk Satellite |
