# Round 149 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message with a picture of the
live game on a phone; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit;
nothing here is frozen.

- **Design source:** the owner's request; [round 148](../148/architecture.md) (lines in the language only, with
  their translation); [round 142](../142/architecture.md) (the translation's sentences share colours with the
  line's).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/BilingualText.jsx`, `client/src/index.css`,
  `client/src/components/__tests__/bilingual-text.test.jsx`, `docs/rounds/149/shots/`.

## Goal

Nothing between a character's line and its English translation. The word buttons go under the translation.

## Design

A line was drawn as: the line, the word buttons, the translation. Round 148 made the translation show with every
line at 100 %, and the buttons then stood between the two coloured texts, which are meant to be read against each
other. Now the order is:

1. the line;
2. its translation, directly under it (or "Translate sentence" while the translation is still a hint);
3. the word buttons;
4. the note about hints. Where the translation is already shown, the note says "Word translations use your
   companion hint allowance.", since only the words cost a hint there.

The web client only. Nothing on the server changes.

## Tests

`client/src/components/__tests__/bilingual-text.test.jsx`: the translation is the line's next element and the words
come after it, with the translation shown and with it still a hint. `client/scripts/road-shots.mjs` fails if
anything stands between the two.

## Claim boundary

Seen in headless Chromium, not on a phone. The iPhone app's line is as it was.

## Outcome

See [`findings.md`](findings.md).
