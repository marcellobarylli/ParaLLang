# Codex critique 1: round 007 tone layer and no dictation

- **Dispatched:** 2026-11-05T11:09:44Z
- **Returned:** 2026-11-05T11:16:16Z
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol; session 01a1ab66-ae55-7480-86ee-12d4299d7d0f
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", plus the numbering instruction
- **Reviewed input:** `plan-v1.md`, sha256 b256ac32d91e25bdbbb29a42b2d80a483de4b2130387ef8e3ba9c697b1ee19e1, HEAD 83ec243, working tree untracked `docs/rounds/007/`. Stdin bundle sha256 3fbc51b5889e0a5d7c7edc4d734ae287558ce10639440b77e7fba33a7a1c1e42 (1551 lines): `cat -n` of plan-v1.md, content/narration/style_guide.yaml, content/characters/enemies/imp_coffee.yaml, prompts/system/base.txt, prompts/encounter/greeting.txt, prompts/encounter/dialogue_turn.txt, prompts/language/grading.txt, server/src/llm/prompt-builder.js, server/src/content-loader.js, server/src/learning-service.js, server/scripts/play-market.js, server/test/encounters.test.js, server/test/language-packs.test.js, content/languages/it/encounters/imp_coffee_greeting.yaml
- **Findings:** 10

## Raw output (verbatim)

