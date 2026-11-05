# Round 058 plan v1: no two vocabulary entries share a folded form

Backlog F3 (new; round 057 critique, Optional: "a content lint for surface forms that collide after folding").
`matchCanonicalVocabulary` folds accents, case and (since round 054) apostrophes, and takes the longest form first;
two entries with the same folded form would be matched arbitrarily (sort order), so a chip, the grader-evidence
check and round 057's marks would name the wrong word. Checked today (`node` over both packs): 77 it entries, 72 es
entries, no shared folded form, no accent-only collision. A test pins it. No content change, no live calls.

## Design

`server/test/vocabulary-forms.test.js`, for each pack (`it`, `es`): fold every surface variant the way the matcher
does (NFD, marks stripped, lower case, `foldApostrophes`, whitespace runs to one space) and fail with the form and
both ids if two entries share one. Same-entry duplicates (an entry's `è l'una` and `è l’una`) are allowed.

The fold is imported, not copied: export `foldForm(text)` from `language-engine.js` and use it in
`matchCanonicalVocabulary` for variants, so the test and the matcher cannot drift.

## Tests

The new test passes on today's content; a fixture with two entries `año` / `ano` (es) fails it.

## Success

All server, mobile and client tests pass; matcher behaviour unchanged (existing matcher tests).
