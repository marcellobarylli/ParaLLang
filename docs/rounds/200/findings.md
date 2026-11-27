# Round 200 findings

## Question

Can the legacy dungeons have the road's free look (round 199)?

## Finding

Yes. The dungeon's director kept its own copy of round 125's look: a range of 0.25 rad sideways and 0.18 up or down,
a 0.12 s ease and its own turn of the sight, fed by the small tilt (`createTilt`). Both directors now take the range,
the ease and the turn from tilt.js, and the dungeon's view uses the free look.

In headless Chromium at Portia's site in Ta Prohm, with synthetic `deviceorientation` events: a turn of the phone
120 degrees to the right turned the camera's sight 120.2 degrees; a quarter turn to the left, 89.5; turned 170, it
stopped at 132.8; on past the back (200) it stayed at the edge (132.7), and 20 degrees back answered at once
(112.9). Tilted right back it looked 88.8 degrees up; flat, face up, 86.0 down; held as at first, it looked ahead
again. The road's check gave the same as in round 199 with the shared turn
([pictures](shots/)).

## Results

| Check | Result |
|---|---|
| Client tests | 338 of 338 |
| Client build | passes |
| `free-look-check.mjs … dungeon` | 8 of 8 |
| `free-look-check.mjs … road` | 8 of 8 |
| On a phone, real sensor | not checked |

## Claim boundary

- In the dungeon the sight was read from the director's pose, which the camera is set to each frame; the road's
  from the rendered camera.
- The orientation events were synthetic; no phone was used.
