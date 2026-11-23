# Round 176 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 144 (the road's camera), round 175 (the title).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/graph.js` (`route`), `client/src/scene/roadPath.js`, `client/src/scene/roadDirector.js`,
  `client/src/scene/roadView.js`; `client/scripts/travel-check.mjs` and its pictures in [`shots/`](shots/).

## Decisions

1. **The shortest walk.** The camera goes from one site to the next by the shortest walk along the graph's ways, by
   their length in metres (A*, with the straight distance as the estimate; up to 4,000 sites looked at). Before, it
   took the one way between the two sites when they were joined and flew straight over the country when they were not
   (a site of the frontier hangs from an earlier site of the trail, not always from the one the player stands at).
   Straight over the country is now only the fallback when no walk is found.
2. **Smooth, near the ways, not on them.** The ways' points, end to end, are resampled every 3 m and smoothed twice by
   a Gaussian 16 m wide, narrowed towards the ends so the line leaves and reaches the sites where they are. Corners
   between ways and the small bends of each are rounded; the line stays within about 8 m of the ways.
3. **Smooth in height too.** The glide's height follows the highest ground within the smoothing's reach, smoothed
   over about one second of the glide at its top speed and read on a Catmull-Rom curve; it is never under the ground
   and settles onto the ground over the last fifth, where the hold takes over. A long walk may take up to 12 s (9 s
   before).
4. **Numbering.** Rounds 173 and 174 were made on `main` by another session at the same time (streamlined mode;
   every conversation complete on the third reply). The title round of this session is 175 and this one 176; `main`
   was merged into the session branch, with the title's seed kept on `enterRoad`'s first look alongside 173's
   streamlined setting.

## Tests

`npm test -w server` (586), `npx vitest run` in `client/` (305), `npm test -w aesthetic` (95), `npx vite build`;
`node client/scripts/travel-check.mjs`, `title-check.mjs` and `caption-check.mjs` after the build.

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed with rounds 175 on the owner's word.
