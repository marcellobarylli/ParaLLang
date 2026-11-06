# Round 067 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/` (journal).

- **Design source:** STATE.md's next candidates: a live tour as a regression run after rounds 051–066.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** none (measurement only); reports in `results/`.

## Goal (pre-run)

Check that the whole market still plays live after rounds 051–066. Since the last tours (round 050 it, round 051
es), the game gained match spans, a cross-entry matcher sort, apostrophe folding, the slow walk's numbers, held
passes and kept lines, plus app-only rounds. A measurement round: no code or content change.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique.** There is no design to critique; the success criteria below are fixed before the results are
   read.

## Method (pre-run)

`play-market.js --provider codex-cli --tour`, once per pack (it, es), in-process (no port), started at about
01:52 UTC on 2026-11-06 (before this record was written; its output was not read before the commit). Measured with
`docs/rounds/026/results/tour-measure.mjs` against round 050's `tour-it.json` and round 051's `tour-es.json`, plus
`leak-scan.js`.

## Success (pre-run)

Per pack:

1. The tour resolves: every encounter resolved, the Rift sealed before the Bookshop and open after.
2. Every encounter's verdict sequence equals the baseline's (the same scripted answers).
3. Total mean share within 0.10 of the baseline (it 0.56, es 0.52), with the requested mean unchanged (0.44).
4. `tour-measure` leak lines at most the baseline's plus 2 (it 6, es 7), each read by hand.

A failure of 1 or 2 is a regression to fix next; 3 or 4 alone is a note.

## Claim boundary (pre-run)

One run per pack on one provider: LLM variation alone can move 3 and 4.
