# Round 194 findings

## Question

Why does tilt to look do nothing in a conversation on the road?

## Finding

It was never built there: round 125 gave the tilt to the dungeon's view alone (DungeonView passes it to levelView,
whose director turns the look). On the road the setting was not passed to RoadView, and the road's director had no
look. With both added, a test turns the hold's line of sight by the full range without moving the camera, and a glide
is untouched; in the real road view in Chromium a fake tilt of 0.2 rad turned the conversation's view by 0.18 rad
(the hold's own sway the rest).

## Results

| Check | Result |
|---|---|
| Client tests | 337 of 337 (1 new) |
| Client build | passes |
| Road view in Chromium, fake tilt | turns the view |
| On a phone, real sensor | not checked |

## Claim boundary

- The phone's sensor path (permission, events) is the dungeons', unchanged; it was not tried on a phone here.
