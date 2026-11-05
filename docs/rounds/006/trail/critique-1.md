# Codex critique 1: round 006 multi-encounter engine

- **Dispatched:** 2026-11-05T10:53:14Z
- **Returned:** 2026-11-05T11:01:52Z
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol; session 01a1ab57-68b7-7133-b1d0-3a19d9b37936
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", plus the numbering instruction
- **Reviewed input:** `plan-v1.md`, sha256 797ee09f677ba0366511eda8a6bd98b90e34c0b4064c0d18e75fb18abde63de8, HEAD 1a7ff35, working tree untracked `docs/rounds/006/`. Stdin bundle sha256 88dfb5d8706b302c65f3130f16a254ee510fb30bd72f563713c12d8bf6daabd4 (2129 lines): `cat -n` of plan-v1.md, server/src/content-loader.js, server/src/learning-service.js, server/src/world.js, server/src/llm/prompt-builder.js, prompts/encounter/greeting.txt, prompts/encounter/dialogue_turn.txt, prompts/system/base.txt, server/src/routes/encounter.js, server/scripts/verify-cli.js, server/scripts/play-market.js, content/languages/it/language.yaml, content/languages/it/encounters/imp_coffee_greeting.yaml, content/world/locations/coffee_cart.yaml, content/world/connections.yaml, mobile/src/stores/gameStore.js, mobile/src/api/learning.js, mobile/src/components/DialoguePanel.js, mobile/src/components/InputBar.js, mobile/src/components/MapPanel.js, mobile/App.js, client/src/stores/gameStore.js, client/src/api/encounter.js
- **Findings:** 10

## Raw output (verbatim)

```text
1. **Error — high: Removing `content.vocabulary` breaks narration and grading.**

   **Evidence:** The plan removes it at `docs/rounds/006/trail/plan-v1.md:43–45`, but the migration describes version and encounter lookups. Existing callers also read `.vocabulary.entries`: [learning-service.js:118](/work/ParaLLang/server/src/learning-service.js:118), [learning-service.js:281](/work/ParaLLang/server/src/learning-service.js:281), and [play-market.js:93](/work/ParaLLang/server/scripts/play-market.js:93).

   **Failure:** Starting any encounter reaches `canonicalizeNarration` and throws when reading the removed object. Evidence validation and the required live report have the same problem.

   **Smallest fix (−):** Keep the existing vocabulary object with merged entries/references and the pack-level version. Use `entryVersion(id)` for card validity. This also avoids adding a separate top-level `contentVersion` solely to replace `vocabulary.version`.

2. **Error — high: `{{enemy.name}}` is unavailable in the encounter templates.**

   **Evidence:** The plan proposes that placeholder at `plan-v1.md:60`. The system template receives `enemy`, but the greeting/turn template receives only `{ language, turnData } at [prompt-builder.js:56](/work/ParaLLang/server/src/llm/prompt-builder.js:56). Missing variables remain literal placeholders at [prompt-builder.js:15](/work/ParaLLang/server/src/llm/prompt-builder.js:15).

   **Failure:** The proposed replacements produce “React as `{{enemy.name}}`” and “introduce `{{enemy.name}}`”. Gerald’s rendered prompt changes, failing the promised byte comparison; other characters receive unresolved instructions.

   **Smallest fix (+):** Pass the existing enemy-name binding into the encounter-template substitution.

3. **Error — high: The generic greeting still puts every character at The Coffee Cart.**

   **Evidence:** The plan replaces “Gerald” in templates but leaves the location literal in [greeting.txt:1](/work/ParaLLang/prompts/encounter/greeting.txt:1). Its separate `scene` change does not replace that instruction.

   **Failure:** Starting the butcher fixture produces contradictory instructions: introduce the fixture character “at The Coffee Cart”, while TURN DATA places them at the butcher’s stall.

   **Smallest fix (+):** Parameterize the template’s location name using the loaded location. For Gerald, substitute exactly “The Coffee Cart” to preserve the original rendered prompt.

4. **Error — high: The proposed world checks do not enforce one location per encounter.**

   **Evidence:** `plan-v1.md:38–40` checks that location references exist and that each encounter’s declared location points back to it. Neither check rejects another location pointing to the same encounter. The current loader explicitly enforces exactly one placement at [content-loader.js:214](/work/ParaLLang/server/src/content-loader.js:214).

   **Failure:** Leave Gerald declared at `coffee_cart`, and also assign `imp_coffee_greeting` to `butchers_stall`. Both proposed checks pass. Starting Gerald at either location passes the proposed start check, and completing him marks both location cards complete.

   **Smallest fix (0):** Strengthen the location check to require that the referenced encounter’s `location` equals that location’s id. Retain the reverse check for unplaced encounters.

