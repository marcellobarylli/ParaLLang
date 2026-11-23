# Round 175 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); round 144 (the road), round 147 (the clouds and the map),
  round 161 (the journey on the map), round 172 (Settings in categories).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/DungeonScreen.jsx`, `client/src/components/Road.jsx`,
  `client/src/components/RoadView.jsx`, `client/src/scene/roadView.js`, `client/src/scene/roadDirector.js`,
  `client/src/scene/farLand.js`, `client/src/stores/roadSlice.js`, `client/src/stores/gameStore.js`,
  `client/src/roadMap.js`, `client/src/index.css`, `aesthetic/src/scene/endless.js`, `aesthetic/src/scene/sky.js`,
  `server/src/road/service.js`, `server/src/app.js`; `client/scripts/title-check.mjs` and its pictures in
  [`shots/`](shots/).

## Decisions

1. **The title screen is the road's.** The page opens on the landscape of the player's road seen from above the
   clouds, turning once round the site in six minutes, with the name and one button: "The Journey 2: Journathan
   Returns (again)". Ta Prohm and The Kiln are no longer offered there; they are under the menu's "Other places"
   (the old world map), and reachable on the road as before (round 160).
2. **"Twice as far" is taken as the map's width, twice.** The road's map shows at least about 1 km across. The title's
   camera stands where its frame holds about 2.1 km across its narrower side, between 1.4 and 2.6 km from the site
   on a line 55° under the level (`ROAD_CAMERA.title`, `titleDistance`). On a phone held upright that is the far
   limit, and the frame is about 1.4 km wide.
3. **Something shows at once, and the world loads behind it.** Before the 3D view has started, a CSS sky with drifting
   clouds stands in (about 150 to 300 ms to the title in the headless check). The landscape is known without the
   server: the browser keeps the last road's seed and site (`parallang.title`), and for a new player draws a seed
   itself and proposes it with the first look at the road (`GET /api/road?seed=`, taken only when the road is made;
   `proposedSeed` checks it is one the server would draw). While the title is up the road is read (`preloadRoad`), and
   the ground round the site is built.
4. **The view from above.** The built ground covers about 430 m, so the rest of the frame is a coarse sheet of the
   same terrain (`farLand.js`: 6.4 km square, 32 m cells, built eight tiles a frame-pair nearest first, painted with
   the map's colours through `groundColour`, 2.5 m under the true ground, thrown away once the camera is down). The
   built ground is hidden while the camera is high, where it showed as a tile of another texture. The fog and the
   clip planes stand back with the camera's distance; in play the sky's own fog is the farther, so nothing changes
   there.
5. **Clouds below the camera.** A second cloud layer, 330 m over the water (higher than any camera of the road goes),
   of the same shapes 2.6 times larger, flattened, painted for a view from above in the sky's cloud colours, drifting
   with the wind 2.2 times faster, and as many as the cover asks for (`EFFECTS.high`). It shows only with the camera
   over it and shrinks to nothing as the camera sinks through it. Above it the rain does not fall on the camera; the
   sky's dome and the stars rise with a high camera. The light, the clouds' colours, the cover and the lightning are
   the weather of the moment, as on the road.
6. **The zoom down.** The title's button enters the road; the next arrival from the sky is, from the title, a descent
   from where the camera is: the distance shrinks by the same share each moment, the camera levels out and turns
   0.7 rad round the site, never under the ground, in 6.5 s (`descend` in `roadDirector.js`). While it comes down the
   dock shows "Coming down to …"; the site's card comes when the camera is there (on a phone the card covered the
   whole descent). A server still waking keeps the title turning until the road is here.
7. **One top bar.** Everywhere: the title (and on the road the curriculum's chip), Map, and Menu, whose badge counts
   the reviews due and the guidebook's new entries. The Spellbook, the party, the guidebook's "?" and the gear moved
   into the menu, as did the hub's Map, Curriculum and World map buttons, the resolved conversation's Map and
   Curriculum, and the dungeon cards' Map buttons.
8. **The menu** lists the map, the curriculum (on the road), the Spellbook, the party (in a place of the world map),
   the guidebook, Settings, "Leave the conversation" when one is under way, "Other places" (on the title and the
   road), and "Back to the title". A tap beside it closes it.
9. **The map in a conversation.** On the road the map opens over the conversation, with "Back to <name>". A site
   picked on it reads "Leave the conversation and walk here": the walk is made with `leave`, and the conversation is
   left unfinished, as Leave leaves it. In a place of the world map the map is the place's own screen, so Map leaves
   the conversation for it (the conversation waits and Talk takes it up again).
10. **A reload opens on the title.** A dungeon's run is resumed where it was the first time its place (the one last
    entered) is entered from the world map, as a reload itself used to resume it; tests that played a reload take
    that step.

## Tests

`npm test -w server` (579), `npx vitest run` in `client/` (300), `npm test -w aesthetic` (95), `npx vite build`, and
`node client/scripts/title-check.mjs docs/rounds/175/shots [desktop]` after the build.

## Status

Built, tested and seen in headless Chromium at 390 × 844 and 1440 × 900. Not seen on a real phone. Deployed with
round 176 on the owner's word.
