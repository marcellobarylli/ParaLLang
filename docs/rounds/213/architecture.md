# Round 213 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; [issue #23](https://github.com/marcellobarylli/ParaLLang/issues/23);
  [`docs/proposals/2026-11-23-the-first-pull.md`](../../proposals/2026-11-23-the-first-pull.md);
  [`docs/lore-book.md`](../../lore-book.md), "The pulls".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/pulls.js` (new), `server/src/road/pacing.js`, `service.js`, `graph.js`, `terrain.js`,
  `server/src/app.js`, `learning-storage.js`; `client/src/pullEvent.js`, `land.js`, `components/PullEvent.jsx` (new),
  `client/src/roadMap.js`, `stores/roadSlice.js`, `components/Road.jsx`, `RoadView.jsx`, `SettingsSheet.jsx`,
  `scene/roadView.js`; `aesthetic/src/scene/endless.js`; `client/scripts/pull-check.mjs` (new); shots in
  [`shots/`](shots/).

## Decisions

1. **When.** The conversation that takes the learner from one level to the next (A1 to A2, A2 to B1) pulls the land:
   `finishRoad` compares `levelAt` before and after. Streamlined, that is the last conversation of the gate after the
   level's last unit (a gate owed belongs to the units it closes); in the full pacing, the passed gate of that unit.
   It fires at no other step, and a developer's jump pulls nothing.
2. **What is saved.** `road.pulled`, oldest first: `{ step, depth, sites, from, to }`, the sites of the walk that no
   earlier pull named, written in the same save as the conversation's result. `road.pullsSeen` counts the pulls the
   learner has watched. The road's view sends the watched pulls as `pulled` (the land shown is pulled by these) and
   the next one as `event`; `POST /api/road/event { number }` marks it watched. A reload before that plays it again.
3. **The depth** is two of the tallest trees: `PULL.depth = 2 * TALLEST_TREE` = 26 m (palm and broad-leaved reach
   13 m). Each later pull sinks the earlier sites again, to a limit of 78 m.
4. **The geometry** (`pulls.js`). The pull is a displacement field D added to the land. D is a sum of one compactly
   supported bump per site (Wendland's (1 - r)^4 (4r + 1), reach 2.4 cells of the graph, about 211 m). Neighbouring
   bumps overlap, so the weights are solved for (conjugate gradients on the sparse, positive definite matrix of the
   bumps) so that D is exactly the depth at every site. Between the sites D is roughened by fractal noise, mostly
   towards shallower, through a gate that is shut at each site, so the sites are the low points and the constraint
   holds.
5. **What sinks is space.** Ground, water surface and trees go down by the same D (`heightAt`, `waterAt`,
   `surfaceAt`, `treesIn`). Nothing floods or dries, no site ends under water, and a point's cover and biome are read
   from the height it had. The graph is read from the unpulled land (ids, ways and saved walks stay valid); a site's
   height is its height on the pulled land (`withPulls`).
6. **The event** (`pullEvent.js`, `PullEvent.jsx`), on the whole screen over everything, with no bar and no button:
   dark; the map alone, from further off than the usual map stands (at most 0.062 units a metre against 0.095); the
   web in faint grey, generated while it shows and in the graph's own order, outward from the player: in each cell the
   ten points tried, the one chosen, then its ways growing from the sites already there; the journey in black, one
   walk at a time along its ways; then the land sinking over 7.5 s with the web and the journey sinking with it; then
   one button, Continue.
7. **Before anything shows**, the land before and after is worked out: the pull is solved and `prepareMap` reads,
   for every sample of the picture, its surface, its dip and its colour before and after. `paintMap(prepared, t)`
   then paints any share of the way down in a few milliseconds. Its last frame is the pulled land's own map to the
   pixel (tested).
8. **How it is reached.** While the road owes an event, the way on (Continue, the choices, the map's "Walk here") is
   one Continue that opens it. Afterwards the player is at the site's card on the pulled land, and the way on walks.
9. **Afterwards** the map (`RoadMap`) and the 3D level (`createRoadView`, `buildChunk`, the camera, the tracks, the
   far land of the title) are built from the pulled land. A chunk the pull has bent has its water as a quad a cell.
10. **The developer's jump.** Settings has "Developer": "Developer mode" (a display preference, off by default) shows
    "Jump to", every unit and the gates (streamlined: the gate after every third unit, at its last conversation; full
    pacing: the two gates that end a level), with "Undo the pulls first". `POST /api/road/jump { unitId, gate?,
    unpull? }` (`jumpProgress`): every unit before counts as done; the player stays where they stand.

## Decided without the owner

- **Space sinks, water with it** (decision 5), instead of the proposal's "depth capped above the water". The start of
  every road is 4 to 10 m over the sea, so a cap would leave a few metres there and 26 m further inland. The cost: a
  lake beside a pulled site has a sloping surface.
- **Every site walked to is pulled** (the owner: "along this"), not only those with a finished conversation.
- **Behind Continue, not at once**, so the last line and the result of the gate can be read.
- **Shown once**; the web is seen only during the event; no narrator's passage and no guidebook entry (issue #23
  names both).
- **Reduce motion is not read** (CLAUDE.md's rule). Nothing flashes.

## Tests

`npm test -w server` (630; `test/pulls.test.js` is new), `npm exec --workspace client -- vitest run` (372;
`pullEvent.test.js`, `pull-flow.test.js`, `pull-event.test.jsx` are new), `npm test -w aesthetic` (96),
`npm run build -w client`, then `node client/scripts/pull-check.mjs` (and with `--desktop`).

## Status

Built; seen in headless Chromium at phone and desktop size, not on a phone. Merged to `main` and pushed on the owner's
word; GitHub Pages deploys the page and Render the server.

## Amendment (2026-11-28, round 215)

On the owner's answer, [round 215](../215/architecture.md) changes decisions 2 and 5: a pull takes the sites whose
conversation was finished, not every site walked to; and the sea keeps its level, so ground pulled under it floods
(the water no longer sinks with the ground). "Every site walked to is pulled" and "Space sinks, water with it" under
"Decided without the owner" no longer hold.
