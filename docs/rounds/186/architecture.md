# Round 186 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 132 (the panel's drag handle and its limits).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/SheetHandle.jsx`, `client/src/index.css`,
  `client/src/components/__tests__/panel-layout.test.jsx`.

## Decisions

1. **The conversation panel opens full.** Its height before the player drags it was 62 % of the screen; it is now the
   room under the top bar, the height a drag to the top gives (`sheetLimits().max`). SheetHandle writes it to
   `--sheet-full` on the panel and measures again when the window changes size. The 62 % stays as the fallback.
2. **A dragged height still wins** and is kept from one conversation to the next (round 132), so a player who wants
   to see the character drags the panel down once.
3. **Wide screens** (1100 px and more) are unchanged: the panel is a full-height side panel there already.
4. **Deployed with rounds 184 and 185**, on the owner's word.

## Tests

`npm exec --workspace client -- vitest run` (330; 1 new), client build.

## Status

Merged to `main` and pushed with rounds 184 and 185; GitHub Pages and Render deploy `main`.
