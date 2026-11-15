# Codex critique 1: the map in the dungeon, in two layers

- **Dispatched:** 2026-11-15T09:49:34Z
- **Returned:** 2026-11-15T10:02:48Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1de9c-e501-75f0-a1dc-df394d36e9cb`. The model name was not printed.
- **Prompt:** the codex-critique template, with "Decided with the owner" read as the plan's "Owner decisions" section, and this goal: "the web client's Ta Prohm dungeon stops being three sites in a fixed order; the player moves freely over a map with fog of war in two layers (the temple as a map of seven sites joined by branching paths, and a world map of places above it)".
- **Reviewed input:** `plan-v1.md`, sha256 2f16b2cc8a0c470e0d2012851e05b8b39dfe1aee96beefb9cd9b5415a71450a9, HEAD 365044e (branch `round-119-map`), working tree: only `docs/rounds/119/` untracked
- **Findings:** 9 (3 Errors, 6 Cuts)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1de9c-e501-75f0-a1dc-df394d36e9cb).
[codex] Turn started (01a1de9c-e8d7-76c3-b39f-24c32804afc2).
[codex] Assistant message captured: I’ll read the current state and plan, then check each step and acceptance criterion against t...
[codex] Running command: /bin/bash -lc 'cat STATUS.md'
[codex] Command completed: /bin/bash -lc 'cat STATUS.md' (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/119/trail/plan-v1.md'
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/119/trail/plan-v1.md' (exit 0)
[codex] Running command: /bin/bash -lc "rg --files -g 'AGENTS.md' -g '*SKILL.md' -g '*architecture.md' -g '*findings.m...
[codex] Command completed: /bin/bash -lc "rg --files -g 'AGENTS.md' -g '*SKILL.md' -g '*architecture.md' -g '*findings.m... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba docs/rounds/119/trail/plan-v1.md'
[codex] Command completed: /bin/bash -lc 'nl -ba docs/rounds/119/trail/plan-v1.md' (exit 0)
[codex] Running command: /bin/bash -lc 'ls -la docs/rounds/119; cat docs/rounds/118/architecture.md docs/rounds/118/fi...
[codex] Command failed: /bin/bash -lc 'ls -la docs/rounds/119; cat docs/rounds/118/architecture.md docs/rounds/118/fi... (exit 2)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/115/architecture.md docs/handoff.md'
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/115/architecture.md docs/handoff.md' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/director.js; nl -ba client/src/__tests__/dungeon-file....
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/director.js; nl -ba client/src/__tests__/dungeon-file.... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'dungeon|DUNGEON|NOT_NEXT|completedEncounterIds|drill_before' server/src...
[codex] Command completed: /bin/bash -lc "rg -n 'dungeon|DUNGEON|NOT_NEXT|completedEncounterIds|drill_before' server/src... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/director.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/director.js' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/stores/gameStore.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/stores/gameStore.js' (exit 0)
[codex] Assistant message captured: The plan changes the save format, movement rules and camera paths as well as the screens. I’m...
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '600,640p;680,870p;1190,1260p';...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '600,640p;680,870p;1190,1260p';... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/D...
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/D... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/levelView.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/levelView.js' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba server/test/dungeon.test.js; nl -ba server/test/web-client.test.js'
[codex] Command completed: /bin/bash -lc 'nl -ba server/test/dungeon.test.js; nl -ba server/test/web-client.test.js' (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'TA_PROHM|PASSAGE|sanctuary|inner|library|passage|gate' aesthetic/src/sc...
[codex] Command completed: /bin/bash -lc "rg -n 'TA_PROHM|PASSAGE|sanctuary|inner|library|passage|gate' aesthetic/src/sc... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/test/helpers.js | sed -n '1,210p'; nl -ba client/scripts/dungeon...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/helpers.js | sed -n '1,210p'; nl -ba client/scripts/dungeon... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/test/helpers.js | sed -n '12,155p'; nl -ba server/src/world.js; ...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/helpers.js | sed -n '12,155p'; nl -ba server/src/world.js; ... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'market|location|sceneLocation|scene_location|inscription|footnote|fragm...
[codex] Command completed: /bin/bash -lc "rg -n 'market|location|sceneLocation|scene_location|inscription|footnote|fragm... (exit 0)
[codex] Assistant message captured: The seven-site graph is reachable under the proposed pass and seal rules. I’m now checking re...
[codex] Running command: /bin/bash -lc "head -32 server/src/learning-storage.js; nl -ba server/src/learning-service.js...
[codex] Command completed: /bin/bash -lc "head -32 server/src/learning-storage.js; nl -ba server/src/learning-service.js... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '550,580p;87,144p'; nl -ba clie...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '550,580p;87,144p'; nl -ba clie... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import { randomUUID } from 'node:crypto'; impo...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import { randomUUID } from 'node:crypto'; impo... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs'; import y...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs'; import y... (exit 0)
[codex] Assistant message captured: The proposed paths pass the existing wall-plan check, and the fixture provider resolves all s...
[codex] Running command: /bin/bash -lc "nl -ba content/languages/it/characters/enemies/charcutier_mortimer.yaml | head...
[codex] Command failed: /bin/bash -lc "nl -ba content/languages/it/characters/enemies/charcutier_mortimer.yaml | head... (exit 1)
[codex] Running command: /bin/bash -lc "rg --files content | rg 'charcutier|mortimer'; nl -ba content/languages/it/enc...
[codex] Command completed: /bin/bash -lc "rg --files content | rg 'charcutier|mortimer'; nl -ba content/languages/it/enc... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {blendPoses,EYE,STANDOFF,ENGAGE_MAX} fr...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {blendPoses,EYE,STANDOFF,ENGAGE_MAX} fr... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {blendPoses} from './client/src/scene/d...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {blendPoses} from './client/src/scene/d... (exit 0)
[codex] Assistant message captured: 1. **Error — high — Leaving a replay does not cover every legal move.** **Evidence:** [plan-v...
[codex] Turn completed.
1. **Error — high — Leaving a replay does not cover every legal move.**

   **Evidence:** [plan-v1.md:165](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:165) specifies `leave: true` for retreating to a visited neighbour. The [pass rule](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:111) also allows a cleared site to lead to an unvisited neighbour, while the [move endpoint](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:131) rejects an ongoing conversation without `leave`.

   **Failure:** Clear Root Court, replay Gerald, press Leave, then choose the unvisited Sunlit Court. That destination is reachable, but the specified client handling omits `leave: true`; the server returns `CONVERSATION_UNDER_WAY`.

   **Smallest fix (0):** Reuse `leave: true` for every permitted move after Leave, including moves from a cleared site to an unvisited neighbour.

2. **Error — high — `BLOCKED` names the wrong character.**

   **Evidence:** [plan-v1.md:132](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:132) specifies “Portia has not let you pass yet.” Buttress Tree instead hosts Mortimer: [encounter definition:4](/home/marcello/workspace/ParaLLang/content/languages/it/encounters/butchers_stall_charcutier.yaml:4), [character definition:3](/home/marcello/workspace/ParaLLang/content/characters/enemies/charcutier_mortimer.yaml:3).

   **Failure:** Clear Portia, move to uncleared Buttress Tree, then request Root Court. The endpoint correctly blocks the move but incorrectly blames Portia, who has already let the player pass.

   **Smallest fix (0):** Narrow the message to “Finish this site’s encounter first.”

3. **Error — medium — Resuming a completed run depends on an unspecified victory exit.**

   **Evidence:** [plan-v1.md:154](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:154) leaves the source of the semicolon-separated “Stay in the temple” transition ambiguous. [Reload always selects victory](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:168). The existing [VictoryCard](/home/marcello/workspace/ParaLLang/client/src/components/DungeonScreen.jsx:149) offers only Play again and Spellbook; [Play again resets the run](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:236).

   **Failure:** If Stay is implemented only beside the goal’s resolved conversation, reloading a completed run removes the way back into it. That conflicts with “a complete run stays playable.”

   **Smallest fix (0):** Explicitly attach the already planned Stay transition to `victory`, including victory reached through reload.

4. **Cut — high — Rank 1: Remove the automatic turn toward an unchosen branch.**

   **Evidence:** [plan-v1.md:196](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:196) chooses the first unvisited neighbour before the player chooses a destination. The existing director uses an [8 m onward look](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:30) and [spherical pose blending](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:54).

   **Failure/removable complexity:** Clear Sunlit Court after arriving from Root Court. The automatic turn points toward unexplored Library; choose Before the Sanctuary instead. Applying the existing blend to those proposed paths puts the camera around `[-9.17, 1.67, 29.06]`, inside the third enclosure’s gallery, away from its passage. The [existing wall check](/home/marcello/workspace/ParaLLang/client/src/__tests__/dungeon-file.test.js:16) rejects that position. The turn also introduces visited-state-dependent camera logic that navigation does not need.

   **Smallest fix (-):** Keep looking at the resolved site until the player chooses a walk. Reuse the existing hold and transition.

5. **Cut — medium — Rank 2: Keep a fixed temple-map frame.**

   **Evidence:** [plan-v1.md:174](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:174) and [plan-v1.md:198](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:198) introduce framing that changes with visibility. The director already has [fixed overview bounds and aspect-aware framing](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:134).

   **Removable complexity:** Growing the frame requires fog changes to update camera bounds and requires checking multiple visibility-dependent poses. Fog and branching movement work with one frame covering the temple.

   **Smallest fix (-):** Reuse fixed overview bounds containing all seven sites and paths. Keep visibility filtering and the framing acceptance check.

6. **Cut — medium — Rank 3: Remove server loading and validation of the atlas.**

   **Evidence:** [plan-v1.md:102](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:102) adds atlas validation to the server, while [plan-v1.md:142](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:142) explicitly gives the world layer no server endpoint, save field or enforcement.

   **Removable complexity:** This adds server startup work, validation branches and loader fixtures for data consumed entirely by the bundled client.

   **Smallest fix (-):** Bundle the atlas only in the client. Retain the world-card checks against that bundled data.

7. **Cut — medium — Rank 4: Remove the loader’s clearing-order search.**

   **Evidence:** [plan-v1.md:83](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:83) requires runtime validation that every site can be reached under some clearing order. The [contract test](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:215) already requires a legal traversal clearing all seven sites.

   **Removable complexity:** A general solvability search and its invalid-content fixtures duplicate the proof required for this dungeon’s actual graph.

   **Smallest fix (-):** Remove the loader’s clearing-order search. Keep reference validation, rule tests and the legal seven-site contract traversal.

8. **Cut — medium — Rank 5: Keep projected labels as labels.**

   **Evidence:** [plan-v1.md:178](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:178) already provides accessible Walk here buttons in the overview card, then adds buttons over the level too. Existing projected labels are [display-only](/home/marcello/workspace/ParaLLang/client/src/components/DungeonView.jsx:53), with [pointer events disabled](/home/marcello/workspace/ParaLLang/client/src/index.css:24).

   **Removable complexity:** A second movement-control surface requires additional handlers, enabled states and pointer/focus handling. The card already lets the player choose every reachable site.

   **Smallest fix (-):** Retain projected numbers and labels; use the overview card for movement.

9. **Cut — medium — Rank 6: Remove dungeon progress from world-fog calculation.**

   **Evidence:** Under [plan-v1.md:117](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:117), a place becomes visited through being the start or having dungeon progress. In the [proposed atlas](/home/marcello/workspace/ParaLLang/docs/rounds/119/trail/plan-v1.md:94), only the start has a dungeon.

   **Removable complexity:** `progressByDungeon` cannot change world visibility this round: Ta Prohm is always visited, Angkor Wat and Micromort Mountain are always known, and Bone Dome is always hidden.

   **Smallest fix (-):** Derive world fog once from the atlas start and adjacency. Continue using Ta Prohm’s progress for its cleared-count display.
```
