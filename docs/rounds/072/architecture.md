# Round 072 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Results go into the dated Outcome section. The trail (journal) is in `trail/`.

- **Design source:** [round 067](../067/findings.md) (the last regression tour, and its addendum on the folded
  share), [round 070](../070/architecture.md) (`submitDialogue` now builds the assessment before the reply).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/` (the tour report and log). No code or content change.

## Goal (pre-run)

Since round 067's tours, round 070 moved the assessment block and the effective qualities in `submitDialogue`
ahead of the narration call, and wrapped the narration and commit in `try/finally`. Round 071 changed only the
app. Check with one full live tour that the whole market still plays as before.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique, Italian only.** This is a measurement round with criteria fixed before the run, like round 067.
   Only Italian is played, to spare Codex's window (a tour is 64 calls). The changed code is not language-specific.

## Method (pre-run)

`node server/scripts/play-market.js --provider codex-cli --tour --out docs/rounds/072/results/tour-it.json`,
`TARGET_LANGUAGE=it`, in-process. It is measured with `docs/rounds/026/results/tour-measure.mjs` against round
067's `tour-2026-11-06-it.json`, plus the folded share (round 067 addendum).

## Success (pre-run)

1. The tour resolves: every encounter resolves, and the Rift is sealed before the Bookshop and open after.
2. Every encounter's verdict sequence equals round 067's (the same scripted answers).
3. The mean folded share is within 0.10 of round 067's 0.43, with the requested mean unchanged (0.44).
4. `tour-measure` finds at most 10 leak lines (round 067's 8 plus 2), each read by hand.

A provider failure is re-run once and both reports are kept. A verdict that differs is read by hand before it is
called a regression.

## Claim boundary (pre-run)

One tour, one pack, one provider. The app's changes (rounds 070–071) are not exercised: the tour is in-process.
