# Codex critique 1: round 014 the Rift gate

- **Dispatched:** 2026-11-05T13:22:48Z
- **Returned:** 2026-11-05T13:26:41Z (the output file's mtime; read at 13:36:16)
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high`; session 01a1abe0-63c7-7b23-a16e-8afc4b15d387
- **Prompt:** the codex-critique template, preceded by the no-commands preamble, plus "Number your findings 1, 2, 3, ..." (verbatim prompt below the output)
- **Reviewed input:** `plan-v1.md`, sha256 c33909697e93cc98bf509f99ebf90bb2b9b9c9a4567ad814bd1c36cf43d79e71, HEAD 58cfa6e, working tree untracked `docs/rounds/014/`. Stdin bundle sha256 a1a9be7cf25b2dde70479f935bc395ad466b27eaa472d2fcb8a8d6c1dbeb7757 (1629 lines): `cat -n` of docs/rounds/014/trail/plan-v1.md, server/src/world.js, server/src/content-loader.js, server/src/learning-service.js, server/src/errors.js, mobile/src/components/MapPanel.js, mobile/src/stores/gameStore.js, server/scripts/play-market.js, content/world/connections.yaml, content/world/locations/the_rift.yaml, server/test/world.test.js
- **Findings:** 5

## Raw output (verbatim)

```text
1. **Error — medium: the provider-call estimate is wrong.**  
   **Evidence:** [plan-v1.md:31–35](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:31) promises the scripted tour at approximately 30 calls. The [scripts contain 20 player lines](/work/ParaLLang/server/scripts/play-market.js:19). Each encounter starts with one provider call ([learning-service.js:220](/work/ParaLLang/server/src/learning-service.js:220)); each submitted line makes two ([grading:338](/work/ParaLLang/server/src/learning-service.js:338), [narration:362](/work/ParaLLang/server/src/learning-service.js:362)).  
   **Failure:** A successful run consuming all scripted lines needs **45 calls**, underestimating the planned workload by 50%. Earlier resolution can shorten it, but then some scripted lines are skipped.  
   **Smallest fix (−):** Remove the call and runtime estimate. Measure the actual run.

2. **Gap — medium: the checks do not explicitly distinguish “all five required” from “only Marginalia required.”**  
   **Evidence:** The tour checks rejection after the first four encounters and success after Marginalia ([plan-v1.md:31–35](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:31)). The server tests specify sealed/open cases without identifying which prerequisites are missing ([plan-v1.md:40–42](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:40)). Completion IDs already provide independent prerequisite membership ([learning-service.js:414–415](/work/ParaLLang/server/src/learning-service.js:414)).  
   **Failure:** A faulty move predicate that checks only Marginalia can pass those tour attempts and ordinary zero-complete/all-complete tests. A player completing Marginalia first could then enter with four encounters unfinished—even if snapshot progress is calculated correctly.  
   **Smallest fix (+):** Make the existing sealed move test table-driven: complete four prerequisites, omit each of the five in turn, and require `SEALED`. Keep one all-five success case.

3. **Cut — medium: the second live tour duplicates the gate demonstration.**  
   **Evidence:** [plan-v1.md:45–46](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:45) requires Italian and Spanish tours. Both packs load the same world through `loadWorld` ([content-loader.js:183](/work/ParaLLang/server/src/content-loader.js:183), [222–223](/work/ParaLLang/server/src/content-loader.js:222)); the move function has no language-specific branch ([world.js:57–69](/work/ParaLLang/server/src/world.js:57)).  
   **Unnecessary outcome:** Running both repeats every live encounter and provider call to demonstrate the same gate logic.  
   **Smallest fix (−):** Run one live tour. Check that both packs load the shared prerequisite list in the server tests.

4. **Cut — medium: Expo Doctor and the frozen web build do not validate this change.**  
   **Evidence:** [plan-v1.md:43–44](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:43) requires both, while the planned app change is confined to `MapPanel` and the web client remains untouched ([plan-v1.md:28–30](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:28), [10–11](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:10)).  
   **Unnecessary outcome:** An unrelated dependency diagnostic or unchanged frontend build can block acceptance without exposing a gate defect.  
   **Smallest fix (−):** Drop Expo Doctor and the web build from this round’s required checks. Retain the server and mobile tests.

5. **Cut — medium: new verdict aggregation and assessment analysis exceed the gate goal.**  
   **Evidence:** The plan adds verdict counts and verdicts-against-intent findings ([plan-v1.md:33–34](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:33), [45–46](/work/ParaLLang/docs/rounds/014/trail/plan-v1.md:45)). Existing reports already contain resolution, per-step verdicts, narration shares and raw grading ([play-market.js:119–125](/work/ParaLLang/server/scripts/play-market.js:119), [145–156](/work/ParaLLang/server/scripts/play-market.js:145)).  
   **Unnecessary outcome:** The tour gains another reporting requirement and a grading audit unrelated to whether completion unlocks movement.  
   **Smallest fix (−):** Reuse the existing encounter reports. Add only the gate-attempt results and aggregate success needed for the tour’s exit code.
```

## Prompt (verbatim)

```text
Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below.

Read-only: do not edit, create or delete any files. Critique the plan in `docs/rounds/014/trail/plan-v1.md` against the code in this repo. Its goal: The Rift cannot be entered until the player has completed the other five encounters; the iPhone app's map shows it as sealed with progress and the server refuses a move into it; the five encounters, their prompts and the frozen web client are unchanged; a live full-market tour through the CLI provider shows the gate holding and opening. The owner values simplicity: the best plan is the smallest one that meets the goal correctly.

Report three kinds of finding:
1. **Error:** something that would make the plan fail or give a wrong result. That covers a false claim about the code or data (check it and cite file:line), an internal contradiction, a step that does not serve the goal as written, or an unverified assumption the plan rests on.
2. **Gap:** something the goal needs that the plan lacks.
3. **Cut:** a step, component, check or output the goal does not need.

Simplicity limits the fixes, not the search: check every part of the plan, including its checks and acceptance criteria, and report every Error you find.

For each finding give: type, severity (critical/high/medium), evidence, the concrete failure (what input leads to what wrong outcome), and the smallest fix. Prefer fixes that remove, narrow or reuse existing code over fixes that add. Mark each fix as making the plan larger (+), smaller (−) or neither (0).

Leave out hardening, extra controls, extra reporting and style unless leaving them out causes a concrete failure. If you still want to suggest any, list at most three, one line each, under "Optional" at the end. If the plan is sound, say so: no findings is a valid answer. Do not soften.

Number your findings 1, 2, 3, ...
```
