# Critique 1: a share estimate that survives glitched English and gloss translations (Codex)

- **Dispatched:** 21:02:55 UTC
- **Returned:** 21:04:10 UTC
- **Model:** codex-cli 0.166.0 (`codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`), model gpt-6.1-sol, effort high, read-only; session 01a1ad85-ae21-7ca1-a7cf-bc67ae2cfd40; no file access (bundle on stdin)
- **Prompt:** "You are an adversarial reviewer. Do not run any commands or read files: everything you need is in the bundle on stdin (a design plan, docs/rounds/046/trail/plan-v1.md, then cat -n excerpts of the code and data it uses). Critique the plan: find Errors (wrong or will not work), Risks and Suggestions, especially in the folding rules (could they turn a target-language word into an English one, or miss glitch characters?), the 60% gloss threshold, the ground truth and its size, overfitting to 20 lines, and the tests. Reply with a numbered list; each item starts with its type (Error / Risk / Suggestion), a one-line title, a short explanation and a concrete fix. Optional nits under a final 'Optional' heading, unnumbered. Under 500 words."
- **Reviewed input:** `plan-v1.md`, sha256 8894675c095381a5201279d12b9e03591bd60a479a24a6738d6e17bd7fe8d2c7, HEAD a3bc16b, in a 111-line bundle (sha256 a349ea92cf3f8fcb…): plan-v1, play-market.js lines 95–113, play-market.test.js lines 1–30, the iteration 12 sections of round 026's hand-count.md
- **Findings:** 9 (3 Errors, 5 Risks, 1 Suggestion)

## Raw output (verbatim)

```text
1. **Risk — Folding erases real language distinctions.** Spanish `papá` folds to English `papa`; collapsing every repeated letter also merges legitimate spellings. A collision becomes false English evidence. **Fix:** retain original tokens, record matches introduced by folding, and test genuine target words against English collisions before adopting each rule.

2. **Risk — Glitch coverage remains incomplete.** The substitutions miss characters such as `æ`, `œ`, and dotless `ı`. If folding follows the existing tokenizer, internal combining marks can split decomposed words before normalization. **Fix:** normalize comparison text before tokenization, explicitly define supported glitches, and test composed/decomposed equivalents and unsupported characters.

3. **Risk — The 60% rule is unvalidated.** Legitimate translations can be shorter because of language structure or repetition; a long gloss can exceed 60%. Token length does not establish translation fidelity. **Fix:** evaluate labeled translations and glosses across several thresholds, report false positives/negatives, and describe this flag as a length warning.

4. **Error — Null estimates make success undefined.** Flagging difficult lines removes their folded errors. Averaging remaining predictions against the full baseline can manufacture improvement; “no line worse” also has no meaning for nulls. **Fix:** compare both estimates on identical covered rows, report abstention coverage separately, and define acceptance criteria for excluded rows.

5. **Error — Ground truth uses a different denominator.** Hand counts exclude names, while `languageShare` counts every token. These fractions do not measure the same quantity. **Fix:** establish one annotation/tokenization policy and either recount names consistently or apply identical exclusions to both evaluated estimates.

6. **Error — The second gloss case is unidentified.** The supplied 20-row ground truth explicitly identifies only Spanish tour Marginalia as a gloss. “Again” does not locate another included case. **Fix:** enumerate both intended report records and translations; add the missing labeled case or correct the acceptance criterion.

7. **Risk — Twenty greetings encourage overfitting.** Half the rows are Errata greetings, and the rules address already observed failures. Aggregate improvement may largely reflect that concentration. **Fix:** treat these rows as development data; reserve additional encounters, languages, glitch patterns, and translation styles for independent evaluation. Report subgroup errors.

8. **Risk — Hand counts lack reproducibility checks.** Rounded fractions and unstated rules for loanwords, shared words, and glitches can obscure annotation disagreement. **Fix:** store token-level labels, exact numerator/denominator counts, stable source identifiers, and independent adjudication of ambiguous cases.

9. **Suggestion — Expand tests around failure boundaries.** One repaired sentence and one unchanged Italian example provide little protection. **Fix:** add collision negatives, legitimate doubled letters, decomposed marks, empty inputs/translations, threshold equality and neighboring values, and long glosses. Update the existing empty-input deep equality for the advertised return shape while preserving assertions on legacy fields.
```
