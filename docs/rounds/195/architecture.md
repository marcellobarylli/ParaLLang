# Round 195 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message and answer; round 162 (the pulled tree models).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/roadView.js`, `client/src/components/RoadView.jsx`,
  `client/src/components/DungeonScreen.jsx`, `client/src/components/SettingsSheet.jsx`, `client/src/display.js`,
  `client/src/stores/gameStore.js`, `client/scripts/models-check.mjs`; tests in `client/src/__tests__/display.test.js`,
  `client/src/stores/__tests__/dungeon-flow.test.js`, `client/src/components/__tests__/settings-sheet.test.jsx`.

## Decisions

1. **No "Tree models" setting.** The checkbox in Settings, the `treeModels` display preference, the store's
   `setTreeModels` and the `models` props of RoadView and `createRoadView` are gone. A stored `treeModels` from an
   older browser is dropped on the next save.
2. **The road's view loads the model file when it is made**, once, and hands it to the level; `setModels` is no
   longer part of the view's API. Before, the same request was made just after, from RoadView's effect, with the
   setting on by default: the drawn scene is the same.
3. **The simple trees stay** (owner's choice, [`trail/interview.md`](trail/interview.md)): they are the trees of the
   chunks beyond the nearest five and the stand-in until the file has loaded, because models on every chunk would be
   6.5 times the triangle budget. The aesthetic package is unchanged.

## Tests

`npm exec --workspace client -- vitest run` (337; the "Tree models" test replaced by one that Settings has no such
switch and an old stored choice is dropped), `npm test -w aesthetic` (95), client build,
`node client/scripts/models-check.mjs <outDir>` (brought up to the round-175 title flow and pinned to seed 4242).

## Status

Built and tested in Node and in headless Chromium; not tried on a phone. Merged to `main` and pushed on the
owner's word ("Then deploy"); GitHub Pages deploys `main`.
