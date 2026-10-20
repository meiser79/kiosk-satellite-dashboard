# Setup

You need Home Assistant, and an Echo Show or Echo Spot running
[Kiosk Satellite](https://github.com/jxlarrea/kiosk-satellite). Music Assistant is
optional: without it, the menu just has no favourites.

## 1. Copy the folder

Copy this folder to `/config/www/kiosk/` on your Home Assistant. Only `index.html`,
`css/`, `js/`, `themes/` and your `config.js` are needed there; `docs/` and `tools/`
can stay behind. If `www/` did not exist yet, restart Home Assistant once so it starts
serving `/local/`.

## 2. Write your `config.js`

Copy `config.example.js` to `config.js` in the same folder and make it yours. The
example describes a made-up house with three rooms; everything marked `// <-- entity`
is an entity to replace with one of yours.

- Under `devices`, list your kiosks' names (the name under **Settings > Device** in
  Kiosk Satellite), each with the room it starts on.
- Under `rooms`, describe each room: its sensors, mode chips, main light (a light group),
  light tiles, media card and Music Assistant player.
- Under `menu`, keep the items you want and put in your own scripts.

[Configuration](configuration.md) describes every option. `config.js` is yours: it is not
part of the repository, so updating the other files never overwrites it.

Check the result on your computer first:

```
http://<ha>:8123/local/kiosk/index.html?device=Echo+Spot+Bedroom
http://<ha>:8123/local/kiosk/index.html?device=Echo+Show+8+Living+Room
http://<ha>:8123/local/kiosk/index.html?room=living&shape=round
http://<ha>:8123/local/kiosk/index.html?room=bedroom&theme=light
```

Outside Kiosk Satellite, menu items that point at `ks://` links only show a note; add
`?ks` to the address to make them navigate anyway.

## 3. Make it the kiosk's start page

Kiosk Satellite's settings only offer Home Assistant dashboards in their *Dashboard* picker,
but the underlying start URL accepts any page. Set it through the remote API (turn on
**Remote Administration** in Kiosk Satellite if it is off):

```sh
KIOSK=http://<kiosk-ip>:2324
TOKEN=$(curl -s -X POST $KIOSK/api/login -H 'Content-Type: application/json' \
  -d '{"password": "<remote admin password>"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
curl -X PATCH $KIOSK/api/settings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"browser.start_url": "http://<ha>:8123/local/kiosk/index.html"}'
curl -X POST $KIOSK/api/commands/loadStartUrl -H "Authorization: Bearer $TOKEN"
```

Keep **Log in automatically** on (Settings > Home Assistant Configuration); that is what
signs the page in (see [Security](security.md)). Picking a dashboard again in Kiosk
Satellite, or changing the ESPHome *Default dashboard* select in Home Assistant, writes a
dashboard URL back over this one.

## 4. After editing the files

Home Assistant tells browsers to cache `/local/` files. After editing `config.js` (or any
other file), bump its `?v=` in `index.html` (`1.0.0` to `1.0.1`, say), then use **Reload
page** in the kiosk drawer (or its ESPHome button). If `index.html` itself looks stale,
use **Clear cache** instead.

## Updating

Copy the new `index.html`, `css/`, `js/` and `themes/` over the old ones; your
`config.js` stays, and so does a picture of yours in `themes/xp/`.
The new `index.html` comes with new `?v=` versions, so the kiosks fetch the new files. If
the new version adds options, `config.example.js` shows them.
