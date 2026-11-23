# Round 165 findings

## Question

Can the chart of the Odyssey stand on an accurate map of the real world, look like a map from a myth, and still
read on a phone?

## Finding

Yes. The coast is Natural Earth's public-domain land at 1:10m; the line between the stops now sails round the land;
and the chart is drawn as an old sea chart. At the width of a phone's card every number and the lands' names read;
the seas' names are small. Checking the stops against the coast found two of round 163's coordinates wrong.

## Method

The map file made by the script; the chart drawn alone and inside the game in headless Chromium at phone size and
looked at; the stops, the route and the names checked against the coast in tests.

## Results

| Check | Result |
|---|---|
| Web client tests | 287 of 287 (281 before; the chart's file has 9, was 3) |
| Server tests | 567 of 567 (unchanged; the server does not load the chart's files) |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 (its code is unchanged) |
| `node client/scripts/journey-check.mjs docs/rounds/165/shots 120` | 0 problems |
| The client build | builds; the main script is 390 kB, 128 kB compressed |

| The map file | |
|---|---|
| Pieces of land in the frame | 122, of which 76 are kept |
| Points of coast | 3 138 |
| Legs of the route | 14, in 142 points |
| Size | 32 796 bytes; 12 501 compressed |
| Time to make | 1.5 seconds |

| Stop | Against the coast |
|---|---|
| Troy, the Cicones | on the mainland, by the shore |
| The Lotus-eaters (Djerba) | on an island 0.33 by 0.26 degrees at 10.73 to 11.06 east, 33.64 to 33.90 north |
| The Cyclopes, the Laestrygonians | on Sicily |
| Aeolus (Lipari) | on an island 0.08 degrees across at 14.90 to 14.98 east, 38.45 to 38.52 north |
| Circe (Monte Circeo) | 0.03 degrees off the mainland's shore |
| The Sirens | at sea, 0.11 degrees off Sicily's north-east point |
| Scylla and Charybdis | **was inland in Calabria** (15.7, 38.1); now in the strait's water (15.6, 38.2), which the coast shows 0.07 degrees wide there |
| Thrinacia | 0.02 degrees off Sicily's east shore |
| Calypso (Gozo) | on an island 0.15 degrees across at 14.18 to 14.33 east, 36.01 to 36.08 north |
| The Phaeacians (Corfu) | on an island at 19.63 to 20.12 east, 39.36 to 39.82 north |
| Ithaca | 0.01 degrees off an island at 20.62 to 20.76 east, 38.32 to 38.50 north |
| The Underworld | **was on Corsica** (9.2, 41.9); now in open sea, 1.2 degrees from any land |

Pictures: [the map, large](shots/chart-large.jpg), [the chart at a phone's width](shots/chart-phone.jpg),
[in the game, under the narrator's remark](shots/03-the-narrator-and-the-odyssey.jpg). Round 163's chart, for
comparison: [`../163/shots/03-the-narrator-and-the-odyssey.jpg`](../163/shots/03-the-narrator-and-the-odyssey.jpg).

## Decision

- **Data, not a picture.** A scanned old map would look the part and be wrong in its coast; a modern picture could
  not be fetched or its licence read. Public-domain coast data drawn in an old style is both accurate and the look
  asked for.
- **The line goes by sea.** A straight line across Greece on a real coast reads as an error. The caption says the
  line is only the shortest way by sea.
- **The frame is wider.** West to 5.5 degrees east, so that Sardinia is whole and there is open sea beyond it for
  the Underworld; north to 43.2, so that Italy has its shape.
- **English names.** Lands and seas are named in English in an engraver's lettering. Latin or Greek names would
  look older and be one more thing to get wrong.
- **The Aegean's name is written north of Crete.** The middle of the Aegean is full of islands and the route. The
  water north of Crete is also called the Sea of Crete; the sources a search returned count it as the Aegean's
  southern end.
- **The chart stays in the main script.** It is 12.5 kB compressed and shown only from a hundred walks. Loading it
  on demand would save that and add a moment of waiting under the narrator's remark; not done.
- **Issue #13 stays open**, on the owner's earlier word.

## Evidence

- `content/world/odyssey-map.json`, and `client/scripts/make-odyssey-map.mjs` which makes it again from
  `world-atlas/land-10m.json` (sha256 `9b9f5847…171a8`).
- `client/src/components/__tests__/odyssey.test.jsx`.
- `docs/rounds/165/shots/`.
- The trail: [`trail/interview.md`](trail/interview.md) (the owner's words).

## Claim boundary

As in the architecture: the coast is real and accurate to about 1.5 km; the stops are tradition's and mostly
disputed, and their identifications rest on a search's summary of one Wikipedia page; the line between them is this
project's; nothing was seen on a real phone; no speaker of Greek or scholar of the poem has looked at it.

## Open items

- The seas' names are about 7 pixels high at a phone's width. A chart that opens larger on a tap would let them
  read; not asked for.
- The lettering was seen only in the container's serif, which is heavier than Georgia.
- A scanned public-domain map from an old classical atlas remains possible from a session that can reach Wikimedia
  Commons; `client/public/models/ASSETS.md` says what to record.
