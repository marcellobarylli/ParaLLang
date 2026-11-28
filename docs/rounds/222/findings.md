# Round 222 findings

## Question

Does every character now speak at normal speed or slower?

## Finding

Yes, by construction: new road characters are drawn from rate 0.8 to 1, and every character's rate is capped at 1
when its voice is made (tested: a creature asks 1.05 and a sheet 1.15, both speak at 1; a slower rate is kept).

## Results

| Check | Result |
|---|---|
| Server suite | 632 pass (the road's voices within the new range, and spread across it) |
| Client suite | 392 pass |

## Claim boundary

Unit tests only; **not heard** on a phone. How fast a rate of 1 sounds depends on the system voice.

## Open items

None.
