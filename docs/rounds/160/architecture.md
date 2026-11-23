# Round 160 architecture

**Conversational round, recorded with the build.** The eighth of the owner's eleven issues, and the first of the
world map's four (see [`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing
here is frozen.

- **Design source:** GitHub issue #8, "Biome system + legacy dungeons as nodes on the journey graph, tied to
  curriculum units" (step 10 of the build order); [round 144](../144/architecture.md) (the landscape, the graph, the
  pacing).
- **Findings:** [`findings.md`](findings.md), which answers the issue's two questions.
- **Artifact:** `server/src/road/terrain.js` (`BIOMES`, `biomeAt`), `graph.js`, `encounters.js` (`legacyDungeonFor`),
  `service.js` (`offersFor`, `standingIn`, `gateAhead`), `server/src/narration.js`,
  `content/narration/passages.yaml`, `aesthetic/src/scene/endless.js` (palm, broad, shrub, `createLandmark`),
  `client/src/roadMap.js`, `client/src/scene/roadView.js`, `client/src/components/Road.jsx`, `DungeonScreen.jsx`,
  `DungeonView.jsx`, `client/scripts/dungeon-node-check.mjs`, `docs/rounds/160/shots/`.

## Goal

A biome system for the fractal world, starting in the jungle, and the legacy dungeons (Ta Prohm and the others) as
places on the road, tied to the curriculum: a unit's final exam is a legacy dungeon.

## Design

### A word changed first: cover

The landscape already called something a biome: whether a point is water, shore, meadow, forest, highland or snow.
That is what covers one point of ground, not a kind of country. It is now the point's **cover** (`coverAt`, a
site's `cover`, the fact `cover` of an arrival), everywhere, so that **biome** can mean what the issue means. No
save holds the word.

### Biomes

A biome is a kind of country, hundreds of metres across. `BIOMES` in `server/src/road/terrain.js` is the system: an
entry a biome, and a new biome is a new entry.

| Field | What it sets |
|---|---|
| `name` | what the player is shown |
| `wet` | the moisture above which ground is forest (0.38 in the jungle, 0.5 woodland, 0.7 steppe) |
| `density` | the chance a tree stands, by cover |
| `trees` | which trees grow: palms and broad-leaved trees, firs and round trees, or shrubs and round trees |
| `tint`, `map` | the grass's colour in the level and on the map |

`biomeAt(x, z)` is a pure function of the seed and the place: a very low noise (2.4 km across) chooses, and around
the origin the answer is always the first biome, the jungle, out to 620 m with a margin of 380 m. A walk of 88 m
hops stays in the jungle for its first tens of conversations. Woodland is the look the road had until now.

Heights are untouched, so the graph of sites and ways is the same graph for every seed; only what grows on it
differs. High ground (above 30 m) is fir country in every biome.

The level's builder (`aesthetic/src/scene/endless.js`) draws the three new trees as simply as the first two: a palm
is a thin leaning trunk with a star of fronds, a broad-leaved tree a tall trunk under a wide flat crown, a shrub one
small faceted ball. It reads the biome's tint from the terrain it is handed, as it reads everything else. The
map's painter does the same with the biome's map colours.

### Legacy dungeons as nodes

**A unit's gate stands in a legacy dungeon.** The curriculum's unit ends at its gate (a checkpoint without hints).
The site of the road at which the pacing offers the gate is now a **dungeon's node**: on the map it is a stepped
gate, not a sign; the way on reads "Enter Ta Prohm"; walking to it enters the dungeon, and the gate's conversation
is played in the dungeon's own level, at its first site.

**Which dungeon follows from the curriculum alone** (`legacyDungeonFor`): the unit's place in the curriculum, taken
round `LEGACY_ORDER` (Ta Prohm, The Kiln, Micromort Mountain). Unit 1's gate is Ta Prohm, in the jungle the road
starts in; unit 2's The Kiln; unit 3's the mountain; unit 4's Ta Prohm again. Nothing is drawn at random, so it is
the same for every learner and every landscape.

**Where the node is.** The issue asks for the node next to the unit's last node but one, computed with the graph.
The graph here is endless and is the same whoever walks it, while the hops a learner needs for a unit are their own
(reviews, lessons again and a failed gate all add hops). So the node is fixed when the gate falls due, by the same
seeded choice that puts every other conversation on the map (`offersFor`): it is the rails' site, one way on from
where the learner stands after the unit's last lesson. That is the adjacency the issue asks for, and it is
deterministic: the same seed, walk and marks give the same node. Before round 160 a second site ahead could offer
the same gate; a dungeon is one place, so the gate is now offered at one site.

**The count.** The road's view carries `gate: { unitTitle, hops, dungeon }`: the fewest conversations before the
unit's gate (its lessons still to do, and the pause the pacing leaves before a gate) and the dungeon it stands in.
The place's card shows it under the biome: "Jungle · Ta Prohm in 3 conversations or more", then "Ta Prohm is near".

**On the server** the road remembers the dungeon the learner stands in (`road.dungeon`, set on arrival, cleared by
the next walk). The gate's conversation names its scene as the dungeon's first site ("The Face Gate, Ta Prohm"), and
the narrator is told so. An arrival there has the fact `dungeon`, and each dungeon has a written passage for it.

**In the client** the road's 3D view is replaced by the dungeon's while `road.here.dungeon` is set: the same
`DungeonView` the world map's places use, at the dungeon's first site, whose figure gives way to a beacon since the
gate's keeper has no model. From the road, the site ahead that is a dungeon's node shows a ruined gate about 9 m
tall (`createLandmark`) in place of a cloaked figure.

**Lazy.** The dungeon's host (`levelView.js`) is a chunk of its own, asked for only when a `DungeonView` mounts. On
the road no dungeon's level exists; entering one builds it, and walking on disposes of it.

## Tests

- `server/test/biomes-dungeons.test.js` (6 tests): the biomes' table; every road starts in the jungle and all three
  biomes are within 12 km; the biome and its trees as pure functions; no `Math.random` in the road's code and the
  cost of reading a new graph; the dungeon of each unit; the first unit from the count through the gate and out.
- `client/src/components/__tests__/narration.test.jsx`: the biome line, the count, the dungeon's heading, "Enter Ta
  Prohm".
- `client/scripts/dungeon-node-check.mjs` in headless Chromium at a phone's size; `client/scripts/road-shots.mjs`
  (round 144's play of the whole road, at a phone's and a desktop's size) passes again.

## Claim boundary

Seen in headless Chromium with software WebGL, not on a phone: the jungle's cost on a real phone is not measured
(the level holds about 35 000 triangles at the start, in 81 chunks). The steppe and the woodland were tested as
numbers and not looked at in a browser: the walk does not reach them soon. The Kiln and Micromort Mountain as gates
were tested on the server, not entered in a browser. No model was called.

## Outcome

See [`findings.md`](findings.md).
