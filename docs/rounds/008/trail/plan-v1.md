# Round 008 plan v1: grader feedback stops giving the answer away

**Goal:** the grader's feedback, which the app shows the learner before their next attempt, no longer supplies a
target-language expression that would satisfy an objective the learner has not passed, while grading verdicts stay
as they are; measured live with codex-cli in Italian (backlog D5; round 007 findings).

## Problem

`prompts/language/grading.txt` asks for `feedback` per objective and `overall_feedback`
(`server/src/llm/schemas.js`), and says nothing about what feedback may contain. The app shows both in the
Assessment panel (`mobile/src/components/DialoguePanel.js`). Live data:

- Round 007 after runs: overall feedback after the first turn "Add “senza latte” to specify no milk." in 2/3 runs
  (1/3 baseline).
- Round 005 `verify:cli`: "Make your own order, for example: Vorrei un caffè senza latte." (quoted case) and "…
  for example: Un caffè senza latte, per favore." (metalinguistic case); per-objective feedback "The order does not
  include “senza latte” or “caffè nero”."

## Proposed change

1. One rule added to `grading.txt`: "`feedback` and `overall_feedback` are shown to the learner before their next
   attempt. For an objective that did not pass, never write a {{language.name}} expression that would satisfy it,
   and never give a model answer; say in English what is still missing. You may quote the learner's own words."
2. No code change. The grading schema, verdict rules and rubric are unchanged.
3. A server test asserts the rule is in the rendered grading prompt for both packs.

## Measurement

- `npm run verify:cli -- --provider codex-cli` once: verdicts must stay 9/9 and the encounter must resolve.
- `node server/scripts/play-market.js --provider codex-cli` 3 times.
- Baselines already on file: round 005 `verify:cli` (`docs/rounds/005/results/live-3-verify-cli.json`) and round
  007's 3 after runs (`docs/rounds/007/results/after-{1,2,3}.json`), same grading prompt as HEAD.
- Classification by reading every feedback string for an objective that did not pass (per-objective `feedback`
  of a failed objective, and `overall_feedback` when any objective failed): it **leaks** when it contains a
  target-language expression satisfying a failed objective or a model answer.

## Acceptance criteria

1. Server, mobile, client suites pass.
2. Live: `verify:cli` passes (9/9, resolved); 3/3 play-market runs resolve; 0 leaking feedback strings in the after
   runs (verify:cli and play-market). Counts before and after are reported either way.
3. `python3 tools/round_log_check.py 008` passes.

## Out of scope

Grader verdicts and quality rules, the narration prompt, Spanish and claude-cli live runs, the app.
