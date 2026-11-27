# Round 191 findings

## Question

Can the legacy dungeons' rail camera be brought back on the road, and can the road's glide keep near the ground?

## Finding

The dungeon mode's director still had its walk; the road's legacy dungeon passed `walkFrom: null` and the phase
`approach`, so every gate encounter came by `dropPoses` (up to 36 m, across, and down). With `walkFrom` and the new
`enter`, a test walks in from the avenue at eye height (no frame moves more than 0.3 m), then from the Face Gate to the
Buttress Tree and the Root Court, never inside a wall of the plan. On the road, a glide on flat ground stays between
eye height and eye height plus 0.14 m, and on generated terrain no higher than 4 m over eye height above the ground.

## Results

| Check | Result |
|---|---|
| Client tests | 335 of 335 (2 new, 1 changed) |
| Client build | passes |
| In a browser | not checked |
| On a phone | not checked |

## Claim boundary

- The swell's height and length were chosen, not seen; they are `ROAD_CAMERA.bob` to tune.
- The glide's pace is unchanged (16 m/s), so it still moves faster than a walker.

## Open items

- The owner to watch a gate in Ta Prohm and a glide on the road, and say if the swell or the pace should change.
