# Round 191 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 119 (the dungeon's walks), round 160 and 185 (legacy dungeons and
  their gates on the road), rounds 144 and 176 (the road's glide).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/director.js`, `client/src/scene/levelView.js`, `client/src/components/DungeonView.jsx`,
  `client/src/components/DungeonScreen.jsx`, `client/src/scene/roadDirector.js`; tests in
  `client/src/scene/__tests__/director.test.js` and `client/src/scene/__tests__/roadDirector.test.js`.

## Decisions

1. **The legacy dungeon's camera on rails, on the road.** The dungeon mode's walk (round 119: along the path at eye
   height, 2.8 m/s, through the gate passages) is used again. `DungeonScreen` remembers the site the camera stood at
   before this one in the same dungeon and passes it as `walkFrom`, so the second and third gate encounters are
   walked to from the one before (Ta Prohm: the Face Gate, through the gopura to the Buttress Tree, then to the Root
   Court).
2. **Entering on foot.** A new director state, `enter(site)`: the camera stands on the way in (the avenue, for the
   start site) 16 m before its stand, at eye height, and walks the rest. It replaces the drop from the orbit when the
   player enters a legacy dungeon from the road, and on a reload standing in one.
3. **The road's glide stays low.** Round 144's lift (a rise of 7 % of the glide's length, up to 18 m) is gone: the
   camera keeps eye height over the smoothed ground of round 176, the height of the conversation it left, along the
   same path.
4. **A low swell.** The glide bobs by 0.14 m every 22 m of way, as `(1 − cos)/2`, so it only lifts and never dips
   under eye height; it fades in and out over the first and last 18 % of the glide. The look ahead swells by half as
   much.
5. **Unchanged:** the glide's pace (16 m/s, 3.2 to 12 s), the holds, the dungeon mode's own camera.

## Tests

`npm exec --workspace client -- vitest run` (335; 2 new, 1 changed: a glide no longer rises), client build.

## Status

Built and tested in Node; not seen in a browser or on a phone. Merged to `main` and pushed on the owner's word ("Merge and deploy"); GitHub Pages deploys `main`.
