# Round 162 findings

## Question

Can pulled models stand in the endless level inside its triangle budget, in a file small enough to ship, with their
source and licence on record?

## Finding

Yes for the trees, with a caveat about how they look.

- **The file is 34 kB**, loaded only on the road. With it the start of the road holds 57 709 triangles in the
  browser (39 449 with the level's own trees), inside the style's 64 000. In the densest forest of the test's seed
  the count is 48 846.
- **The loader costs more than the file**: the glTF loader and the meshopt decoder are two chunks of 45 kB and
  26 kB (14 kB and 7 kB gzipped), fetched with the file. The 3D chunk every level shares grew from 646 kB to 702 kB
  (174 kB to 189 kB gzipped), because the loader uses parts of three.js that nothing used before.
- **The caveat.** A tree cut from 1 700 triangles to 160 is ragged: leaves become shards, and some trunks have a
  dark wedge where the simplifier closed them. From close by they read as trees and are more varied than the simple
  ones; they are also rougher. "Tree models" in Settings switches between the two, so the owner can compare in one
  tap. If they are not wanted, the switch's default is one word in `client/src/display.js`.

## Method

The aesthetic package's tests on the committed file; `client/scripts/models-check.mjs` on the built client in
headless Chromium at 390×844; the source's readmes fetched and read for the licence; each source file's checksum
taken when it was fetched.

## Results

| Check | Result |
|---|---|
| The aesthetic package's tests | 95 of 95 (87 before, 8 new) |
| Server tests | 566 of 566 |
| Web client tests | 277 of 277 (276 before, 1 new) |
| `models-check.mjs` | 7 checks, 0 problems |
| `road-shots.mjs`, `dungeon-node-check.mjs`, `journey-check.mjs` | pass |
| `make-models.mjs` run again on the sources | the committed file, byte for byte |

Pictures: [the road's card with models behind it](shots/01-hub-with-models.jpg), [the jungle with
models](shots/02-jungle-with-models.jpg), [the same place with the level's own
trees](shots/03-jungle-without-models.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **The trees first, from one CC0 pack.** Nothing was taken from a source whose licence could not be read.
- **About 160 triangles a tree**, which keeps the level inside its budget with five chunks of models.
- **Models in the five nearest chunks only.**
- **On by default, with a switch.**
- **The source files are not in the repository**; their checksums are.

### What was not pulled, and why

- **Dungeon pieces and characters.** The pack has none. Kenney, Quaternius, poly.pizza and OpenGameArt, where such
  packs are, are outside the hosts this session's network allows (the requests were refused by the session's proxy;
  `raw.githubusercontent.com` and the package registry are allowed). Nothing was fetched round that.
- **The exact commit of the source.** The session could read files of the repository's `main` branch but not list
  its history, so the record has the date and the checksums in place of a commit.

## Evidence

`client/public/models/ASSETS.md`, `client/scripts/make-models.mjs`, `aesthetic/test/models.test.js`,
[`shots/`](shots/).

## Claim boundary

Not on a phone; no frame rate. The licence was read from the source's readme; the pack's page on itch.io, which the
readme points to, could not be reached and was not read.

## Open items

- The owner's look at the two kinds of tree, and the default.
- A frame rate on a phone with models on.
- Dungeon pieces and characters, from a session whose network reaches the usual CC0 libraries (or from files the
  owner adds): `ASSETS.md` says how to add one.
- The stones are in the file and unused; a cairn could be made of them.
- Not on `main`.
