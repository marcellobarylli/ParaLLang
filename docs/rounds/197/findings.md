# Round 197 findings

## Question

Why does tilt to look on the road turn the view only a little, and can it turn nearly all the way round and all the
way up and down?

## Finding

Round 194 put the dungeons' tilt (round 125) on the road unchanged: a small window of 12 degrees to either side and
8 up or down, read as a small-angle tilt that drifts back to the middle over 30 s, and the road's camera bounded it
again at 0.25 and 0.18 rad (14 and 10 degrees). That suits a gentle sway, not looking round.

The road now has its own free look (decisions in [`architecture.md`](architecture.md)). In headless Chromium on the
real road at seed 4242, with synthetic `deviceorientation` events: a turn of the phone 120 degrees to the right
turned the rendered view 121.1 degrees; a quarter turn to the left, 88.4; turned 170, the view stopped at 135.3; on
past the back (200) it stayed at the edge (137.0) without a jump, and 20 degrees back answered at once (118.4). The
phone's top tilted right back raised the view to 88.8 degrees above the horizon (from 5.4 below); flat, face up, it
looked 85.3 degrees down; held as at first, it looked ahead again
([pictures](shots/): ahead, 90 left, up, down, 135 left).

## Results

| Check | Result |
|---|---|
| Client tests | 347 of 347 (6 new) |
| Client build | passes |
| `free-look-check.mjs` | 8 of 8 |
| On a phone, real sensor | not checked |

## Claim boundary

- The orientation events were synthetic. On iOS the `alpha` angle is relative to where the page started listening,
  which is all the free look needs; a phone whose compass drifts will turn the view with it.
- Looking straight up or down, the phone's heading means little, so the sideways look is held there until the phone
  comes back from the vertical.
