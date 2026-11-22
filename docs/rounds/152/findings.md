# Round 152 findings

## Question

Does a name of 41 letters fit where the road's name is shown?

## Finding

Everywhere but the world map's label, which is now two lines.

## Method

The built web client played along the road by `client/scripts/road-shots.mjs` in headless Chromium at 390×844 and
1440×900, and the pictures looked at.

## Results

| Where | Result |
|---|---|
| The world map's label | One line ran off the map on a phone and over The Kiln's label. Two lines fit at both sizes |
| The "Set out on" button | Two lines at both sizes |
| The world map's list | Fits |
| The top bar | Fits on a desktop. A phone's top bar shows no place name (as before) |
| Tests | server 505 of 505, web client 258 of 258, the aesthetic package passes. The iPhone app's tests were not run: nothing of it changed |
| `road-shots.mjs` | plays to its end at both sizes |
| The old name | Left only in the earlier rounds' records, the status addenda, and the four "until round 152" notes |

Pictures: [the world map on a phone](shots/01-world-map-phone.jpg),
[on a desktop](shots/02-world-map-desktop.jpg), [the top bar on a desktop](shots/03-hub-desktop.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). The name is the owner's (issue #10). Claude's decisions,
for the owner to overrule:

- The narrator is told the new name as the place of a conversation ("… at The Unlikely Glade in The Journey 2:
  Journathan Returns (again)."). Before, it was told "in The Long Way Home".
- Comments in the code use the short form "The Journey 2".
- The earlier rounds' records keep the old name.

## Evidence

`content/world/atlas.yaml`, `server/src/road/encounters.js`, `client/src/atlas.js`, the tests named in the
architecture, [`shots/`](shots/).

## Claim boundary

Not seen on a phone. No model was called. On a phone the world map's heading stands under the top bar and
"Micromort Mountain" is cut at the map's left edge; both were so before this round and are not changed by it.

## Open items

- The owner's look at the name on a phone.
- A live narrator may make something of the title (it names Journathan). If it does, the scene can be told a plainer
  place name while the screen keeps the title.
