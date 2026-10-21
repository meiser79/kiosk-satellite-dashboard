# Changelog

What changes from one release to the next, for the person at the kiosk and the one
writing `config.js`. Each release on
[GitHub](https://github.com/sylvertom/kiosk-satellite-dashboard/releases) comes with a
zip of the files to copy to Home Assistant ([Updating](docs/setup.md#updating)).

## Unreleased

### Added

- **Settings** in the kiosk's menu: pick the theme and turn Follow the light on or off on
  the kiosk itself, which keeps the choice. To have it, add
  `{ name: 'Settings', icon: 'cog-outline', settings: true }` to `menu` in your
  `config.js` ([Configuration](docs/configuration.md#settings)).
- Settings says which version of the dashboard the kiosk runs.
- Each release comes with a zip of the files to copy to Home Assistant.

### Changed

- Echo Show: the menu on the right sits in the height under the clock, which a long menu
  reached on the Show 5.

## 1.0.0 - 2026-10-20

The first public release.
