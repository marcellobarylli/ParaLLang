# Round 200 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 199 (the road's free look), round 125 (the dungeons' tilt).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/tilt.js` (`turnSight`, `FREE_LOOK.ease`, `fadeIn`, `sightMax`; `createTilt` and
  `TILT` removed), `client/src/scene/director.js`, `client/src/scene/roadDirector.js`,
  `client/src/components/DungeonView.jsx`, `client/src/components/SettingsSheet.jsx`,
  `client/scripts/free-look-check.mjs` (`dungeon` mode); `client/scripts/tilt-check.mjs` removed; tests in
  `client/src/scene/__tests__/tilt.test.js`, `client/src/scene/__tests__/director.test.js`.

## Decisions

1. **One look for both levels.** The legacy dungeons take the road's free look (round 199): the phone's back is the
   line of sight, 135 degrees to either side, a quarter turn up or down reaching straight up or down, no drift back,
   eased over 0.05 s. The range, the ease, the fade-in and the turn of the sight (`turnSight`) live in tilt.js and both
   directors use them, so the two cannot drift apart again.
2. **Where in a dungeon:** at a hold at a site, as before (round 125); the orbits, the map and a walk are not turned.
3. **Round 125's small tilt is removed** (`createTilt`, `TILT`, their tests, and `tilt-check.mjs`, whose checks were
   that tilt's gain and range); `free-look-check.mjs dungeon` checks the dungeons now.
4. **Settings** describes one behaviour: "Where the camera stops, on the road and in the dungeons, turning and
   tilting the phone looks round, as through a window".

## Tests

`npm exec --workspace client -- vitest run` (338: 10 tests of the small tilt removed, 2 of the shared turn added),
client build, `node client/scripts/free-look-check.mjs <outDir> dungeon` and `… <outDir> road`.

## Status

Built, tested in Node and in headless Chromium with synthetic orientation events; not tried on a phone. Merged to
`main` and pushed on the owner's word. Not yet live: the Pages deploy runs the tests first, and three tests on `main`
fail from round 198; the session that made round 198 is fixing them, and its push deploys `main` with this round.
