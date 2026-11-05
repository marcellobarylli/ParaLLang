# Round 046 plan v1: a share estimate that survives glitched English and gloss translations (round 026 open item 2)

`languageShare` in `server/scripts/play-market.js` estimates the target-language share of an NPC line as the share
of its tokens absent from the English `translation` (`notInTranslation`). Round 026's hand counts show two failures:
Errata's glitched English ("procedùre", "yoùù", "ŧhe") is absent from its clean translation, so it counts as
target language (0.91 by estimate, 0.45 by hand); and when the model writes a one-line gloss instead of a
translation (Marginalia, es), almost every word counts (0.92 against 0.40). No live calls (data from round 026).

## Decisions (autonomous, pending owner review)

1. Add a second estimate, `folded`, beside the old one (kept unchanged, so earlier reports stay comparable):
   tokens are folded before comparison — NFD with marks stripped, the glitch letters ŧ→t, ø→o, ł→l, đ→d, ß→ss, and
   runs of a repeated letter collapsed to one ("yoùù" → "you", "errror" → "eror", on both sides).
2. A `translationShort` flag when the translation has fewer than 60% as many tokens as the line: the estimate is
   then unreliable, and `folded` is reported as null.
3. Ground truth: the 20 greetings hand-counted in iteration 12 (`docs/rounds/026/results/hand-count.md`: 8 of
   Errata's replays, 12 tour greetings). Success: `folded` has a lower mean absolute error against the hand count
   than `notInTranslation`, with no line worse by more than 0.10; the two gloss lines are flagged.

## Design

- `languageShare` returns `{ tokens, notInTranslation, folded, translationShort, canonical }`.
- `docs/rounds/046/results/evaluate.mjs` reads the 20 lines from the round 026 reports, the hand counts from a small
  table in the script (copied from `hand-count.md`, with the report and line each comes from), and prints both
  errors per line and the means.
- `tour-measure.mjs` and other round scripts are not changed.

## Tests

- `play-market.test.js`: Errata-style line ("Cøntainment procedùre: yoùù sign hëre.") with a clean translation:
  `folded` 0 for the English part; an Italian line unchanged between the two estimates; a gloss translation sets
  `translationShort` and `folded: null`; the existing assertions on the old fields hold.
