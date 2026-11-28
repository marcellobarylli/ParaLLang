# Round 210 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 206 (the notes above a marked transcript), round 209 (the voices).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js` (`NARRATOR_STYLE`); `server/test/narrator-voice.test.js`.

## Decisions

1. **A fantasy storyteller, played straight:** rich, warm and assured, a quiet sense of wonder, gentle gravity in the
   mysterious moments and lightness in the bright ones; measured pace; no comic voices, winks or exaggeration. The
   humour is left to the text.
2. **One set of notes for every voice**; they name no "he" or "she", so round 209's grandmother and grandfather go.
3. **Unchanged:** the layout (notes, then the transcript; only the transcript spoken), foreign words said as a
   native says them, Algenib the default, the six voices in Settings.

## Tests

`npm test -w server` (620).

## Status

Built and tested with Google faked; not heard. Merged to `main` and pushed; Render deploys the server from `main`.
