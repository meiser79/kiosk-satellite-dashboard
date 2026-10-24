#!/usr/bin/env python3
"""Build js/icons.js from Material Design Icons (Pictogrammers, Apache 2.0).

Usage: python3 tools/fetch_icons.py [extra-icon ...]
Icon names are the mdi names without the "mdi:" prefix. DEFAULT is the set
the page itself uses, OFFERED a choice for config.js's rooms, lights, modes
and menu; add more on the command line (or in config.js, then run this with
those names) and the file is extended, never shrunk.
"""
import json, re, sys, urllib.request, pathlib

BASE = "https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/{}.svg"
DEFAULT = """
thermometer water-percent motion-sensor motion-sensor-off theme-light-dark
weather-night weather-sunny account-outline account-off-outline lightbulb-group
lightbulb-group-outline lightbulb lightbulb-outline lightbulb-off-outline
ceiling-light lamp lamp-outline led-strip-variant floor-lamp sofa-outline
silverware-fork-knife countertop string-lights wall-sconce-flat television
projector projector-off movie-open-outline cctv music play-circle-outline
apps gamepad-variant power close chevron-left chevron-right chevron-up chevron-down
home-outline bed-outline cog-outline home-assistant wifi-off alert-circle-outline
check toggle-switch-outline brightness-6 palette auto-fix tune-variant
white-balance-sunny moon-waning-crescent sleep menu dots-horizontal
view-dashboard-outline play pause skip-previous skip-next volume-high
volume-medium volume-low volume-off apple cast-connected open-in-new
monitor-shimmer lightning-bolt-outline circle-small desk account-voice cellphone-sound
shower toilet eyedropper-variant palette-outline snowflake
book-open-page-variant-outline monitor gamepad-variant-outline image-filter-hdr
water-outline cogs rocket-launch-outline pill weather-sunset information-outline
door-open molecule-co2 calendar-blank-outline satellite-variant
""".split()
OFFERED = """
bed-king-outline bed-queen-outline bed-double-outline bed-single-outline bed-empty
bunk-bed-outline baby-carriage human-child teddy-bear sofa sofa-single-outline
chair-rolling table-furniture bookshelf wardrobe-outline hanger stairs stairs-up
stairs-down home-floor-0 home-floor-1 home-floor-2 home-floor-b garage floor-plan
garage-open garage-variant balcony greenhouse pool hot-tub fence gate
flower-outline tree-outline pine-tree grass bathtub-outline shower-head
washing-machine tumble-dryer dishwasher fridge-outline stove microwave
toaster-oven kettle coffee coffee-maker-outline blender iron-outline
robot-vacuum robot-mower-outline printer-outline router-wireless laptop tablet
desktop-tower-monitor ceiling-light-outline ceiling-light-multiple-outline
floor-lamp-outline desk-lamp lamps-outline wall-sconce-round-outline
light-recessed light-flood-down outdoor-lamp coach-lamp track-light chandelier
globe-light-outline lightbulb-on-outline lightbulb-night-outline lightbulb-spot
led-strip led-variant-outline string-lights-off vanity-light lava-lamp
light-switch spotlight-beam thermostat radiator radiator-off
fan fan-off ceiling-fan ceiling-fan-light air-conditioner air-filter
air-purifier air-humidifier air-humidifier-off heat-wave fire snowflake-thermometer
thermometer-lines home-thermometer-outline water-thermometer-outline gauge leaf
weather-cloudy weather-partly-cloudy weather-rainy weather-pouring weather-snowy
weather-windy weather-lightning weather-fog umbrella-outline weather-sunset-up
weather-sunset-down lock-outline lock-open-variant-outline home-lock
home-lock-open shield-home-outline shield-lock-outline alarm-light-outline
smoke-detector-variant doorbell doorbell-video bell-outline bell-ring-outline
bell-sleep-outline cctv-off key-outline water-alert-outline fire-alert door
dresser dresser-outline wardrobe door-closed door-sliding window-closed window-open
window-closed-variant window-open-variant window-shutter-alert window-shutter-auto
window-shutter-cog window-shutter-settings
window-shutter window-shutter-open blinds blinds-open curtains curtains-closed
roller-shade roller-shade-closed speaker speaker-multiple soundbar
television-classic television-box radio playlist-music music-box-multiple
music-note headphones cast cast-audio podcast microphone-outline remote-tv
movie-outline popcorn filmstrip video-outline solar-power solar-panel
battery battery-charging battery-outline ev-station car-electric car-outline
flash power-plug-outline power-socket-eu power-plug-off-outline
meter-electric-outline home-lightning-bolt-outline transmission-tower
water-pump water-boiler sprinkler sprinkler-variant watering-can-outline
account-group-outline account-multiple-outline human-greeting-variant run walk
dog cat paw food-fork-drink glass-cocktail party-popper calendar-month-outline
calendar-today-outline clock-outline alarm timer-outline heart-outline
star-outline robot-outline script-text-outline home-automation home-variant-outline
home-export-outline home-import-outline trash-can-outline recycle mailbox-outline
package-variant-closed broom arrow-left
""".split()

here = pathlib.Path(__file__).resolve().parent.parent
out = here / "js" / "icons.js"
existing = {}
if out.exists():
    m = re.search(r"=\s*(\{.*\});?\s*$", out.read_text(), re.S)
    if m:
        existing = json.loads(m.group(1))

names = sorted(set(DEFAULT) | set(OFFERED) | set(sys.argv[1:]) | set(existing))
icons = dict(existing)
for name in names:
    if name in icons:
        continue
    try:
        svg = urllib.request.urlopen(BASE.format(name), timeout=20).read().decode()
    except Exception as e:  # noqa: BLE001
        print(f"!! {name}: {e}", file=sys.stderr)
        continue
    d = re.search(r'\sd="([^"]+)"', svg)
    if not d:
        print(f"!! {name}: no path", file=sys.stderr)
        continue
    icons[name] = d.group(1)
    print(f"   {name}")

out.write_text(
    "// Generated by tools/fetch_icons.py from Material Design Icons (Apache 2.0).\n"
    "// Keys are mdi names without the prefix; values are 24x24 SVG path data.\n"
    "window.KIOSK_ICONS = " + json.dumps(icons, indent=0, sort_keys=True) + ";\n"
)
print(f"wrote {out} ({len(icons)} icons)")
