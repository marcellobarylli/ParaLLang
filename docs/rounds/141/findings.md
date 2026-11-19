# Round 141 findings

## Question
Do the boxes show all their text as it grows?

## Finding
In headless Chromium at 16 px Courier New: 1 line 44 px, 5 lines 128 px (all 124 px of text), 12 lines at the 268 px cap
(4 px short of the text), 30 lines the same cap, scrolling inside. Client tests pass. Not seen on the iPhone.

## Open items
- If the owner meant a different number of rows, it is the `12 * 22` in the two components.
