# Round 205 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message and recording; round 204 (the dungeons under the road's sky), whose fault
  this is.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/levelView.js`, `client/src/components/DungeonView.jsx`, `DungeonScreen.jsx`,
  `SettingsSheet.jsx`, `client/src/display.js`, `client/src/stores/gameStore.js`;
  `client/scripts/dungeon-sky-check.mjs`; shots in [`shots/`](shots/).

## Decisions

1. **The fault is fixed by default.** The weather effects no longer reach a level's leaves: the sway they set is
   kept at 0, so the canopy holds still in every weather, as before round 204. Everything else of round 204 stays.
2. **"Glitch"** is a switch in Settings, under Display and controls, off unless switched on (`display.glitch`).
   On, the wind's sway reaches the leaves of Ta Prohm, The Kiln and Micromort Mountain and pulls them into shards,
   more the harder it blows. It applies at once, without rebuilding the level.
3. **Capped at 0.12.** The clip was taken in light wind (a sway of about 0.08); in a storm the uncapped sway (0.33)
   fills the whole view with one leaf. The cap keeps the look of the clip in any weather.
4. **The road is not touched**: its leaves are made for the sway and do not glitch, with the switch on or off.

## Tests

`node client/scripts/dungeon-sky-check.mjs` (25 checks, 6 new); `npx vitest run` in `client/` (350; the display's
shape gains `glitch`); `npm run build -w client`.

## Status

Built; seen in headless Chromium, not on a phone. Merged to `main` and pushed on the owner's word ("then deploy").
