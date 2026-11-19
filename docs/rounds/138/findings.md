# Round 138 findings

## Question
Does the text stay where the player scrolled it when an answer, a verdict or a reply arrives?

## Finding
By the code: the only automatic scroll left is on opening a conversation. 223 client tests pass. Not seen on the iPhone.

## Claim boundary
A reply that arrives below the visible text is not announced by any scroll; the player scrolls to it.

## Open items
- A small "new reply" marker at the bottom of the text, if the owner wants one.
