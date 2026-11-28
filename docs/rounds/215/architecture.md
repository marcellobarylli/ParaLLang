# Round 215 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen. It amends [round 213](../213/architecture.md) (the pulls).

- **Design source:** the owner's message; round 213.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/service.js` (`frontierOf`, `nextPull`), `pulls.js` (`withPulls`),
  `learning-storage.js`; `client/src/roadMap.js` (`prepareMap`, `paintMap`), `pullEvent.js`,
  `components/PullEvent.jsx`, `components/Road.jsx`, `scene/roadView.js`; `client/scripts/pull-check.mjs`,
  `scripts/lib/play.mjs`, `scripts/make-icons.mjs`; shots in [`shots/`](shots/). Round 213's changes to
  `aesthetic/src/scene/endless.js`, `client/src/scene/roadDirector.js` and `farLand.js` are taken out again.

## Decisions

1. **Only a finished conversation opens ways on.** The player's own country is `road.cleared`: the sites whose
   conversation they finished. The frontier is the sites next to those that are not among them (`frontierOf`); it was
   the sites next to the trail. A site walked to and left unfinished is not the player's: it opens nothing, and it is
   still a site of the frontier, with someone waiting, to come back to. From it the player may walk to any other site
   of the frontier (the map; `leave` as before).
2. **At the very start nothing is ahead** until the first conversation is finished. The site the player stands at
   counts as theirs when nobody waits there (a new landscape whose next conversation is a gate's, a developer's jump),
   so no road is ever without a way on.
3. **A pull takes the finished sites** (`nextPull` reads `cleared`, in the order they were finished), not the walk.
   `cleared` is kept whole in the save (the last 20,000; it was the last 300).
4. **The ground sinks and the sea does not** (`withPulls`). The water's surface stays at its level, so ground pulled
   under it is water: its cover is `water`, the shore is where the new waterline is, the trees and plants that stood
   on it are gone. The graph is still read from the unpulled land; a site whose ground is drowned is still a site and
   stands on the water (`y` is the surface, `ground` the ground, `drowned` says which).
5. **The event shows the flooding.** `prepareMap` reads the land before and after (`sunk`); `paintMap(prepared, t)`
   decides for every sample of every frame whether its ground is under the sea yet and paints water there, deeper as
   it goes. The web and the journey ride the ground down and stay on the water where it closes (`surfaceAt`). The
   first and last frames are still the two lands' own maps to the pixel.
6. **A walk between two sites that no way joins** (the player turned round) is drawn in the event along the shortest
   walk over the ways, as the camera made it.
7. **Unchanged, on the owner's word:** the web shows only during the event; the event has no narrator's passage and
   no guidebook entry.

## Coordination with the other session

Round 214 (a breath while a reply is awaited) was built by another session while round 213 was being deployed. Its
work was on `main` (`7eadba7`) and deployed, and its turn had ended, when this round began. It could not be messaged:
that session runs on the owner's computer, and its relaying session also asked for proof of a trusted device. So:

- `main` was merged into this branch before the work, and fetched and merged again before the merge to `main`, with
  every suite run on the result.
- No file of round 214 is changed except one line of the shared check library: `client/scripts/lib/play.mjs` now
  switches the breathing off unless a check asks for it, as it does the music and the voices. With it on, its
  first-time card covers the conversation and every scripted check that sends an answer stops there.

## Decided without the owner

- **Which reading of "drowning the sites makes sense"** (see the interview). 
- **Walking back to a finished site** as a destination is not added: the frontier is reachable from wherever the
  player stands, and the camera walks there over the ways.
- **Sites near a pulled one** sink with the land round it (less than a pull) and may be drowned too; a character
  waiting at such a site stands on the water.

## Tests

`npm test -w server` (631), `npm exec --workspace client -- vitest run` (380), `npm test -w aesthetic` (96),
`npm test --prefix mobile` (320), `npm run build -w client`, then `node client/scripts/pull-check.mjs`.

## Status

Built; seen in headless Chromium at phone size, not on a phone. Merged to `main` and pushed on the owner's word;
GitHub Pages deploys the page and Render the server.
