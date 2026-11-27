# Round 195 findings

## Question

Can the road always use the tree models, with the code for the simple trees removed?

## Finding

The setting can go; the simple trees cannot without a cost. The simple trees are not only the "Tree models off"
choice: with models on, they are still the trees of every chunk beyond the nearest five, and the trees shown until the
model file has loaded. Built for all 81 chunks around seed 4242's start, models come to 417 482 triangles and the
simple trees to 48 768, against the style's 64 000 for a scene. The owner chose to remove the setting and keep the
simple trees for the far chunks.

With the seed pinned to 4242, the build before and after the change draw the same scene at the first site
(70 732 triangles in both, the same per material). **That is over the 64 000 budget before this change too**: the
budget check of `models-check.mjs` fails on `main` at seed 4242. With a random seed (the title's, as the game plays)
the counts in six runs went from 26 633 to 76 371. The overrun was not looked into; round 192's undergrowth and the
kept ring of model chunks are where to start.

`models-check.mjs` had not run since round 175 (it tapped an "Enter" button the title no longer has, expected exactly
five model chunks after the descent, and opened Settings outside the Menu). It now plays the current flow, pins the
seed (the title chooses it, so the script's `seedSource` no longer did), and checks that Settings has no switch.

## Results

| Check | Result |
|---|---|
| Client tests | 337 of 337 |
| Aesthetic tests | 95 of 95 |
| Client build | passes |
| `models-check.mjs`, seed 4242 | model file asked for once; model chunks near the camera; no "Tree models" in Settings; **fails the 64 000 budget (70 732), as `main` does** |
| On a phone | not checked |

## Claim boundary

- The same scene before and after was compared at one seed and one site, in headless Chromium.

## Open items

- The road's scene at seed 4242's first site is over the 64 000 triangle budget, before and after this round.
