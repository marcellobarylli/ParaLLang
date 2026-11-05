# Codex critique 1: round 013 The Old Bookshop and The Journey

- **Dispatched:** 2026-11-05T12:58:50Z
- **Returned:** 2026-11-05T13:07:50Z (approximate: the output file was complete when checked at 13:08:07)
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high`; session 01a1abca-66a6-7581-a593-e648b5ffd9e2
- **Prompt:** the codex-critique template, preceded by the no-commands preamble, plus "Number your findings 1, 2, 3, ..." (verbatim prompt below the output)
- **Reviewed input:** `plan-v1.md`, sha256 5603360c59dff7312e4afbb7be5e2c2bad54d783055014cecf0417ca298b377a, HEAD b965253, working tree untracked `docs/rounds/013/`. Stdin bundle sha256 081175f59c227506ff202ae402839b0e9155edfa36c5a94def9e4ca49ab15ff7 (1201 lines): `cat -n` of docs/rounds/013/trail/plan-v1.md, server/src/content-loader.js, server/src/llm/prompt-builder.js, prompts/language/grading.txt, prompts/system/base.txt, content/narration/style_guide.yaml, content/languages/it/encounters/cracked_fountain_letharger.yaml, content/languages/it/vocabulary/fountain_riddles.yaml, content/characters/enemies/letharger_flick.yaml, content/world/locations/old_bookshop.yaml, content/world/connections.yaml, server/test/fountain.test.js, server/scripts/play-market.js, server/src/language-engine.js
- **Findings:** 5

## Raw output (verbatim)

```text
1. **Error — medium: the Spanish accent-sensitivity claim is false.**

   **Evidence:** [plan-v1.md:31](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:31) requires accent-sensitive `años`. [language-engine.js:49](/work/ParaLLang/server/src/language-engine.js:49) folds both text and vocabulary variants unconditionally; it never checks `accent_insensitive`.

   **Failure:** Given narration containing `anos`, the matcher identifies the authored `años` entry and produces the wrong vocabulary match. Setting the YAML flag to false does not prevent this.

   **Smallest fix (−):** Omit the Spanish years vocabulary entry. Keep `años` in the passage; neither objective requires it. This preserves content-only scope.

2. **Error — high: the quotation exception misses the grader’s third-person prohibition.**

   **Evidence:** [plan-v1.md:28](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:28) addresses reusing quoted words, but [grading.txt:5](/work/ParaLLang/prompts/language/grading.txt:5) separately rejects third-person attribution.

   **Failure:** Asked what name Journathan gave, a learner answers `Ha detto «Nessuno».` or `Dijo «Nadie».` These correctly demonstrate comprehension, but the shared grading instruction rejects precisely that form of answer. The proposed bare-word playthroughs do not exercise this conflict.

   **Smallest fix (0):** Replace the planned reuse constraint with an explicit reading-context exception permitting answers about Journathan, including reported speech and quoted names. Use the existing second Italian run to exercise one such answer.

3. **Error — high: transporting the passage into the prompt does not establish its delivery.**

   **Evidence:** [plan-v1.md:18](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:18) infers “so she reads it” from inclusion in learning data. [prompt-builder.js:21](/work/ParaLLang/server/src/llm/prompt-builder.js:21) merely serializes `intent`; it does not display it. It also omits the objective’s `prompt` field.

   **Failure:** Marginalia can ask where Journathan is going without presenting the source passage. The proposed assertion that the passage reaches the system prompt still passes, while the player receives no book fragment.

   **Smallest fix (0):** Put an explicit instruction to read the supplied passage before asking its comprehension question into each `intent`, including the question there. Make observing that sequence a requirement of the already planned live check.

4. **Cut — medium: rejecting every copied whole sentence excludes valid comprehension answers.**

   **Evidence:** [plan-v1.md:29](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:29) imposes this blanket rejection.

   **Failure:** In response to “where is Journathan going?”, `Il suo viaggio verso casa dura vent'anni.` selects the relevant sentence from the passage and correctly supplies the destination. The plan nevertheless rejects it. Sentence copying alone does not distinguish a responsive answer from irrelevant recitation.

   **Smallest fix (−):** Remove the blanket whole-sentence prohibition. Judge whether the response answers the question; retain rejection of unrelated quotations.

5. **Cut — medium: the client regression suites and web build are outside this change’s acceptance needs.**

   **Evidence:** The changes listed at [plan-v1.md:38](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:38) concern server-loaded content and a CLI script, yet [plan-v1.md:57](/work/ParaLLang/docs/rounds/013/trail/plan-v1.md:57) adds mobile tests, web tests and a web build without identifying a client behavior they must verify.

   **Failure:** A content-only encounter requires unrelated client validation work without establishing passage delivery or grading correctness.

   **Smallest fix (−):** Remove that step. Retain the server checks and focused live playthroughs.
```

## Prompt (verbatim)

```text
Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below.

Read-only: do not edit, create or delete any files. Critique the plan in `docs/rounds/013/trail/plan-v1.md` against the code in this repo. Its goal: The Old Bookshop gets its encounter, a lore-heavy NPC with a reading passage (abstract nouns, reading comprehension), in the Italian and Spanish packs, as content only, and the passage is the first in-game fragment of The Journey and its hero Journathan. The owner values simplicity: the best plan is the smallest one that meets the goal correctly.

Report three kinds of finding:
1. **Error:** something that would make the plan fail or give a wrong result. That covers a false claim about the code or data (check it and cite file:line), an internal contradiction, a step that does not serve the goal as written, or an unverified assumption the plan rests on.
2. **Gap:** something the goal needs that the plan lacks.
3. **Cut:** a step, component, check or output the goal does not need.

Simplicity limits the fixes, not the search: check every part of the plan, including its checks and acceptance criteria, and report every Error you find.

For each finding give: type, severity (critical/high/medium), evidence, the concrete failure (what input leads to what wrong outcome), and the smallest fix. Prefer fixes that remove, narrow or reuse existing code over fixes that add. Mark each fix as making the plan larger (+), smaller (−) or neither (0).

Leave out hardening, extra controls, extra reporting and style unless leaving them out causes a concrete failure. If you still want to suggest any, list at most three, one line each, under "Optional" at the end. If the plan is sound, say so: no findings is a valid answer. Do not soften.

Number your findings 1, 2, 3, ...
```
