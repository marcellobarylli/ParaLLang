# Codex critique 1: typographic apostrophes (a Claude subagent stood in for Codex)

- **Dispatched:** 23:27 (journal row 3)
- **Returned:** 23:30 (notification; the subagent ran 122 s)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5), repo read access, read-only instructions. Codex was at its usage limit (reset 01:36 UTC 2026-11-06)
- **Prompt:** adversarial review of `plan-v1.md` against `language-engine.js`, `learning-service.js`, `content-loader.js`, `leak-scan.js`, `grading.txt`, the vocabulary YAMLs with apostrophes and existing tests; numbered Error/Risk/Gap items, then Optional
- **Reviewed input:** `plan-v1.md`, sha256 daee3cd5…, HEAD 9d9cb74, working tree docs/rounds/054/ only (the draft test `server/test/apostrophes.test.js` existed, unmentioned)
- **Findings:** 8

## Raw output (verbatim)

```text
1. **Error — Several of the planned "new" tests already pass on HEAD**
The success criterion says the new tests "fail on HEAD". Three of them will pass on HEAD:
   - **Review test.** `normalizeAnswer` (`server/src/language-engine.js:7`) already turns `'`, `‘` and `’` into a space, so the review test with `’` against "o'clock" passes today.
   - **"A `’` variant matches a `'` text".** If this uses *l'una*, it passes, because the `'` variants `è l'una` and `l'una` exist (`content/languages/it/vocabulary/fountain_riddles.yaml:247-248`).
   - **"NFD È plus `’`".** This passes against the real `luna` entry, because `è l’una` is itself a variant (line 249). Round 052 already covers NFD offsets.

   Fix: build the matcher tests on a synthetic entry that has only one apostrophe form, or use `ancora un po'` (`mortimer_party.yaml:37`). Then reword the criterion: the behaviour tests must fail on HEAD, and the regression guards (review, NFD) pass on both.

2. **Error — Plan item 5 is wrong for four of the six characters**
`gradeVocabularyAnswer` uses `normalizeAnswer`. Its strip class `[.,!?;¿¡:"'()“”‘’]` (`language-engine.js:7`) does not include `ʼ` (U+02BC), `` ` ``, `´` or `′`. `´` (U+00B4) is worse: NFKC (line 5) turns it into a space plus U+0301, so `o´clock` becomes `o ́clock` and is graded wrong.
The loader's ambient-overlap check uses the same function (`content-loader.js:328`). It therefore folds a different apostrophe set from the matcher.
Fix: call `foldApostrophes` inside `normalizeAnswer` before `.normalize('NFKC')`. Then one definition covers the matcher, the evidence check, reviews and the loader. Add a review test with `ʼ` or `´`; that one fails on HEAD.

3. **Risk — The evidence check is still exact on Unicode form and whitespace**
`playerInput.toLowerCase().includes(evidence.toLowerCase())` (`learning-service.js:489`) fails the same unfixable way in three more cases:
   - the player's text is NFD (pasted, or some keyboards) and the grader quotes NFC;
   - the player typed two spaces or a no-break space and the grader collapses it.

   Only `message.trim()` is applied (`submitDialogue`). Since this line is changing anyway, fold both sides the same way: `foldApostrophes`, `.normalize('NFC')`, `\s+` to `' '`, lowercase. Add one test with NFD input and NFC evidence.

4. **Risk — Folding `ʼ` changes word boundaries at all three matcher call sites**
U+02BC is `\p{L}` (Lm). Today it blocks the `(?&lt;![\p{L}\p{N}_])` and `(?![\p{L}\p{N}_])` boundaries in `language-engine.js:75`. After folding it is `'`, which is a boundary. So `lʼuna` newly yields matches, including any shorter entry such as `una` wherever the occupied-span rule does not shadow it.
This reaches:
   - narration chips (`learning-service.js:271`), and so which words help/reveal accepts;
   - the atmosphere filter (`learning-service.js:722`), which will now drop more lines as `'vocabulary'`.

   The plan only mentions the chips and the evidence check. Fix: name the atmosphere site in the plan and add an atmosphere test where a `’` or `ʼ` pack form is dropped and an apostrophe-free English line still passes.

5. **Risk — The grader may drop or add the trailing apostrophe of `ancora un po'`**
The variant ends in `'`, so the pattern needs `po'` (`mortimer_party.yaml:37`). If the grader returns `ancora un po` (models often trim trailing punctuation), presence passes but `excerptIds` (`learning-service.js:487`) is empty and the turn is `INVALID_GRADING`. A player who types `ancora un po` without an apostrophe can never match either. Fix: record this as a known residual, or plan an `ancora un po` variant as a content change with a version bump. Either way, test that a grader dropping the trailing apostrophe still fails, so the behaviour is pinned.

6. **Gap — The service tests do not name their path or fixture**
Run them through `submitDialogue` with a fake grader, not by calling `validateAssessment` directly. That way they exercise the real `playerInput: message` flow (`learning-service.js:525-528`) and the pass path (`required_target_groups`, line 496). Use an objective whose `target_vocabulary_ids` really contains the evidence id (Fountain time objective with `luna`, or Mortimer's party objective). Otherwise the refusal at line 486 masks the apostrophe check.

7. **Gap — Nothing on the iPhone side or the open items for the owner**
The bug's premise is that iOS Smart Punctuation sends `’` (and `‘` after a space). No test covers the mobile path: `mobile/src` does no normalization, and React Native's `TextInput` has no prop to turn smart quotes off. Per the sandbox rules, list an open item for the owner: in the Simulator, type `È l'una` and `Ancora un po'` with Smart Punctuation on and confirm the turn passes. Add a mobile or API test that sends a `’` message through to a pass.

8. **Gap — The plan does not record what does not need to change**
`foldWords` (`content-loader.js:270`), `fold` in `leak-scan.js:27`, `foldForAtmosphere` (`learning-service.js:22`) and the test-local `fold` (`fountain.test.js:144`) already turn every non-letter into a space, so they are apostrophe-agnostic. Say so in the plan so the next agent does not "fix" them. Also say whether the stored `vocabularyEvidence.evidence` (`learning-service.js:618-619`) keeps the grader's form, which may now differ from the player's characters. Nothing reads it today, but any future highlight would need to fold.

## Optional

- The plan relaxes `grading.txt` line 8 ("Evidence must be an exact excerpt") on the server side only. Note this in the plan; there is no need to change the prompt and move the golden prompts.
- Leave the now-redundant `l’una` and `è l’una` variants (fountain_riddles.yaml:249-250) in place as the plan says. Add a comment that they are kept to avoid a version bump, so a later cleanup removes them on purpose.
- Italian ASCII writers type `e'` or `perche'` for `è` / `perché`. This is not a regression, but worth a backlog line, since `e' l'una` still matches only via `l'una`.
- Keep `´` and `′` if they are wanted. They are rarely typed as apostrophes, and folding them mostly widens the atmosphere filter. Their offsets are 1:1 either way (BMP, single unit), so the offset claim holds.
- Add a matcher test for `po‘`, since iOS emits `‘` after a space or at the start of a line.
```
