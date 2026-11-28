# Round 215 findings

## Question

What changes when only a finished conversation opens ways on and is pulled, and when pulled ground under the sea's
level floods; and what has the other session put on `main` that this must not break?

## Finding

**The frontier.** It was read from the trail (every site walked to); it is now read from `cleared`. Three things
followed. At the start of a road nothing is ahead until the first conversation is finished. A road on which nobody
waits where the player stands and nothing was ever finished (a developer's jump to a gate on a new road) would have
had no way on, so that site counts as the player's. And `cleared` was cut to its last 300, which a pull now needs
whole, so it is kept to 20,000.

**The water.** The start of a road stands 4 to 12 m over the sea, and a pull is 26 m, so the first sites of nearly
every journey drown: in the check's journey the first site was 11.6 m up and is under 14.4 m of water. Keeping the sea
level made round 213's bent water in the 3D level, its camera and its far land unnecessary; those changes are removed.
The map's painter now tests each sample against the sea on every frame; a phone-sized frame still paints in 15 to
24 ms here.

**The other session.** Round 214's breathing is on by default and shows a card the first time an answer is sent. In a
scripted check that card covers the conversation and the check stops; this is true of every older check script that
sends an answer, not only this round's.

## Results

| Check | Result |
|---|---|
| Server tests | 631 pass (`road.test.js`, `journey.test.js` and `pulls.test.js` rewritten where they walked on from an unfinished site) |
| Client tests | 380 pass |
| Aesthetic tests | 96 pass |
| Mobile tests | 320 pass |
| The usual map, before and after the painter's change | the same pixels for 4 seeds at 2 frames each |
| `pull-check.mjs`, phone size | 15 checks pass: the pull took the 15 sites whose conversation was finished and not the one only walked to; the first site's ground is 26.00 m lower and under 14.4 m of water; the web 119, 378, 550, 779 of 840 cells; the land's share 0.01, 0.15, 0.46, 0.90, 1.00 |
| `pull-check.mjs --desktop` | not run again this round |
| On a phone; with a real model | not checked |

Pictures: [before the pull](shots/08-before-the-pull.jpg), [the land sinking](shots/09-the-land-sinking.jpg),
[after it](shots/10-after-the-pull.jpg), [the map afterwards](shots/13-the-map-afterwards.jpg).

## Faults found on the way

- An edit to `service.js` replaced a span that also held `clone`, `graphOf` and `proposedSeed`; 41 server tests failed
  until they were put back.

## Claim boundary

- A save made before this round keeps its trail; its frontier is now read from its `cleared`. A player standing at a
  site whose conversation they left, with nothing finished anywhere, has nothing ahead until they finish it.
- Drowned sites in the 3D level (a character or a cairn on the water, a track across it) were not looked at; the
  level's picture in the check is of dry land further on.
- Between the first and last frames the colour of sinking land is a blend of its two colours; a thin ring of the
  shore's colour shows round the water before it has risen that far.
- The older check scripts were not run again with the breathing off.

## Open items

- For the session of round 214: `client/scripts/lib/play.mjs` now sets `breathing: false` unless a check passes
  `display: { breathing: true }`.
- Whether the player should be able to walk back to a finished site as a destination.
