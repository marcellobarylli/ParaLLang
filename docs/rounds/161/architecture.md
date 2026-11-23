# Round 161 architecture

**Conversational round, recorded with the build.** The ninth of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen. It was
taken before issue #11 (3D assets, which the build order puts first of the two): the two do not depend on each
other, and #11 waits on what the session's network can reach.

- **Design source:** GitHub issue #9, 'Save the full graph walk and paint it on the isometric map ("Show Journey so
  far")' (step 12 of the build order); [round 147](../147/architecture.md) (the isometric map);
  [round 160](../160/architecture.md) (the graph is final).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/service.js` (`walk`, `hops`, `getRoadWalk`), `server/src/learning-storage.js`,
  `server/src/app.js`, `client/src/stores/roadSlice.js` (`toggleJourney`), `client/src/components/Road.jsx`
  (`RoadMap`), `client/src/roadMap.js`, `client/scripts/journey-check.mjs`, `docs/rounds/161/shots/`.

## Goal

The entire journey, the walk over the graph, is part of the save and can be shown as a painted path on the map.

## Design

**The walk is node ids, and nothing else.** The road in the save gains `walk`: the id of every site walked to, in
order, the start first, and `hops`, the number of walks. The graph is a pure function of the road's seed, so an id
is all a site needs: its position, its height and the way to it are read from the graph again whenever the walk is
drawn. It is written by the same save as the walk itself (`moveOnRoad`), through the existing save system, and so
goes into the browser's copy and the GitHub save as the rest of the road does.

**Bounds.** The list keeps the last 20 000 sites (about 160 kB of JSON, under the 2 MB a restored save may be);
`hops` goes on counting past that. A road saved before this round has no walk: it takes its trail for one (the
sites visited, each once, in order, the last 300). A new landscape is another graph, so it starts a new walk.

**Served apart.** The road's view goes out after every answer and every walk, and would carry the list each time.
It carries `hops` only; `GET /api/road/walk` returns `{ walk: { seed, nodes, hops, kept } }` when the map asks.

**"Show Journey so far"** is a button under the road's map, a switch (`aria-pressed`). Turned on, the client reads
the walk and the map changes:

- the frame holds every site of the walk, from as far off as that takes (down to 0.003 overlay units a metre,
  about 30 km across; the usual map never shows more than 2 km);
- the walk is painted as one gold line with a dark edge through the sites in order, each at its own height, with a
  pale mark where it began and the usual post where the player stands;
- the sites ahead, their signs and the choice under the map step back, since at that distance they could not be
  picked; the button then reads "Hide the journey" and a line says "60 walks from where you began."

The landscape under it is the same painter's picture at the wider frame (round 147), so the walk lies on the hills
and round the lakes it went round. The switch stays as it was set while the page is open, and the walk is read
again whenever the map is opened with it on.

## Tests

- `server/test/journey.test.js` (5 tests): the walk from a new road through six walks and the save; a walk to the
  same site; a road from before the walk was kept; a new landscape, a walk longer than the list, and a walk that is
  not a list of sites; the route's need of a learner.
- `client/src/stores/__tests__/road-flow.test.js`: the switch, the read, and the read again after a walk.
- `client/src/__tests__/roadMap.test.js`: the wider frame.
- `client/scripts/journey-check.mjs` in headless Chromium at a phone's size, as a learner sixty walks along.

## Claim boundary

Seen in headless Chromium, not on a phone. The picture was looked at for a walk of 60; a walk of thousands was
tested as data (the list's bound) and not drawn. Between two sites the line is straight: it does not follow the bends
of the way, which at this distance are under a pixel.

## Outcome

See [`findings.md`](findings.md).
