# Round 218 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message and two answers ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `content/world/dungeons/angkor_wat.yaml` (new); `server/src/road/encounters.js` (`LEVEL_GATE`,
  `endsLevel`); `client/src/dungeon.js` (`ANGKOR_WAT`, `GATE_DUNGEONS`), `stores/gameStore.js` (`gates`, `persist`,
  the slot's share, `NEW_GAME_KEY`), `stores/roadSlice.js`, `slots.js`, `scene/levelView.js` (`angkorHeightAt`),
  `components/DungeonView.jsx` (`preloadLevel`, retries, `stale`), `components/DungeonScreen.jsx`, `index.css`;
  `client/scripts/gate-check.mjs` (new), `pull-check.mjs` (`--breathe`). Shots in [`shots/`](shots/).

## Decisions

1. **The title's radios.** The global `input` rule (flex 1, 44 px tall, padded) stretched the native radio, larger
   when chosen. The radio is now a small square in the game's style (a gold square when chosen), and the answers read
   from the left.
2. **The gate that ends a level stands in Angkor Wat.** `legacyGateFor` (streamlined) and `legacyDungeonFor` (full
   pacing) send the gate closing the last unit of a level (unit 12: A1 to A2; unit 24: A2 to B1) to `angkor_wat`; the
   other gates keep their place in round 160's turn (Angkor Wat is in no turn, so none moves). Without the file the
   turn is as before.
3. **Angkor Wat's sites**, on the `angkor` level (`temple.js`): The Naga Causeway (start), The Reflecting Pool, The
   Terrace of Honour (the goal), The North Library. The gate's three conversations are at the first three. Every path
   and the entrance keep to dry ground, go through the west gopura's central passage only, and stay off the tiers and
   the libraries (tested). `angkorHeightAt` gives the causeways and the terrace their heights, so the camera walks on
   them. Angkor Wat is not opened on the world map (its causeway is still "under review"): `GATE_DUNGEONS` gives it to
   the road's gates alone, so no run of it is read or made.
4. **The level that did not start.** The faint green the owner saw is `.level-backdrop`, shown when the level's code
   cannot be loaded or its WebGL start throws. The likeliest cause on a phone: a page left open over a deploy (four
   were made that day) asks for the level's chunk by the old build's name, which the site no longer has. Now:
   - the chunk is fetched 5 s after the road is up (`preloadLevel`), so a gate entered later needs nothing new;
   - a failed import is tried once more; a start that throws is tried three times (0, 0.4, 1.5 s);
   - a level whose code cannot be had says "The game was updated while this page was open…" with **Reload**.
5. **Nothing is heard over the world event.** When it opens, the speaker is stopped (the queue, the narrator's clip,
   a clip still coming are all dropped, not resumed) and the microphone is closed. Nothing new is said under it or
   after it from before.
6. **The review's fixes** (rounds 214 to 217):
   - Once a level is said, the share of the language is the slot's own (`parallang.share`): Settings' slider and
     "Follow my level" move it, a reload keeps it, and the display all slots share keeps its own, so another slot's
     game does not move.
   - A game made on the title stays new (`parallang.newGame`) until the journey sets out, so a reload before that still
     asks the level (and lets the language be chosen).
   - Choosing the language on the title keeps the level said.
   - Switching the breathing off in Settings ends a breathing under way (over the walk and over a reply).
   - `hasNarration`'s unused import is gone.

## Tests

`npm test -w server` (632), `vitest run` in `client/` (391), `npm test -w aesthetic` (96), `npm test --prefix mobile`
(320), `npm run build -w client`, then `node client/scripts/gate-check.mjs` and `node client/scripts/pull-check.mjs`.

## Status

Built and played in headless Chromium at phone size, not on a phone. Merged to `main` and pushed on the owner's word;
GitHub Pages deploys the page and Render the server.

## Amendment (2026-11-28, the owner)

Angkor Wat is the place of **every** change of level: A1 to A2, A2 to B1, and any level added to the curriculum later
(decision 2's rule is by the level of the next unit, so a new level's gate goes there with no change).

## Amendment (2026-11-28): the title loads a newer build

After the deploy the owner's phone still showed the old title: the home-screen app keeps running the build it was
opened with (the cause of the green gate too). While the title is up (not once the journey is setting out), the page
reads the site's `version.json` when it opens and whenever it comes back to the screen; if the build there is newer,
it reloads past the cache (`viewport.js` `updateIfNewer`), once per build, so a cache still serving the old files
cannot make it loop. A conversation is never interrupted.
