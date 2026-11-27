# Round 193 findings

## Question

What makes the ground just under the player warp while moving, and does the fix remove it?

## Finding

The ground is cut into 6 m quads. The PS1 shader maps textures affinely (linear in screen space, no perspective
divide), and a quad seen from eye height right under the camera spans much of the screen, so its texture shears into
long diagonal streaks that slide as the camera moves ([before](trail/before.png): the lower frames). With the mapping
perspective-correct out to 5 m and affine from 16 m, the same glide shows a steady texture under the camera
([after](trail/after.png)). The two runs are at different hours of the game's clock, so the light differs.

## Results

| Check | Result |
|---|---|
| Aesthetic tests | 95 of 95 |
| Client tests | 336 of 336 |
| Client build | passes |
| A glide in Chromium (SwiftShader), before and after | streaks under the camera, then none |
| On a phone | not checked |

## Claim boundary

- Checked on the road only; the legacy dungeons take the same shader, and their near walls and floors are now
  perspective-correct too, unseen.
