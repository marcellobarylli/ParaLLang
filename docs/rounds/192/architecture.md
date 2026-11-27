# Round 192 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 144 (the endless level), round 160 (biomes), round 162 (tree models).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/wayClearance.js`, `client/src/scene/roadView.js`, `server/src/road/terrain.js`,
  `aesthetic/src/scene/endless.js`; test `client/src/scene/__tests__/wayClearance.test.js`.

## Decisions

1. **Nothing grows on a way.** The track is 1.6 m wide; the margin is half that again on each side, so nothing stands
   within 1.6 m of a way's centreline: a tree's trunk (0.35 m) or a plant's whole spread. Every way of the graph is
   kept clear, drawn or not. The client wraps the terrain it gives the level (`clearOfWays`); the server's terrain
   and graph are unchanged, and a tree's crown may still lean over the track.
2. **Undergrowth** (`terrain.undergrowthIn`, `UNDERGROWTH`): one candidate every 3.2 m, a fern, a flower clump, a
   bush or nothing, by cover (forest: ferns; meadow: flowers) and by biome (the jungle has more ferns, the steppe
   more flowers and bushes, few ferns). Deterministic by seed, for the look alone; the server does not read it.
3. **Shapes, in the level's low-polygon look:** a fern of four or five arching fronds (8 to 10 triangles); a bush, a
   faceted ball (8); a flower clump, a green tuft and three bright four-faced blooms (15), in seven colours: red,
   yellow, white, violet, blue, pink and orange.
4. **Only near the camera.** Plants are built on the camera's chunk and the four beside it (`ENDLESS.undergrowth`),
   and kept until a chunk is beyond `undergrowthKept`, to stay within the 64,000-triangle budget with tree models.

## Tests

`npm exec --workspace client -- vitest run` (336; 1 new), `npm test` in `aesthetic/` (95) and `server/` (614), client
build.

## Status

Built, tested and seen in screenshots in Chromium; not seen on a phone. Pushed to the session branch; not merged.
