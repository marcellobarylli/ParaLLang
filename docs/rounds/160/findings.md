# Round 160 findings

## Question

The issue's own two, to be answered with the change:

1. Is the fractal terrain already seed-deterministic? Is the graph? Does any `Math.random` leak in?
2. Is graph generation cheap, and are dungeons loaded only on entry, never during overworld play?

## Finding

**1. Yes to both; no leak.** `terrain.js` and `graph.js` draw every choice from one hash of two integers and the
seed (`hash2`); the same holds for the new biomes, for the characters and place names, and for which dungeon a gate
stands in. No file of `server/src/road/` contains `Math.random` (a test now reads them for it). The one unseeded
draw is the seed itself, once, when a learner's road is made (`roadSeed`, from `node:crypto`), and it is then kept
in the save. In the web client `Math.random` appears only in the ambient music's choice of chord and in a fallback
for an answer's id.

**2. Yes.** Nothing of the graph is generated ahead: a site or a way is computed when it is asked for and kept in a
bounded memory. A new graph's first two rings of sites and their ways take a few milliseconds (the test allows
400 ms on a busy runner, and 20 ms for the same again). A dungeon costs nothing until entered: its 3D host is its
own chunk (`levelView`, 18 kB, with the levels' builders in the shared `figures` chunk of 646 kB that the title
screen already uses), and on the road no dungeon's level object exists; the headless check reads
`window.__parallangLevel` as undefined on the road, set inside Ta Prohm, and undefined again after walking on.

## Method

Server and client tests; `client/scripts/dungeon-node-check.mjs` on the built client in headless Chromium at
390×844, as a learner walked on the server to the point where the first unit's gate is offered;
`client/scripts/road-shots.mjs` for the whole road at 390×844 and 1440×900.

## Results

| Check | Result |
|---|---|
| Server tests | 561 of 561 (555 before, 6 new) |
| Web client tests | 274 of 274 (272 before, 2 new) |
| The aesthetic package's tests | 87 of 87 |
| `dungeon-node-check.mjs` | 13 checks, 0 problems |
| `road-shots.mjs` | plays to its end at both sizes; the start holds 81 chunks and 35 130 triangles |
| The rename of biome to cover | every suite passed after it, before anything else was changed |

Pictures: [the place's card in the jungle, with Ta Prohm near](shots/01-jungle-and-the-way-in.jpg), [the jungle
itself](shots/01b-jungle-level.jpg), [the map with Ta Prohm's node](shots/02-map-with-ta-prohm.jpg), [the gate's
conversation in Ta Prohm](shots/03-the-gate-in-ta-prohm.jpg), [back on the road](shots/04-back-on-the-road.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **"Biome" was renamed to "cover"** for the old meaning, so that the new word means one thing.
- **Three biomes**: jungle (the start), woodland (the old look) and steppe. A fourth is a new entry in `BIOMES`.
- **The dungeon's node is fixed when the gate falls due, not when the graph is generated**, for the reason in the
  architecture. It is next to the learner's last site of the unit, as asked.
- **The units go round the three dungeons in order.** Thirty-six units, three dungeons: each is entered twelve
  times in a full curriculum.
- **The gate's keeper is the road's generated character**, shown as a beacon in the dungeon. The dungeon's own cast
  (Portia and the others) stay where they are for the world map's free play.
- **The gate is offered at one site** where two could offer it before.
- **The world map is unchanged**: the three dungeons can still be entered from it.

## Evidence

`server/src/road/terrain.js`, `server/src/road/encounters.js`, `server/test/biomes-dungeons.test.js`,
[`shots/`](shots/).

## Claim boundary

Software WebGL in a headless browser: no frame rate was measured, and none on a phone. The jungle is denser than
what the road had (more trees a chunk); if a phone struggles, `BIOMES.jungle.density` is the number to lower.

## Open items

- A look at the jungle on a phone, and a frame rate.
- The steppe and the woodland, seen: a learner reaches them only after a long walk. A test road with its start
  moved would show them.
- Whether the dungeon's own characters should conduct the gates (Portia at the Face Gate, and so on).
- Issue #11 (3D assets) can now name what it needs: the three biomes' trees, the landmark, the gate's keeper.
- Not on `main`.
