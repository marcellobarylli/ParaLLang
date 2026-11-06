# Round 074 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Results go into the dated Outcome section. The trail (journal) is in `trail/`.

- **Design source:** [round 072](../072/findings.md) (the Italian regression tour after rounds 069–071, which left
  Spanish unplayed), [round 067](../067/findings.md) (the last Spanish tour and its folded-share addendum).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/` (the tour report and log). No code or content change.

## Goal (pre-run)

Round 072 played only Italian after round 070 reorganised `submitDialogue`. Check with one full Spanish tour that
the whole market still plays as before in the other pack.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique.** A measurement round with criteria fixed before the run, like rounds 067 and 072.

## Method (pre-run)

`node server/scripts/play-market.js --provider codex-cli --tour --out docs/rounds/074/results/tour-es.json`,
`TARGET_LANGUAGE=es`, in-process (no port). It is measured with `docs/rounds/026/results/tour-measure.mjs` against
round 067's `tour-2026-11-06-es.json`, plus the folded share (round 067 addendum).

## Success (pre-run)

1. The tour resolves: every encounter resolves, and the Rift is sealed before the Bookshop and open after.
2. Every encounter's verdict sequence equals round 067's Spanish one (the same scripted answers).
3. The mean folded share is within 0.10 of round 067's Spanish figure, with the requested mean unchanged (0.44).
4. `tour-measure` finds at most round 067's Spanish leak lines plus 2, each read by hand.

A provider failure is re-run once and both reports are kept. A verdict that differs is read by hand before it is
called a regression.

## Claim boundary (pre-run)

One tour, one pack, one provider. The app's changes (rounds 070–073) are not exercised: the tour is in-process.