5. **Gap — medium: Switching encounters retains the previous character’s assessment and draft.**

   **Evidence:** The app changes only the requested id in `plan-v1.md:67–68`. Successful entry currently replaces the encounter and Spellbook but retains `assessment`, `draft`, and `pendingInput` at [gameStore.js:79](/work/ParaLLang/mobile/src/stores/gameStore.js:79).

   **Failure:** Fail a Gerald objective, leave an unsent coffee reply, then enter the butcher encounter. The new conversation shows Gerald’s assessment and the coffee reply in its input.

   **Smallest fix (+):** When entry returns a different session id, clear those three fields, reusing the reset behavior already used by restart. Preserve them when resuming the same session. Cover this transition in the mobile tests.

6. **Gap — medium: Coffee-specific text remains outside the proposed replacements.**

   **Evidence:** The plan’s app changes omit “Reply to Gerald…” at [InputBar.js:15](/work/ParaLLang/mobile/src/components/InputBar.js:15) and “Order complete” at [DialoguePanel.js:15](/work/ParaLLang/mobile/src/components/DialoguePanel.js:15). Merely substituting the character name also leaves “has already accepted this order” in [learning-service.js:313](/work/ParaLLang/server/src/learning-service.js:313).

   **Failure:** A non-Gerald encounter still asks the player to reply to Gerald. Completing an objective unrelated to ordering still announces an order, including in the server’s resolved-session error.

   **Smallest fix (+):** Include these strings in the migration: use the encounter’s character name for the reply placeholder and generic completion wording for the heading and error. No additional content field is needed.

7. **Error — medium: Removing the default aliases breaks the loader’s compatibility exports.**

   **Evidence:** The plan updates tests and `verify-cli.js`, but [content-loader.js:228](/work/ParaLLang/server/src/content-loader.js:228) and [content-loader.js:229](/work/ParaLLang/server/src/content-loader.js:229) still return `loadGameContent().character` and `.encounter`.

   **Failure:** After the planned removal, `loadCharacter()` and `loadEncounter()` return `undefined`.

   **Smallest fix (−):** Keep the two default aliases—the plan’s existing alternative—and remove the alias-driven rewrites of default-only consumers. Session-specific behavior can still use the encounter map.

8. **Error — medium: The live playthrough’s ratio calculation has no encounter context.**

   **Evidence:** Ratios currently depend on the single character and encounter at [learning-service.js:57](/work/ParaLLang/server/src/learning-service.js:57). The plan makes those reads session-dependent, but [play-market.js:89](/work/ParaLLang/server/scripts/play-market.js:89) calls `service.ratioFor(turn)` without a session or definition.

   **Failure:** Once ratio calculation requires the session’s definition, the acceptance-required live report cannot calculate its requested ratios. Preserving the old call requires an unstated default fallback.

   **Smallest fix (+):** Explicitly include this caller in the migration and supply the default encounter context using the chosen ratio-helper signature.

9. **Error — medium: The acceptance criteria contradict the session replacement policy.**

   **Evidence:** `plan-v1.md:55–56` replaces a learner’s session when switching definitions. Yet `plan-v1.md:101–102` requires Gerald’s session state to remain unaffected while switching replaces the session. There is only one session slot per learner at [learning-service.js:23](/work/ParaLLang/server/src/learning-service.js:23).

   **Failure:** Progress Gerald, switch to the fixture, then return to Gerald. Under the proposed policy, Gerald starts fresh; his previous session state is unavailable.

   **Smallest fix (−):** Remove the requirement to preserve Gerald’s session state across replacement. Keep the checks for unaffected unrelated cards, correct replacement, and Gerald’s unchanged behavior when played.

10. **Cut — medium: Requiring both live scripts duplicates the default-encounter playthrough.**

    **Evidence:** Acceptance criterion 5 requires both scripts. `verify-cli.js` already plays the coffee encounter at [verify-cli.js:120](/work/ParaLLang/server/scripts/verify-cli.js:120); `play-market.js` plays it and checks map completion at [play-market.js:68](/work/ParaLLang/server/scripts/play-market.js:68) and [play-market.js:100](/work/ParaLLang/server/scripts/play-market.js:100).

    **Consequence:** Each acceptance run requires an additional live grading suite and duplicate coffee playthrough. Neither exercises the new second encounter; the fixture tests provide that coverage.

    **Smallest fix (−):** Keep `play-market.js` as the single live acceptance run, alongside the existing tests and Gerald prompt comparison. Keep `verify:cli` working without requiring another live execution.
```
