# Round 187 findings

## Question

Can the title music go on while the server wakes, and fade only once the game has begun?

## Finding

Yes: in a test, setting out with no road yet leaves the music alone, and the fade starts once the game has begun.
Not heard on the phone.

## Results

| Check | Result |
|---|---|
| Client tests | 331 of 331 (1 new) |
| Client build | passes |
| Heard on a phone | not checked |

## Claim boundary

- The test stands in for "the road has arrived" with the store's own state; the fade's timing on the hosted page was
  not heard.
