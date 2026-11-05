# Round 054 plan v1: typographic apostrophes in the vocabulary matcher

Backlog F2 (new, from the round 050 trap "Typographic apostrophes are not folded by matchCanonicalVocabulary").
No live LLM calls: a deterministic server change. Codex is at its usage limit until 01:36 UTC.

## Problem

An iPhone keyboard types a typographic apostrophe (U+2019 ’) with Smart Punctuation on, the default. Two server
checks compare the player's text exactly:

1. `matchCanonicalVocabulary` (`server/src/language-engine.js`) folds accents and case but not apostrophes, so the
   variant `ancora un po'` does not match "Ancora un po’" (checked: 0 matches vs 1). Only *l'una* carries a `’`
   variant today (round 050). The matcher feeds the narration chips and the grader-evidence check.
2. `validateAssessment` (`server/src/learning-service.js`) requires
   `playerInput.toLowerCase().includes(evidence.toLowerCase())`. When the player types `’` and the grader quotes the
   evidence with `'` (models normalise punctuation), the check fails and the turn is `INVALID_GRADING` (retryable),
   and the retry with the same answer fails the same way: a correct answer can never pass.

## Design

1. `foldApostrophes(text)` in `language-engine.js`: replace U+2019 ’, U+2018 ‘, U+02BC ʼ, U+0060 ` , U+00B4 ´ and
   U+2032 ′ with U+0027 '. Each is one UTF-16 unit replaced by one, so offsets are unchanged.
2. `matchCanonicalVocabulary` applies it to each folded cluster piece and to every variant form. Excerpts,
   `start`/`end` still index the source text (the excerpt keeps the player's or NPC's own apostrophe).
3. `validateAssessment`'s presence check compares `foldApostrophes(x).toLowerCase()` on both sides.
4. Content unchanged: the `’` variants of *l'una* stay (now redundant, harmless: the occupied-span rule drops the
   duplicate match). No version pins move.
5. `gradeVocabularyAnswer` (reviews) already strips both apostrophes: unchanged, covered by a test.

## Tests

- Matcher: `po’`, `po‘`, `poʼ` match `ancora un po'`; a `’` variant matches a `'` text; excerpt and offsets index the
  source (excerpt keeps `’`); a decomposed accent plus `’` (`È l’una` with NFD È) still gives the right offsets.
- Service: a grader that quotes evidence with `'` while the player typed `’` passes (Fountain `luna` or Mortimer's
  tasting); the reverse too; evidence absent from the answer is still refused.
- Review: `gradeVocabularyAnswer` accepts `’` for an accepted translation with `'` (English "o'clock"-style).
- Golden prompts unchanged (Gerald), all suites green.

## Success

All server, mobile and client tests pass; the new tests fail on HEAD (shown by running them before the fix).
