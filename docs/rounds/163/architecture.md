# Round 163 architecture

**Conversational round, recorded with the build.** The last of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #13, "Narrator comments on random-walk journey (Odyssey) + show a royalty-free
  Odyssey map" (step 13 of the build order); [round 161](../161/architecture.md) ("Show Journey so far") and
  [round 156](../156/architecture.md) (the narrator's written passages).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/narration/passages.yaml` (`journey_random_walk`), `content/narration/guidebook.yaml`
  (`the_long_way_round`), `content/world/odyssey.yaml`, `server/src/road/service.js` (`getRoadWalk`),
  `server/src/narration.js` (`min_hops`), `client/src/components/OdysseyChart.jsx`, `Road.jsx`,
  `client/src/stores/roadSlice.js`, `client/public/models/ASSETS.md`, `docs/rounds/163/shots/`.

## Goal

"On rails" play, drawn whole, looks like a random walk, and so does Homer's Odyssey when it is mapped. When the
walk is past about a hundred hops and the player shows the journey, the narrator remarks on this, and a map of the
Odyssey's route is shown beside the remark.

## Design

**The remark is a written passage** (round 156's mechanism): `journey_random_walk`, for a new event,
`journey_shown`, with a new condition on a passage, `min_hops: 100`. Asking the server for the walk is the map's
"Show Journey so far" (round 161), so that request is the event: from a hundred walks its reply carries the passage
beside the walk. It is told every time a journey that long is shown; the first time, it also enters a guidebook
entry, "The long way round", and only that first time is anything written to the save.

The passage keeps the narrator's rules: it is told to "you", describes the line ("what a fly does in a quiet
room"), points at "one other line drawn like it, by a sailor who took ten years over a few days' sail", and
explains nothing.

**The map of the Odyssey is a chart drawn here.** The issue asks for a royalty-free or public-domain map "if one
exists". None could be taken: Wikimedia Commons and every other page tried were outside this session's network, so
no map's licence could be read, and a map is not shipped on a guess about its licence. What the player is shown is
this project's own drawing, which needs nobody's licence:

- `content/world/odyssey.yaml` holds the voyage as data: the stops in the poem's order (Troy, the Cicones, the
  Lotus-eaters, the Cyclopes, Aeolus, the Laestrygonians, Circe, the Underworld and back, the Sirens, Scylla and
  Charybdis, Thrinacia, Calypso, the Phaeacians, Ithaca), each with the place tradition most often gives it, that
  place's position, and whether it is disputed. Its header says what each of these rests on.
- `client/src/components/OdysseyChart.jsx` draws it: a dark sea with a faint two-degree grid, the route as the same
  gold line the player's own journey is painted in, the stops numbered, the Underworld as a dashed ring "on no map",
  and under it the list of stops with "(disputed)" where tradition is, and a caption that calls it a sketch.

There is no coastline. A coastline would have to be drawn from memory or taken from data that could not be fetched;
the point of the picture is the shape of the line, and the line is there.

`client/public/models/ASSETS.md` records this under "The Odyssey's route": that no map was pulled and why, what
stands in for it, and how to put a real one in its place.

**In the client** the remark and the chart stand under the map while the journey is shown, in a box of their own.
Hiding the journey hides them.

## Tests

- `server/test/journey.test.js`: 99 walks, no remark and nothing written; 100, the remark, the guidebook's entry and
  the save; shown again, the remark again and nothing more written.
- `client/src/components/__tests__/odyssey.test.jsx` (3 tests): the stops and their order, the frame, east and
  north, and the drawing.
- `client/src/stores/__tests__/road-flow.test.js`: the store keeps the remark and tells the guidebook.
- `client/scripts/journey-check.mjs` with 120 walks (and with 60: no remark), in headless Chromium at a phone's size.

## Claim boundary

The chart is a sketch from a search engine's summary of the traditional identifications and from positions written
from memory; no page could be opened to check either, and the yaml's header says so. It is not a map and should not
be measured. Seen in headless Chromium, not on a phone.

## Outcome

See [`findings.md`](findings.md).
