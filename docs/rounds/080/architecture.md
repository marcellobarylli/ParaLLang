# Round 080 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Results go into the dated Outcome section. The trail (journal) is in `trail/`.

- **Design source:** [round 078](../078/findings.md) (every narration call now goes through `narrate()`, with the
  no-target-language guard); [round 072](../072/findings.md) (the last Italian tour, the baseline).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/` (the report). No code or content change.

## Goal (pre-run)

Check with one full Italian tour that the market still plays as before after round 078, and record the guard's
`narrationStats` over a whole tour.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique.** A measurement round with criteria fixed before the run, like rounds 072 and 074.

## Method (pre-run)

`node server/scripts/play-market.js --provider codex-cli --tour --out docs/rounds/080/results/tour-it.json`
(Italian, in-process, no port). Measured with `docs/rounds/026/results/tour-measure.mjs` against round 072's
`tour-it.json`, and with `docs/rounds/074/results/folded.mjs`.

## Success (pre-run)

1. The tour resolves: every encounter resolves, and the Rift is sealed before the last encounter and open after.
2. Every encounter's verdict sequence equals round 072's (the same scripted answers).
3. The mean folded share is within 0.10 of round 072's 0.45, with the requested mean unchanged (0.44).
4. `tour-measure` finds at most round 072's 7 leak lines plus 2, each read by hand.
5. Every line the guard flags (`narrationStats.flagged`) is all English when read by hand. A flag on a line with
   target language is a false positive and fails this criterion.

A provider failure is re-run once and both reports are kept. A verdict that differs is read by hand before it is
called a regression.

## Claim boundary (pre-run)

One tour, one pack, one provider, in-process (the app is not run).
