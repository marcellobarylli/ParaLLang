# Round 194 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 125 (tilt to look in the dungeons).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/roadDirector.js`, `client/src/scene/roadView.js`, `client/src/components/RoadView.jsx`,
  `client/src/components/DungeonScreen.jsx`; test in `client/src/scene/__tests__/roadDirector.test.js`.

## Decisions

1. **The road's director takes a look** (`look({ yaw, pitch })`), bounded and eased as the dungeon's director does
   (0.25 rad to either side, 0.18 rad up or down, 0.12 s ease). At a hold, the camera's line of sight is turned by it;
   the position stays. It fades in over the first half second of a hold, so an arrival joins without a jump, and a
   glide, the title and the descent are not turned.
2. **The road's view listens** to the phone's orientation when "Tilt to look" is on (the same setting and the same
   tilt.js source as the dungeons), and takes the way the phone is held on each arrival as straight ahead.
3. **Unchanged:** the walk round a site where nobody waits (the wander) is not turned.

## Tests

`npm exec --workspace client -- vitest run` (337; 1 new), client build.

## Status

Built, tested in Node and in Chromium with a fake tilt; not tried on a phone. Merged to `main` and pushed on the
owner's word; GitHub Pages deploys `main`.
