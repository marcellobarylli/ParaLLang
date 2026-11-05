# Round 051 plan v1: an early pass in an ordered encounter is not a success (backlog H1)

Autonomous round (no owner present).

## Problem (round 050 data)

In an ordered encounter (every encounter except `mortimer_tasting`), `submitDialogue` grades every remaining
objective and closes only the leading run of passes (`learning-service.js`, "In order: the leading run of passes
closes"). When a later objective passes while an earlier one fails, three things tell the player it succeeded,
though it stays open and must be met again:

1. the grader's `feedback` for it: "You successfully insist on now. You still need to tell Flick what time it is."
   (round 050, run 1 it and es);
2. the app's Assessment panel shows ✓ for it (`DialoguePanel.js`: `result.passed ? '✓' : '→'`);
3. the narrator gets `authoritative_decision.objectiveResults` with `passed: true` and reacts as to a success
   ("¡Ahora, sí! No quieres esperar.").

Two turns later the player is asked to say "now" again.

## Design

1. **`held` on a result** (server). In an ordered encounter, a result that passed but does not close (it follows a
   failed objective) is marked `held: true`, in both `decision.objectiveResults` (narration) and the response's
   `assessment.objectiveResults`. The field is added only when true, so every other prompt and response stays
   byte-identical (Gerald's pinned narration prompts, `server/test/fixtures/gerald-prompts-r026.json`). Unordered
   encounters never hold. `passed` keeps the grader's verdict (the evidence was correct usage; the Spellbook
   records it as now).
2. **Grading prompt** (`prompts/language/grading.txt`, filled from `buildGradingMessages`): a conditional ORDER line
   after the rubric, only when the encounter is ordered and more than one objective is supplied (empty otherwise,
   like `ambientLine`): "ORDER: the objectives count in the order given. If an objective passes while an earlier
   one has not, its feedback must say in English that it will count once the earlier one is done, not that it
   succeeded." `buildGradingMessages` gets `ordered` (boolean).
3. **Narration** (`prompts/encounter/dialogue_turn.txt` unchanged): `held: true` is self-describing inside the
   authoritative decision, plus one sentence added to the TURN DATA only when a held result exists:
   `held_note: "A held objective was said correctly but does not count yet: an earlier objective comes first."`
   (inside `authoritative_decision`, only when held, so pinned prompts stay identical).
4. **App** (`mobile/src/components/DialoguePanel.js`): a held result shows `…` instead of ✓, and its line ends with
   "(counts once the earlier objective is done)". The frozen web client is unchanged (it shows ✓; noted).
5. **Tests:** service test (Fountain fixture: "Adesso!" at `time` gives `now` held in the response and in the
   narration call's decision; a combined answer gives no held); unordered (`mortimer_tasting`) never holds; grading
   prompt has the ORDER line for an ordered multi-objective call and not for single or unordered; Gerald's pinned
   prompts unchanged; mobile component test for `…` and the note.

## Live

codex-cli, `play-market.js --location cracked_fountain` (the script holds "Adesso!" at `time`), 1 × it, 1 × es.
Measure: feedback for the held `now` (says it will count later, not success), Flick's next line (does not treat
now as achieved), all verdicts as scripted. Then `npm run verify:cli -- --provider codex-cli` as Gerald's regression.

## Success

All tests pass; in both live runs the held objective's feedback does not call it a success and the verdicts match
the script; verify:cli passes.
