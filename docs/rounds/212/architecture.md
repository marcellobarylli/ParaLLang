# Round 212 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 211's report.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/motion.js` (new), `client/src/components/RoadView.jsx`,
  `client/src/components/DungeonView.jsx`, `client/src/index.css`; `client/scripts/sink-check.mjs` (`--reduced`);
  `CLAUDE.md` ("Reduce motion").

## Decisions

1. **The game ignores Reduce motion.** `prefersReducedMotion()` in `client/src/motion.js` answers false; the road's
   and the dungeon's views take it from there. The three `prefers-reduced-motion` CSS rules are removed.
2. **A standing rule for later rounds**, in `CLAUDE.md`: do not gate animation on the setting; honour it only for
   something that could truly harm, such as rapid flashing, and tell the owner.
3. **Left as they are:** the 3D views' `reducedMotion` option (now always false), and the Expo app's fades.

## Tests

`node client/scripts/sink-check.mjs <out> --reduced`; `npm exec --workspace client -- vitest run` (351);
`npm run build -w client`.

## Status

Built; seen in headless Chromium with the setting on, not on a phone. Merged to `main` and pushed on the owner's
word; GitHub Pages deploys the page.
