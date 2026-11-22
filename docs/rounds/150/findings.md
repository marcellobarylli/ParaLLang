# Round 150 findings

## Question

Can the app's and the web's icon be a snapshot of the isometric map with a graph walk on it, legible when small?

## Finding

Yes, down to about 64 pixels. At 32 pixels the lake, the shore and a pale walk read; at 16 pixels (a browser tab on
a plain screen) only the lake and the land do.

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

Built as designed in [`architecture.md`](architecture.md). The landscape and the frame are the owner's
pick (seed 3; the Amendment). Claude's decisions, for the owner to overrule: the wider frame of the maskable icon
and a PNG in place of the SVG favicon.

## Evidence

`client/scripts/make-icons.mjs`, `client/src/__tests__/pages.test.js`, [`shots/`](shots/).

## Claim boundary

Not seen on a phone or in the Simulator. A phone that has the page on its home screen keeps the old icon until the
page is added again.

## Open items

- Issue #19 (the saved journey) is not built; the icon's walk is the map's trail as it is drawn today.
