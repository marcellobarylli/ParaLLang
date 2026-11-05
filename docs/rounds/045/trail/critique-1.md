# Critique 1: objectives met in any order (Codex)

- **Dispatched:** 20:36:21 UTC
- **Returned:** 20:37:09 UTC
- **Model:** codex-cli 0.166.0 (`codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`), model gpt-6.1-sol, effort high, read-only; session 01a1ad6d-5c51-7ad0-8ff4-d087a81956d5; no file access (bundle on stdin)
- **Prompt:** "You are an adversarial reviewer. Do not run any commands or read files: everything you need is in the bundle on stdin (a design plan, docs/rounds/045/trail/plan-v1.md, followed by cat -n excerpts of the code it changes). Critique the plan: find Errors (things that are wrong or will not work), Risks and Suggestions, especially in the session state, the grading/narration prompts, reveals and help, SM-2 scheduling, the resolving turn, replays (attemptId), and tests. Reply with a numbered list; each item starts with its type (Error / Risk / Suggestion), a one-line title, a short explanation and a concrete fix. Optional nits under a final 'Optional' heading, unnumbered. Under 600 words."
- **Reviewed input:** `plan-v1.md`, sha256 81ee2d6072206847c26699ebb6b16d3420cb2802bf7548ef92567fce58a14684, HEAD 258a7a7, in a 487-line bundle (sha256 380c1349ceeabcb5…): plan-v1, learning-service.js lines 70–100, 240–300, 360–420, 460–600 (before the draft), content-loader.js lines 60–140, content/languages/es/encounters/mortimer_tasting.yaml
- **Findings:** 9 (1 Error, 7 Risks, 1 Suggestion)

## Raw output (verbatim)

```text
1. **Risk — Two progress fields can disagree.** `objectiveIndex` becomes a count for unordered encounters, while `passedObjectiveIds` determines membership. The plan lacks explicit update invariants. Initialize the array on creation; stage unique passed IDs, derive the count from them, and commit both together. Define how missing arrays are handled.

2. **Error — A closed count cannot select remaining objectives.** Existing `activeObjectives()` and post-grading narration both use `slice(index)`. After only `ask_more` passes, index 1 selects that completed objective and drops `like_it`. Replace both paths explicitly with membership filtering; build narration’s list from the proposed post-turn state.

3. **Risk — Authored sequencing can contradict unordered progression.** Mortimer still declares `like_it.next_objective: ask_more`, although `ask_more` may already be complete. Prompt-builder contents are absent, so their handling cannot be verified. For unordered encounters, make the server’s remaining IDs and `decision.nextObjectiveId` authoritative; prevent authored links from directing progression.

4. **Risk — Open lists alone do not define grading semantics.** Full conversation history reaches the grader. Without explicit instructions, it may credit earlier utterances or treat authored order as a prerequisite. Specify that each open objective is independently assessed against the current input. Preserve complete, unique, expected-ID validation and test missing, duplicate, unknown, and already-closed results.

5. **Risk — Help attribution allows unassisted credit after help.** Reveals belong only to the first open objective, but the player can complete another objective using the translated NPC message. That objective receives uncapped quality because scheduling checks its own reveal bucket. Define the assistance policy explicitly; track which open objectives a reveal assists and apply that policy during grading and scheduling.

6. **Risk — Shared vocabulary makes scheduling depend on iteration order.** Multiple newly closed objectives may provide evidence for one vocabulary item. The first update can make it no longer due, suppressing later evidence with a different quality or assistance cap. Aggregate scheduling candidates by vocabulary ID, choose a documented quality policy, and schedule once. Test overlapping targets and already-not-due cards.

7. **Risk — Resolving must use one staged state everywhere.** Resolution, narration objectives, `nextObjectiveId`, serialized current objective, and party progress must agree after non-prefix completion. Derive them from one staged encounter before narration. Test empty remaining objectives, null next/current objective, resolving translation visibility, and exactly one party increment. Provider or save failure must leave progress unchanged.

8. **Risk — Replay coverage is missing.** Existing replay lookup intentionally precedes version and completion checks. Reordering it would break retries of successful resolving turns. Preserve that order and the existing fingerprint. Test identical retries after further progress or restart: cached response, `replayed: true`, no provider call, scheduling, or party increment; changed payload with the same ID must conflict.

9. **Suggestion — Expand tests beyond the two-objective happy path.** Add three objectives with noncontiguous passes, repeat failures after partial completion, help before and after the current objective changes, and retry after narration/save failure. Assert remaining IDs, counts, current objective, prompts, schedules, and persisted replay response. Golden prompts protect ordered wording; they do not establish ordered state or scheduling equivalence.
```
