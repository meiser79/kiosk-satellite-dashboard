# Features

What the page does, screen by screen. [Configuration](configuration.md) says how to set each part up.

- **One page for every kiosk.** The room it starts on comes from the Kiosk Satellite
  device name (`devices` in `config.js`); the layout from the screen: a square screen gets
  the round Echo Spot layout, anything else the wide one, with a tighter density on the
  Show 5. A few [address parameters](configuration.md#address-parameters) help on a
  desktop browser.
- **Room view.** A header with the room title, the sensors under it (one without a value,
  such as an unavailable one, is left out, and one can show only while a state holds),
  the house's alerts first among them in the warning colour while they need attention
  (the front door left open; on the Spot they have the row to themselves), the mode chips (toggles, or a pair of scripts
  for things like a projector; when the header has no room for their names, they show
  their icons alone) and a large 24 hour clock. Under it, the dial for
  the room's lights: drag along its arc or across it to dim, tap the name in its middle to
  toggle, long-press for the panel. Beside it the light tiles, two across: each lies across, its
  icon, its name and its state, filled from the left as far as its level; tap toggles, a
  drag across it dims that light alone, long-press opens the panel. After them, the room's
  covers, thermostats and fans as tiles of their own (see *Covers, thermostats and fans*). Both grow
  to fill the screen; with the media card on, the dial shrinks to a small ring beside the
  name. A room with covers, thermostats or fans as well as lights keeps them apart: the
  dial as a small ring, its light tiles under it and above the media card, the others
  beside them, their rows on the same lines.
- **Spot.** The dial is a thick rim along the edge of the round screen. From the top: the
  room title, the sensors and the modes as round icons; a large power button for the
  room's lights beside their name and state, faint arrows either side; under it a strip
  of tiles lying across as on the Show (icon, name, state, filled as far as the level), two
  side by side inside the round screen (the media card at its end); a tap toggles, a drag
  across a tile sets its level as on the Show, a long-press opens the panel; the dots under
  them move the strip two tiles at a time (a swipe on them, or a tap beside them); a large
  tab for the menu. No clock. A swipe across the main light dims nothing: it slides
  the room's lights through, one after another, like a
  carousel (a tap on an arrow does too), and the rim and power button follow the one
  shown (the end of the screensaver brings back the room's main light).
- **Covers, thermostats and fans.** A room's shutters, blinds, awnings and garage door, its
  heating or air conditioning, and its fans are tiles after the lights (at the end of the strip on
  the Spot). A cover's tile is lit while it is open, its icon shows it open or
  closed; a tap opens or closes it, or stops it on its way, and a drag across it sets the
  position. Its panel has Open, Stop and Close, the position, and the tilt of slats that
  turn. A thermostat's tile is orange while it heats and blue while it cools, a drag across
  it sets the target temperature, the room's own after it; a tap turns it on or off. Its
  panel has the target and chips for its modes and presets. A fan's tile is lit while it
  runs; a tap turns it on or off, a drag across it sets its speed in the fan's own steps,
  its preset mode after it. Its panel has Off and On, the speed, and chips for its preset
  modes, oscillation and direction.
- **Single-light room.** Just the dial, in the middle of the screen.
- **Room menu.** Tap the room title to change room. Every room says how many of its lights
  are on (what its main light says under its name: the members of its group that are on;
  its own tiles that are on when Home Assistant does not list the group's members) and
  has a power button that turns those off; a tile that is another room's main light
  counts in that room only. A last card turns off every light on the page. On the Spot
  the rooms are rows across the screen, in a list that scrolls (the menu tab points down
  meanwhile, and closes it); on the Echo Show they are a grid of cards. Turning lights
  off leaves the menu open.
- **Detail panel.** Brightness, then tabs for what the light supports: White (colour
  temperature), Colour (hue, saturation, swatches), Effects (the light's effect list),
  More (any select, number or switch entities you list under `controls`, such as the
  palette, preset, speed and intensity entities WLED creates), Lights (members of a
  group). On the Echo Show it is a card with Off and On buttons. On the Spot there is no
  card: the controls stand in a column that keeps inside the circle, evenly spaced, over
  the menus' dark backdrop: the light's name at the top, then a power button before the
  brightness slider; a long tab scrolls, and the tab at the bottom, or a tap beside the
  controls, closes it.
- **Media card.** Artwork, title, transport, volume and source chips for a media player,
  shown only while `showWhen` matches (the projector is on). Compact on small screens.
- **Events.** What a room's Home Assistant calendars hold today, this week, this month or
  next: how many, after the sensors, and a list that a swipe scrolls through, a line just
  above the main light on the Spot, a wide tile first among the lights on the Show, the
  one on now marked. A tap shows them all with their hours and where, and a button to
  Kiosk Satellite's calendar. An event added to a calendar shows at once.
- **Menu.** On the Echo Show, a rail of icons on the right edge, always there. On the
  Spot, a ring of large buttons in the middle of the screen, opened by a tap or a swipe
  on the tab at the bottom; picking one, or a tap anywhere but on one, closes it. The
  fewer the buttons, the larger they are, their names too (up to ten on a ring). An item
  is a `ks://` link handled by Kiosk Satellite, a Home Assistant page or another room, a
  Home Assistant script to run, or a folder of such items (*Find my phone*, *Music*): on
  the Spot a folder opens as a ring of its own with *Back* in the middle, on the Show as a
  grid of cards with *Back* first. An item can be kept to the Spot or to the Show. *Now
  playing* shows only while Kiosk Satellite has something to play (its versions from
  October 2026 say so; with an older one the item stays).
- **Music Assistant favourites.** A folder can hold your favourite radios, playlists and
  albums from Music Assistant (*Music*), shown with their covers, a switch at the top of
  the screen between them. Picking one plays it on the speakers of the room the kiosk
  belongs to. The list comes from Music Assistant each time the folder opens, so a
  station you star there shows up the next time; the Spot's ring shows the first ten by
  name. A script or a favourite says what it did in a short toast.
- **Calling a kiosk.** A folder (*Intercom*) lists the other Echos on Kiosk Satellite's
  intercom, named after their rooms (or their areas in Home Assistant), and a tap calls
  one straight away, without Kiosk
  Satellite's *Call a kiosk* sheet. One that cannot take a call now (offline, *Do not
  disturb*) shows faded. A new Echo shows up by itself.
- **Themes.** Fourteen to choose from: dark, light, Nord, E-ink, an amber CRT, a handheld
  console's greens, two desktops of the early 2000s, steampunk brass, a starship's
  console, two that move: Matrix's falling code and a synthwave sunset, and Kiosk
  Satellite's own look, dark and light. One for the whole house or one per kiosk, each with its own accent colour, or
  yours. The accent can take the colour of the light the dial
  controls (the main light on the Show, the light in the main slot on the Spot), fading
  from one to the next. A picture can sit behind every room, or each room its own, faded
  into the theme so that the text stays legible; or a gradient the page draws from a
  colour of yours, from the accent, or from the accent's opposite, following the light
  with it.
- **Fast.** Live states come over the Home Assistant WebSocket, subscribed to just the
  entities on the page (plus the members of a light group, once it says who they are).
  Only the widgets whose entity changed are redrawn, in one frame. A level you set stays
  on screen until Home Assistant answers with the new state, and no longer: what you see
  is always what Home Assistant reports. Every animation moves only transform and opacity.
