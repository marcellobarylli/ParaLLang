# Codex critique 1: round 008 grader feedback

- **Dispatched:** 2026-11-05T11:21:51Z
- **Returned:** 2026-11-05T11:26:07Z
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol; session 01a1ab71-9dd4-7f70-9ccc-90f1e1676115
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", plus the numbering instruction
- **Reviewed input:** `plan-v1.md`, sha256 5277c0f6d28e002be9bcb477ea9b7548446f1433d10a59f570f3fe09633f2f45, HEAD a10a9ee, working tree untracked `docs/rounds/008/`. Stdin bundle sha256 a1b37ac71f6da9f5b050550dbed44280d5c8992e1e00f5f124451761f9150b32 (1331 lines): `cat -n` of plan-v1.md, prompts/language/grading.txt, server/src/llm/prompt-builder.js, server/src/llm/schemas.js, server/src/learning-service.js, server/scripts/verify-cli.js, server/scripts/play-market.js, mobile/src/components/DialoguePanel.js, content/languages/it/encounters/imp_coffee_greeting.yaml, server/test/language-packs.test.js
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — high: The quotation exception permits the leak being prohibited.**

   **Evidence:** [plan-v1.md:23](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:23) permits quoting the learner’s words. The existing quoted and metalinguistic cases contain `senza latte` while expecting failure ([verify-cli.js:43](/work/ParaLLang/server/scripts/verify-cli.js:43), [verify-cli.js:44](/work/ParaLLang/server/scripts/verify-cli.js:44)).

   **Failure:** After `The sign says 'senza latte'.`, feedback can say “Use ‘senza latte’ in your own order.” That follows the quotation permission but supplies an expression accepted for the failed objective ([imp_coffee_greeting.yaml:51](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:51)).

   **Smallest fix (−):** Delete “You may quote the learner’s own words.”

2. **Error — high: The classifier excludes a displayed route for leaking answers.**

   **Evidence:** [plan-v1.md:33](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:33) inspects per-objective feedback only for failed objectives. The app displays every objective’s feedback ([DialoguePanel.js:25](/work/ParaLLang/mobile/src/components/DialoguePanel.js:25)).

   **Failure:** For `Vorrei un caffè.`, coffee passes and no-milk fails. The passed coffee result could say “Good request; add ‘senza latte’ for your preference.” The learner sees the answer, but the classifier skips that string.

   **Smallest fix (0):** Inspect **all** per-objective feedback and overall feedback whenever any objective failed; assess each string against every failed objective.

3. **Error — high: `verify:cli` does not report all feedback required by acceptance.**

   **Evidence:** Its nine grading cases retain only `overall_feedback` ([verify-cli.js:106](/work/ParaLLang/server/scripts/verify-cli.js:106)). Its encounter report retains objective results, including their feedback, but omits both turns’ overall feedback ([verify-cli.js:164](/work/ParaLLang/server/scripts/verify-cli.js:164)). The plan nevertheless requires reading every relevant string and zero leaks across `verify:cli` ([plan-v1.md:33](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:33), [plan-v1.md:40](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:40)).

   **Failure:** A standalone case can leak only through per-objective feedback, or the first encounter turn can say “Add ‘senza latte’” only in overall feedback. Neither leak appears in the corresponding report.

   **Smallest fix (+):** Retain the missing feedback in the existing `verify-cli` report: objective feedback for the nine cases and overall feedback for both encounter turns. Amend “No code change” to permit this measurement change. `play-market` already retains complete grading outputs ([play-market.js:105](/work/ParaLLang/server/scripts/play-market.js:105)).

