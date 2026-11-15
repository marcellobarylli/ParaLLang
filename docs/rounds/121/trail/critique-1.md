# Codex critique 1: levels in the dungeon

- **Dispatched:** 2026-11-15T11:48:03Z
- **Returned:** 2026-11-15T11:58:55Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1df09-614e-7d51-97a8-e421224cf7d1`. The model name was not printed.
- **Prompt:** the codex-critique template, with "Decided with the owner" read as the plan's "Owner decisions" section, a first line forbidding servers and port-binding tests on the login node, one added sentence asking it to check the plan's arithmetic against the content files (objectives per encounter, the XP at each site, whether the Sanctuary's level can be reached, how many cards are due by then and whether reviews are open), and this goal: "the player earns experience and levels in the web client's dungeon; a level opens sealed places and raises how much of the target language the characters speak".
- **Reviewed input:** `plan-v1.md`, sha256 65b15faa45b5b2268d490cb549734ad3a4d5660295885eec037d327dcc5be1bd, HEAD 448ccad (branch `round-121-levels`), working tree: only `docs/rounds/121/` untracked
- **Findings:** 7 (4 Errors, 3 Cuts)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1df09-614e-7d51-97a8-e421224cf7d1).
[codex] Turn started (01a1df09-6308-7620-b216-e2dbc5ff6016).
[codex] Assistant message captured: I’ll trace the plan against the dungeon code and content, including XP, unlocks, and review t...
[codex] Running command: /bin/bash -lc "pwd; rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'SKILL.md' -...
[codex] Command completed: /bin/bash -lc "pwd; rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'SKILL.md' -... (exit 0)
[codex] Running command: /bin/bash -lc 'cat STATUS.md'
[codex] Command completed: /bin/bash -lc 'cat STATUS.md' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba docs/rounds/121/trail/plan-v1.md; cat AGENTS.md'
[codex] Command completed: /bin/bash -lc 'nl -ba docs/rounds/121/trail/plan-v1.md; cat AGENTS.md' (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/119/architecture.md docs/rounds/119/findings.md docs/rounds/12...
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/119/architecture.md docs/rounds/119/findings.md docs/rounds/12... (exit 0)
[codex] Running command: /bin/bash -lc 'rg --files server/src server/test client/src content tools | sort'
[codex] Command completed: /bin/bash -lc 'rg --files server/src server/test client/src content tools | sort' (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'Log protocol|round-log|121|Reading' STATUS.md; rg --files -g 'AGENTS.md...
[codex] Command completed: /bin/bash -lc "rg -n 'Log protocol|round-log|121|Reading' STATUS.md; rg --files -g 'AGENTS.md... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba server/src/learning-storage.js'
[codex] Command completed: /bin/bash -lc 'nl -ba server/src/learning-storage.js' (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'ratioFor|targetRatio|ratioBonus|submitDialogue|submitReview|scheduleCha...
[codex] Command completed: /bin/bash -lc "rg -n 'ratioFor|targetRatio|ratioBonus|submitDialogue|submitReview|scheduleCha... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba server/src/dungeon.js; nl -ba content/world/dungeons/ta_prohm.yaml; nl ...
[codex] Command completed: /bin/bash -lc 'nl -ba server/src/dungeon.js; nl -ba content/world/dungeons/ta_prohm.yaml; nl ... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n '"'^ - id:|''^objectives:|vocabulary|target_ratio|review|sequence|ordere...
[codex] Command completed: /bin/bash -lc "rg -n '"'^ - id:|''^objectives:|vocabulary|target_ratio|review|sequence|ordere... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '160,340p'; nl -ba server/src/l...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '160,340p'; nl -ba server/src/l... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '600,920p'"
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '600,920p'" (exit 0)
[codex] Assistant message captured: The stated objective counts and the 300 XP total match the Italian content. I’m checking whic...
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1035,1340p'; nl -ba server/src...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1035,1340p'; nl -ba server/src... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '1,280p'; nl -ba client/src/com...
[codex] Command completed: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '1,280p'; nl -ba client/src/com... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '280,630p'"
[codex] Command completed: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '280,630p'" (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'base_target_ratio' content/characters/enemies/*.yaml; nl -ba server/src...
[codex] Command completed: /bin/bash -lc "rg -n 'base_target_ratio' content/characters/enemies/*.yaml; nl -ba server/src... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '1,250p'"
[codex] Command completed: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '1,250p'" (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '1,280p'; nl -ba server/test/he...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '1,280p'; nl -ba server/test/he... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba content/languages/it/encounters/market_entrance_tutorial.yaml; nl -ba c...
[codex] Command completed: /bin/bash -lc "nl -ba content/languages/it/encounters/market_entrance_tutorial.yaml; nl -ba c... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '1,28p' server/test/helpers.js; sed -n '1,140p' server/test/web-client....
[codex] Command completed: /bin/bash -lc "sed -n '1,28p' server/test/helpers.js; sed -n '1,140p' server/test/web-client.... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '100,161p'; nl -ba client/scrip...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '100,161p'; nl -ba client/scrip... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '73,100p'; nl -ba server/test/r...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '73,100p'; nl -ba server/test/r... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import { readFileSync } from 'node:fs'; impo...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import { readFileSync } from 'node:fs'; impo... (exit 0)
[codex] Assistant message captured: Successful encounter answers advance their vocabulary cards to tomorrow. In an in-memory chec...
[codex] Running command: /bin/bash -lc "nl -ba server/src/app.js | sed -n '55,130p'; nl -ba client/src/components/Dung...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/app.js | sed -n '55,130p'; nl -ba client/src/components/Dung... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/test/send-retry.test.js | sed -n '1,180p'; nl -ba server/src/lea...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/send-retry.test.js | sed -n '1,180p'; nl -ba server/src/lea... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n -A 12 -B 3 'Leveling Up|only unlocked|XP|progression.js' parallang.md pr...
[codex] Command completed: /bin/bash -lc "rg -n -A 12 -B 3 'Leveling Up|only unlocked|XP|progression.js' parallang.md pr... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import { readFileSync } from 'node:fs'; impo...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import { readFileSync } from 'node:fs'; impo... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '140,275p'; rg -n '"'^test|diff...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '140,275p'; rg -n '"'^test|diff... (exit 0)
[codex] Assistant message captured: The existing screenshot playthrough includes Gerald’s party conversation: it reaches 345 XP w...
[codex] Running command: /bin/bash -lc "nl -ba docs/rounds/119/trail/interview.md | sed -n '1,190p'; nl -ba docs/round...
[codex] Command completed: /bin/bash -lc "nl -ba docs/rounds/119/trail/interview.md | sed -n '1,190p'; nl -ba docs/round... (exit 0)
[codex] Assistant message captured: 1. **Error · critical — Updating XP alone leaves level gates closed in the client.** **Eviden...
[codex] Turn completed.
1. **Error · critical — Updating XP alone leaves level gates closed in the client.**

   **Evidence:** The plan’s [store step](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:86) updates `progression`, but movement uses cached `progress.sites`. [Party resolutions refresh only the party](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:493), and [review submissions refresh only the Spellbook](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:537). [Travel refuses a cached unreachable destination](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:272).

   **Failure:** The existing screenshot route earns 300 XP from the six sites and 45 from Gerald’s party conversation. My read-only, in-memory reproduction found five due cards, with reviews open. Three correct reviews reach 360 XP and level 5, but the cached Sanctuary gate remains sealed and its walk button disabled. An older map response can also overwrite newer XP: the existing freshness counter orders map reads, not dialogue and review replies.

   **Smallest fix (0):** Reuse `refreshProgress` after a party or review reply crosses a level, and reuse the existing request freshness guards when accepting progression.

2. **Error · high · Owner decision — The complete-run criterion conflicts with the new seal formula.**

   **Evidence:** [The proposed formula](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:58) requires both prerequisites and level, while [acceptance requires completed runs to stay open](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:100). Existing [movement bypasses gates for completed runs](/home/marcello/workspace/ParaLLang/server/src/dungeon.js:53), but [map gates are calculated separately](/home/marcello/workspace/ParaLLang/server/src/dungeon.js:81).

   **Failure:** Load a completed pre-round save without `progression`. The planned default gives it zero XP and level 1. Movement remains allowed, but the Library and Sanctuary report sealed level gates. The map describes accessible, cleared places as sealed.

   **Smallest fix (0):** Reuse `isComplete` when constructing map gate states so their sealed status agrees with movement. Preserve the complete-run acceptance criterion.

3. **Error · high · Owner decision — World-map unlock promises contradict the closed-place scope.**

   **Evidence:** The plan simultaneously says [“Opens at level 6” and “places stay closed”](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:72). [World-map entry requires a dungeon](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:245); [Angkor Wat has none](/home/marcello/workspace/ParaLLang/content/world/atlas.yaml:20).

   **Failure:** Six site clears plus five ordinary two-objective party conversations earn 525 XP, reaching level 6. Angkor Wat still cannot open despite its displayed promise.

   **Smallest fix (0):** Owner decision: narrow the existing label to “Level 6 · unavailable” while retaining the fixed scope that these places remain closed.

4. **Error · medium — The claimed Library unlock moment depends on the route.**

   **Evidence:** The plan says [the player sees the Library sealed until answering Flick](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:68). The content permits [Portia → Mortimer → Gerald → Flick](/home/marcello/workspace/ParaLLang/content/world/dungeons/ta_prohm.yaml:34). Their first three encounters have [three](/home/marcello/workspace/ParaLLang/content/languages/it/encounters/market_entrance_tutorial.yaml:22), [two](/home/marcello/workspace/ParaLLang/content/languages/it/encounters/butchers_stall_charcutier.yaml:16), and [two](/home/marcello/workspace/ParaLLang/content/languages/it/encounters/imp_coffee_greeting.yaml:14) objectives.

   **Failure:** Clearing those three gives `55 + 45 + 45 = 145 XP`, already level 3 before Flick starts. The Library’s level seal is already open; Flick’s existing pass rule prevents entry.

   **Smallest fix (0):** Narrow that sentence to the route that skips Mortimer and extra conversations. Keep the Library rule and its acceptance checks.

5. **Cut · high · rank 1 — Remove stored progression snapshots from receipts.**

   **Evidence:** The plan adds [progression to dialogue and review replies](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:53). Existing [receipt construction retains every field except the Spellbook](/home/marcello/workspace/ParaLLang/server/src/learning-service.js:82), and [replay returns those retained fields](/home/marcello/workspace/ParaLLang/server/src/learning-service.js:1045).

   **Removable complexity / failure:** Storing progression duplicates mutable learner state inside historical receipts. Pass Portia’s greeting for 10 XP, pass her introduction for another 10, then resend the first request with its original attempt ID. The receipt path returns the earlier 10-XP snapshot instead of the current 20 XP.

   **Smallest fix (-):** Exclude progression in the existing `forReceipt` function and reconstruct it from the current envelope in `replay`, as the Spellbook already is. Keep duplicate-award checks.

6. **Cut · medium · rank 2 — Remove the separate 85% difficulty ceiling.**

   **Evidence:** The plan introduces [a new 0.85 cap](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:78), while [the existing calculation already caps at 1](/home/marcello/workspace/ParaLLang/server/src/language-engine.js:122).

   **Removable complexity:** This adds a second saturation policy and lowers existing difficulty. Portia starts at [0.20](/home/marcello/workspace/ParaLLang/content/characters/enemies/archway_portia.yaml:20) and escalates by [0.05 per turn](/home/marcello/workspace/ParaLLang/content/languages/it/encounters/market_entrance_tutorial.yaml:15): turn 14 currently requests 90%, but the plan would request 85% even at level 1.

   **Smallest fix (-):** Pass `base + ratioBonus` into the existing capped calculation. Retain the acceptance check at the existing 100% cap.

7. **Cut · medium · rank 3 — The new progression module is unnecessary.**

   **Evidence:** The plan creates [a file containing two pure calculations and three award sizes](/home/marcello/workspace/ParaLLang/docs/rounds/121/trail/plan-v1.md:51). [The existing language engine already houses pure difficulty and learning calculations](/home/marcello/workspace/ParaLLang/server/src/language-engine.js:122).

   **Removable complexity:** A new module boundary is unnecessary for these calculations and does not change the player’s behavior.

   **Smallest fix (-):** Put the pure calculations in the existing `language-engine.js` and keep award sizes beside their commit logic in `learning-service.js`. Preserve the planned tests.
```
