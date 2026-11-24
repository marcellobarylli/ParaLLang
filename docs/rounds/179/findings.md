# Round 179 findings

## Question

Can a save slot be deleted, and the progress of the game being played reset?

## Finding

Yes, in tests and in headless Chromium. Not seen against the hosted server or on a phone.

## Method

Store tests of `deleteSlot` with a stub server; the production build in headless Chromium, the menu's Save slots with
three slots set, Start over pressed once.

## Results

| Check | Result |
|---|---|
| Client tests | 310 of 310 (2 new) |
| In the browser | slot 1 (playing) shows Start over, then "Really start over" with "This deletes this game's progress for good and starts a new game in this slot."; slot 3 shows Play and Delete ([shot](shots/start-over.png)) |

## Claim boundary

- The deletion on a real server and the reload into a new game were tested with stubs, not on the hosted page.

## Open items

- The owner starts over or deletes a slot on the hosted page.
