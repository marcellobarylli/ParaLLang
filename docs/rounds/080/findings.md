# Round 080 findings

## Question

Does the whole market still play as before in Italian after round 078 (every narration call through `narrate()`,
with the no-target-language guard)? And what does the guard do over a whole tour?

## Finding

**Yes, with no regression.** One Italian tour (codex-cli, 64 calls, 03:49:53–03:58:26 UTC) met all five pre-run
criteria.

1. **It resolved.** All six encounters resolved, and the Rift was sealed before the last encounter and open after it.
2. **Same verdicts.** The verdict sequence was the same as round 072's in every encounter.
3. **Language share.** The mean folded share was 0.43 over 34 lines, against 0.45 over 35 lines in round 072 and
   0.44 requested. Per encounter: Portia 0.20 (requested 0.28), Gerald 0.31 (0.30), Mortimer 0.40 (0.40), Flick 0.53
   (0.50), Marginalia 0.46 (0.47, 5 of 6 lines), Errata 0.48 (0.50).
4. **Leaks.** `tour-measure` found 8 leak lines (limit 9; round 072 had 7), all of known kinds:
   - Gerald's "espresso" in the greeting (1);
   - Mortimer repeating the player's scripted "Chilo." (1, new in this tour, the echo kind);
   - Flick's *adesso* inside his refusal (1);
   - Marginalia's authored passage, which holds the next answer (2);
   - Errata repeating the player's words (*caffè*, *nome*) (3).
5. **The guard** checked 35 narration lines and flagged none, so the tour made no extra call (64, as in rounds 072
   and 074).

## Method

As fixed in [architecture.md](architecture.md): `play-market.js --tour` in-process (Italian), then
`docs/rounds/026/results/tour-measure.mjs` and `docs/rounds/074/results/folded.mjs`, against round 072's report.
There was no critique, as decided.

## Results

| Measure | Round 072 (it) | Round 080 (it) |
|---|---|---|
| Resolved, gate | yes, held and opened | yes, held and opened |
| Calls | 64 | 64 |
| Verdict sequences equal | — | 6/6 |
| Folded share (requested 0.44) | 0.45 (35 lines) | 0.43 (34 lines) |
| Leak lines (`tour-measure`) | 7 | 8 |
| Guard: checked / flagged | — | 35 / 0 |

## Decision

No regression from round 078. Together with round 079 and round 078's two runs, the guard has checked 52 live lines
and flagged none.

## Evidence

[`results/tour-it.json`](results/tour-it.json). The raw `results/tour-it.log` stays local: `*.log` is ignored by git.

## Claim boundary

One tour, one pack, one provider, in-process. The guard's retry still has not run live.

## Open items

None new. Round 078's open item stands: read the first live line the guard flags.
