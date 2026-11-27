# Round 204 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; rounds 146 (the road's time of day and weather), 147 (clouds) and 160
  (the legacy dungeons as nodes of the road).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/levelView.js`, `client/src/components/DungeonView.jsx`,
  `client/src/components/DungeonScreen.jsx`; `client/scripts/dungeon-sky-check.mjs` (new); shots in
  [`shots/`](shots/).

## Decisions

1. **A dungeon's level has the road's sky.** Given the road's seed, `createLevelView` reads the same clock
   (`weatherClock.js`: the seed and the time give the weather, on the server too) four times a second and applies
   the road's atmosphere (`atmosphereFor`) to its own world: the sun's or the moon's light, the sky's colours, the
   fog's colour. The road's weather effects (`createWeatherEffects`) run in it: rain, snow high up (Micromort
   Mountain), stars, fireflies, clouds, lightning and the sway of the leaves.
2. **What stays the level's own:** its glow (The Kiln's ember), its corruption, and its fog's reach, which mist
   shortens in the proportion it shortens the road's.
3. **The low clouds are hidden from above.** When the camera is 45 m or more over what it looks at (the map of the
   dungeon, the title orbit), the cloud layer is not drawn, so it never covers the map.
4. **The seed** is the road's (`road.seed`, else the title's), whether the dungeon is entered from the road or from
   "Other places", so both show the same hour and weather.
5. **The rain and the thunder are heard in the dungeons**: the rain's sound follows the same weather in every mode
   (it was asked for on the road only), and a lightning flash in a level calls the thunder.
6. **Without a seed** (the tests, a caller that gives none) a level keeps its fixed preset, as before.

## Tests

`node client/scripts/dungeon-sky-check.mjs` (Vite's dev server and headless Chromium: Ta Prohm, The Kiln and
Micromort Mountain, each with five weathers held still); `npm exec --workspace client -- vitest run` (342);
`npm test -w aesthetic` (95); `npm run build -w client`.

## Status

Built; seen in headless Chromium, not on a phone. Merged to `main` with round 202 and pushed on the owner's word
("Then deploy"); GitHub Pages deploys the page and Render the server from `main`.
