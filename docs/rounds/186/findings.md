# Round 186 findings

## Question

Can the conversation panel cover the whole screen by default, instead of leaving the character in view?

## Finding

Yes: before it is dragged, the panel is as tall as a drag to the top makes it. Tested in jsdom with a 844 px screen
and a top bar ending at 104 px (the panel 740 px tall); not seen on a phone.

## Results

| Check | Result |
|---|---|
| Client tests | 330 of 330 (1 new) |
| Client build | passes |
| Seen on a phone | not checked |

## Claim boundary

- On iOS the height is measured from the layout when the panel appears and on each resize; whether Safari's
  toolbars coming and going leave a gap or an overlap was not seen.

## Open items

- The owner checks the panel on the iPhone after the deploy.
