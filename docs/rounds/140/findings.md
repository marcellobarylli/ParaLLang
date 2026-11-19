# Round 140 findings

## Question
Does the text stay where the player scrolled it when a reply arrives?

## Finding
Unverified. The code now puts the position back after any scroll the player did not make. Not reproduced or watched.

## Claim boundary
Momentum scrolling lasts longer than 1.8 s on a very long flick, and a jump inside that time would be taken as the
player's. A jump of another kind (the whole panel resizing) is not covered.

## Open items
- The owner tries it on the iPhone after reloading the page.