4. **Error — high: Resolution alone can accept a grading regression and eliminate the leak opportunity.**

   **Evidence:** Acceptance requires the three playthroughs to resolve ([plan-v1.md:40](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:40)). Their first answer contains no no-milk expression ([play-market.js:18](/work/ParaLLang/server/scripts/play-market.js:18)); the script stops submitting answers once resolved ([play-market.js:70](/work/ParaLLang/server/scripts/play-market.js:70)).

   **Failure:** If the changed prompt incorrectly grades `Vorrei un caffè, per favore.` as `[true, true]`, the encounter resolves immediately. All three runs can pass with zero failed-objective feedback to inspect. The separate nine cases can still pass: their positive answer omits `per favore` ([verify-cli.js:37](/work/ParaLLang/server/scripts/verify-cli.js:37)).

   **Smallest fix (+):** Require the existing playthrough verdicts to be `[true, false]`, then `[true]`, as well as resolution. Those verdicts are already reported ([play-market.js:75](/work/ParaLLang/server/scripts/play-market.js:75)).

5. **Error — medium: The commands do not ensure Italian measurement.**

   **Evidence:** Both scripts select the language from the environment ([verify-cli.js:81](/work/ParaLLang/server/scripts/verify-cli.js:81), [play-market.js:60](/work/ParaLLang/server/scripts/play-market.js:60)). `TARGET_LANGUAGE=es` selects Spanish ([language-packs.test.js:74](/work/ParaLLang/server/test/language-packs.test.js:74)). Neither planned command pins the language ([plan-v1.md:29](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:29)).

   **Failure:** With `TARGET_LANGUAGE=es` already configured, every live check can pass in Spanish without measuring the required Italian behavior.

   **Smallest fix (0):** Prefix both live commands with `TARGET_LANGUAGE=it`.

6. **Error — medium: “Or a model answer” rejects feedback the goal permits.**

   **Evidence:** The goal concerns expressions satisfying an **unpassed** objective ([plan-v1.md:3](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:3)). The classifier separately declares any model answer a leak ([plan-v1.md:35](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:35)); the proposed instruction also bans model answers ([plan-v1.md:23](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:23)).

   **Failure:** After coffee passes and no-milk fails, overall feedback could offer `Un espresso, per favore.` as another coffee request. It supplies no no-milk expression, but the model-answer clause rejects it.

   **Smallest fix (−):** Remove the separate model-answer ban from the instruction and classifier. The failed-objective restriction already covers model answers that violate the goal.

7. **Error — medium: The problem statement falsely attributes the feedback fields to the prompt.**

   **Evidence:** [plan-v1.md:9](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:9) says `grading.txt` asks for those fields. The template contains no such request; it ends with the rubric and a structured-JSON instruction ([grading.txt:12](/work/ParaLLang/prompts/language/grading.txt:12)). The fields are required by the schema ([schemas.js:28](/work/ParaLLang/server/src/llm/schemas.js:28), [schemas.js:35](/work/ParaLLang/server/src/llm/schemas.js:35)).

   **Failure:** For every grading input, the plan’s description of the existing field contract is wrong. This is a documentation error, without a separate runtime consequence.

   **Smallest fix (0):** Say that the schema requires both feedback fields and the grading prompt supplies no feedback-content restriction.

8. **Cut — medium: Mobile and client suites are unnecessary acceptance gates.**

   **Evidence:** The plan changes the grading prompt and adds a server prompt test, while leaving the schema unchanged ([plan-v1.md:24](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:24)). It nevertheless gates acceptance on both frontend suites ([plan-v1.md:39](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:39)).

   **Concrete cost:** An unrelated frontend failure blocks acceptance of a change whose relevant behavior is measured through the server and live grader.

   **Smallest fix (−):** Remove mobile and client suites from this plan’s acceptance gates; retain the server checks.

9. **Cut — medium: Historical before/after counts are unnecessary.**

   **Evidence:** [plan-v1.md:31](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:31) introduces historical baselines, and [plan-v1.md:41](/work/ParaLLang/docs/rounds/008/trail/plan-v1.md:41) requires comparative counts. The required outcome is zero leaking feedback in the Italian after runs with unchanged verdicts.

   **Concrete cost:** Historical classification and comparison add work without changing that acceptance decision.

   **Smallest fix (−):** Drop the historical counting requirement. Keep the existing examples as motivation and report the after-run leak count and verdict results.
```
