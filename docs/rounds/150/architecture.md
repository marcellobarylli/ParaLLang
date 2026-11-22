# Round 150 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message "Pls implement top
issue on gh"; the owner's words and the issue's are in [`trail/interview.md`](trail/interview.md). No pre-run
commit; nothing here is frozen.

- **Design source:** GitHub issue #22 (and #14, which asks for the same with the sizes);
  [round 147](../147/architecture.md) (the road's map as an isometric picture); [round 114](../114/architecture.md)
  (the first icons and their script).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/scripts/make-icons.mjs`, `client/public/parallang-icon-*.png`, `mobile/assets/icon.png`,
  `client/index.html`, `client/public/manifest.webmanifest`, `client/src/__tests__/pages.test.js`,
  `docs/rounds/150/shots/`.

## Goal

The icon of the web app and of the iPhone app is a snapshot of the isometric map with a walk along the graph drawn
on it, in place of the gold archway.

## Design

`client/scripts/make-icons.mjs` draws the icon from the game's own code, so it is a picture of the game and not a
drawing of one:

1. The landscape of seed 42 (a lake's shore, a meadow and a wood) and its graph of sites.
2. A walk of nine ways from the graph's start: a hashed pick among the sites next door, new ones first. This is the
   rule of the rails in small.
3. The picture is `renderMap` of `client/src/roadMap.js` in a square frame of 42 map units (about 440 m across,
   closer than the map in the game, whose marks would be too small on an icon), 72 pixels across and shown large.
4. The marks are the map's own: the walked ways in cream along the ground, a green tile at each site, a white tile
   with a post and a flag where the walker stands, each with a dark edge. They are drawn at each icon's own size, so
   they stay sharp.

One picture serves every size. The walk and the flag lie inside a circle of 80 % of the side, so a round mask (the
maskable icon) cuts landscape only.

**Files.** 64 pixels for the browser tab (new; the SVG favicon is removed, since the picture is pixels), 192 and 512
and the maskable 512 for the manifest, 180 for the iPhone's home screen, 1024 for the Expo app
(`mobile/assets/icon.png`). All are RGB without transparency, which iOS requires of an app icon.

**Not in this round.** The saved journey and its "show Journey so far" toggle (issue #19). When the walk's look on
the map changes there, the script's marks should follow. The Expo app's splash picture is unchanged; nothing in
`app.json` uses it.

## Tests

`client/src/__tests__/pages.test.js`: the walk has nine ways and no site twice; every mark lies inside the maskable
icon's safe circle; the walked line's colour is in the 64-pixel picture; every file has its size and is RGB; the page
links the 64-pixel icon.

## Claim boundary

Seen in headless Chromium, not on a phone's home screen and not in the Simulator. The iPhone app's tests were not
run (the change there is one picture).

## Outcome

See [`findings.md`](findings.md).
