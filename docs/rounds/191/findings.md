# Round 191 findings

## Question

Can the tilt look over 270 degrees without new jumps?

## Finding

Yes in tests: an upright phone turned 160 degrees looks 135 to the side, 120 the other way looks 120, the leash still
answers at once on the way back, and the director's eases are as smooth for the wider range as they were for the old.
Not tried on a phone.

## Results

| Check | Result |
|---|---|
| Client tests | 333 of 333 |
| Client build | passes |
| On a phone | not checked |

## Claim boundary

- With the phone tipped back (not upright), turning round is part yaw and part roll in the phone's frame, so the look
  turns less than the body; only the screen's vertical axis counts, as since round 125.
- At gain 1 a small shake of the hand shows one to one in the sideways look; the 0.12 s ease smooths it. Not felt.
