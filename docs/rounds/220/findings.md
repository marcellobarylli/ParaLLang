# Round 220 findings

## Question

Does the breathing give the player more time before the breath in, with the dial starting 70 degrees before it?

## Finding

Yes: the light starts at 290 degrees clockwise from north and reaches the top after about 1.94 s, where the breath in
begins. Every breath after it keeps its time; the breathing ends about 0.7 s later than before.

## Method

The client suite, with the breathing's tests set to the new lead-in.

## Results

| Check | Result |
|---|---|
| Client suite | 392 pass |

## Claim boundary

Tested in jsdom; **not seen in a browser or on a phone**.

## Open items

None.