```text
1. **Error — high: The round can pass while the central defect remains**

   **Evidence:** [plan-v1.md:73](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:73) makes encounter resolution the pass condition and reports dictation “either way.”
   
   **Failure:** Gerald continues saying “Say: ‘Senza latte, per favore.’” in every after run. The scripted player supplies that answer, all six encounters resolve, and the round passes despite failing its goal.
   
   **Smallest fix (0):** Require the after runs to resolve **without answer dictation**. Baseline resolution is an observation, not a gate on the fix.

2. **Error — high: The detector misses ordinary answer dictation**

   **Evidence:** [plan-v1.md:43](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:43) recognizes quoted spans or exactly `say:` / `specify:` / `try:`.
   
   **Failure:** With `no_milk` active, Gerald says `You need to say senza latte, per favore.` There are no quotes or colon, so `dictates` is false although Gerald supplied an accepted answer ([Italian encounter:51](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:51)).
   
   **Smallest fix (−):** Drop the automatic predicate and manually classify the six saved playthroughs. Inspect both narrative and dialogue for supplied answers; do not build a larger instruction detector.

3. **Error — medium: A target-word hit is not a complete accepted answer**

   **Evidence:** The implementation described at [plan-v1.md:43](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:43) requires only a target surface form. `vorrei` is an assessment target, but the required group demands a coffee expression ([Italian encounter:18](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:18), [Italian encounter:20](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:20)).
   
   **Failure:** During `order_coffee`, `Try: vorrei.` is counted as a complete supplied answer even though it contains no coffee request. This gives a wrong dictation count.
   
   **Smallest fix (−):** Use the manual classification from finding 2, judging whether the supplied expression actually satisfies the authored objective.

4. **Error — high: Checking only the current objective misses answers supplied early**

   **Evidence:** [plan-v1.md:42](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:42) restricts detection to the current objective. The greeting prompt receives **all** objectives ([learning-service.js:223](/work/ParaLLang/server/src/learning-service.js:223)). `senza_latte` belongs to `no_milk`, not `order_coffee` ([Italian encounter:18](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:18), [Italian encounter:42](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:42)).
   
   **Failure:** In the greeting, Gerald says `Later, say: senza latte, per favore.` The detector finds no current-objective target and reports false. The player has nevertheless received their later answer.
   
   **Smallest fix (0):** Judge disclosures against every unsatisfied objective, including future ones. Apply this scope to the manual review above.

5. **Gap — medium: Direct prompt-builder callers need the new argument**

   **Evidence:** The plan specifies passing `styleGuide` from `LearningService` ([plan-v1.md:34](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:34)), but direct test calls also exist. Their shared arguments omit it ([encounters.test.js:95](/work/ParaLLang/server/test/encounters.test.js:95), [language-packs.test.js:92](/work/ParaLLang/server/test/language-packs.test.js:92)).
   
   **Failure:** Adding the described style-guide dereferences leaves those calls without the guide. They either throw or retain style placeholders, preventing the required server tests from passing.
   
   **Smallest fix (+):** Add `styleGuide: c.styleGuide` / `content.styleGuide` to the two existing shared argument objects. No fallback loader is needed.

6. **Cut — medium: The `humour_style` edit cannot affect narration**

   **Evidence:** [plan-v1.md:30](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:30) changes that field, but the builder passes only character name, species, personality tone and quirks ([prompt-builder.js:47](/work/ParaLLang/server/src/llm/prompt-builder.js:47)).
   
   **Failure:** Changing only `humour_style` produces exactly the same prompt. That part of the character edit does no work toward the tone goal.
   
   **Smallest fix (−):** Remove the `humour_style` edit. The proposed global style instructions and character quirk already reach the prompt.

7. **Cut — medium: The newly activated breakdown instruction asks for discarded output**

   **Evidence:** The plan preserves all five guide rules ([plan-v1.md:25](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:25)), including generating breakdowns for every target-language word ([style_guide.yaml:7](/work/ParaLLang/content/narration/style_guide.yaml:7)). The service ignores generated breakdowns and constructs its own from canonical vocabulary matches ([learning-service.js:123](/work/ParaLLang/server/src/learning-service.js:123), [learning-service.js:134](/work/ParaLLang/server/src/learning-service.js:134)).
   
   **Failure:** A narrator supplies breakdowns for additional Italian words; the server discards them. Activating this instruction adds generation work without changing the delivered breakdowns or serving either round goal.
   
   **Smallest fix (−):** Remove that rule from the updated guide; retain the existing server-owned breakdown behavior.

8. **Error — medium: There are not two duplicate LANGUAGE RULES lines**

   **Evidence:** [plan-v1.md:35](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:35) claims two duplicates. Only the English-narrative rule clearly repeats the guide ([base.txt:4](/work/ParaLLang/prompts/system/base.txt:4), [style_guide.yaml:5](/work/ParaLLang/content/narration/style_guide.yaml:5)). Beginner level and English context ([base.txt:5](/work/ParaLLang/prompts/system/base.txt:5)) are distinct from grammatical correctness ([style_guide.yaml:6](/work/ParaLLang/content/narration/style_guide.yaml:6)).
   
   **Failure:** The plan gives a false inventory of the existing constraints. Retaining the lines causes no runtime failure, but the stated code claim is wrong.
   
   **Smallest fix (0):** Say that the existing LANGUAGE RULES remain, without claiming two duplicates.

9. **Cut — medium: The new placeholder assertion duplicates existing coverage**

   **Evidence:** [plan-v1.md:39](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:39) adds this assertion. The existing language-pack test already checks both narration paths in both languages for unfilled placeholders ([language-packs.test.js:94](/work/ParaLLang/server/test/language-packs.test.js:94), [language-packs.test.js:100](/work/ParaLLang/server/test/language-packs.test.js:100)).
   
   **Failure:** The same unresolved style placeholder fails two overlapping checks; the additional assertion covers no new behavior.
   
   **Smallest fix (−):** Keep the no-dictation-rule assertion and reuse the existing placeholder check after updating its arguments.

10. **Cut — medium: Unchanged frontend suites are unnecessary acceptance gates**

    **Evidence:** [plan-v1.md:70](/work/ParaLLang/docs/rounds/007/trail/plan-v1.md:70) requires mobile and client tests, while the proposed changes affect server prompt construction, content and a server measurement script, with the response schema unchanged.
    
    **Failure:** An unrelated frontend failure can block completion without providing evidence about style-guide propagation or answer dictation.
    
    **Smallest fix (−):** Remove the mobile/client test requirement. Keep the relevant server tests, live Italian measurement and required round-log check.
```
