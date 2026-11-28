# Round 219 findings

## Question

Can the road be made softer (warm daylight, a soft blue, greens that are not neon) and its sunrises and sunsets
longer, without changing the other levels?

## Finding

- **Softer, warm daylight.** At noon the grass and the palms are a sage green rather than a neon one, the haze at the
  horizon is a warm cream, and the sky keeps its blue, paler. The grade is the road's only; the dungeons and the app
  are unchanged.
- **The twilight colours stay.** Sunset keeps its orange horizon under a purple sky, a little hazier.
- **Longer sunrises and sunsets.** The sun is between height 0.24 and -0.17 for about 5.9 minutes at each end of the
  day, against about 3 before (measured over the phase in steps of 1/20000).

## Method

The suites, then `client/scripts/soft-check.mjs` (new) in headless Chromium at phone size: the road's first site with
the panel hidden, the weather pinned clear at five phases, once on this round's build and once on the previous
commit's (in a git worktree), the same seed and place in both.

## Results

| Check | Result |
|---|---|
| Server suite | 632 pass |
| Client suite | 391 pass |
| Aesthetic suite | 96 pass (the noon clouds' "white" test needed the day's cloud colour at `#fffdf8`) |
| Mobile suite | not run: its dependencies (jest) are not installed in this container; the app's pipeline keeps the default grade 0 0 0 |
| `soft-check.mjs` | five pictures each, before and after |

## Evidence

[`shots/`](shots/) (after) and [`shots/before/`](shots/before/): `1-morning`, `2-noon`, `3-golden-hour`, `4-sunset`,
`5-sunrise`.

## Claim boundary

Seen in headless Chromium with software WebGL at phone size, **not on a phone**. The grade's strength is a judgement
from those pictures; the owner's eye decides.

## Open items

- The owner to look on the phone and say whether the greens or the warmth want more or less (`GRADE` in
  `client/src/scene/roadView.js`), and whether the dungeons should take the grade too.
