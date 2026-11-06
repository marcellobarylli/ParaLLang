# Round 072 findings

## Question

Does the whole market still play as before, after round 070 reorganised `submitDialogue` (the assessment built
before the reply, and the reply and commit inside `try/finally`)?

## Finding

**Yes, with no regression.** One Italian tour (codex-cli, 64 calls, 9 minutes) met all four pre-run criteria.

1. **It resolved.** All six encounters resolved, and the Rift was sealed before the Bookshop and open after it.
2. **Same verdicts.** The verdict sequence was the same as round 067's in every encounter.
3. **Language share.** The mean folded share was 0.45, against 0.43 in round 067 and 0.44 requested. Per
   encounter: Portia 0.23 (requested 0.28), Gerald 0.30 (0.30), Mortimer 0.43 (0.40), Flick 0.49 (0.50),
   Marginalia 0.53 (0.48), Errata 0.51 (0.50).
4. **Leaks.** `tour-measure` found 7 leak lines (limit 10; round 067 had 8), all of the known kinds:
   - Gerald's English "espresso" in his greeting;
   - Flick repeating the player's failed "Adesso?";
   - Marginalia's authored passage, which holds the next answer (*casa*, *Nessuno*);
   - Errata repeating the player's own words (*caffè*, *nome*, *sono*).

While comparing, I found an error in round 067's folded-share addendum. Marginalia's Italian figure was 0.49, not
0.41. It is corrected by a second addendum there.

## Method

As fixed in [architecture.md](architecture.md): `play-market.js --tour` in-process with `TARGET_LANGUAGE=it`, then
`docs/rounds/026/results/tour-measure.mjs` against round 067's report, with the folded share averaged over the lines
that have one. There was no critique, as decided.

## Results

| Measure | Round 067 (it) | Round 072 (it) |
|---|---|---|
| Resolved, gate | yes, held and opened | yes, held and opened |
| Calls | 64 | 64 |
| Verdict sequences equal | — | 6/6 |
| Folded share (requested 0.44) | 0.43 | 0.45 |
| Leak lines (`tour-measure`) | 8 | 7 |

## Decision

No regression. Rounds 069–071 stand.

## Evidence

[`results/tour-it.json`](results/tour-it.json) and [`results/tour-it.log`](results/tour-it.log). The comparison is
the `tour-measure.mjs` output recorded in journal row 4.

## Claim boundary

One tour, Italian only, on one provider. The tour runs in-process, so round 070's progress route and the app's
changes from rounds 070–071 are not exercised here. Round 070's live HTTP run covers the route.

## Open items

None.
