# Round 067 findings

## Question

Does the whole market still play live after rounds 051–066? Since the last tours (round 050 it, round 051 es), the
game gained match spans, a cross-entry matcher sort, apostrophe folding, the slow walk's numbers, held passes, kept
lines and app-only rounds.

## Finding

**Yes. No regression in either pack.**

- **Both tours resolved** in 64 generation calls each. All six encounters resolved, and the Rift was sealed before
  the Bookshop and open after it (criterion 1).
- **Verdicts (criterion 2).** Spanish: identical to round 051's in every encounter. Italian: identical to round
  050's except one Fountain line. "Adesso!", said while the time objective was still open, **fails** now where it
  passed in round 050. That is round 051's intended change (H1, an early pass in an ordered encounter fails and
  is said again), which came after round 050's tour. Round 051's own Spanish tour already shows the new sequence.
  I count criterion 2 as met for both packs, with this one difference explained.
- **Language share** (criterion 3): it 0.53 (baseline 0.56) and es 0.52 (0.52), against a requested 0.44.
  - The Rift still runs far over: 0.83 it and 0.88 es, against 0.50. Errata's mixed, glitched lines are mostly
    target language.
  - Portia stays a little under: 0.22 it and 0.24 es, against 0.28.
- **Leaks** (criterion 4): `tour-measure` leak lines it 8 (limit 8), es 5 (limit 9). Read by hand, they are the
  known kinds:
  - Gerald's *espresso* in his greeting (round 050 had it too);
  - Flick repeating the player's own *Adesso*;
  - Marginalia's authored passages, which quote the answers by design;
  - Errata using review words (*sono*, *basta*, *nome* / *nombre*) in its boss fight, which reviews all vocabulary.

  `leak-scan.js` agrees: it 4 leak and es 2, all in Gerald's greeting or the Rift; 0 near in both.

## Method

- `play-market.js --provider codex-cli --tour`, it (01:50:48–01:58:57 UTC) then es (01:58:57–02:07:11), in-process,
  no port. The start was before the pre-run record; the output was not read before its commit (journal rows 1, 4).
- Measured with `docs/rounds/026/results/tour-measure.mjs` against `docs/rounds/050/results/tour-it.json` and
  `docs/rounds/051/results/tour-es.json`, plus `server/scripts/leak-scan.js`.
- No critique (decision 1).

## Results

| Pack | Resolved | Calls | Verdicts vs baseline | Share (baseline) | Leak lines (limit) |
|---|---|---|---|---|---|
| it | 6/6, sealed then open | 64 | same except the Fountain's early "Adesso!" (round 051) | 0.53 (0.56) | 8 (8) |
| es | 6/6, sealed then open | 64 | identical | 0.52 (0.52) | 5 (9) |

Per encounter, share against the requested ratio (it / es): Portia 0.22 / 0.24 (0.28), Gerald 0.34 / 0.33 (0.30),
Mortimer 0.36 / 0.37 (0.40), Flick 0.51 / 0.52 (0.50), Marginalia 0.57 / 0.48 (0.48), Errata 0.83 / 0.88 (0.50).

## Decision

No regression; nothing to fix. The tours become the baseline for the next language-share work (E1).

## Evidence

`results/tour-2026-11-06-it.json`, `results/tour-2026-11-06-es.json` (and `.log`); [journal](trail/journal.md).

## Claim boundary

One run per pack on one provider. The share and the leak counts move with LLM variation alone.

## Open items

None for the owner beyond the rounds whose features this tour plays.
