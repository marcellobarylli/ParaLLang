# Round 187 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-26 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message and screenshot ("Finding the road…" while the hosted server wakes).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/DungeonScreen.jsx`, `client/src/components/__tests__/title-gate.test.jsx`.

## Decisions

1. **The title music fades when the game has begun**, not when the Journey button is pressed: while the road is being
   found (`mode` is `road` and no road has come back) the title still counts as the title, and the music goes on.
   Once the road is here, the 30 s fade starts as before (the camera's descent and the welcome card play over it).
2. **A road that cannot be found** ("The road is not here") keeps the title music playing until the player goes back
   to the title or the road arrives.

## Tests

`npm exec --workspace client -- vitest run` (331; 1 new), client build.

## Status

Merged to `main` and pushed; GitHub Pages deploys `main`.
