# Round 079 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Results go into the dated Outcome section. The trail (journal) is in `trail/`.

- **Design source:** backlog D1 ([round 003](../003/findings.md) open item 3: `verify:cli` "for either provider in
  Spanish"). Spanish has had tours and encounter runs since round 015, but never the scripted grading cases of
  `verify:cli` (the quoted, metalinguistic, negated and third-person answers).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/` (the report and log). No code or content change.

## Goal (pre-run)

Run `TARGET_LANGUAGE=es npm run verify:cli -- --provider codex-cli` once and record whether the nine grading cases
and the two-turn encounter pass in Spanish as they do in Italian (9/9 since round 005).

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique.** A measurement round with criteria fixed before the run, like rounds 072, 074 and 077.
2. **D1 stays open for claude-cli** (its token is not in the agent's shell; supervisor note 2).

## Method (pre-run)

One run: `TARGET_LANGUAGE=es npm run verify:cli -- --provider codex-cli`, output saved to `results/verify-es.json`
and `results/verify-es.log`. The script binds 127.0.0.1 with a random token and closes its server. A provider failure
is re-run once, and both reports are kept.

## Success (pre-run)

1. `passed: true`: the nine grading cases give their expected verdicts and the encounter resolves.
2. No `overallFeedback` or objective feedback string gives a Spanish answer to an open objective (round 008's rule),
   by reading.
3. At most 15 provider calls (14, plus one if a narration line was retried by round 078's guard).

## Claim boundary (pre-run)

One run, one provider, Gerald's encounter only.

## Outcome (2026-11-06)

All three criteria met: 9/9 verdicts as expected, the encounter resolved, no feedback gives a Spanish answer, 14
calls ([findings](findings.md)).
