# Round 165 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-23 by the owner's message after the deploy of
round 164; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is
frozen.

- **Design source:** the owner's message (no new GitHub issue; it bears on [issue #13](https://github.com/marcellobarylli/ParaLLang/issues/13),
  which stays open); [round 163](../163/architecture.md) (the chart).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/scripts/make-odyssey-map.mjs`, `content/world/odyssey-map.json`,
  `content/world/odyssey.yaml`, `client/src/components/OdysseyChart.jsx`, `client/src/index.css`,
  `client/scripts/odyssey-shot.mjs`, `client/public/models/ASSETS.md`, `docs/rounds/165/shots/`.

## Goal

Round 163's chart of the Odyssey was a line through numbered stops on a blank grid. The owner asks for a real world
map under it, accurate, and looking like a world map from a myth.

## Design

**The map is real data, not a picture taken from somewhere.** Pictures of old maps are on Wikimedia Commons, which
this session's network does not reach. The npm registry is reachable, and the package `world-atlas` redistributes
Natural Earth's vector data. Natural Earth is in the public domain (its `LICENSE.md`, read this round), so the coast
under the chart is Natural Earth's land boundaries at 1:10m, its most detailed scale. Source, licence in the
source's words and checksum are in [`client/public/models/ASSETS.md`](../../../client/public/models/ASSETS.md).

**One script makes one small file.** `client/scripts/make-odyssey-map.mjs` reads the land, cuts it to the chart's
frame and a margin, and writes `content/world/odyssey-map.json`:

- `rings`: the coast, thinned (Douglas-Peucker, 0.012 degrees, about 1.3 km). Pieces of land under 0.11 degrees
  across are dropped unless a stop stands on or beside them (Lipari and Gozo are that small). 76 of the frame's
  122 pieces are kept, in 3 138 points.
- `route`: for each leg of the voyage, the shortest way by sea between its two stops, found on the unthinned coast
  (A* on a grid of 0.02 degrees, sailing costing more within seven cells of a shore, so the line keeps off the
  coast but can still pass a strait). The way to the Underworld and back is found once and sailed twice.

Both are whole numbers, hundredths of a degree. The file is 33 kB, 12.5 kB compressed, and is bundled with the
client. The tools (`world-atlas`, `topojson-client`) are not dependencies of the repository; like the model
script's they are taken from wherever Node finds them.

**Why the line goes by sea.** On a blank grid a straight line between stops was honest. On a real coast it runs
across Greece, Sicily and Sardinia, which reads as a mistake. The poem names almost nothing between its stops, so
the line cannot be the poem's; it is the shortest way a ship could go, and the caption says so. Where the poem does
name the way (blown off course at Cape Malea, past Cythera, nine days to the Lotus-eaters) the line agrees.

**The drawing is an old sea chart.** `OdysseyChart.jsx` draws, in order: the sea; three thin lines along every
shore, as an engraver shades water (each is the land's outline stroked wide and then stroked again a little
narrower in the sea's colour); sixteen lines of the winds from a compass rose in open water; the land in paper
colour with an ink coast; names in an engraver's serif, lands in spaced capitals and seas in italic; a title plate;
the paper's stains (one SVG turbulence filter); then, in fresh ink over the stains, the voyage as a dashed red line
and the numbered stops; a darkening toward the edges; and a border whose bars are whole degrees, dark and light by
turns. The projection is the plain one of such charts: longitude across, latitude up, a degree of longitude drawn
as long as it is on the ground at the middle of the frame.

**Accuracy is tested, not asserted.** The stops' coordinates were written from memory in round 163. This round
checks each against the coast:

- the island stops fall on islands of the right size at those positions (Djerba, Corfu; Lipari, Gozo and Ithaca
  within 0.03 degrees of islands under a quarter of a degree across);
- two were wrong and are corrected: Scylla and Charybdis stood inland in Calabria and now stand in the strait's
  water; the Underworld, which is on no map, stood on Corsica and now stands in open sea at the western edge;
- Troy, Lipari and Gozo are given to a hundredth of a degree so that they fall on their land.

Tests keep it so: every placed stop on or beside land; every leg meeting its stops and never more than 0.05 degrees
deep in land between them; every land name on land and every sea name on the sea; Rome, Athens and Tunis on land.

**Where stops crowd, the number moves and the place stays.** Round the Strait of Messina five stops lie within a
degree. A stop may carry `label: [right, down]`: its number is drawn off its place and joined to it by a thin line,
and a red dot marks the place. Seven stops use it.

**What is on the map that is not geography.** "The stream of Ocean" is written down the western edge and the
Underworld's way is dotted: both are the poem's (book 11). The title plate reads "The Wanderings of Odysseus".

## Tests

`client/src/components/__tests__/odyssey.test.jsx`, 9 tests (3 before): the projection; the coast (source named,
known cities on land, known seas at sea, the strait open); stops against the coast; the route against the coast and
its stops; names against the coast; the drawing (one land shape used for the shore lines, fourteen legs, the two to
the Underworld dotted, the border's bars counted from the frame, the title, the credit); two charts on a page not
sharing shapes; and the script's own parts on a toy sea (a ring cut to a box, a line thinned, the way by sea going
round a wall of land).

## Claim boundary

- The coast is Natural Earth's at 1:10m, thinned. It is accurate to about a kilometre and a half, on a chart where
  a kilometre is under a tenth of a pixel on a phone.
- Where each stop stands is tradition's, not fact, and most are disputed. The identifications rest on a web
  search's summary of Wikipedia's "Geography of the Odyssey" (round 163); the page itself was never opened. No
  gazetteer was read: the coast confirms that the coordinates fall on the places named, not that tradition names
  those places.
- The line between stops is this project's, not the poem's.
- Seen in headless Chromium at phone size, alone and inside the game. Not seen on a real phone; the lettering is
  Georgia where the device has it and another serif where it does not (the container's is heavier).
- Natural Earth's own terms page was outside the network; the licence quoted is the one in its repository.

## Outcome

Built and recorded in one sitting. The chart is on the real coast and reads as an old sea chart at phone size.
Web client 287 tests, server 567, the aesthetic package's 95, the iPhone app's 320; the client builds;
`journey-check.mjs … 120` reports 0 problems.
