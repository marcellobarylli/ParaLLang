# Round 205 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 202 (the narrator's hosted voice), whose decision 1's direction this
  replaces.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js` (`NARRATOR_STYLE` and how it is joined to the text);
  `server/test/narrator-voice.test.js`.

## Decisions

1. **The direction is set apart from the text.** The request's text is headed notes (`# AUDIO PROFILE`,
   `### DIRECTOR'S NOTES`) ending "Speak only the words under TRANSCRIPT. Never say these notes or the headings
   aloud.", then `#### TRANSCRIPT` and the passage on the next line.
2. **The narrator's character** is the owner's: an old, slightly silly storyteller, whimsical, a little goofy and
   charming, who finds the story absurd and barely keeps a straight face; playful and warm, unhurried with bounce,
   comic beats leaned on. Words not in English are still said as a native speaker says them.
3. **Unchanged:** the model, the voice (Charon), the fallback to the device's voice, the clip caches.

## Tests

`npm test -w server` (618).

## Status

Built and tested with Google faked; nothing was heard. Merged to `main` and pushed on the owner's word ("Then
deploy"); GitHub Pages deploys the page and Render the server from `main`.
