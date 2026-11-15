# Codex review 1: round 121's build

- **Dispatched:** 2026-11-15T12:14:29Z
- **Returned:** 2026-11-15T12:32:12Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1df21-8bda-7373-befb-cfb6a5e86a86`. The model name was not printed.
- **Prompt:** written for this review (not the codex-critique template). It asked for defects in `git diff 29f7271..d95b03d -- client server content` against `docs/rounds/121/architecture.md`, in eight areas: where XP is awarded, receipts, replays and every caller of `ratioFor` (with the note that the iPhone app must keep working unchanged); the level in gates, moves, the map and old saves; the level curve; the client store's handling of progression; the level chip and the XP lines; a new client with round 120's server and the reverse; whether a player can get stuck outside the Sanctuary; the tests. For each finding: severity, file and line, the sequence of actions, the smallest fix, and how it was verified. It named no conclusion of Claude's.
- **Reviewed input:** `git diff 29f7271..d95b03d -- client server content`, branch `round-121-levels`. Working tree at dispatch: `docs/rounds/121/` (journal, pictures) changed and `docs/rounds/122/` (a draft) untracked.
- **Findings:** 6 (2 high, 2 medium, 2 low)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1df21-8bda-7373-befb-cfb6a5e86a86).
[codex] Turn started (01a1df21-8d95-7372-adf3-dc3bae5ae46f).
[codex] Assistant message captured: I’ll read the round designs, trace the changed code and shared flows, and verify concrete fai...
[codex] Running command: /bin/bash -lc 'cat STATUS.md'
[codex] Command completed: /bin/bash -lc 'cat STATUS.md' (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/121/architecture.md docs/rounds/121/findings.md docs/rounds/12...
[codex] Command failed: /bin/bash -lc 'cat docs/rounds/121/architecture.md docs/rounds/121/findings.md docs/rounds/12... (exit 1)
[codex] Running command: /bin/bash -lc "rg --files -g AGENTS.md -g '*round-log*' -g package.json -g '*121*' -g '*progr...
[codex] Command completed: /bin/bash -lc "rg --files -g AGENTS.md -g '*round-log*' -g package.json -g '*121*' -g '*progr... (exit 0)
[codex] Running command: /bin/bash -lc 'git status --short && git diff --stat 29f7271..d95b03d -- client server conten...
[codex] Command completed: /bin/bash -lc 'git status --short && git diff --stat 29f7271..d95b03d -- client server conten... (exit 0)
[codex] Running command: /bin/bash -lc 'cat docs/rounds/119/architecture.md docs/rounds/120/architecture.md'
[codex] Command completed: /bin/bash -lc 'cat docs/rounds/119/architecture.md docs/rounds/120/architecture.md' (exit 0)
[codex] Running command: /bin/bash -lc 'git diff 29f7271..d95b03d -- client/src/components client/src/index.css conten...
[codex] Command completed: /bin/bash -lc 'git diff 29f7271..d95b03d -- client/src/components client/src/index.css conten... (exit 0)
[codex] Running command: /bin/bash -lc 'git status --short; git diff --stat 29f7271..d95b03d -- client server content;...
[codex] Command completed: /bin/bash -lc 'git status --short; git diff --stat 29f7271..d95b03d -- client server content;... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba server/test/progression.test.js; git diff 29f7271..d95b03d -- client/sr...
[codex] Command completed: /bin/bash -lc 'nl -ba server/test/progression.test.js; git diff 29f7271..d95b03d -- client/sr... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '1,290p'; nl -ba client/src/sto...
[codex] Command completed: /bin/bash -lc "nl -ba client/src/stores/gameStore.js | sed -n '1,290p'; nl -ba client/src/sto... (exit 0)
[codex] Assistant message captured: The review replies lack the stale-request checks used by dialogue and map replies. I’m checki...
[codex] Running command: /bin/bash -lc "rg -n 'ratioFor\\(|replay\\(|sealedMessage|gateOfSite|loadEnvelope|submitDialo...
[codex] Command completed: /bin/bash -lc "rg -n 'ratioFor\\(|replay\\(|sealedMessage|gateOfSite|loadEnvelope|submitDialo... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1070,1330p'; nl -ba server/src...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1070,1330p'; nl -ba server/src... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1510,1620p'; git diff 29f7271....
[codex] Command completed: /bin/bash -lc "nl -ba server/src/learning-service.js | sed -n '1510,1620p'; git diff 29f7271.... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'difficulty|ratio|experience|xpGained|progression|assert|overlap' server...
[codex] Command completed: /bin/bash -lc "rg -n 'difficulty|ratio|experience|xpGained|progression|assert|overlap' server... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '352,442p'; nl -ba client/src...
[codex] Command completed: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '352,442p'; nl -ba client/src... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/components/__tests__/dungeon-screen.test.jsx | sed -n '365,4...
[codex] Command failed: /bin/bash -lc "nl -ba client/src/components/__tests__/dungeon-screen.test.jsx | sed -n '365,4... (exit 1)
[codex] Running command: /bin/bash -lc "cat server/test/helpers.js | sed -n '1,200p'; rg --files server/test | sort; c...
[codex] Command completed: /bin/bash -lc "cat server/test/helpers.js | sed -n '1,200p'; rg --files server/test | sort; c... (exit 0)
[codex] Running command: /bin/bash -lc "git show 29f7271:client/src/components/DungeonScreen.jsx | sed -n '98,190p'; g...
[codex] Command completed: /bin/bash -lc "git show 29f7271:client/src/components/DungeonScreen.jsx | sed -n '98,190p'; g... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import { createGameStore } from './client/src/...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import { createGameStore } from './client/src/... (exit 0)
[codex] Assistant message captured: An in-memory check confirmed that a delayed review can replace a new learner’s 0 XP with the ...
[codex] Running command: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '195,255p'; cat server/test/lan...
[codex] Command completed: /bin/bash -lc "nl -ba server/test/web-client.test.js | sed -n '195,255p'; cat server/test/lan... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'due-badge|hud|font-size' client/src/index.css; PYTHONDONTWRITEBYTECODE=...
[codex] Command completed: /bin/bash -lc "rg -n 'due-badge|hud|font-size' client/src/index.css; PYTHONDONTWRITEBYTECODE=... (exit 0)
[codex] Running command: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' import importlib.util for name i...
[codex] Command completed: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' import importlib.util for name i... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {LearningService} from './server/src/le...
[codex] Command failed: /bin/bash -lc "node --input-type=module <<'JS' import {LearningService} from './server/src/le... (exit 1)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {LearningService} from './server/src/le...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {LearningService} from './server/src/le... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'encounter/start|dungeonId|learning' server/src/app.js | head -50; git d...
[codex] Command completed: /bin/bash -lc "rg -n 'encounter/start|dungeonId|learning' server/src/app.js | head -50; git d... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'OLDER|older than|OLD_CLIENT|OLD_SERVER|dungeons|encounter/start' server...
[codex] Command completed: /bin/bash -lc "rg -n 'OLDER|older than|OLD_CLIENT|OLD_SERVER|dungeons|encounter/start' server... (exit 0)
[codex] Running command: /bin/bash -lc 'head -25 server/test/language-engine.test.js; node --test server/test/dungeon-...
[codex] Command completed: /bin/bash -lc 'head -25 server/test/language-engine.test.js; node --test server/test/dungeon-... (exit 0)
[codex] Assistant message captured: The shared service also changes normal market play: after Portia and Gerald, Mortimer’s greet...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import assert from 'node:assert/strict'; impor...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import assert from 'node:assert/strict'; impor... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process...
[codex] Command failed: /bin/bash -lc "node --input-type=module <<'JS' import {execFileSync} from 'node:child_process... (exit 1)
[codex] Running command: /bin/bash -lc 'git show 29f7271:client/src/stores/gameStore.js'
[codex] Command completed: /bin/bash -lc 'git show 29f7271:client/src/stores/gameStore.js' (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module -e ' import {LearningService} from '\\''./server/src/...
[codex] Command completed: /bin/bash -lc "node --input-type=module -e ' import {LearningService} from '\\''./server/src/... (exit 0)
[codex] Running command: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' from PIL import ImageFont regula...
[codex] Command completed: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' from PIL import ImageFont regula... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/app.js | sed -n '20,82p'; nl -ba server/test/dungeon-rules.t...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/app.js | sed -n '20,82p'; nl -ba server/test/dungeon-rules.t... (exit 0)
[codex] Assistant message captured: The round 120 store against the new service confirms a deploy-transition problem: after six c...
[codex] Running command: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' from PIL import ImageFont reg='/...
[codex] Command completed: /bin/bash -lc "PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY' from PIL import ImageFont reg='/... (exit 0)
[codex] Assistant message captured: I’m consolidating the findings. Source checks also identify an unbounded level calculation fo...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import assert from 'node:assert/strict'; impor...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import assert from 'node:assert/strict'; impor... (exit 0)
[codex] Assistant message captured: Verification was read-only: 14 pure tests passed, and additional checks used in-memory storag...
[codex] Turn completed.
Verification was read-only: 14 pure tests passed, and additional checks used in-memory storage and fixture providers. No files were changed or servers started.

- XP commits, receipt contents, dialogue/review replays, help reveals, fixed dungeon-session bonuses, base-ratio prefetch and `SEALED` messages: no additional defect found.
- Dungeon gates, moves, completed runs, old-save defaults and resets: no additional defect found. No permanent Sanctuary XP deadlock found; site conversations remain repeatable.
- New client against round 120’s server: no defect found by inspection; missing progression fields are handled.
- XP lines, seal wording and the 390 px layout: no defect found. Desktop CSS sizing fits at 1100 px; supplied 1440 px screenshots also look sound. No browser rendering was run.

1. **High — Dungeon difficulty scaling also changes normal iPhone/market play.** [learning-service.js:894](/home/marcello/workspace/ParaLLang/server/src/learning-service.js:894)

   Complete Portia and Gerald in the market, return through the entrance and start Mortimer. Those encounters now award 100 XP, and the shared `openSession` applies the resulting level bonus despite no dungeon having been entered. Mortimer requests 33% Italian instead of his previous 30%. Further market play keeps increasing this unannounced difficulty.

   **Verified:** executed that exact market sequence with the real service and fixture provider: `dungeons: {}`, XP 100, difficulty approximately `0.33`, narration prompt explicitly requesting 33%.

   **Smallest fix:** apply bonuses only in dungeon mode, including explicitly identified dungeon party conversations. Unmarked market/mobile starts must retain zero bonus.

2. **High — Round 120 clients cannot explain the new seal and retain it after earning enough XP.** [learning-service.js:727](/home/marcello/workspace/ParaLLang/server/src/learning-service.js:727)

   Keep a round 120 client open across the server deployment and clear the six sites. The server now seals the Sanctuary at 300 XP, while that client displays “sealed: 6 of 6 cleared” and shows no XP or level requirement. Even after two Gerald conversations earn 390 XP, its cached route remains disabled because the old store does not refresh the map after party conversations.

   **Verified:** loaded the actual store from `29f7271` in memory against the new service. After the conversations, the server reported `reachable: true`; the old store still held `reachable: false`, with no error.

   **Smallest fix:** make level gates conditional on a client progression capability, preserving round 120’s site-only gates for older clients.

3. **Medium — A delayed review contaminates the learner loaded after changing settings.** [gameStore.js:575](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:575), [gameStore.js:96](/home/marcello/workspace/ParaLLang/client/src/stores/gameStore.js:96)

   Submit a review, switch servers in Settings while its reply is pending, and load a learner with lower XP. The old review then calls `tookReview` without checking the request epoch or learner. Its progression replaces the newly loaded progression; the monotonic XP guard subsequently rejects legitimate lower values.

   **Verified:** deferred a real-store review reply, switched to a learner at 0 XP, then released the previous learner’s 360-XP reply. The new learner immediately showed 360 XP and level 5.

   **Smallest fix:** capture and validate `requestEpoch` and learner identity before applying either review action’s response or error.

4. **Medium — The new chip makes the HUD title overlap at intermediate widths.** [index.css:93](/home/marcello/workspace/ParaLLang/client/src/index.css:93), [dungeon-shots.mjs:377](/home/marcello/workspace/ParaLLang/client/scripts/dungeon-shots.mjs:377)

   Open the page at 600 px with progression available. The compact grid ends at 560 px, so the chip joins the single-row header. The title shrinks but its text remains visible outside its box, painting across the level chip.

   **Verified:** calculated the declared flex layout using the CSS’s DejaVu Sans fallback metrics: the approximately 112-px title gets a 74-px box; the chip starts around x=104 while the title paints to x=124. Round 120’s header fits at this width. The playthrough compares element rectangles, which remain separate despite that text overflow.

   **Smallest fix:** extend the compact-header breakpoint to cover this width, and check text bounds in the overlap assertion.

5. **Low — Accepted oversized XP can block the server’s event loop.** [learning-storage.js:181](/home/marcello/workspace/ParaLLang/server/src/learning-storage.js:181), [language-engine.js:132](/home/marcello/workspace/ParaLLang/server/src/language-engine.js:132)

   Load a damaged or edited save containing `"xp": 1e308`, then request its dungeon map. JavaScript considers that value an integer, so storage accepts it. `levelFor` then increments one level at a time through an effectively unbounded loop, blocking all learners’ requests.

   **Verified:** the real storage validator accepted the value through an in-memory read. An isolated worker remained inside `levelFor` and was terminated; the loop has no upper-bound protection.

   **Smallest fix:** validate persisted XP with `Number.isSafeInteger`, treating unsupported values as zero.

6. **Low — The ratio test does not verify the level bonus in subsequent narration prompts.** [progression.test.js:137](/home/marcello/workspace/ParaLLang/server/test/progression.test.js:137)

   A regression removing the bonus from `submitDialogue`’s `targetRatio` would make NPC replies easier than the displayed difficulty. The test checks the greeting prompt, then checks only serialized encounter difficulty on later turns.

   **Verified:** removed that bonus solely in an in-memory module copy. Every existing ratio-test assertion still passed, while the subsequent prompt requested 25% Italian and the encounter displayed 31%.

   **Smallest fix:** assert the subsequent narration prompt’s percentage, including a turn after crossing a level boundary.
```
