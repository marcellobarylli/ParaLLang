# Round 134 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-19 by the owner's request, in a Claude Code cloud
session, not through the round pipeline. There was no pre-run commit: the request was one sentence and the design
below was settled while building, so every section is written after the fact and nothing here is frozen. The owner's
words are in [`trail/interview.md`](trail/interview.md).

- **Design source:** the owner's request; round 119's [architecture](../119/architecture.md) (the dungeon as a map under
  a world map), round 122's (characters as figures), round 113 (Bambieshart's signpost sends the player to the
  mountain), `content/world/atlas.yaml` (Micromort Mountain was a closed place).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/world/dungeons/micromort_mountain.yaml`, `content/world/atlas.yaml`,
  `content/world/locations/micromort_trail.yaml`, `content/characters/enemies/hiker_eduardo.yaml`,
  `content/languages/{it,es}/encounters/micromort_eduardo.yaml`, `content/languages/{it,es}/vocabulary/eduardo_ankle.yaml`,
  `aesthetic/src/scene/micromort.js`, `aesthetic/src/scene/figures.js`, `client/src/` (dungeons, store, world card,
  director, level view), the tests and `docs/rounds/134/shots/`.

## Goal

A minimal Micromort Mountain: a place on the world map that opens a level of its own. The run starts halfway up the
mountain on a ledge, with one encounter, Eduardo, a hiker who has sprained his ankle. The summit is a snowfield with
a wine festival.

## Design

### Content

- **The dungeon** `micromort_mountain`: level `micromort`, one site `ankle_ledge` (Eduardo, figure `hiker`), no paths,
  `start` and `goal` the same site. Resolving Eduardo completes the run, so the victory card follows.
- **Eduardo** (`hiker_eduardo_001`): a sunburnt hiker who insists the ankle is fine and counts the risk in
  micromorts. His encounter `micromort_eduardo` has three objectives: offer help (*aiuto* / *ayuda*), ask how far it
  is to the top (*cima*), ask whether there is a festival up there (*festa* / *fiesta*). The words were chosen so
  that none occurs in the lore texts or in the Spanish fragment where *vino* means "came" (see the interview).
- **A location.** An encounter must have a location (`loadWorld` checks that each is held by its location), so
  `micromort_trail` joins the Crumbling Market's world, connected to The High Gate, whose signpost points to the
  mountain. As round 113 did for The High Gate, the tests that list the market's contents were told to leave it out:
  the Rift's gate, the tour order, Errata's review set.
- **The world map.** `atlas.yaml` gives Micromort Mountain its `dungeon`, so the place opens.

### The level (`aesthetic/src/scene/micromort.js`)

- **Ground.** `micromortHeightAt(x, z)`: a ridge that climbs from the valley at +z to a flat summit plateau at -z
  (110 m), steepest in the middle, falling away on both sides and, behind the plateau, to a back slope. The trail
  winds up the middle. Eduardo's ledge, at (3, 22), is flat and halfway up (56 m), blended into the slope over 62 m.
  Grass below 36 m, rock to 66 m, snow above, chosen per quad by altitude and a noise, with two new textures (`snow`,
  `rock`) and a preset `alpine` with a far fog, so the summit shows from halfway up.
- **Props.** Firs to the treeline, snow-laden pines round the plateau, boulders, cairns along the trail, a signpost,
  Eduardo's rucksack and his broken pole, snow drifts.
- **The festival** on the plateau: a bonfire in a ring of stones, five striped marquees, five long tables with
  bottles and glasses, barrels, a stone cellar with a chimney, ten posts joined by bunting (the strings glow, as
  every string in the dead branch does), a banner arch over the way in, and a crowd of 24, some with a glass raised.
- **Eduardo's figure** `hiker`: seated on a rock, a boot off, the ankle swollen, a bobble hat. 140 triangles, inside the
  figures' limits (`aesthetic/test/figures.test.js`).
- The level is 23.7 k triangles of the style's 64 k.

### The client

- `dungeon.js` bundles both dungeon files as `DUNGEONS`. `createGameStore` takes `dungeons`; `enterPlace` on the world
  map starts the place's dungeon: if it is not the one in play, the store takes it over (run, conversation and
  camera's site start again) and reads that dungeon's run. A reply still in flight from the other dungeon is dropped.
- The world card has one "Enter …" button for each open place and shows "n of m cleared" only for the dungeon in play.
- `DungeonView` gives its canvas a `key` of the dungeon's id. Without it, the second level's renderer was made on a
  canvas whose context the first had lost, and failed ("Cannot read properties of null (reading 'precision')").
- The director: the overview frames at least 28 m on each side and looks at the ground's height at its middle (it
  looked at height 0, which on a mountain is under the slope); the orbit's centre height can be set by the level
  (`centreY`, 50 for the mountain).
- The camera comes to the ledge from the west, along the shelf (the `entrance`): the valley falls away behind Eduardo
  and the summit stands to the left. From below, the first version looked into a rock face.
- The victory card says "Eduardo lets you pass." and "Stay on the mountain" for a one-site dungeon.

### The iPhone app

The new location has a wind loop for the app's ambience (`mobile/scripts/gen-ambient.js`, committed as
`micromort_trail.wav`), because the app's test requires one per market location. The app's play is otherwise unchanged;
it will show the new place on the market map, joined to The High Gate.

## Claim boundary

Checked with scripted replies (the server's passing provider) and in headless Chromium with software WebGL. Nobody has
played Eduardo against the live model, nothing was tried on a phone, and the Italian and Spanish text is Claude's, not
reviewed by the owner (the reference URLs were not opened). The summit and the festival are scenery: there is no
conversation there, and the camera reaches the summit only in the orbit of the title, the world map and the victory
view. The pictures were taken from the dev client without a server, so two show a "server returned an unreadable
response" card; the 3D level is unaffected.

## Deferred

- Walking on to the festival: a second site there, with its own encounter, and a path up the mountain.
- A micromort counter as a mechanic (the trail's risk per step is only in the text).
- The player's position in the world: a reload always resumes in Ta Prohm.
- Per-dungeon progress on the world card ("n of m" shows for the dungeon in play only).

## Tests

- **Server** (`server/test/micromort.test.js`): the dungeon loads in both packs; Eduardo's objectives and accepted
  examples; a run starts at the ledge, resolving completes it and Ta Prohm's run is untouched. The tests that list the
  market's contents were updated (eight locations, the Rift's gate and tour, voices, vocabulary versions).
- **Client** (`client/src/__tests__/micromort.test.js`): the bundled mountain, the ledge halfway up and flat, the
  summit plateau, the camera above the ground on the way in, and the store taking the mountain over and back.
- **Aesthetic:** the level and the `hiker` figure inside the budget and limits; the generic world tests run it.
- **Mobile:** the ambience loop's generator output is the committed file.

## Outcome (2026-11-19)

Built as described. The world map opens Micromort Mountain; its level shows the valley, a ridge trail with cairns,
Eduardo on his ledge and a snowy summit with the festival ([pictures](shots/)); Eduardo's encounter plays through the
server in Italian and Spanish; resolving him completes the run. Server 467, client 213, aesthetic 54 and mobile 320
tests pass and the client builds. See [`findings.md`](findings.md).
