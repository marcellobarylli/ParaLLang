# Round 136 findings

## Question
Is the font Courier New, and does a reply put the text at the start of that reply?

## Finding
By the code and the 223 client tests, yes. Not watched in a browser or on a phone.

## Claim boundary
The 3D labels and the PS1-style panels inherit the font; a few rows may now wrap differently in monospace. The scroll
uses the reply's measured position, so a reply taller than the panel shows its start, not its end.
