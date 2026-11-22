# Round 150 findings

## Question

Can the app's and the web's icon be a snapshot of the isometric map with a graph walk on it, legible when small?

## Finding

Yes, down to about 32 pixels. At 16 pixels (a browser tab on a plain screen) the landscape reads and the walk is a
pale mark.

## Method

The icons written by the script, shown side by side in headless Chromium at 360, 180, 96, 64, 32 and 16 pixels,
with the round mask and the iPhone's rounded corners.

## Results

| What | Result |
|---|---|
| Tests | web client 258 of 258 (257 before the round). The server, the aesthetic package and the iPhone app's tests were not run: none of their code changed |
| The client build | builds; `dist/` holds the five icons |
| The walk | nine ways, ten sites, inside the maskable icon's safe circle |

Picture: [the icons at their sizes](shots/01-icon-sizes.png).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule: the
landscape (seed 42, picked from eight looked at), the closer view than the game's map, the walk's length, and a PNG
in place of the SVG favicon.

## Evidence

`client/scripts/make-icons.mjs`, `client/src/__tests__/pages.test.js`, [`shots/`](shots/).

## Claim boundary

Not seen on a phone or in the Simulator. Not deployed: the work is on the session branch.

## Open items

- The owner looks at the icon and says whether another landscape or walk is wanted (`ICON` in the script).
- Issues #22 and #14 stay open until the owner has seen it; #19 (the saved journey) is not built.
