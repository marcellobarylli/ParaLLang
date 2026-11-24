# Round 178 findings

## Question

Can the player keep up to three games in one browser and switch between them, so that progress can be reset in one
without losing another?

## Finding

Yes, in tests and in headless Chromium. Not seen on a phone or against the hosted server.

## Method

Unit and store tests of `slots.js` and the store's slot actions; the production build in headless Chromium with three
slots set in storage, the menu opened and the sheet read and photographed.

## Results

| Check | Result |
|---|---|
| Client tests | 308 of 308 (3 new) |
| Server tests | 592 of 592 |
| In the browser | the sheet lists slot 1 (playing; 12 conversations, 2 words, saved Nov 24), slot 2 (Empty, New game), slot 3 (Play, Empty; a second press to confirm) ([shot](shots/save-slots.png)) |

Found on the way: the shared sheet background follows the panel-opacity setting and let the title show through; the
slots sheet is opaque.

## Claim boundary

- Slots live in one browser: another browser or device has its own three.
- The reload into a slot was tested with a stub, not by reloading a real page.
- An emptied slot's save stays on the server (and in the GitHub saves branch when that is set).

## Open items

- The owner tries a reset in slot 2 or 3 on the hosted page.
