# Round 149 findings

## Question

Can the Italian line and its English translation stand together, with the word buttons under them?

## Finding

Yes. The translation is directly under the line and the word buttons come after it.

## Method

A component test of the order; the built client in headless Chromium at 390×844 and 1440×900.

## Results

| What | Result |
|---|---|
| Tests | web client 257 of 257 (255 before the round). The server (505), the aesthetic package (87) and the iPhone app are untouched |
| The order | the line, its translation, the word buttons, the note |
| Playthrough | passes at both sizes, 43 pictures |

Picture: [the line and its translation together](shots/22-line-and-translation-desktop.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). One decision of Claude's: the note under a line whose
translation is already shown now speaks of word translations only.

## Evidence

`client/src/components/__tests__/bilingual-text.test.jsx`, `client/scripts/road-shots.mjs`, [`shots/`](shots/).

## Claim boundary

Not seen on a phone: on the phone's sheet the picture shows the line only, and the translation is a scroll below it.

## Open items

None.
