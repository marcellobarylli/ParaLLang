# Codex critique 2: round 005 map and navigation

- **Dispatched:** 2026-11-05T10:39:23Z
- **Returned:** 2026-11-05T10:46:04Z
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol; session 01a1ab4a-ba79-78c3-9add-bda32fde2c03
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", with the numbering instruction of critique 1
- **Reviewed input:** `plan-v2.md`, sha256 824161b008af9268c3fcf26a2701dd43f154d0c981394f9514e69d1514aa28dc (identical to `plan-v1.md`), HEAD 9d59032. Stdin bundle sha256 b358049b8261c7b9964b8a9e9e4b22b26c6f6f0ac96ffbea67000ee2ae73f123 (1875 lines): `cat -n` of plan-v2.md, server/src/content-loader.js, server/src/learning-storage.js, server/src/learning-service.js, server/src/app.js, server/src/routes/encounter.js, server/src/errors.js, server/server.js, server/scripts/verify-cli.js, server/test/helpers.js, mobile/App.js, mobile/src/stores/gameStore.js, mobile/src/api/learning.js, mobile/src/components/Header.js, mobile/src/__tests__/learning-flow.test.js, content/languages/it/encounters/imp_coffee_greeting.yaml, client/src/api/encounter.js, all at HEAD. Working tree at dispatch: untracked docs/autonomy/, docs/rounds/005/, content/world/; server/src/content-loader.js being edited (not in the bundle's HEAD copies)
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — high: The paths use an undeclared entrance ID**

   **Evidence:** [plan:18–24](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:18) declares `market_entrance`, but specifies two paths using `entrance`. The loader must reject unknown endpoints under lines 26–28.

   **Failure:** Implementing the listed paths literally makes content loading fail, preventing server startup.

   **Smallest fix (0):** Use `market_entrance` in both paths.

2. **Error — high: The first move loses the entrance from visited history**

   **Evidence:** [plan:32–49](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:32) initializes an empty visited list, marks the entrance visited only in the response, and adds only the destination when moving.

   **Failure:** A fresh learner opens the map, then moves to `coffee_cart`. The saved visited list contains only `coffee_cart`. The entrance becomes merely known, and `butchers_stall` becomes hidden again because its only visited neighbour—the entrance—was never saved.

   **Smallest fix (0):** On a successful move, save both the effective origin and destination in `visitedLocationIds`.

3. **Error — high: Map initialization drops the saved spellbook**

   **Evidence:** [plan:65–69](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:65) replaces encounter startup with world loading while keeping spellbook and review unchanged. Currently, initialization obtains the spellbook from the encounter response at [gameStore.js:44–47](/work/ParaLLang/mobile/src/stores/gameStore.js:44). The initial spellbook is empty.

   **Failure:** A returning learner launches the app and opens Spellbook before talking to Gerald. Their saved cards are absent and the header reports zero reviews due, despite the save retaining them.

   **Smallest fix (+):** Fetch the spellbook during initialization using the existing [getSpellbook API](/work/ParaLLang/mobile/src/api/learning.js:42), alongside the world.

4. **Error — high: Existing return buttons bypass the Coffee Cart entry flow**

   **Evidence:** The plan leaves spellbook and review unchanged. Both return callbacks use `returnToDialogue` at [App.js:26–31](/work/ParaLLang/mobile/App.js:26), which unconditionally selects dialogue at [gameStore.js:101–102](/work/ParaLLang/mobile/src/stores/gameStore.js:101). Restart starts Gerald without checking location at [gameStore.js:56–65](/work/ParaLLang/mobile/src/stores/gameStore.js:56).

   **Failure:** A fresh learner at the entrance opens Spellbook and selects its return button. They enter dialogue with no encounter. Because Restart appears in dialogue under the proposed header rules, they can then start Gerald from the entrance. An existing encounter can similarly be reopened after moving elsewhere.

   **Smallest fix (0):** Wire these return buttons to `openMap` and update their labels. This avoids adding navigation history or server location enforcement.

5. **Error — medium: Completion tracking does not distinguish session IDs from content IDs**

   **Evidence:** [plan:25,45,50](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:25) associates the location with `imp_coffee_greeting`, then says resolution saves the encounter’s “id”. Existing encounter instances instead receive a random UUID at [learning-service.js:209–210](/work/ParaLLang/server/src/learning-service.js:209), exposed as `encounter.id` at line 166. The content ID is separate: [imp_coffee_greeting.yaml:1](/work/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:1).

   **Failure:** Recording the existing runtime `encounter.id` on resolution stores a UUID. Checking completion for the map’s `imp_coffee_greeting` never matches, so the check mark remains absent.

   **Smallest fix (−):** Remove completion tracking, its save field, check mark, resolution-triggered reload and associated acceptance requirements. Persisted encounter completion is outside the stated goal. If retained, the plan must explicitly use `this.content.encounter.id`.

6. **Error — medium: Vocabulary coverage is reported as a language ratio**

   **Evidence:** [plan:76–78,115](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:76) calls canonical vocabulary matches a measurement of target-language tokens. The loader supplies an authored coffee vocabulary at [content-loader.js:122](/work/ParaLLang/server/src/content-loader.js:122); narration matching searches only those entries at [learning-service.js:116–119](/work/ParaLLang/server/src/learning-service.js:116).

   **Failure:** A valid Italian line containing Italian words outside that vocabulary has those words omitted from the numerator. The report can therefore show a low ratio for a wholly Italian line and make an incorrect comparison against the requested ratio.

   **Smallest fix (−):** Delete the measured-ratio output and acceptance requirement. Language identification is unnecessary for this map change.

7. **Cut — medium: API token authentication is unrelated to the level**

   **Evidence:** [plan:54–56,109](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:54) adds authentication, verifier configuration and token tests. Existing request helpers send no token: [mobile learning.js:9–12](/work/ParaLLang/mobile/src/api/learning.js:9), [client encounter.js:4–7](/work/ParaLLang/client/src/api/encounter.js:4), and [verify-cli.js:50–54](/work/ParaLLang/server/scripts/verify-cli.js:50).

   **Concrete consequence:** Enabling this option makes existing client requests return 401. The verifier also needs header plumbing beyond merely setting a random token. None of this contributes to exploration, fog or persistence.

   **Smallest fix (−):** Remove the token feature and its checks.

8. **Cut — medium: The second live playthrough duplicates existing provider verification**

   **Evidence:** [plan:74–78,114–115](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:74) requires a new live script, timings, grading output and recorded dialogue. The existing verifier already starts Gerald and completes the two-turn order at [verify-cli.js:115–145](/work/ParaLLang/server/scripts/verify-cli.js:115).

   **Concrete consequence:** Accepting a navigation change requires another live provider session and additional reporting, although prompts and grading are unchanged. The new script still exercises only two map locations.

   **Smallest fix (−):** Remove `play-market.js` and its reporting requirements. Use the planned service and mobile tests for navigation and persistence; retain the existing verifier if its regression check is desired.

9. **Cut — medium: Location vocabulary metadata has no consumer**

   **Evidence:** [plan:20](/work/ParaLLang/docs/rounds/005/trail/plan-v2.md:20) adds `vocabulary_focus`, but the proposed snapshot, navigation and location card never use it. Gerald’s prompts already obtain vocabulary through the existing encounter content.

   **Concrete consequence:** Implementing the six locations requires authoring and validating additional data that changes no observable behaviour.

   **Smallest fix (−):** Omit `vocabulary_focus` until location-specific language content uses it.

The supplied block omits `prototype.md` §8.2, so the six location names and their correspondence to that specification cannot be independently verified.
```
