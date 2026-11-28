# Round 213 findings

## Question

Can the land be pulled down at the sites of the walk by a fixed depth, exactly, and still be the one pure landscape
the server and the client share; and can the player be shown it happening, from the true land before to the true land
after?

## Finding

Yes. The pull is a displacement field solved from the sites (`server/src/road/pulls.js`), added to the land wherever
the land is read. Every pulled site is its depth lower to within 0.00002 m, the field is smooth, and beyond 211 m of
the walk nothing moves. Solving it takes under a millisecond for 20 sites and 64 ms for 1,500.

A depth measured against the sea would not have worked: the start of a road is lifted to 4 to 10 m over the water, so
26 m of sinking soil would have put the first sites under it. The pull therefore moves everything at a point down
together, water included.

The event paints the pull from arrays read once. On this machine reading them takes 0.2 s for a phone's picture
(240 by 519) and painting a frame 15 to 17 ms. The picture at the end of the pull equals the pulled land's own map
byte for byte, and the picture at its start equals the land's map before.

## Results

| Check | Result |
|---|---|
| Server tests (`pulls.test.js`: geometry, trigger, event, jump) | 630 pass |
| Client tests (the event's data, the store's flow, the screen without a canvas) | 372 pass |
| Aesthetic tests (a chunk on pulled land: ground, bent water, track) | 96 pass |
| `pull-check.mjs`, phone size (390 by 844) | 14 checks pass: Settings' jump to the gate after unit 12; its conversation; Continue opens the event with nothing else on the screen; the web generated outward (118, 373, 548, 780 of 840 cells at four readings); the journey; the land's share 0.01, 0.14, 0.45, 0.91, 1.00; afterwards the first site of the journey is 26.00 m lower in the level |
| `pull-check.mjs --desktop` (1440 by 900) | 14 checks pass (450 cells) |
| The usual map, before and after the painter was split | the same pixels for 4 seeds at 2 frames each |
| On a phone | not checked |
| A real model's conversation through the gate | not run: the grader and the narrator were scripted |

Pictures: [the web spreading](shots/05-the-web-spreads.jpg), [the journey](shots/07-the-journey-a-walk-at-a-time.jpg),
[before the pull](shots/08-before-the-pull.jpg), [after it](shots/10-after-the-pull.jpg),
[the map afterwards](shots/13-the-map-afterwards.jpg), [Settings' jump](shots/00-developer-jump.jpg).

## Faults found on the way

- The event's own Continue did not close it under a touch: a pressed button's transform replaced the transform that
  centred it, so it moved from under the finger and the click went to the screen behind. It is centred by its margins.
- The first grey of the web could not be seen on dark forest. It is now a mid-grey thread on a wider, darker, fainter
  one, which shows on forest and on sand.

## Claim boundary

- The frame rate of the sinking on a phone is not measured. The picture is painted on the main thread each frame;
  time runs by the clock, so a slow phone shows fewer frames, not a slower pull.
- A journey so long that its frame holds more than 5,200 cells gets the web only for the nearest 5,200.
- A lake next to a pulled site slopes. This was not looked at in the 3D level beyond the test of its geometry.
- The level seen was the pulled one after a walk on from the gate's old place. The level rebuilt in place (the event
  watched while standing on the road, which the full pacing cannot reach either, since its gates are in old places
  too) was not seen.
- `POST /api/road/jump` is open to anyone with the server's token or the friends' code; only the page hides it behind
  "Developer mode".

## Open items

- Issue #23's narrator passage and guidebook entry for the event.
- Whether the web should stay on the map, faintly, after the event (issue #23's open question).
- The view from below (issue #25) can read a site's shortening from `siteDepths(road.pulled)`.
