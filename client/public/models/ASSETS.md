# Models: sources and licences

Round 162 (GitHub issue #11). Every 3D asset the web client ships that was not made in this repository is listed
here with where it came from and under what licence. The levels themselves (Ta Prohm, The Kiln, Micromort Mountain,
the endless road), the characters' figures and the road's own simple trees are built in code in `aesthetic/` and are
not assets.

## `nature.glb`

One file, 34 332 bytes, 1 672 triangles in 15 models: the trees of the road's three biomes, bushes and stones. It is
loaded when the road is open, never before (always: round 195 removed the "Tree models" setting) (`client/src/scene/roadView.js`), and
its models are stamped into the five chunks of ground nearest the camera (`aesthetic/src/scene/models.js`).

- **Source:** "low poly nature pack" by flo-bit, from the repository
  [flo-bit/low-poly-asset-packs](https://github.com/flo-bit/low-poly-asset-packs), folder `nature-pack/glb/`, branch
  `main`, fetched 2026-11-23 from `https://raw.githubusercontent.com/flo-bit/low-poly-asset-packs/main/nature-pack/glb/<file>`.
  The pack is also published at flo-bit.itch.io.
- **Licence:** CC0. The repository's `Readme.md` says: "All packs are licensed under CC0, do whatever you want with
  them :)". The pack's own `nature-pack/Readme.md` says: "cc0, do whatever you want with it, credits are appreciated
  though".
- **Credit** (asked for, not required): flo-bit, https://flo-bit.dev.
- **To be undone:** the owner did not intend the models to be cut down (2026-11-23: "we can keep the original poly
  counts seems fine since they're low poly assets anyway"). GitHub issue #24 is to use them as they are.
- **What was done to them:** `client/scripts/make-models.mjs` drops each model's normals and texture coordinates
  (the level shades every triangle flat and colours it from the material), welds its vertices, simplifies it to the
  share of its triangles in the script's `MODELS`, names it after its file, puts all fifteen into one file and
  compresses that (quantized, meshopt). Run on the source files below it writes this file byte for byte.

| Source file | Bytes | Triangles | Triangles kept | SHA-256 of the source file |
|---|---|---|---|---|
| `palm_tree_1.glb` | 160508 | 1704 | 168 | `7593e377d51736309da8ee28afa453dc07db152a377b858e9718d3f579f1ed35` |
| `palm_tree_2.glb` | 159760 | 1704 | 170 | `3816384e750576674b36d33da93166e5d07ab920562c08a9bbce424bd586afd1` |
| `palm_tree_3.glb` | 185604 | 1987 | 174 | `00b4f32f72870a80ce914398d2ef63634c45393222371db8e2cb9af231fce910` |
| `common_tree_1.glb` | 245300 | 2372 | 162 | `e17c3742e9251af93f03dee12d7d94c3ab15b78d61661e1a86b704f1f725f9ea` |
| `common_tree_2.glb` | 226772 | 2196 | 160 | `8451a97982c5e43641dce7cbea4624f68f22f6048c1a13f004d21e1e3c7b9d02` |
| `common_tree_3.glb` | 318884 | 3094 | 162 | `129a861f0eb715ff196791f93fe965a46833f945803c52c9fbd8d4df1c2e97a2` |
| `pine_tree_1.glb` | 134788 | 1300 | 154 | `d37154637ccd55a5ff0cf53df7645f0503fd0b9bd81900bce8bc92624b2e514a` |
| `pine_tree_2.glb` | 149416 | 1444 | 158 | `a8d8e81d34713b79a5e0ee846281f2a4dcc5bcb6181c9b7c821fd188751310b3` |
| `pine_tree_3.glb` | 100372 | 1004 | 148 | `06fd84104dcacc73fbf214d8c295263f6e94698b7874bb991693c7173dfa269f` |
| `bush_1.glb` | 30652 | 288 | 56 | `b649a4a17b57a18655f60d42b2eef4caf53508ae07d73ca9df4b527903e2def4` |
| `bush_2.glb` | 9428 | 80 | 40 | `a91d1b42f447fe67900acd388f83763858a72226b346e0dcc2aec6d8b5882ddd` |
| `bush_3.glb` | 40428 | 384 | 60 | `dd107014cad24adf3b5ea4c272d5a03bab50ea3832d6762567c8e402c81d6009` |
| `stone_1.glb` | 3228 | 20 | 20 | `9287b01d0ae0dd8b7f599f6a7c1887a680f69a37bc2192f3d68447cc6fcb3a8b` |
| `stone_2.glb` | 3228 | 20 | 20 | `27b75335e445e611bc18b2837e354cef557f2424e5015b47d93d1bbcf655d6e7` |
| `stone_3.glb` | 3232 | 20 | 20 | `43cf7f9c92244c1ce6ccd7896f12f091b4a3efd20fb9af55c55aaf920de29b98` |

The source files are not in the repository (1.77 MB together); the checksums say which files they were.

Which model stands for which tree is `MODEL_KINDS` in `aesthetic/src/scene/models.js`: palms for the jungle's palms,
the "common" trees for broad-leaved and round trees, the pines for firs, the bushes for the steppe's shrubs. The
stones are in the file and not yet used.

## Not pulled

Issue #11 also names dungeon pieces, characters and the isometric map. None was pulled in round 162:

- **Dungeon pieces and characters.** The source above has neither. The other sources looked for (Kenney, Quaternius,
  poly.pizza, OpenGameArt) could not be reached from the session that did the work, so nothing of theirs was read,
  and nothing was taken from a source whose licence could not be read.
- **The isometric map** is painted from the landscape itself, pixel by pixel (`client/src/roadMap.js`), and uses no
  asset.

## The Odyssey's route (round 163, issue #13; the map under it, round 165)

Issue #13 asks that a royalty-free or public-domain map of the Odyssey's route be shown beside the narrator's remark
on a long journey, if one exists, with its source and licence on record. No finished map of the route was taken:
Wikimedia Commons, where such maps are, was outside the network of the sessions that built the feature, and a web
search alone named only maps under non-free licences.

What the game shows is **a chart drawn in this repository on a real coast**. `client/src/components/OdysseyChart.jsx`
draws it from two files: `content/world/odyssey.yaml` (the poem's stops at the places tradition most often gives
them, and the names written on the map) and `content/world/odyssey-map.json` (the coast, and the line between the
stops).

**The coast is Natural Earth's.**

| | |
|---|---|
| Data | Natural Earth, land boundaries ("Land"), 1:10m, the most detailed of its three scales; version 4.1.0 |
| Taken from | the npm package `world-atlas` 2.0.2, file `land-10m.json` (TopoJSON, unprojected decimal degrees). Its README calls itself "a convenient redistribution of Natural Earth's vector data, version 4.1.0 as TopoJSON" and says this file is "derived from the Natural Earth's land boundaries, 1:10m large scale" |
| sha256 of `land-10m.json` | `9b9f584709c119d63fbadf484ce425260497697b7166be7a2fe360e8c0b171a8` |
| Licence of the data | Public domain. Natural Earth's `LICENSE.md` (https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/LICENSE.md, read 2026-11-23): "All versions of Natural Earth raster + vector map data found on this website are in the public domain." and "No permission is needed to use Natural Earth. Crediting the authors is unnecessary." |
| Licence of the package | ISC, "Copyright 2013-2019 Michael Bostock" (the package's `LICENSE`). Only the data is used; none of the package is in the repository |
| Credit shown | "Coast: Natural Earth, public domain." under the chart. Natural Earth asks for none and suggests "Made with Natural Earth." |

`client/scripts/make-odyssey-map.mjs` makes `odyssey-map.json` from that file: it cuts the land to the chart's frame,
thins it (bends of the coast under about 1.3 km and the smallest islets are lost; 76 of the frame's 122 pieces of
land are kept, in 3 138 points), and finds the line between two stops as the shortest way by sea on the unthinned
coast. Run it again when a stop or the frame in `odyssey.yaml` changes:

```
npm install --no-save world-atlas topojson-client     # anywhere Node finds them; not dependencies of the repo
node client/scripts/make-odyssey-map.mjs <path to>/world-atlas/land-10m.json
```

**What is whose.** The coast is real and is Natural Earth's. The places of the stops are tradition's, and most are
disputed (`odyssey.yaml` says what they rest on). The line between the stops, the look of an old sea chart, the
compass rose and the names written on the map are this project's own work. Natural Earth's own site
(naturalearthdata.com) was outside the session's network, so its terms page was not read; the licence above is the
one in its repository.

## Adding an asset

1. Read the licence at the source, and take only what is public domain, CC0 or as permissive.
2. Add the file to the script's `MODELS` (or a new file beside this one), and run the script.
3. Add a row here: the source, the licence in the source's own words, the date and the checksum.
4. Load it lazily: nothing in this folder is asked for before the screen that shows it.
