# Round 161 findings

## Question

Can the whole walk be kept as node ids and drawn from them alone?

## Finding

Yes. The save holds ids; the map reads each site from the graph of the road's seed and paints the line. In the
headless run a learner sixty walks along the rails saw one line through 61 sites, all inside the picture, lying over
the landscape from the start to where they stood.

## Method

Server and client tests; `client/scripts/journey-check.mjs` on the built client in headless Chromium at 390×844.

## Results

| Check | Result |
|---|---|
| Server tests | 566 of 566 (561 before, 5 new) |
| Web client tests | 276 of 276 (274 before, 2 new) |
| `journey-check.mjs` | 8 checks, 0 problems |
| `dungeon-node-check.mjs` (round 160) | passes again |

Pictures: [the usual map](shots/01-map.jpg), [the journey of sixty walks](shots/02-journey.jpg). On rails the walk
looks like what the next issue says it is: a random walk.

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **The walk is served on its own route**, not in the road's view.
- **The last 20 000 sites are kept**, and the count goes on.
- **A new landscape starts a new walk.** Its sites are another graph's and could not be drawn on one map.
- **While the journey is shown the sites ahead are hidden.**
- **Taken before issue #11**, which is next.

## Evidence

`server/test/journey.test.js`, `client/scripts/journey-check.mjs`, [`shots/`](shots/).

## Claim boundary

Not on a phone. A walk of thousands of sites was not drawn.

## Open items

- Issue #13 hangs the narrator's remark on this switch.
- Not on `main`.
