# Round 074 findings

## Question

Does the whole market still play as before in Spanish, after rounds 069–073 (round 072 checked Italian only)?

## Finding

**Yes, with no regression.** One Spanish tour (codex-cli, 64 calls, 9 minutes) met all four pre-run criteria.

1. **It resolved.** All six encounters resolved, and the Rift was sealed before the Bookshop and open after it.
2. **Same verdicts.** The verdict sequence was the same as round 067's in every encounter.
3. **Language share.** The mean folded share was 0.41 over 33 lines, against 0.44 over 35 lines in round 067 and
   0.44 requested. Per encounter: Portia 0.22 (requested 0.28), Gerald 0.35 (0.30), Mortimer 0.35 (0.40), Flick
   0.50 (0.50), Marginalia 0.47 (0.50, 4 of 6 lines), Errata 0.46 (0.50). Two of Marginalia's lines have no folded
   value: their translation covers only the passage and the question, not her English remarks (`translationShort`).
   Read by hand, both are about half Spanish.
4. **Leaks.** `tour-measure` found 6 leak lines (limit 7; round 067 had 5), all of the known kinds:
   - Marginalia's authored passage, which holds the next answer (*casa*, *Nadie*), in 2 lines;
   - Errata repeating the player's own words (*café* once, *nombre* in 3 lines).

Portia stays the furthest under her ratio, as in every tour since round 009 (backlog E1, closed on this evidence).

## Method

As fixed in [architecture.md](architecture.md): `play-market.js --tour` in-process with `TARGET_LANGUAGE=es`, then
`docs/rounds/026/results/tour-measure.mjs` against round 067's Spanish report. The folded share comes from
[`results/folded.mjs`](results/folded.mjs), which leaves out lines without a folded value (as round 067's corrected
addendum does). Its output for round 067's report reproduces that addendum's Spanish column. There was no critique,
as decided.

## Results

| Measure | Round 067 (es) | Round 074 (es) |
|---|---|---|
| Resolved, gate | yes, held and opened | yes, held and opened |
| Calls | 64 | 64 |
| Verdict sequences equal | — | 6/6 |
| Folded share (requested 0.44) | 0.44 (35 lines) | 0.41 (33 lines) |
| Leak lines (`tour-measure`) | 5 | 6 |

## Decision

No regression. Rounds 069–073 stand in both packs.

## Evidence

[`results/tour-es.json`](results/tour-es.json), [`results/tour-es.log`](results/tour-es.log) and the measures in
[`results/measure.txt`](results/measure.txt).

## Claim boundary

One tour, Spanish only, on one provider. The tour runs in-process, so the app's changes (rounds 070–073) and the
progress route are not exercised.

## Open items

None.
