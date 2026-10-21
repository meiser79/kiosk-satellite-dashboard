# Setup

You need Home Assistant, and an Echo Show or Echo Spot running
[Kiosk Satellite](https://github.com/jxlarrea/kiosk-satellite). Music Assistant is
optional: without it, the menu just has no favourites.

## 1. Copy the folder

Download the zip of the latest
[release](https://github.com/sylvertom/kiosk-satellite-dashboard/releases) and unzip it in
`/config/www/` on your Home Assistant: it holds the `kiosk/` folder, with `index.html`,
`css/`, `js/`, `themes/` and `config.example.js`. (From a copy of the repository, those
are the ones to copy to `/config/www/kiosk/`; `docs/` and `tools/` can stay behind.) If
`www/` did not exist yet, restart Home Assistant once so it starts serving `/local/`.

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

Add the page to Kiosk Satellite as a
[custom page](https://kiosksatellite.com/docs/custom-pages/), on the kiosk or in its
remote administration page:

1. Open **Settings > Home Assistant > Custom Pages** and tap **Add page**.
2. Give it a name (*Kiosk*) and the path `/local/kiosk/index.html`, then tap
   **Save & Validate**.
3. Pick it as the **Default dashboard**: it is listed under *Custom Pages* in every
   dashboard picker, and in the kiosk's ESPHome dashboard selects in Home Assistant.

Every kiosk gets the same page: it finds which kiosk it is on by itself.
Keep **Log in automatically** on (Settings > Home Assistant Configuration); that is what
signs the page in (see [Security](security.md)). *Share Home Assistant connection*, at the
top of Custom Pages, can stay off: the page does not use it.

## 4. After editing the files

Home Assistant tells browsers to cache `/local/` files. After editing `config.js` (or any
other file), bump its `?v=` in `index.html` (`1.0.0` to `1.0.1`, say), then use **Reload
page** in the kiosk drawer (or its ESPHome button). If `index.html` itself looks stale,
use **Clear cache** instead.

## Updating

[CHANGELOG.md](../CHANGELOG.md) says what each release changes, and what to add to
`config.js` for something new. Unzip the release's zip over the old folder: it has no
`config.js`, so yours stays, and so does a picture of yours in `themes/xp/`.
The new `index.html` comes with new `?v=` versions, so the kiosks fetch the new files;
Settings > Version on a kiosk says which release it runs.
