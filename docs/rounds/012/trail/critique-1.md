# Codex critique 1: round 012 NPCs stop offering the answers as a menu

- **Dispatched:** 2026-11-05T12:45:15Z
- **Returned:** 2026-11-05T12:47:33Z
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high`; session 01a1abbe-0307-7a82-9f93-ce9d5d3ec57c
- **Prompt:** the codex-critique template, preceded by the no-commands preamble, plus "Number your findings 1, 2, 3, ..." (verbatim prompt below the output)
- **Reviewed input:** `plan-v1.md`, sha256 24ea76fc403467acbeeb5bb1073edecdbf65bfd3600f1e7e612638ae5ae78b92, HEAD 88442bd, working tree untracked `docs/rounds/012/`. Stdin bundle sha256 13e449b734d45720b4da7883040c8b99d9c59877bdfae8429b1de51265c7fa11 (777 lines): `cat -n` of docs/rounds/012/trail/plan-v1.md, content/narration/style_guide.yaml, prompts/system/base.txt, prompts/encounter/greeting.txt, prompts/encounter/dialogue_turn.txt, server/src/llm/prompt-builder.js, server/test/encounters.test.js, content/languages/it/encounters/butchers_stall_charcutier.yaml, content/languages/it/encounters/market_entrance_tutorial.yaml, content/languages/es/encounters/cracked_fountain_letharger.yaml, docs/rounds/010/findings.md, docs/rounds/011/findings.md
- **Findings:** 1

## Raw output (verbatim)

```text
1. **Cut — medium: remove the mobile tests, web tests and web build.**  
   **Evidence:** `docs/rounds/012/trail/plan-v1.md:40–41` requires these checks despite explicitly limiting the change to narration prompts (`:7–8`). The changed rule is inserted into the server’s system-message string at `server/src/llm/prompt-builder.js:49–59`.  
   **Concrete consequence:** For this YAML-only change, those frontend checks add work without testing whether NPCs stop offering answer menus.  
   **Smallest fix (−):** Drop the frontend checks; retain server tests and the live narration checks.

No Errors or Gaps found in the supplied material.
```

## Prompt (verbatim)

```text
Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below.

Read-only: do not edit, create or delete any files. Critique the plan in `docs/rounds/012/trail/plan-v1.md` against the code in this repo. Its goal: NPCs no longer offer an open objective's passing target words as options to choose from, so the player recalls the word instead of picking it from a list; a narration-prompt change only. The owner values simplicity: the best plan is the smallest one that meets the goal correctly.

Report three kinds of finding:
1. **Error:** something that would make the plan fail or give a wrong result. That covers a false claim about the code or data (check it and cite file:line), an internal contradiction, a step that does not serve the goal as written, or an unverified assumption the plan rests on.
2. **Gap:** something the goal needs that the plan lacks.
3. **Cut:** a step, component, check or output the goal does not need.

Simplicity limits the fixes, not the search: check every part of the plan, including its checks and acceptance criteria, and report every Error you find.

For each finding give: type, severity (critical/high/medium), evidence, the concrete failure (what input leads to what wrong outcome), and the smallest fix. Prefer fixes that remove, narrow or reuse existing code over fixes that add. Mark each fix as making the plan larger (+), smaller (−) or neither (0).

Leave out hardening, extra controls, extra reporting and style unless leaving them out causes a concrete failure. If you still want to suggest any, list at most three, one line each, under "Optional" at the end. If the plan is sound, say so: no findings is a valid answer. Do not soften.

Number your findings 1, 2, 3, ...
```
