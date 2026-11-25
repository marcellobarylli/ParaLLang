# Round 180 findings

## Question

Does the journey open on a short message about learning by conversation, with the character behind it, before the
arrival's card?

## Finding

Yes, in tests and in headless Chromium at phone size. Not seen on a real phone or on the hosted page.

## Method

Component tests against the road server logic with no WebGL; the production build in headless Chromium, the title's
button pressed and the zoom down watched to its end.

## Results

| Check | Result |
|---|---|
| Client tests | 311 of 311 (1 new) |
| In the browser | no message during the zoom down; the message once the camera holds; no Talk button behind it; 358 × 502 on a 390 × 844 screen; Set out gives the arrival's card and is remembered ([shot](shots/01-welcome.jpg)) |

## Claim boundary

- The wording is Claude's draft on the owner's brief; the owner has not read it in the game.

## Open items

- The owner reads the message on the hosted page and adjusts the wording.
