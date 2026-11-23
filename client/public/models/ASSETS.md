# Models: sources and licences

Round 162 (GitHub issue #11). Every 3D asset the web client ships that was not made in this repository is listed
here with where it came from and under what licence. The levels themselves (Ta Prohm, The Kiln, Micromort Mountain,
the endless road), the characters' figures and the road's own simple trees are built in code in `aesthetic/` and are
not assets.

## `nature.glb`

One file, 34 332 bytes, 1 672 triangles in 15 models: the trees of the road's three biomes, bushes and stones. It is
loaded when the road is open and "Tree models" is on in Settings, never before (`client/src/scene/roadView.js`), and
its models are stamped into the five chunks of ground nearest the camera (`aesthetic/src/scene/models.js`).

- **Source:** "low poly nature pack" by flo-bit, from the repository
  [flo-bit/low-poly-asset-packs](https://github.com/flo-bit/low-poly-asset-packs), folder `nature-pack/glb/`, branch
  `main`, fetched 2026-11-23 from `https://raw.githubusercontent.com/flo-bit/low-poly-asset-packs/main/nature-pack/glb/<file>`.
  The pack is also published at flo-bit.itch.io.
- **Licence:** CC0. The repository's `Readme.md` says: "All packs are licensed under CC0, do whatever you want with
  them :)". The pack's own `nature-pack/Readme.md` says: "cc0, do whatever you want with it, credits are appreciated
  though".
- **Credit** (asked for, not required): flo-bit, https://flo-bit.dev.
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

## The Odyssey's route (round 163, issue #13)

Issue #13 asks that a royalty-free or public-domain map of the Odyssey's route be shown beside the narrator's remark
on a long journey, if one exists, with its source and licence on record. **None was taken.** Wikimedia Commons,
where such maps are, and every other page tried were outside the network of the session that built the feature, so
no map's licence could be read; a web search alone named only maps under non-free licences.

What the game shows instead is **a chart drawn in this repository**: `client/src/components/OdysseyChart.jsx` draws
it from `content/world/odyssey.yaml`, a line through the poem's stops at the places tradition most often gives them.
It is this project's own work and needs no licence from anyone. It is a sketch with no coastline, and the yaml file
says what its places and coordinates rest on.

To show a real map instead: put the image in `client/public/maps/`, add its source, author, date and licence here in
the source's own words, and have `OdysseyChart.jsx` show it (an old engraved map from a nineteenth-century classical
atlas, or a public-domain or CC0 route map on Wikimedia Commons, would do).

## Adding an asset

1. Read the licence at the source, and take only what is public domain, CC0 or as permissive.
2. Add the file to the script's `MODELS` (or a new file beside this one), and run the script.
3. Add a row here: the source, the licence in the source's own words, the date and the checksum.
4. Load it lazily: nothing in this folder is asked for before the screen that shows it.
