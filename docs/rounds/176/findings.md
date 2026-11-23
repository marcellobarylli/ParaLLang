# Round 176 findings

## Question

Does the camera go from one site to another along the shortest walk over the graph, on a smooth line near the ways,
without hard edges?

## Finding

Yes, in tests and in headless Chromium. Not seen on a phone.

## Method

Unit tests of the route, the smoothing and the glide; `client/scripts/travel-check.mjs` sends the camera along a walk
of six sites in a production build and reads its position every 0.1 s.

## Results

| Check | Result |
|---|---|
| Server tests | 586 of 586 (1 new: `route` is a walk of ways and no longer than a walk through the first neighbour) |
| Web client tests | 305 of 305 (3 new: a square corner rounded with its ends kept; a line between sites through others, within 16 m of the ways and turning under 0.2 rad per 3 m; a glide without vertical jolts, under 0.08 m per frame squared) |
| In the browser | a walk of 6 sites; the camera within 7.4 to 8.1 m of the ways over 96 readings; its sharpest turn 0.29 to 0.34 rad in 0.1 s ([on the way](shots/01-on-the-way.jpg), [further](shots/02-further.jpg), [there](shots/03-there.jpg)) |

Found on the way: smoothing the ground's height made it pass under peaks, and the camera then jumped onto the ground;
the envelope now reaches as far as the smoothing, so the smoothed height is never under the ground.

## Claim boundary

- The browser check drives the 3D view directly (`show({ mode: 'travel' })`), not through a walk of the store; the
  store's walks use the same call.
- The glide's start, where it leaves the hold, eases as before and was not changed.

## Open items

- The owner watches a walk on a phone: the line, the speed of a long walk, the height over hills.
