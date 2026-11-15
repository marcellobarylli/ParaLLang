# Codex review 1: round 120's build

- **Dispatched:** 2026-11-15T11:29:36Z
- **Returned:** 2026-11-15T11:38:50Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1def8-7780-7442-bb8a-22417180bc7d`. The model name was not printed.
- **Prompt:** written for this review (not the codex-critique template). It asked for defects in `git diff 605a00e..fb700bc -- client server` against `docs/rounds/120/architecture.md`, in six areas: the store's party actions and their races with the site actions; the screen and the Party panel; the styles of the top bar at 390 px and from 1100 px; the server (the `saveable` field, and what a party conversation started from the dungeon meets); a new client with round 119's server and the reverse; the tests. For each finding: severity, file and line, the sequence of actions, the smallest fix, and how it was verified. No style or nice-to-have items. It named no conclusion of Claude's.
- **Reviewed input:** `git diff 605a00e..fb700bc -- client server`, branch `round-120-party`. Working tree at dispatch: `docs/rounds/120/` (journal, pictures) and `docs/rounds/121/` (a draft) untracked or changed.
- **Findings:** 5 (4 medium, 1 low)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1def8-7780-7442-bb8a-22417180bc7d).
[codex] Turn started (01a1def8-7934-7d52-a4ea-68c3c62db806).
[codex] Assistant message captured: I’ll read the current status and round designs, then trace the client and server changes and ...
[codex] Running command: /bin/bash -lc 'cat STATUS.md'
[codex] Command completed: /bin/bash -lc 'cat STATUS.md' (exit 0)
[codex] Running command: /bin/bash -lc 'git status --short'
[codex] Command completed: /bin/bash -lc 'git status --short' (exit 0)
[codex] Running command: /bin/bash -lc 'git diff --stat 605a00e..fb700bc -- client server'
[codex] Command completed: /bin/bash -lc 'git diff --stat 605a00e..fb700bc -- client server' (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/120/architecture.md docs/rounds/119/architecture.md docs/round...
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/120/architecture.md docs/rounds/119/architecture.md docs/round... (exit 0)
[codex] Running command: /bin/bash -lc 'ls docs/rounds/120; git diff 605a00e..fb700bc -- client/src/stores/gameStore.j...
[codex] Command completed: /bin/bash -lc 'ls docs/rounds/120; git diff 605a00e..fb700bc -- client/src/stores/gameStore.j... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '1,130p' STATUS.md; rg --files -g AGENTS.md -g '*round-log*'"
[codex] Command completed: /bin/bash -lc "sed -n '1,130p' STATUS.md; rg --files -g AGENTS.md -g '*round-log*'" (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/stores/gameStore.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/stores/gameStore.js' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/P...
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/P... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'party|dungeon|activeSession|serializeSpellbook|hasActive|review|startEn...
[codex] Running command: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/stores/__tests__/dungeon-flow.test.js ...
[codex] Command completed: /bin/bash -lc "rg -n 'party|dungeon|activeSession|serializeSpellbook|hasActive|review|startEn... (exit 0)
[codex] Command completed: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/stores/__tests__/dungeon-flow.test.js ... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '296,415p' client/src/components/DungeonScreen.jsx; cat -n client/src/c...
[codex] Command completed: /bin/bash -lc "sed -n '296,415p' client/src/components/DungeonScreen.jsx; cat -n client/src/c... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '260,295p' server/src/learning-service.js; sed -n '737,911p' server/src...
[codex] Command completed: /bin/bash -lc "sed -n '260,295p' server/src/learning-service.js; sed -n '737,911p' server/src... (exit 0)
[codex] Assistant message captured: The server change adds only the map’s `saveable` field, so I’m tracing how existing session r...
[codex] Running command: /bin/bash -lc "sed -n '90,235p' client/src/index.css; sed -n '270,293p' server/src/learning-s...
[codex] Command completed: /bin/bash -lc "sed -n '90,235p' client/src/index.css; sed -n '270,293p' server/src/learning-s... (exit 0)
[codex] Running command: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/stores/__tests__/dungeon-flow.test.js'
[codex] Command completed: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/stores/__tests__/dungeon-flow.test.js' (exit 0)
[codex] Running command: /bin/bash -lc "rg --files node_modules | rg 'playwright|puppeteer' | head -20; command -v chr...
[codex] Command completed: /bin/bash -lc "rg --files node_modules | rg 'playwright|puppeteer' | head -20; command -v chr... (exit 0)
[codex] Running command: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/components/__tests__/dungeon-screen.te...
[codex] Command completed: /bin/bash -lc 'git diff 605a00e..fb700bc -- client/src/components/__tests__/dungeon-screen.te... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '1,165p' client/src/components/Spellbook.jsx; sed -n '1,120p' client/sr...
[codex] Command completed: /bin/bash -lc "sed -n '1,165p' client/src/components/Spellbook.jsx; sed -n '1,120p' client/sr... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '395,463p' client/src/components/__tests__/dungeon-screen.test.jsx; nl ...
[codex] Command failed: /bin/bash -lc "sed -n '395,463p' client/src/components/__tests__/dungeon-screen.test.jsx; nl ... (exit 2)
[codex] Running command: /bin/bash -lc "git rev-parse HEAD; rg -n 'expect\\(|assert\\.' client/src/stores/__tests__/du...
[codex] Command completed: /bin/bash -lc "git rev-parse HEAD; rg -n 'expect\\(|assert\\.' client/src/stores/__tests__/du... (exit 0)
[codex] Assistant message captured: I found a reachable navigation race that can leave every Party Talk button disabled after a p...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {createGameStore} from './client/src/...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import {createGameStore} from './client/src/... (exit 0)
[codex] Running command: /bin/bash -lc "ls docs/rounds/120/shots; rg -n 'expect|assert|check' client/scripts/dungeon-s...
[codex] Command completed: /bin/bash -lc "ls docs/rounds/120/shots; rg -n 'expect|assert|check' client/scripts/dungeon-s... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'top bar|titleScroll|overlap|phone|desktop' docs/rounds/120/shots/shots....
[codex] Command failed: /bin/bash -lc "rg -n 'top bar|titleScroll|overlap|phone|desktop' docs/rounds/120/shots/shots.... (exit 1)
[codex] Running command: /bin/bash -lc "git diff 605a00e..fb700bc -- client/src/__tests__/settings.test.js server/test...
[codex] Command completed: /bin/bash -lc "git diff 605a00e..fb700bc -- client/src/__tests__/settings.test.js server/test... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'camera|setPhase|levelView|convers|Spellbook|review' client/src/stores/_...
[codex] Command completed: /bin/bash -lc "rg -n 'camera|setPhase|levelView|convers|Spellbook|review' client/src/stores/_... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'top bar' docs/rounds/120/shots/shots.json; rg --files /home/marcello/.l...
[codex] Command completed: /bin/bash -lc "rg -n 'top bar' docs/rounds/120/shots/shots.json; rg --files /home/marcello/.l... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'Spellbook|review|meanings|inEncounter|IN_ENCOUNTER' server/test/party-c...
[codex] Command completed: /bin/bash -lc "rg -n 'Spellbook|review|meanings|inEncounter|IN_ENCOUNTER' server/test/party-c... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import { LearningService } from './server/sr...
[codex] Command failed: /bin/bash -lc "node --input-type=module <<'NODE' import { LearningService } from './server/sr... (exit 1)
[codex] Running command: /bin/bash -lc "rg -n '"'^ async '"' server/src/learning-service.js | tail -22; sed -n '96,128...
[codex] Command failed: /bin/bash -lc "rg -n '"'^ async '"' server/src/learning-service.js | tail -22; sed -n '96,128... (exit 1)
[codex] Assistant message captured: The store probes confirmed both races: cancelling a pending Talk leaves `partyStarting` set, ...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import { LearningService } from './server/sr...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import { LearningService } from './server/sr... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '136,165p' client/scripts/dungeon-shots.mjs; rg -n 'party|attract|victo...
[codex] Command completed: /bin/bash -lc "sed -n '136,165p' client/scripts/dungeon-shots.mjs; rg -n 'party|attract|victo... (exit 0)
[codex] Running command: /bin/bash -lc "cat package.json; sed -n '90,125p' client/src/components/__tests__/camera-wiri...
[codex] Command completed: /bin/bash -lc "cat package.json; sed -n '90,125p' client/src/components/__tests__/camera-wiri... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {createGameStore} from './client/src/...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import {createGameStore} from './client/src/... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {execFileSync} from 'node:child_proce...
[codex] Command failed: /bin/bash -lc "node --input-type=module <<'NODE' import {execFileSync} from 'node:child_proce... (exit 1)
[codex] Running command: /bin/bash -lc "sed -n '146,250p' docs/rounds/119/architecture.md; sed -n '1,145p' docs/rounds...
[codex] Command completed: /bin/bash -lc "sed -n '146,250p' docs/rounds/119/architecture.md; sed -n '1,145p' docs/rounds... (exit 0)
[codex] Assistant message captured: The direct server checks passed with storage held in memory: party chats hide non-due meaning...
[codex] Assistant message captured: Verified through source inspection and in-memory probes of the actual store and server servic...
[codex] Turn completed.
Verified through source inspection and in-memory probes of the actual store and server service. No files were changed and no ports were bound.

No server behaviour defect found in map `saveable`, party sessions, moves, site replacement, hidden meanings or review refusal.

No separate offer/invitation defect found on matching builds. No header defect identified at 390 px or from 1100 px through CSS inspection and existing phone/desktop images.

No contract break found for the round 119 client against the new server.

1. **Medium — cancelling Talk can permanently disable every Party Talk button.** [gameStore.js:380](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:380), [PartyPanel.jsx:38](/home/marcello/workspace/ParaLLang/client/src/components/PartyPanel.jsx:38).

   From a site card, open Party, click Talk, close the panel while the greeting loads, then click Map. `openMap()` invalidates the request and clears `encounterLoading`, but leaves `partyStarting` set. The discarded reply never clears it. Reopening Party disables every Talk button indefinitely; finishing another site conversation does not repair it. Play again during a pending Talk has the same problem.

   **Verified:** a deferred-response probe ended in `overview` with `encounterLoading: false` and `partyStarting: "gerald_coffee_break"`. The panel explicitly disables all Talk buttons for that value.

   **Smallest fix:** clear `partyStarting` whenever navigation invalidates a party start, including through the shared `quiet` patch. Add a deferred-start navigation test.

2. **Medium — a delayed recruit reply overwrites newer conversation progress.** [gameStore.js:351](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:351).

   Have Gerald recruited with two completed conversations. Save Mortimer, but delay the recruit response after the server commits it. Meanwhile, open Party and finish Gerald’s third conversation. Its refresh correctly unlocks `gerald_confidence`. When Mortimer’s older recruit response arrives, it unconditionally replaces the party with Gerald’s count of two and his earlier conversation.

   **Verified:** an in-memory store probe changed Gerald from count three/`gerald_confidence` back to count two/`gerald_coffee_break`. The existing race test at [dungeon-flow.test.js:868](/home/marcello/workspace/ParaLLang/client/src/stores/__tests__/dungeon-flow.test.js:868) only delays reads, never a recruit response.

   **Smallest fix:** track party operations across the recruit request. If another operation overtakes it, discard its snapshot and refresh the party; otherwise apply it and invalidate older reads.

3. **Medium — a pending party greeting closes a Spellbook the player subsequently opened.** [gameStore.js:381](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:381).

   Click Party → Talk, close Party while the greeting loads, then open Spellbook. When Talk succeeds, spreading `quiet` forces `view: 'dialogue'`, ejecting the player from Spellbook. Existing site starts preserve the selected overlay.

   **Verified:** a deferred-response probe showed `view: 'spellbook'` before the greeting arrived and `view: 'dialogue'` afterward. The existing overlay-preservation test exercises only a site start.

   **Smallest fix:** close the Party overlay on success only if it is still selected; preserve a subsequently selected Spellbook or review view.

4. **Medium — the new client silently loses cleared-site invitations against the round 119 server.** [gameStore.js:46](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:46), [DungeonScreen.jsx:191](/home/marcello/workspace/ParaLLang/client/src/components/DungeonScreen.jsx:191).

   During the deployment gap, load the new client against the old server at a cleared, unrecruited Gerald site. Initialization succeeds, but the old map lacks `saveable`; the merge produces `null`, so “Invite Gerald to your party” disappears. Reloading preserves this omission. Recruiting requires replaying and resolving his site conversation to recover the offer.

   **Verified:** compared the server implementations and passed a round 119-shaped map into the actual new store: it reported `connection: 'ready'` with Gerald’s `saveable: null`. The invitation requires a truthy value.

   **Smallest fix:** detect missing capability metadata and show an updating/retry state for recruitment, or obtain it through a compatible fallback. Add a mixed-version contract case.

5. **Low — party-specific Spellbook and review behaviour lacks regression coverage.** [web-client.test.js:286](/home/marcello/workspace/ParaLLang/server/test/web-client.test.js:286).

   The dungeon-party contract starts, leaves, resumes and resolves Gerald’s conversation without inspecting meanings or attempting reviews. Existing privacy/review tests exercise ordinary encounters; party tests check fragment withholding, but not vocabulary meanings and review refusal.

   **Verified:** inspected those suites and independently exercised the missing sequence against the service with memory storage: seven non-due cards were withheld and review creation returned `IN_ENCOUNTER`. Current behaviour is correct, but excluding party sessions from these protections would escape the added party tests.

   **Smallest fix:** extend this contract case to check non-due meanings during the party conversation, review refusal while it runs, and review availability after resolution.
```
