# Codex critique 1: round 010 The Butcher's Stall

- **Dispatched:** 2026-11-05T11:59:50Z
- **Returned:** 2026-11-05T12:07:45Z
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high`; session 01a1ab94-5c32-7993-8c81-53d0245e0847
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", plus "Number your findings 1, 2, 3, ..."
- **Reviewed input:** `plan-v1.md`, sha256 cb1bb21e2830da9c32357a0b5c5996d8149235ae60006d7fd821ae40079f765c, HEAD 056efe3, working tree untracked `docs/rounds/010/`. Stdin bundle sha256 9a31853876f63b5c7c7b3d62f00f45e418108dd7dd26ec899a5901b5c2aa6c01 (1703 lines): `cat -n` of docs/rounds/010/trail/plan-v1.md, server/src/content-loader.js, server/src/learning-service.js, server/scripts/play-market.js, content/languages/it/encounters/market_entrance_tutorial.yaml, content/languages/it/vocabulary/entrance_greetings.yaml, content/world/locations/butchers_stall.yaml, content/characters/enemies/archway_portia.yaml, content/narration/style_guide.yaml, server/src/language-engine.js, server/test/encounters.test.js, server/test/tutorial.test.js, prompts/language/grading.txt
- **Findings:** 7

## Raw output (verbatim)

```text
1. **Error · medium — Two Italian forms can produce incorrect vocabulary chips.**

   The plan adds `due` and the `chili` variant ([plan:20](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:20), [plan:34](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:34)). Matching checks surface text without distinguishing English from Italian ([language-engine.js:49](/work/ParaLLang/server/src/language-engine.js:49)); matched entries become chips and discoveries ([learning-service.js:122](/work/ParaLLang/server/src/learning-service.js:122), [learning-service.js:231](/work/ParaLLang/server/src/learning-service.js:231)).

   **Failure:** Mortimer’s mixed-language line “Your payment is due; prosciutto?” produces a chip meaning *two* for English “due”. “No chili today; prosciutto?” produces a *kilogram* chip for English “chili”.

   **Smallest fix (−):** Omit the `due` entry and `chili` variant. Narrow the supported forms accordingly; the remaining numbers and weight forms still meet the goal without engine changes.

2. **Error · medium — The real-pack test update misses the combined vocabulary version.**

   The plan specifies updating encounter membership ([plan:49](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:49)), but the existing test also expects a version containing only the entrance and Gerald files ([encounters.test.js:117](/work/ParaLLang/server/test/encounters.test.js:117)). The loader joins every vocabulary file’s version in sorted order ([content-loader.js:142](/work/ParaLLang/server/src/content-loader.js:142)).

   **Failure:** After adding either butcher vocabulary file, the old version assertion fails even when loading and gameplay work correctly.

   **Smallest fix (0):** Include `butcher-meats-${code}-v1` in that existing assertion, alongside updating encounter membership. The fixture’s version expectation can stay unchanged because its copy removes the real butcher vocabulary.

3. **Error · medium — The promised live ham-negative run cannot use the proposed script.**

   The proposed Italian script contains only salame and quantity requests ([plan:41](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:41)), yet the live check requires ham first ([plan:54](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:54)). The runner submits only the fixed script array; it has no player-line override ([play-market.js:82](/work/ParaLLang/server/scripts/play-market.js:82)).

   **Failure:** Running the specified command repeatedly never submits “Vorrei del prosciutto.”, so it cannot establish the claimed live rejection.

   **Smallest fix (0):** Prepend that negative request to the existing Italian butcher script, followed by the two successful requests. No new CLI option is needed.

4. **Error · medium — Prior completion of the tutorial is not guaranteed.**

   “The tutorial has introduced the mechanics” is the rationale for omitting a briefing ([plan:37](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:37)). Movement does not check tutorial completion, and starting an explicit encounter checks location only ([learning-service.js:431](/work/ParaLLang/server/src/learning-service.js:431), [learning-service.js:205](/work/ParaLLang/server/src/learning-service.js:205)). The existing test demonstrates the route from the entrance to the stall ([encounters.test.js:138](/work/ParaLLang/server/test/encounters.test.js:138)).

   **Failure:** A new player can walk directly to Mortimer and receive no briefing despite never playing Portia.

   **Smallest fix (−):** Delete the prior-tutorial claim. Keeping the briefing absent is compatible with this goal; adding a tutorial gate is unnecessary.

5. **Gap · medium — Nothing checks the quantity objective’s distinguishing rejection.**

   The plan requires a quantity rather than a bare unit, but its quantity tests and live scripts contain only passing examples ([plan:19](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:19), [plan:49](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:49)). The server’s evidence check requires only the authored target group ([learning-service.js:311](/work/ParaLLang/server/src/learning-service.js:311)); the number requirement depends on the actual grader following the rubric.

   **Failure:** A grader verdict passing `chilo` with `chilo` evidence satisfies the server check and can resolve the encounter without a quantity. The planned positive cases and test grader do not detect this.

   **Smallest fix (+):** During the existing live run in each language, submit `chilo` / `kilo` at the quantity objective and verify rejection before submitting the valid quantity. Keep the unit-only required group.

6. **Cut · medium — The client validation battery exceeds this change’s scope.**

   Mobile tests, web tests/build and an iOS export are required solely as a “quality bar” ([plan:53](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:53)), while the plan explicitly changes no engine or app code ([plan:45](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:45)).

   **Unnecessary outcome:** The content addition acquires client build and export work that does not establish its authored grading behavior.

   **Smallest fix (−):** Remove that battery. Retain the server suite and focused live checks.

7. **Cut · medium — Three Italian live runs have no distinct acceptance purpose.**

   The plan requires three Italian runs but distinguishes only the ham-negative case ([plan:54](/work/ParaLLang/docs/rounds/010/trail/plan-v1.md:54)).

   **Unnecessary outcome:** Repeating the same positive script adds provider calls without exercising another specified behavior.

   **Smallest fix (−):** Run once per language, including the necessary negative cases followed by successful resolution.
```
