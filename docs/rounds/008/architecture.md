# Round 008 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [round 007 findings](../007/findings.md) (grader feedback gives the answer away); backlog D5 in
  [`docs/autonomy/STATE.md`](../../autonomy/STATE.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `prompts/language/grading.txt`, `server/scripts/verify-cli.js`, a server test.

## Goal (pre-run)

The grader's feedback, which the app shows the learner before their next attempt, no longer supplies a
target-language expression that would satisfy an objective the learner has not passed, while grading verdicts stay
as they are; measured live with codex-cli in Italian.

## Owner decisions (pre-run)

No owner was present. Autonomous decisions, pending owner review (also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md)):

1. **Prompt rule, not a server filter.** A filter would have to rewrite free text; the prompt rule is one line.
2. **Second opinion:** critique 1 findings 1–7 accepted, 8 and 9 rejected.

## Claim boundary (pre-run)

The round can claim, for codex-cli in Italian, one `verify:cli` run and three playthroughs: whether any feedback
string leaked an answer, and whether the verdicts held. Nothing about claude-cli, Spanish, free-form answers or the
app.

## Deferred (pre-run)

Grader verdict and quality rules; the narration prompt; Spanish and claude-cli runs. Codex listed no Optional items.

## Design (pre-run)

- **Background (critique 1.7):** the grading schema (`server/src/llm/schemas.js`) requires `feedback` per
  objective and `overall_feedback`; `grading.txt` places no restriction on their content. The app shows every
  objective's feedback and the overall feedback.
- **Rule** added to `prompts/language/grading.txt`: "`feedback` (for every objective, passed or not) and
  `overall_feedback` are shown to the learner before their next attempt. While an objective has not passed, never
  write a {{language.name}} expression that would satisfy it, not even by quoting the learner. Say in English what
  is still missing." (critiques 1.1 and 1.6: no quotation exception, no separate model-answer ban.)
- **Test:** the rendered grading prompt contains the rule for both packs.
- **`verify-cli.js` report (critique 1.3):** each grading case also records its per-objective feedback, and the
  encounter records both turns' overall feedback. No other change; the pass condition is unchanged.

### Measurement

- Live, `TARGET_LANGUAGE=it` (critique 1.5): `npm run verify:cli -- --provider codex-cli` once and
  `node server/scripts/play-market.js --provider codex-cli` 3 times, saved under `results/`.
- Classification by reading (critique 1.2): every per-objective feedback string (passed or not) and the overall
  feedback, in any assessment where an objective failed; a string **leaks** when it contains a target-language
  expression that would satisfy a failed objective.
- Baseline, already on record with the same grading prompt (critique 1.9 rejected): round 005 `verify:cli`, 3 of 7
  failed-case strings leak; round 007 after runs, 3 of 6 (journal row 5).

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 5277c0f6…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "You may quote the learner's own words" permits the leak | − | Accept: delete it | **Accepted** (autonomous, pending owner review) | Design: Rule |
| 1.2 | Error | Classifier skips feedback on passed objectives, which the app shows | 0 | Accept | **Accepted** (autonomous, pending owner review) | Measurement |
| 1.3 | Error | `verify:cli` does not save all the feedback the check needs | + | Accept: record it | **Accepted** (autonomous, pending owner review) | Design: verify-cli |
| 1.4 | Error | Resolution alone can hide a verdict regression | + | Accept: require [true, false] then [true] | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Error | Language not pinned | 0 | Accept: `TARGET_LANGUAGE=it` | **Accepted** (autonomous, pending owner review) | Measurement |
| 1.6 | Error | The model-answer ban rejects permitted feedback | − | Accept: drop it | **Accepted** (autonomous, pending owner review) | Design: Rule |
| 1.7 | Error | The plan says grading.txt asks for the feedback fields; the schema does | 0 | Accept: corrected | **Accepted** (autonomous, pending owner review) | Design: Background |
| 1.8 | Cut | Mobile and client suites as gates | − | Reject: the run's quality bar requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |
| 1.9 | Cut | Historical before/after counts | − | Reject: already computed (journal row 5); they show the change did something | **Rejected** (autonomous, pending owner review) | Measurement |

Net change from plan v1: +1 small report change in `verify-cli.js`, +1 verdict gate; −2 clauses in the rule.

## Tests (pre-run)

1. Server, mobile and client suites and the client build pass; the new prompt assertion passes.
2. Live, Italian: `verify:cli` passes (9/9, resolved); each of the 3 playthroughs grades "Vorrei un caffè, per
   favore." `[true, false]` and "Senza latte, per favore." `[true]` and resolves; **0 leaking strings** in all
   after-run feedback. Counts reported either way.
3. `git diff --check`; `python3 tools/round_log_check.py 008`.

## Outcome (2026-11-05)

Built as designed with critique findings 1–7. All suites pass. Live codex-cli in Italian: `verify:cli` 9/9 and
resolved; 3/3 playthroughs with the expected verdicts; 0 of 29 feedback strings leak an answer (baseline 3/7 and
3/6). See [findings](findings.md).
