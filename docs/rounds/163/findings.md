# Round 163 findings

## Question

Does a public-domain map of the Odyssey's route exist that the game can show, and does the narrator's remark appear
when a long journey is shown?

## Finding

**The remark: yes.** At 99 walks the journey is shown without a word; at 100 the narrator remarks on it, the chart
appears beside the remark, and the guidebook gains "The long way round".

**The map: not answered.** Whether a public-domain map exists could not be found out from this session. Wikimedia
Commons, Wikipedia and the other pages tried did not resolve (they are outside the session's allowed network), and a
web search named only maps under licences that do not allow reuse (a Creative Commons non-commercial, no-derivatives
map) or with no licence stated. Nothing was fetched round the block. The game shows a chart drawn in this repository
instead, which is royalty-free because it is the project's own.

## Method

Server and client tests; `client/scripts/journey-check.mjs` on the built client in headless Chromium at 390×844, as
a learner 60 and then 120 walks along the rails; a web search for the traditional identifications and for maps, and
three attempts to open pages, all refused.

## Results

| Check | Result |
|---|---|
| Server tests | 567 of 567 (566 before, 1 new) |
| Web client tests | 281 of 281 (277 before, 4 new) |
| The aesthetic package's tests | 95 of 95 |
| `journey-check.mjs`, 120 walks | 12 checks, 0 problems |
| `journey-check.mjs`, 60 walks | the narrator says nothing; 0 problems |
| Every other headless play (`light`, `narrator`, `guidebook`, `turmeric`, `revelation`, `dungeon-node`, `models`) | 0 problems each |

Pictures: [a journey of 120 walks](shots/02-journey.jpg), [the narrator's remark and the
chart](shots/03-the-narrator-and-the-odyssey.jpg), [the chart's list and caption](shots/04-the-chart.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **A chart drawn here in place of a pulled map**, with the reason on record and the way to replace it.
- **No coastline.**
- **A hundred walks**, counted as the issue's "~100 hops".
- **The remark is told each time** a journey that long is shown, and enters the guidebook once.
- **The narrator names nobody.** The chart's title says whose voyage it is. In the game's own lore the sailor of
  *The Journey* is Journathan; the remark fits either.

## Evidence

`content/world/odyssey.yaml`, `client/src/components/OdysseyChart.jsx`, `client/public/models/ASSETS.md`,
`server/test/journey.test.js`, [`shots/`](shots/).

## Claim boundary

The chart's places are tradition's guesses as a search summarised them, and its coordinates are from memory. Not on
a phone.

## Open items

- **A real map.** From a network that reaches Wikimedia Commons: find a route map whose page says public domain or
  CC0, and put it in as `ASSETS.md` describes. Until then the issue's second half is met by a stand-in.
- A check of the chart's stops and positions by someone with the sources open.
- Not on `main`.
