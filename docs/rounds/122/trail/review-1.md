# Codex review 1: round 122's build

- **Dispatched:** 2026-11-15T13:07:54Z
- **Returned:** 2026-11-15T13:15:12Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1df52-8640-7972-a1c5-2eb6ceb5eba9`. The model name was not printed.
- **Prompt:** written for this review (not the codex-critique template). It asked for defects in `git diff 98bb0e4..1b174ef -- aesthetic client server content` against `docs/rounds/122/architecture.md` with its Amendment, in five areas: the figures' geometry, limits, colours and determinism; the level view's handling of the figures (lifecycle, per-frame work, boundaries, the beacon that remains, the triangle count); whether a figure hides something or is hidden wrongly; the build and deploy; the tests and the playthrough's checks. For each finding: severity, file and line, the sequence of actions, the smallest fix, and how it was verified. It asked not to judge how the figures look, and named no conclusion of Claude's.
- **Reviewed input:** `git diff 98bb0e4..1b174ef -- aesthetic client server content`, branch `round-122-figures`. Working tree at dispatch: `docs/rounds/122/` (journal, pictures being written by job 5474) and one line of `client/scripts/dungeon-shots.mjs` (the 1.6 s wait before the figure check) were in the commit.
- **Findings:** 3 (1 medium, 2 low)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1df52-8640-7972-a1c5-2eb6ceb5eba9).
[codex] Turn started (01a1df52-87e8-79e2-9ee1-d9421a1c36a6).
[codex] Assistant message captured: I’ll read the round’s design and current state, then trace the changed code and checks. I’ll ...
[codex] Running command: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'architect...
[codex] Command completed: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'architect... (exit 0)
[codex] Running command: /bin/bash -lc 'cat STATUS.md; cat docs/rounds/122/architecture.md; if test -f docs/rounds/122...
[codex] Command completed: /bin/bash -lc 'cat STATUS.md; cat docs/rounds/122/architecture.md; if test -f docs/rounds/122... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/levelView.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/levelView.js' (exit 0)
[codex] Running command: /bin/bash -lc 'git diff 98bb0e4..1b174ef -- aesthetic client server content'
[codex] Running command: /bin/bash -lc 'nl -ba aesthetic/src/scene/figures.js; cat aesthetic/src/scene/meshBuilder.js;...
[codex] Command completed: /bin/bash -lc 'git diff 98bb0e4..1b174ef -- aesthetic client server content' (exit 0)
[codex] Command completed: /bin/bash -lc 'nl -ba aesthetic/src/scene/figures.js; cat aesthetic/src/scene/meshBuilder.js;... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'round-log|Log protocol|122' STATUS.md; cat AGENTS.md; rg --files .codex...
[codex] Command failed: /bin/bash -lc "rg -n 'round-log|Log protocol|122' STATUS.md; cat AGENTS.md; rg --files .codex... (exit 2)
[codex] Running command: /bin/bash -lc 'cat aesthetic/src/scene/geometry.js; cat aesthetic/package.json; cat client/pa...
[codex] Command failed: /bin/bash -lc 'cat aesthetic/src/scene/geometry.js; cat aesthetic/package.json; cat client/pa... (exit 1)
[codex] Running command: /bin/bash -lc "sed -n '1,164p' client/src/scene/levelView.js; cat client/src/scene/director.j...
[codex] Command completed: /bin/bash -lc "sed -n '1,164p' client/src/scene/levelView.js; cat client/src/scene/director.j... (exit 0)
[codex] Assistant message captured: I’ve read the design and amendment and traced the figure construction and view lifecycle. I’m...
[codex] Running command: /bin/bash -lc "git diff 98bb0e4..1b174ef -- client/scripts/dungeon-shots.mjs client/src/__tes...
[codex] Command completed: /bin/bash -lc "git diff 98bb0e4..1b174ef -- client/scripts/dungeon-shots.mjs client/src/__tes... (exit 0)
[codex] Running command: /bin/bash -lc "cat client/src/__tests__/taProhmPlan.js; rg -n 'plain|Light|light|createWorldK...
[codex] Command completed: /bin/bash -lc "cat client/src/__tests__/taProhmPlan.js; rg -n 'plain|Light|light|createWorldK... (exit 0)
[codex] Running command: /bin/bash -lc "cat aesthetic/src/materials.js; rg --files aesthetic/src | sort; cat client/sr...
[codex] Command completed: /bin/bash -lc "cat aesthetic/src/materials.js; rg --files aesthetic/src | sort; cat client/sr... (exit 0)
[codex] Running command: /bin/bash -lc "cat aesthetic/src/ps1/shaders.js; cat aesthetic/src/scene/world.js; cat aesthe...
[codex] Command failed: /bin/bash -lc "cat aesthetic/src/ps1/shaders.js; cat aesthetic/src/scene/world.js; cat aesthe... (exit 2)
[codex] Running command: /bin/bash -lc "rg --files client/src | sort; rg -n 'contract|dungeon|characterName' client/sr...
[codex] Command completed: /bin/bash -lc "rg --files client/src | sort; rg -n 'contract|dungeon|characterName' client/sr... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'contract|dungeon|characterName' client/src/stores/gameStore.js server/s...
[codex] Command completed: /bin/bash -lc "rg -n 'contract|dungeon|characterName' client/src/stores/gameStore.js server/s... (exit 0)
[codex] Running command: /bin/bash -lc 'node --test aesthetic/test/figures.test.js'
[codex] Command completed: /bin/bash -lc 'node --test aesthetic/test/figures.test.js' (exit 0)
[codex] Running command: /bin/bash -lc "node --version; ls -ld node_modules node_modules/three node_modules/@parallang...
[codex] Command completed: /bin/bash -lc "node --version; ls -ld node_modules node_modules/three node_modules/@parallang... (exit 0)
[codex] Assistant message captured: The figure suite passes, and I haven’t found a package-export or client/server contract break...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import { createFigure, FIGURES, createWorld } ...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import { createFigure, FIGURES, createWorld } ... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs'; import * as THREE fr...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs'; import * as THREE fr... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs';import yaml from 'js-...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs';import yaml from 'js-... (exit 0)
[codex] Assistant message captured: The probes confirmed both issues: reduced-motion mode still produces the roughly 14 cm hop, a...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs';import yaml from 'js-...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import fs from 'node:fs';import yaml from 'js-... (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '725,747p' server/src/learning-service.js; sed -n '1,95p' client/src/ap...
[codex] Command completed: /bin/bash -lc "sed -n '725,747p' server/src/learning-service.js; sed -n '1,95p' client/src/ap... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {loadGameContent}from'./server/src/cont...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {loadGameContent}from'./server/src/cont... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import fs from'node:fs';import yaml from'js-ya...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import fs from'node:fs';import yaml from'js-ya... (exit 0)
[codex] Assistant message captured: The remaining probes found no additional lifecycle defect: Gerald disappears when the walk cr...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'JS' import {build}from'esbuild';import{readFile}fr...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'JS' import {build}from'esbuild';import{readFile}fr... (exit 0)
[codex] Assistant message captured: Read-only verification used the figure Node suite, an in-memory client bundle, and scene prob...
[codex] Turn completed.
Read-only verification used the figure Node suite, an in-memory client bundle, and scene probes with rendering stubbed. No files changed, servers started, or port-binding tests ran.

Geometry, primitive transforms, bounds, colours and determinism: no defects found.

Conversation framing, site cards, reload approaches, neighbouring figures, fog, facing, beacon fallback and disposal: no additional defects found.

Package exports, client imports, both language loaders, Docker configuration and old/new client-server pairing: no defects found; Docker was inspected, not built.

1. **Medium — Figures still hop with reduced motion enabled.** [levelView.js:312](/home/marcello/workspace/ParaLLang/client/src/scene/levelView.js:312)

   Enable the operating system’s reduced-motion preference, open the dungeon and pass an objective. The camera beat is suppressed, but the figure still hops; its continuous bob also ignores the preference.

   **Verified:** instantiated the actual view with `reducedMotion: true` and renderer/pipeline stubs, then sent a passing beat. Gerald rose approximately 15.5 cm above ground after 0.2 seconds.

   **Smallest fix:** guard the hop assignment with `!reducedMotion` and keep the figure at its ground height when reduced motion is requested.

2. **Low — The triangle-budget check omits the sky and passes an over-budget scene.** [levelView.js:337](/home/marcello/workspace/ParaLLang/client/src/scene/levelView.js:337)

   Finish the dungeon and choose “Stay in the temple”. The complete map exceeds the stated 64,000-triangle limit, while the accessor used by the playthrough reports **63,692**. `world.stats.triangles` counts props and surface geometry but excludes the sky.

   **Verified:** traversed the actual scene geometry: **64,404** triangles including hidden markers, or **64,152** when invisible groups are excluded. The omitted sky contributes **712** triangles. Consequently, the assertion at [dungeon-shots.mjs:283](/home/marcello/workspace/ParaLLang/client/scripts/dungeon-shots.mjs:283) incorrectly passes.

   **Smallest fix:** count the whole scene, excluding only reflections as the style specifies, then reduce geometry to meet that count—404 triangles under the current all-geometry convention.

3. **Low — Nothing asserts the amendment’s protection against walking through a figure.** [dungeon-shots.mjs:254](/home/marcello/workspace/ParaLLang/client/scripts/dungeon-shots.mjs:254)

   Run the playthrough with distance-based shrinking disabled: the figure assertions still check full-sized destination figures at their holds. Walking from The Root Court to The Sunlit Court would then take the camera through Gerald’s cart without an assertion detecting it. Intermediate walk checks inspect phase, dialogue and caption only.

   **Verified:** traced every figure assertion and advanced the real director/view through that route in memory; the camera reaches exactly Gerald’s horizontal position. Existing figure assertions run after arrival or after resolving the destination conversation.

   **Smallest fix:** sample the source figure during that walk and assert that it is whole beyond 2.1 m, shrinks between 2.1 and 1.3 m, and is hidden within 1.3 m.
```
