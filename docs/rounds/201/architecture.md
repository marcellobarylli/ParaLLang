# Round 201 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 129 (the correction's practice box).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/CorrectionCard.jsx`; its test in
  `client/src/components/__tests__/camera-wiring.test.jsx`; `client/scripts/beginner-check.mjs`.

## Decisions

1. **The practice box never says no.** A try that matches the corrected sentence (capitals, accents and punctuation
   aside) gets "✓ That's it.", as before. Any other try gets "✓ Yeah, pretty good. You probably said it right.", in
   the same green. The box is for trying the sentence, and the microphone mishears; the straight face is the joke.
2. **Removed:** "Not quite. Look again at: …" and its list of words. `differingWords` stays in `practice.js`, unused
   by the card.
3. **Unchanged:** the practice sends nothing and costs nothing; an empty box cannot be checked.

## Tests

Root `npm test`; `npm run build -w client`.

## Status

Built and tested; not seen in a browser or on a phone. Merged to `main` and pushed on the owner's word.
