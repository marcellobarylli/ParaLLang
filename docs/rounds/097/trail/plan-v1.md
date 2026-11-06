# Round 097 plan v1: fixes from a review of the live-run scripts and the prompt builder

Source: `review-1.md` (10 findings) on `server/scripts/` and `server/src/llm/prompt-builder.js` at HEAD f42b40b.
No committed report is affected (the review found no report with a retried narration).

## Accepted

1. **R1.1 (Error): a retried narration is one report line.** The play-market provider wrapper records whether a
   narration call is the guard's retry (its last message starts with `CORRECTION:`, from `correctionNote`). A new
   exported `narrationLines(calls, keptNatives, { ratioFor, share })` groups each narration call with the retry that
   follows it; the line is the one the service kept, found as the committed transcript's NPC line of that turn
   (`keptNatives[turn]`), else by the service's rule (`lacksTarget` of the retry); the other is reported as
   `retried: { kept: 'first' | 'retry', rejectedNative }`. Turns count groups, so `requestedRatio` and shares stay
   on their turns. Test: calls [greeting (English only), its retry, a reply] with the transcript's natives give two
   lines, turn 0 the retry with `retried.kept: 'retry'`, turn 1 the reply; a failed retry keeps the first.
2. **R1.2 (Error):** follows from 1 (no extra line, so the scan's count holds); the scan also ignores any line marked
   `rejected` (defensive). Test: a report built with a retried greeting is scanned, not skipped.
3. **R1.3 (Error): the scan follows the encounter's order rule.** `openObjectives(objectives, turns, k,
   { unordered })`: unordered, every objective that passed in an earlier turn is closed; ordered, each turn closes the
   leading run of still-open objectives in authored order that passed in that turn (verdicts looked up by id), as
   `submitDialogue` does. Test: Mortimer's tasting (`ask_more` passed while `like_it` failed, then `like_it`): both
   closed; ordered verdicts listed out of authored order still close.
4. **R1.4 (Gap, false fail): `verify-cli` compares by objective id** (`objectives.map((o) => results.find(...).passed)`).
   Test: an exported `observedVerdicts(objectives, results)` gives `[true, false]` for results listed in reverse.
5. **R1.9 (Minor): echo needs one earlier message** holding the form (`messages.some`), for exact and word hits, as
   the foreign check already does. Test: a two-word form split over two messages is a leak, not an echo.

## Deferred or rejected

- R1.5 (scan the narrative, footnote and grading feedback): deferred; a new kind of hit changes the scan's totals,
  better with fresh live reports to read.
- R1.6 (earlier player turns unframed for the narrator), R1.7 (the grader's context without speakers), R1.8 (the
  narrator sees `accepted_examples`): deferred to a live round; each changes a prompt and needs a measurement
  (round 095 R1.7 is the same as R1.6).
- R1.10 (the share tokenizer): rejected for now; changing it breaks comparison with forty rounds of reported shares.

## Claim boundary

Tests with stubs; no live run. The scripts' outputs on old committed reports do not change except where the scan's
order rule (R1.3) or echo rule (R1.9) applies.
