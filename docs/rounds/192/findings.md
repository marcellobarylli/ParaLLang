# Round 192 findings

## Question

Can trees be kept off the road, and can ferns, flowers and bushes be added within the triangle budget?

## Finding

Round the start of seed 4242 (seven by seven chunks) no kept tree or plant is within 1.6 m of a way, and some that
were are gone. Undergrowth on every detailed chunk (21) came to 75,862 triangles in the densest forest with models,
over the 64,000 budget; on the five nearest chunks the start is 62,049 with models (57,118 before) and the densest
forest 53,830. In the [screenshot](trail/undergrowth.png) the track is clear, and ferns, bushes and flowers of several
colours stand in the jungle.

## Results

| Check | Result |
|---|---|
| Client tests | 336 of 336 (1 new) |
| Aesthetic tests (triangle budgets) | 95 of 95 |
| Server tests | 614 of 614 |
| Client build | passes |
| Screenshot in Chromium | track clear; plants seen |
| On a phone | not checked |

## Claim boundary

- The start of seed 4242 with tree models is 1,951 triangles under the budget; more undergrowth needs a budget
  decision.
- Plants stop about one chunk (48 m) from the camera; the fog hides them from about 46 m.
- Tree crowns are not kept off the track, only trunks.

## Open items

- The owner to look at the plants on a phone and say whether they want more, fewer or other colours.
