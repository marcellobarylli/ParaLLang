# Round 088 plan v1: fixes from a review of rounds 054–064

**Source:** a read-only review of the code of rounds 054–064 (`trail/review-1.md`): one Error, two Minor; checked
by hand at HEAD. **Offline:** no LLM call.

## R1.1 (Error): a kept line can give away a due card's answer

`keptLines` (server/src/learning-service.js) and `lineHiddenBy` (mobile/src/components/Spellbook.js) hide a kept
line's translation only while one of its **stored** ids is due. Those ids are the line's chips: matched against the
current encounter's narration entries only, non-overlapping, longest first. So "Grazie, il caffè è ottimo." kept in
Gerald's coffee break (chips: grazie, ottimo) shows its translation while the *caffe* card (another encounter's
word) is due; "caffè nero" stored as `caffe_nero` does not hide for a due *caffe*.

**Fix.** At snapshot time, the server computes for each line `cardIds`: the stored ids plus every card of the
learner (any card, due or not) whose forms appear in `line.native` when matched **alone**
(`matchCanonicalVocabulary(native, [entry])`, so overlaps do not exclude each other). Hidden while any of
`cardIds` is due. The app's clock check uses `line.cardIds ?? line.vocabularyIds` (older servers). Cached per
(native, card id) in memory; at most 50 lines × the learner's cards per snapshot. Nothing changes in the save.

## R1.2 (Minor): the app keeps the shorter of two overlapping spans

`segmentLine` sorts same-start spans shortest first. Sort longest first (`b.end - a.end`), as the server matches.
The server never sends overlaps today.

## R1.3 (Minor): the 500-character cap can split a surrogate pair

`keepLine`'s `cap` drops a trailing lone high surrogate after `slice(0, 500)`. The native and translation cut at
different points remains (round 060 decision 4 capped them; NPC lines are far shorter).

## Tests

- server `test/kept-lines.test.js`: Italian, a line kept in a conversation whose chips do not include *caffe*: with
  the *caffe* card due, the line is hidden and `cardIds` holds `caffe`; a line with "caffè nero" (stored
  `caffe_nero`) is hidden for a due *caffe*; with no card due, shown; an English homograph is not an issue (cards
  only). A 500-character cap ending in an emoji keeps no lone surrogate.
- mobile: `lineHiddenBy` uses `cardIds` when present (a due card only in `cardIds` hides), falls back to
  `vocabularyIds`; `segmentLine` with two same-start spans keeps the longer.
- Full suite.

## Claim boundary

Tests only. The line's other target-language words that are not cards (not yet discovered) do not hide it: they
are no card's answer yet.
