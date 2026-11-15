# Codex critique 1: characters at the sites

- **Dispatched:** 2026-11-15T12:35:32Z
- **Returned:** 2026-11-15T12:50:05Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`), stdin closed; thread `01a1df34-ddb1-7483-9b9e-f15725a455de`. The model name was not printed.
- **Prompt:** the codex-critique template, with "Decided with the owner" read as the plan's "Owner decisions" section, a first line forbidding servers and port-binding tests on the login node, one added sentence asking it to check the plan against `aesthetic/src` (MeshBuilder, the PS1 materials, the package's tests and budgets, building geometry in Node), against `levelView.js` and `director.js` (where the camera stands at each site and what is around each site in `taprohm.js`) and against the dispose path, and this goal: "each of the seven sites of the Ta Prohm dungeon shows its character as a 3D figure in the level's PS1 look, in place of the placeholder beacon".
- **Reviewed input:** `plan-v1.md`, sha256 65e9fdf7e3275f6053e6e3d7a29db1da503533246c4214619e852b6ad640067d, HEAD d95b03d (branch `round-121-levels`, with round 121's review fixes uncommitted in the working tree)
- **Findings:** 11 (7 Errors, 4 Cuts)

## Raw output (verbatim)

The companion's whole output: its progress lines (commands cut short by the companion), then the final message.

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1df34-ddb1-7483-9b9e-f15725a455de).
[codex] Turn started (01a1df34-e075-71d0-b95c-b7b0d94967aa).
[codex] Assistant message captured: I’ll read the current records and plan, then trace the rendering, camera, geometry, tests, an...
[codex] Running command: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'plan-v1.m...
[codex] Command completed: /bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'STATUS.md' -g '*round-log*' -g 'plan-v1.m... (exit 0)
[codex] Running command: /bin/bash -lc 'cat STATUS.md && cat AGENTS.md && nl -ba docs/rounds/122/trail/plan-v1.md'
[codex] Command completed: /bin/bash -lc 'cat STATUS.md && cat AGENTS.md && nl -ba docs/rounds/122/trail/plan-v1.md' (exit 0)
[codex] Running command: /bin/bash -lc "sed -n '1,100p' STATUS.md; rg -n '122|Log protocol|round-log' STATUS.md; ls do...
[codex] Command completed: /bin/bash -lc "sed -n '1,100p' STATUS.md; rg -n '122|Log protocol|round-log' STATUS.md; ls do... (exit 0)
[codex] Running command: /bin/bash -lc "rg --files aesthetic/src aesthetic/test aesthetic/tests client/src/scene clien...
[codex] Command completed: /bin/bash -lc "rg --files aesthetic/src aesthetic/test aesthetic/tests client/src/scene clien... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba aesthetic/src/scene/geometry.js; nl -ba aesthetic/src/ps1/material.js; ...
[codex] Command completed: /bin/bash -lc 'nl -ba aesthetic/src/scene/geometry.js; nl -ba aesthetic/src/ps1/material.js; ... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba aesthetic/src/scene/taprohm.js'
[codex] Command completed: /bin/bash -lc 'nl -ba aesthetic/src/scene/taprohm.js' (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba client/src/scene/levelView.js; nl -ba client/src/scene/director.js'
[codex] Command completed: /bin/bash -lc 'nl -ba client/src/scene/levelView.js; nl -ba client/src/scene/director.js' (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/scene/director.js | sed -n '15,260p'"
[codex] Command completed: /bin/bash -lc "nl -ba client/src/scene/director.js | sed -n '15,260p'" (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba aesthetic/src/scene/geometry.js'
[codex] Command completed: /bin/bash -lc 'nl -ba aesthetic/src/scene/geometry.js' (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba aesthetic/src/ps1/material.js; nl -ba aesthetic/src/ps1/shaders.js | se...
[codex] Command completed: /bin/bash -lc "nl -ba aesthetic/src/ps1/material.js; nl -ba aesthetic/src/ps1/shaders.js | se... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba content/world/dungeons/ta_prohm.yaml; nl -ba client/src/dungeonModel.js...
[codex] Command completed: /bin/bash -lc "nl -ba content/world/dungeons/ta_prohm.yaml; nl -ba client/src/dungeonModel.js... (exit 0)
[codex] Assistant message captured: The main risk is placement: a clear camera path doesn’t prove there’s room for a full figure ...
[codex] Running command: /bin/bash -lc "nl -ba aesthetic/src/scene/world.js | sed -n '1,40p'; nl -ba aesthetic/src/ps1...
[codex] Command completed: /bin/bash -lc "nl -ba aesthetic/src/scene/world.js | sed -n '1,40p'; nl -ba aesthetic/src/ps1... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '1,280p'; nl -ba server/src/c...
[codex] Command completed: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '1,280p'; nl -ba server/src/c... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba server/src/content-loader.js | sed -n '188,217p'; nl -ba aesthetic/src/...
[codex] Command completed: /bin/bash -lc "nl -ba server/src/content-loader.js | sed -n '188,217p'; nl -ba aesthetic/src/... (exit 0)
[codex] Running command: /bin/bash -lc 'nl -ba content/characters/enemies/archway_portia.yaml; nl -ba content/characte...
[codex] Command completed: /bin/bash -lc 'nl -ba content/characters/enemies/archway_portia.yaml; nl -ba content/characte... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/scene/director.js | sed -n '260,450p'; rg -n 'setProgress|se...
[codex] Command completed: /bin/bash -lc "nl -ba client/src/scene/director.js | sed -n '260,450p'; rg -n 'setProgress|se... (exit 0)
[codex] Running command: /bin/bash -lc "head -20 server/src/content-loader.js; nl -ba client/src/components/DungeonVie...
[codex] Command completed: /bin/bash -lc "head -20 server/src/content-loader.js; nl -ba client/src/components/DungeonVie... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {readFileSync} from 'node:fs'; import...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import {readFileSync} from 'node:fs'; import... (exit 0)
[codex] Assistant message captured: The shader choice and headless geometry construction check out: `plain` uses vertex colours, ...
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {createWorld} from './aesthetic/src/i...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import {createWorld} from './aesthetic/src/i... (exit 0)
[codex] Running command: /bin/bash -lc "rg -n 'dialogue|dock|hud|bottom-sheet|sheet-height|height|62' client/src/index...
[codex] Command completed: /bin/bash -lc "rg -n 'dialogue|dock|hud|bottom-sheet|sheet-height|height|62' client/src/index... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/src/index.css | sed -n '98,132p'; nl -ba client/src/components/D...
[codex] Command completed: /bin/bash -lc "nl -ba client/src/index.css | sed -n '98,132p'; nl -ba client/src/components/D... (exit 0)
[codex] Running command: /bin/bash -lc "node --input-type=module <<'NODE' import {readFileSync} from 'node:fs';import ...
[codex] Command completed: /bin/bash -lc "node --input-type=module <<'NODE' import {readFileSync} from 'node:fs';import ... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba aesthetic/src/scene/temple.js | sed -n '52,94p'; nl -ba aesthetic/STYLE...
[codex] Command completed: /bin/bash -lc "nl -ba aesthetic/src/scene/temple.js | sed -n '52,94p'; nl -ba aesthetic/STYLE... (exit 0)
[codex] Running command: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '412,525p'; rg -n 'details|de...
[codex] Command completed: /bin/bash -lc "nl -ba client/scripts/dungeon-shots.mjs | sed -n '412,525p'; rg -n 'details|de... (exit 0)
[codex] Assistant message captured: The existing dispose path covers figure meshes and shared materials once they’re attached to ...
[codex] Assistant message captured: 1. **Error — high: the phone framing clips the proposed tall figures.** **Evidence:** The [pl...
[codex] Turn completed.
1. **Error — high: the phone framing clips the proposed tall figures.**

   **Evidence:** The [plan’s Errata dimensions](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:65) put its top about 2.5 m above ground. The camera initially stops 4 m away and then moves closer ([director.js:18](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:18), [director.js:242](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:242)). The phone’s conversation sheet occupies 62% of the height ([index.css:117](/home/marcello/workspace/ParaLLang/client/src/index.css:117)); the view shifts the camera projection into the remaining rectangle ([levelView.js:159](/home/marcello/workspace/ParaLLang/client/src/scene/levelView.js:159)).

   **Failure:** At 390×844, projecting Errata’s top through the existing camera puts it above the canvas even with no HUD inset: approximately −53 px at the initial Sanctuary hold. Engagement clips more. Testing only the origin or bounding-box centre could pass while the figure is cropped.

   **Smallest fix (0): Owner decision.** Reconcile the stated heights, “inside the view” criterion, and unchanged-camera scope. Reuse the existing camera framing to fit the figure’s bounds in the free rectangle, including the engaged hold.

2. **Error — high: the 6 m check fails at the first site.**

   **Evidence:** The [proposed check](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:107) applies to every site. The initial approach explicitly uses a 9.5 m setback and 2.8 m rise ([director.js:27](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:27), [director.js:247](/home/marcello/workspace/ParaLLang/client/src/scene/director.js:247)). The current browser check already allows 10.5 m for this site ([dungeon-shots.mjs:184](/home/marcello/workspace/ParaLLang/client/scripts/dungeon-shots.mjs:184)).

   **Failure:** Starting a fresh run places the camera approximately 9.98 m from Portia’s look-at point. The new assertion fails before the first answer.

   **Smallest fix (0): Owner decision.** Keep the 6 m criterion and reuse the ordinary 4 m eye-height hold for the initial site. This requires revising the unchanged-director scope.

3. **Error — high: the universal grounding test contradicts floating Errata.**

   **Evidence:** The [figure test](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:48) requires every figure’s lowest vertex between y=0 and 0.05. [Errata](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:65) floats 0.3 m above ground.

   **Failure:** A faithful Errata build with its geometry starting at y=0.3 fails the grounding assertion. Moving it down to satisfy the assertion loses the specified floating placement.

   **Smallest fix (0): Owner decision.** Retain the ground-level group origin, but distinguish grounded geometry from Errata’s specified 0.3 m clearance in the existing test.

4. **Error — medium: a clear site point does not establish room for these figures.**

   **Evidence:** The plan places figures at the [site ground points](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:80) and permits movement within a 3 m box. The existing checks validate a walker’s centre with 0.35 m shoulder clearance ([taProhmPlan.js:6](/home/marcello/workspace/ParaLLang/client/src/__tests__/taProhmPlan.js:6)), rather than figure bounds or roots.

   The actual constraints include:

   - Errata’s site is `[0.3, 5.4]` ([ta_prohm.yaml:35](/home/marcello/workspace/ParaLLang/content/world/dungeons/ta_prohm.yaml:35)). The adjoining gate pier occupies x=1.1–3.2, z=5.6–9.8 ([taprohm.js:126](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:126)). The proposed rightward clearance shift moves the figure’s centre to x=1.1 when facing the arriving camera.
   - Marginalia stands at z=26, between the library plinth ending at z=24.5 and gallery masonry beginning at z=27.4 ([taprohm.js:188](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:188), [taprohm.js:94](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:94)).
   - Gerald’s court has surface roots from the gallery tree ([taprohm.js:351](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:351)). A headless geometry probe with seed 7 finds one at approximately `[5, 0.13, 21.5]`, only 1 m from his site.

   **Failure:** Dimensions and movements allowed by the plan can intersect stone or roots while passing both the existing point-clearance tests and the proposed 3 m bound. Prop footprints, rotating extents, and clearance positions remain unspecified.

   **Smallest fix (0):** Narrow the figures’ and props’ footprints to the actual available space. Reuse the existing dungeon geometry check and screenshot run to verify those bounds from every arrival direction, including cleared positions.

5. **Error — medium: separate figure budgets do not preserve the scene budget.**

   **Evidence:** The [plan excludes figures from level-budget verification](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:48), but attaches them to the rendered world scene. The style permits 64,000 triangles for the scene ([style.js:28](/home/marcello/workspace/ParaLLang/aesthetic/src/style.js:28)). A headless build of the current seed-7 Ta Prohm reports 62,408 triangles, leaving 1,592 before dungeon markers. `world.stats` is computed during assembly ([world.js:148](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/world.js:148)); subsequently attached geometry does not update it.

   **Failure:** Seven figures near the permitted 400-triangle limit exceed the scene budget while every proposed individual figure check and existing world-budget test passes.

   **Smallest fix (+):** Reuse the existing browser run to count rendered level, marker, and figure geometry together against the existing 64,000 limit. Keep the individual cap.

6. **Error — medium: the package integration leaves the new API inaccessible through its public imports.**

   **Evidence:** The plan creates `scene/figures.js`, but specifies no export change. [aesthetic/package.json:8](/home/marcello/workspace/ParaLLang/aesthetic/package.json:8) exposes only the package root and `./style`; [src/index.js:5](/home/marcello/workspace/ParaLLang/aesthetic/src/index.js:5) contains the explicit public exports.

   **Failure:** Importing `createFigure` or `FIGURES` from `@parallang/aesthetic` fails without an export. Importing the new scene module as a package subpath is blocked by the export map.

   **Smallest fix (+):** Export the new API through the existing `aesthetic/src/index.js`.

7. **Error — medium: the server scope contradicts the content step.**

   **Evidence:** The plan adds a field to the loader schema and a server test ([plan-v1.md:74](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:74)), then lists the server as unchanged ([plan-v1.md:96](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:96)). The existing site schema is strict ([content-loader.js:203](/home/marcello/workspace/ParaLLang/server/src/content-loader.js:203)).

   **Failure:** Keeping the server unchanged makes all seven proposed `figure` fields fail content loading. Implementing the content step changes the server.

   **Smallest fix (0): Owner decision.** Narrow “server unchanged” to “server gameplay rules unchanged,” consistent with the stated optional schema change.

8. **Cut — high — rank 1: remove the idle/flare choreography and cleared quarter-turn; retain the clearance translation.**

   **Evidence:** The [motion step](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:67) introduces breathing, hopping, independently drifting slabs, orbiting tiles, verdict gestures, and a cleared quarter-turn. `MeshBuilder` merges each material bucket into one mesh ([geometry.js:139](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/geometry.js:139)); independent slab and tile motion therefore requires additional transformable meshes or groups. The quarter-turn also conflicts with facing the camera within 25°: resolving an encounter requests a 90° turn away.

   **Removable complexity:** Timers, gesture state, animation hierarchies, and competing rotation rules are unnecessary for showing seven recognizable 3D characters.

   **Smallest fix (−):** Keep the figures static apart from camera-facing rotation and the specified cleared translation. Keep the existing update/bounds/reset checks.

9. **Cut — medium — rank 2: remove the retained beacon rings at converted sites.**

   **Evidence:** The [ring step](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:87) retains placeholder geometry and its material, visibility, colour, and pulse handling. The interface already marks the current and cleared sites ([DungeonScreen.jsx:343](/home/marcello/workspace/ParaLLang/client/src/components/DungeonScreen.jsx:343), [DungeonScreen.jsx:364](/home/marcello/workspace/ParaLLang/client/src/components/DungeonScreen.jsx:364)).

   **Removable complexity:** The figures meet the replacement goal without this additional marker.

   **Smallest fix (−):** Omit rings and their animation handling for the seven figure sites.

10. **Cut — medium — rank 3: use `plain` for the bright seams instead of the corruption-glow materials.**

    **Evidence:** The [material step](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:46) selects `inscription` or `rootGlow` for glow. Both depend on `uCorruption` ([shaders.js:108](/home/marcello/workspace/ParaLLang/aesthetic/src/ps1/shaders.js:108)). Ta Prohm defaults to `jungle`, whose corruption is zero ([taprohm.js:470](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/taprohm.js:470), [presets.js:76](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/presets.js:76)), so neither produces the promised glow. Both also sample textures ([world.js:21](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/world.js:21), [world.js:28](/home/marcello/workspace/ParaLLang/aesthetic/src/scene/world.js:28)). With those extra material buckets, the “seven more meshes” claim is already understated before independent animation meshes.

    **Removable complexity:** Extra textured material buckets do not provide their intended effect in the actual dungeon.

    **Smallest fix (−):** Paint the threads and seam brightly using the existing `plain` material. Recognizable figures in the PS1 look remain achievable.

11. **Cut — medium — rank 4: remove easing from camera-facing rotation.**

    **Evidence:** The [facing step](/home/marcello/workspace/ParaLLang/docs/rounds/122/trail/plan-v1.md:82) adds interpolation even though its purpose is simply to face the player from either arrival direction.

    **Removable complexity:** Angular easing needs persistent rotation state and angle-wrap handling. Directly assigning the ground-plane facing angle satisfies the facing criterion.

    **Smallest fix (−):** Set the facing angle directly from the figure and camera positions.
```
