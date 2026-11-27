# Round 188 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/InputBar.jsx`, `client/src/components/__tests__/camera-wiring.test.jsx`.

## Decisions

1. **The microphone is a toggle.** A tap switches it on and a second tap off. The browser's recognition still ends
   each stretch after a silence (`continuous` stays false: iOS Safari repeats words in continuous mode), and while
   the microphone is on the bar starts the next stretch at once. Each stretch adds its words after what the box holds.
2. **The language button works while it listens.** It ends the current stretch; the next one starts in the other
   language, and the microphone stays on.
3. **What still switches it off:** sending (the character's spoken answer would otherwise be written into the box),
   the bar being disabled, a refusal (said under the box as before), and three stretches in a row that end within a
   second with nothing heard (a browser that will not listen would otherwise start and end without pause; it reads
   as "Listening could not start").

## Tests

`npm exec --workspace client -- vitest run` (332; 1 new, 1 changed), client build.

## Status

Merged to `main` and pushed; GitHub Pages deploys `main`.
