# Codex review 1: round 119's build

- **Dispatched:** 2026-11-15T10:32:39Z
- **Returned:** 2026-11-15T10:42:19Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1dec4-2810-7252-b52d-b50136e0a604`. The model name was not printed.
- **Prompt:** written for this review (not the codex-critique template). It asked for defects in the diff `365044e..5c60a49` against `docs/rounds/119/architecture.md`, in six areas: the server's dungeon rules and routes; the client store's races and dead ends; the camera; the screen and its styles on a 390 px phone; the build and the deploy, including a new client with an old server and the reverse; the tests. For each finding: severity, file and line, the sequence of actions, the smallest fix, and how it was verified. No style or nice-to-have items. The full prompt is in the session's command; it named no conclusion of Claude's.
- **Reviewed input:** `git diff 365044e..5c60a49`, branch `round-119-map`. Working tree at dispatch: `docs/rounds/119/` (journal; pictures being written by job 5443). Three store fixes Claude made while the review ran (a read of the run when the map opens, a read when a start names another site, no walk while Talk is with the server) were not in the reviewed commit; findings R1.3 and R1.4 name two of them independently.
- **Findings:** 6 (2 high, 3 medium, 1 low)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1dec4-2810-7252-b52d-b50136e0a604).
[codex] Turn started (01a1dec4-2b01-7702-9aef-e10562604951).
[codex] Assistant message captured: I’ll read the round 119 design and diff, then trace the server, client state, scene, controls...
[codex] Running command: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'SKILL.md'...
[codex] Command completed: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'SKILL.md'... (exit 0)
[codex] Running command: /bin/bash -lc 'git status --short && git diff --stat 365044e..5c60a49 && cat STATUS.md'
[codex] Command completed: /bin/bash -lc 'git status --short && git diff --stat 365044e..5c60a49 && cat STATUS.md' (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '1,105p' STATUS.md; sed -n '300,365p' STATUS.md; cat docs/rounds/119/ar...
[codex] Command completed: /bin/bash -lc "sed -n '1,105p' STATUS.md; sed -n '300,365p' STATUS.md; cat docs/rounds/119/ar... (exit 0)
[codex] Running command: /bin/bash -lc 'git diff 365044e..5c60a49 -- server/src/dungeon.js server/src/learning-service...
[codex] Command completed: /bin/bash -lc 'git diff 365044e..5c60a49 -- server/src/dungeon.js server/src/learning-service... (exit 0)
[codex] Running command: /bin/bash -lc "git diff 365044e..5c60a49 -- client/src/stores/gameStore.js client/src/dungeon...
[codex] Command completed: /bin/bash -lc "git diff 365044e..5c60a49 -- client/src/stores/gameStore.js client/src/dungeon... (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/119/architecture.md'
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/119/architecture.md' (exit 0)
[codex] Running command: /bin/bash -lc 'git rev-parse HEAD; nl -ba server/src/dungeon.js; git diff 365044e..5c60a49 --...
[codex] Command completed: /bin/bash -lc 'git rev-parse HEAD; nl -ba server/src/dungeon.js; git diff 365044e..5c60a49 --... (exit 0)
[codex] Running command: /bin/bash -lc "git rev-parse HEAD; nl -ba server/src/dungeon.js; nl -ba client/src/stores/gam...
[codex] Command completed: /bin/bash -lc "git rev-parse HEAD; nl -ba server/src/dungeon.js; nl -ba client/src/stores/gam... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '235,600p'"
[codex] Command completed: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '235,600p'" (exit 0)
[codex] Assistant message captured: The server’s graph rules appear to match the design so far. I’m checking the handoffs next: o...
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/director.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/director.js' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/D...
[codex] Running command: /bin/bash -lc "nl -ba client/src/scene/levelView.js; cat .github/workflows/deploy.yml .github...
[codex] Command completed: /bin/bash -lc "nl -ba client/src/scene/levelView.js; cat .github/workflows/deploy.yml .github... (exit 0)
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/components/DungeonScreen.jsx; nl -ba client/src/components/D... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/director.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/director.js' (exit 0)
[codex] Running command: /bin/bash -lc 'cat client/src/__tests__/taProhmPlan.js; cat client/src/__tests__/dungeon-file...
[codex] Command completed: /bin/bash -lc 'cat client/src/__tests__/taProhmPlan.js; cat client/src/__tests__/dungeon-file... (exit 0)
[codex] Running command: /bin/bash -lc "cat client/src/dungeonModel.js client/src/atlas.js client/src/dungeon.js; nl -...
[codex] Command completed: /bin/bash -lc "cat client/src/dungeonModel.js client/src/atlas.js client/src/dungeon.js; nl -... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n \"client|aesthetic|\\.\\./\\.\\./|readFile|dungeon|listen\" server/src/c...
[codex] Command completed: /bin/bash -lc "rg -n \"client|aesthetic|\\.\\./\\.\\./|readFile|dungeon|listen\" server/src/c... (exit 0)
[codex] Running command: /bin/bash -lc 'cat client/src/stores/__tests__/dungeon-flow.test.js'
[codex] Command completed: /bin/bash -lc 'cat client/src/stores/__tests__/dungeon-flow.test.js' (exit 0)
[codex] Running command: /bin/bash -lc 'cat client/src/api/settings.js client/src/api/encounter.js; cat client/src/__t...
[codex] Command completed: /bin/bash -lc 'cat client/src/api/settings.js client/src/api/encounter.js; cat client/src/__t... (exit 0)
[codex] Running command: /bin/bash -lc "git show 365044e:client/src/stores/gameStore.js | nl -ba | sed -n '145,245p'; ...
[codex] Command completed: /bin/bash -lc "git show 365044e:client/src/stores/gameStore.js | nl -ba | sed -n '145,245p'; ... (exit 0)
[codex] Assistant message captured: I found a recovery gap: after a site resolves, a failed progress read can leave the next path...
[codex] Running command: /bin/bash -lc "rg --files node_modules | rg '(playwright|puppeteer)' | head -20; rg -n 'taPro...
[codex] Command completed: /bin/bash -lc "rg --files node_modules | rg '(playwright|puppeteer)' | head -20; rg -n 'taPro... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' for (const pkg of ['zustand','js-yaml','puppet...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' for (const pkg of ['zustand','js-yaml','puppet... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'CHROME_PATH|PUPPETEER_CORE|chrome-headless|puppeteer' README.md docs/ha...
[codex] Command failed: /bin/bash -lc "rg -n 'CHROME_PATH|PUPPETEER_CORE|chrome-headless|puppeteer' README.md docs/ha... (exit 1)
[codex] Running command: /bin/bash -lc "sed -n '108,135p' client/src/index.css; sed -n '140,158p' docs/handoff.md; nl ...
[codex] Command completed: /bin/bash -lc "sed -n '108,135p' client/src/index.css; sed -n '140,158p' docs/handoff.md; nl ... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import { readFileSync } from 'node:fs'; import...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import { readFileSync } from 'node:fs'; import... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '18,31p' aesthetic/src/scene/taprohm.js; sed -n '84,125p' aesthetic/src...
[codex] Command completed: /bin/bash -lc "sed -n '18,31p' aesthetic/src/scene/taprohm.js; sed -n '84,125p' aesthetic/src... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import ya...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import ya... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import ya...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import ya... (exit 0)
[codex] Running command: /bin/bash -lc "git status --short; sed -n '235,246p' client/src/stores/gameStore.js; sed -n '...
[codex] Command completed: /bin/bash -lc "git status --short; sed -n '235,246p' client/src/stores/gameStore.js; sed -n '... (exit 0)
[codex] Assistant message captured: The working tree changed during the review, so I’m pinning further checks to `5c60a49` in mem...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import {e...
[codex] Command failed: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import {e... (exit 1)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import {e...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {readFileSync} from 'node:fs';import {e... (exit 0)
[codex] Running command: /bin/bash -lc "git show 5c60a49:client/src/stores/__tests__/dungeon-flow.test.js | nl -ba | s...
[codex] Command completed: /bin/bash -lc "git show 5c60a49:client/src/stores/__tests__/dungeon-flow.test.js | nl -ba | s... (exit 0)
[codex] Running command: /bin/bash -lc "git diff 365044e..5c60a49 -- server/test/encounters.test.js client/src/__tests...
[codex] Command failed: /bin/bash -lc "git diff 365044e..5c60a49 -- server/test/encounters.test.js client/src/__tests... (exit 2)
[codex] Running command: /bin/bash -lc "git diff -- client/src/stores/__tests__/dungeon-flow.test.js; git show 5c60a49...
[codex] Command completed: /bin/bash -lc "git diff -- client/src/stores/__tests__/dungeon-flow.test.js; git show 5c60a49... (exit 0)
[codex] Running command: /bin/bash -lc "git show 5c60a49:server/test/web-client.test.js | nl -ba | sed -n '79,228p'; g...
[codex] Command completed: /bin/bash -lc "git show 5c60a49:server/test/web-client.test.js | nl -ba | sed -n '79,228p'; g... (exit 0)
[codex] Running command: /bin/bash -lc "cat aesthetic/package.json; rg -n 'export|function createWorld|document|create...
[codex] Command completed: /bin/bash -lc "cat aesthetic/package.json; rg -n 'export|function createWorld|document|create... (exit 0)
[codex] Running command: /bin/bash -lc 'node --test server/test/dungeon-rules.test.js'
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process...
[codex] Command completed: /bin/bash -lc 'node --test server/test/dungeon-rules.test.js' (exit 0)
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process... (exit 0)
[codex] Assistant message captured: The pure dungeon-rules test passed. I also verified that the old client goes offline against ...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process... (exit 0)
[codex] Running command: /bin/bash -lc "git show 5c60a49:client/src/components/__tests__/dungeon-screen.test.jsx | nl ...
[codex] Command completed: /bin/bash -lc "git show 5c60a49:client/src/components/__tests__/dungeon-screen.test.jsx | nl ... (exit 0)
[codex] Running command: /bin/bash -lc "rg --files --no-ignore docs/rounds/119/shots | head -30; sed -n '52,67p' aesth...
[codex] Command completed: /bin/bash -lc "rg --files --no-ignore docs/rounds/119/shots | head -30; sed -n '52,67p' aesth... (exit 0)
[codex] Assistant message captured: Reviewed `365044e..5c60a49`; excluded concurrent working-tree edits. Verification used read-o...
[codex] Turn completed.
Reviewed `365044e..5c60a49`; excluded concurrent working-tree edits. Verification used read-only inspection, in-memory reproductions and the passing port-free dungeon-rules test. No files were changed or ports opened.

Server graph rules, save migration/validation, session `siteId`, clearing and reset: no independent gameplay defect found.

Client-only build imports and Dockerfile/`.dockerignore`: no packaging defect found by inspection; builds were not run.

390 px layout: no additional clipping or missing-control defect found in the code and existing phone screenshots.

1. **High — The new server breaks clients still running the previous deployment.** [learning-service.js:727](/home/marcello/workspace/ParaLLang/server/src/learning-service.js:727)

   **Sequence:** Render updates before Pages, or a player keeps the old page open. The new dungeon response omits `clearedEncounterIds`. The old store’s initialization reads `.length` from that missing field and sets the connection offline. Its linear progression also depends on the removed `nextSiteIndex` and previous start semantics.

   **Verification:** Loaded the store from `365044e` in memory and supplied the new server’s actual `dungeonView()` response. Initialization produced `offline: Cannot read properties of undefined (reading 'length')`.

   **Smallest fix:** Keep the previous dungeon contract available during rollout and expose the graph contract through a versioned endpoint. Restoring response fields alone does not restore the old progression semantics.

2. **High — Going down from the map can put the camera inside the gallery roof.** [director.js:279](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:279)

   **Sequence:** Reach the Root Court, open Map, let the overview settle, then choose “Go down to The Root Court.” The spherical approach crosses the third enclosure’s roof instead of descending through clear space.

   **Verification:** Evaluated the real director with a phone-shaped free viewport. At 2.4 seconds, the camera is approximately `[3.747, 3.004, 29.944]`. That lies inside the noncollapsed roof course generated by [taprohm.js:119](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:119). Existing collision tests start approaches without a previous overhead pose or check only their endpoint.

   **Smallest fix:** Move above the clear final position before descending vertically, and check the complete overview-to-approach transition against the geometry.

3. **Medium — A failed progress read leaves a resolved site blocking further progress.** [gameStore.js:272](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:272)

   **Sequence:** Resolve Portia, but let the following `getDungeon` request fail once. The conversation displays its resolved state while local progress still says the gate is uncleared. Opening Map does not refresh it: neither outgoing path is available, and Start reopens Portia.

   **Verification:** Reproduced against the committed store with an in-memory API. After restoring the API and opening Map, there were zero additional reads, `clearedSiteIds` remained empty, and no site was reachable.

   **Smallest fix:** Refresh progress when opening Map, with the existing stale-read protection. Add a test where the post-resolution read fails and opening Map recovers it.

4. **Medium — Following another tab’s encounter leaves the movement map at the previous site.** [gameStore.js:121](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:121)

   **Sequence:** Tab A loads the fresh gate map. Tab B clears Portia and moves to the Root Court. Tab A presses Start: it correctly receives Gerald and changes `siteIndex`, but retains the gate’s old progress. After Leave, the return path to the gate is disabled even though the server permits retreat.

   **Verification:** Reproduced the existing two-tab scenario in memory, then called Leave. The resulting state had `siteIndex: 2`, `progress.at: 'face_gate'`, and `face_gate.reachable: false`. The existing test checks the encounter and phase but never checks the map afterward.

   **Smallest fix:** Refresh progress whenever a start response identifies a different site; verify position and retreat availability in that test.

5. **Medium — A delayed move reply can overwrite a completed reset.** [gameStore.js:245](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:245), [DungeonScreen.jsx:274](/home/marcello/workspace/ParaLLang/client/src/components/DungeonScreen.jsx:274)

   **Sequence:** On victory, press Play again while its request is slow. “Stay in the temple” remains enabled: press it, go down to the Sanctuary, and walk back toward Before the Sanctuary. If the move is processed before the reset but its response arrives afterward, the store accepts the old run and leaves the world map.

   **Verification:** Reproduced that button-action sequence with independently delayed reset processing and move delivery. After reset, both sides reported run 2. Delivering the old move changed the client to run 1 at `before_sanctuary`, while the server remained on run 2 at `face_gate`.

   **Smallest fix:** Disable and guard Stay during reset, and invalidate outstanding move replies when reset completes. The move guard currently checks learner/settings identity only.

6. **Low — The screen test accepts omission of the required `leave` flag.** [dungeon-screen.test.jsx:283](/home/marcello/workspace/ParaLLang/client/src/components/__tests__/dungeon-screen.test.jsx:283)

   **Sequence:** Remove `leave: true` from moves after leaving an ongoing conversation. This assertion still passes because it explicitly accepts `undefined`. The screen fixture also drops the session on movement without enforcing the server’s conversation rule.

   **Verification:** Checked the assertion and fixture handler: a move containing only `siteId` satisfies the assertion and the fixture accepts it.

   **Smallest fix:** Exercise a move immediately after leaving an ongoing replay, assert that request’s `leave === true`, and make the fixture reject an ongoing-conversation move without it.
```
