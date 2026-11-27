# Round 199 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 125 (tilt to look in the dungeons), round 194 (on the road).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/tilt.js` (`createFreeLook`, `FREE_LOOK`, `backDirection`),
  `client/src/scene/roadDirector.js`, `client/src/components/RoadView.jsx`, `client/src/components/SettingsSheet.jsx`,
  `client/scripts/free-look-check.mjs` (new); tests in `client/src/scene/__tests__/tilt.test.js`,
  `client/src/scene/__tests__/roadDirector.test.js`.

## Decisions

1. **The road has a free look, as through a window.** The direction out of the phone's back, in the Earth's frame, is
   the line of sight, turned from where it pointed on arriving at a site: the heading's change is the yaw (turning
   left looks left), the elevation's change the pitch (the phone's top towards the player looks up). Read from the
   direction, large turns compose properly however the phone is held, upright or in landscape.
2. **Range:** 135 degrees to either side (270 in all). Past it the look stays at the edge and "ahead" is dragged
   along, so turning on past the back never jumps the view across, and turning back answers at once. Up and down: a
   phone turned a quarter turn up or down from where it pointed shows straight up or down, whatever the camera's own
   angle was (the rest of the way is spread over the quarter turn); the line of sight stops at 1.55 rad (89 degrees),
   just short of the vertical, so the view never flips.
3. **No drift back while held** (the dungeons' tilt recentres over 30 s); a new site is "ahead" again on arrival.
   Eased over 0.05 s (0.12 before), so the window follows the hand.
4. **Where:** at a site with someone (the hold, as round 194) and now also at a site where nobody waits (the
   wander). Not on a glide, the title or the descent.
5. **The dungeons are unchanged:** their gentle tilt (12 and 8 degrees) stays.

## Tests

`npm exec --workspace client -- vitest run` (347; 6 new), client build, `node client/scripts/free-look-check.mjs <outDir>`.

## Status

Built, tested in Node and in headless Chromium with synthetic orientation events; not tried on a phone. Opened as
round 197 and renumbered: another session's rounds 197 and 198 reached `main` first. Merged to `main` and pushed on
the owner's word; GitHub Pages deploys `main`.
