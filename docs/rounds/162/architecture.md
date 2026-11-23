# Round 162 architecture

**Conversational round, recorded with the build.** The tenth of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #11, "Pull 3D assets" (step 11 of the build order); [round 160](../160/findings.md),
  which named what is needed first: the three biomes' trees.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/public/models/nature.glb`, `client/public/models/ASSETS.md`,
  `client/scripts/make-models.mjs`, `aesthetic/src/scene/models.js`, `aesthetic/src/scene/endless.js`
  (`setModels`, the chunks' levels), `client/src/scene/roadView.js`, `client/src/components/RoadView.jsx`,
  `SettingsSheet.jsx`, `client/src/display.js`, `aesthetic/test/models.test.js`, `client/scripts/models-check.mjs`,
  `docs/rounds/162/shots/`.

## Goal

Pull in 3D assets from permissively licensed sources, record each asset's source and licence in the repository, and
keep them small enough for the GitHub Pages deploy: compressed, and loaded lazily.

## Design

### Scope: the trees first

The issue leaves the scope open ("which assets are needed first"). Round 160 gave the road three biomes whose trees
are a few triangles each, built in code; they are what a player on the road looks at most, so they come first:
palms and broad-leaved trees for the jungle, pines for high ground and the woodland, bushes for the steppe. Dungeon
pieces and characters were not pulled (see the findings: no source for them could be reached and read).

### The source

One pack: **"low poly nature pack" by flo-bit**, from `github.com/flo-bit/low-poly-asset-packs`, **CC0** (its
readme: "All packs are licensed under CC0, do whatever you want with them :)"). Fifteen of its models were taken.
`client/public/models/ASSETS.md` holds the record: the source's address, the licence in the source's own words, the
date, each source file's size, triangle count and SHA-256, and what was done to it. It is beside the file it
describes and is deployed with it.

### From source to the page: `client/scripts/make-models.mjs`

The pack is low-poly for a desktop scene, not for this level: a tree is 1 000 to 3 000 triangles, and the road
stands about thirty trees on each of 81 chunks of ground inside a budget of 64 000 triangles a scene
(`aesthetic/src/style.js`). The script makes them fit:

1. drops each model's normals and texture coordinates (the level shades every triangle flat and colours it from
   the material, as it does its own trees), so that vertices can be welded;
2. welds and simplifies each model to a share of its triangles (a tree to about 160);
3. puts the fifteen models into one file, each under the name of its source file;
4. compresses the file: quantized positions and meshopt.

The result is **34 332 bytes for 1 672 triangles**, from 1 771 600 bytes and 17 617 triangles. The script is
reproducible: run on the source files it writes the committed file byte for byte. Its tools (glTF Transform,
meshoptimizer) are not dependencies of the repository, like Playwright for the checks.

### In the level: `aesthetic/src/scene/models.js`

- `loadModels(url)` loads the file with three.js's glTF loader and meshopt decoder, both imported inside the call,
  so a host that never asks for models never loads them.
- `templateFrom` turns a model into a template: a list of triangles, each with one colour (the material's, lifted
  from the dark values of the author's renderer to the level's own range), standing on y = 0 over the middle of its
  foot and one unit tall.
- `stampModel` writes a template into a chunk's mesh at a tree's place, height and turn. A chunk with models is
  still one mesh for its trees, in the level's plain vertex-coloured material: no new material, texture or draw
  call per tree.

`MODEL_KINDS` says which models stand for which kind of tree of the terrain.

**Only the nearest trees.** The endless level gives each chunk a level by its distance from the camera's chunk:
models (the camera's chunk and the four beside it), detail (trunks and second cones) or the least. A chunk is built
again when the camera comes near enough for it to carry more, and a chunk left behind with models is built again
without them once it is two chunks off. So the count of triangles does not grow as the player walks. The far trees
stay the level's own.

### In the client

`createRoadView` asks for the file the first time models are wanted, which is when the road's level is built: not
at the title, not on the world map, not in a dungeon. Settings has **"Tree models"**, on unless switched off;
switched off, the level's own trees come back, and on again the models return without a second request. If the file
does not load, the simple trees stay and the console says why.

## Tests

- `aesthetic/test/models.test.js` (8 tests), on the committed file: its size; a model for every name and every kind
  of tree a biome grows; each template's shape and weight; a stamp; a chunk with models; the level before and after
  `setModels`, on a walk, and with the models taken away; the triangle budget at the start and in the densest forest.
- `client/src/components/__tests__/settings-sheet.test.jsx`: the switch.
- `client/scripts/models-check.mjs` in headless Chromium at a phone's size: when the file is asked for, the five
  model chunks, the triangle count, the switch off and on.

## Claim boundary

Seen in headless Chromium with software WebGL, not on a phone, and no frame rate was measured. Whether the models
look better than the simple trees is a matter of taste that the owner has not judged; see the findings.

## Outcome

See [`findings.md`](findings.md).
