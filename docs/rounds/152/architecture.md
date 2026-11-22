# Round 152 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message "Please clear context
and start next issue"; the owner's words and the issue's are in [`trail/interview.md`](trail/interview.md). No
pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #10; [round 144](../144/architecture.md) (the road and its first name).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/world/atlas.yaml`, `server/src/road/encounters.js`, `client/src/atlas.js`,
  `client/src/components/DungeonScreen.jsx`, `client/src/components/Road.jsx`, `README.md`, `CLAUDE.md`,
  `docs/curriculum.md`, `docs/handoff.md`, `docs/rounds/152/shots/`.

## Goal

The endless road is called **The Journey 2: Journathan Returns (again)** wherever a player or a reader meets its
name. It was The Long Way Home.

## Design

**The name is data in two places**, as before: the world map's place in `content/world/atlas.yaml` and the server's
`ROAD_PLACE` in `server/src/road/encounters.js` (the name in the road's view, in an error message and in what the
narrator is told of the scene). A test holds the two equal.

**The web client reads it from the atlas** (`ROAD_NAME` in `client/src/atlas.js`). The top bar and the road's
loading card had it written out; they now use `ROAD_NAME`. The world map's label, list and "Set out on" button read
the atlas already.

**The world map's label is two lines.** At 41 letters the name does not fit one line of the map: on a phone it ran
off the right edge and over The Kiln's label. A name with a colon is set as two lines, broken after the colon
(`mapLabel` in `DungeonScreen.jsx`).

**Identifiers are unchanged**: the place's id `the_long_way`, the `road` field of a save, file and function names.
No save is touched.

**The documents** (`README.md`, `CLAUDE.md`, `docs/curriculum.md`, `docs/handoff.md`) use the new name and say once
that it was The Long Way Home until round 152, so that the earlier rounds' records can still be found. **Comments in
the code** say "The Journey 2". The earlier rounds' records and the status addenda keep the old name: they are a
record of their day.

## Tests

- `client/src/__tests__/dungeon-file.test.js`: the atlas's name is the new one, and the server's copy equals it.
- `client/src/components/__tests__/dungeon-screen.test.jsx`: the world map lists the new name and sets it as two
  lines.
- `client/src/components/__tests__/road-screen.test.jsx`: the button and the top bar.
- `server/test/road.test.js`, `server/test/road-weather.test.js`: what the narrator is told of the scene.
- `client/scripts/road-shots.mjs` plays the built client along the road in headless Chromium.

## Claim boundary

Seen in headless Chromium at a phone and a desktop size, not on a phone. No model was called: what the narrator
does with a place of this name is not seen. The iPhone app does not have the road and is unchanged.

## Outcome

See [`findings.md`](findings.md).
