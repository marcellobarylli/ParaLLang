# Round 046 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round 026 [open item 2](../026/findings.md#open-items). The share estimate `notInTranslation`
  in `server/scripts/play-market.js` misreads two cases:
  - Errata's glitched English ("procedùre", "yoùù", "ŧhe"), which is absent from its clean translation and so counts
    as target language;
  - a `translation` that is a one-line gloss (Marginalia), which makes almost every word count.
- **Findings:** [`findings.md`](findings.md), after the evaluation.
- **Artifact:** `glitchFold`, `GLOSS_RATIO`, and the `folded` and `translationShort` fields of `languageShare`, with
  tests in `server/test/play-market.test.js`. Also `results/evaluate.mjs` and `results/collisions.mjs`. No game
  code, prompt or content change; no live calls.

## Goal (pre-run)

Find a second estimate that agrees with the hand counts where the old one fails, and leaves it unchanged elsewhere.
The old estimate is kept, so earlier reports stay comparable.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **`folded`** compares tokens after glitch folding, on both sides. The folding:
   - composes the text first (NFC), so a decomposed accent cannot split a word;
   - strips marks and maps the glitch letters (ŧ ø ł đ ß æ œ ı);
   - collapses runs of one letter, in words of 4+ letters only. Below that, Spanish *al* would meet English "all"
     (critique 1.1).
2. **`translationShort`** is a length warning, not a verdict (critique 1.3). It is true when the translation has
   fewer than 60% of the line's tokens, and `folded` is then null: the estimate abstains.
3. **Ground truth.**
   - Development set: the 20 greetings hand-counted in iteration 12.
   - Held-out set: the 9 lines hand-counted in iteration 8, which were not looked at while the folding was
     designed (critique 1.7).
   - Hand counts leave names out. The evaluation adds each line's names to the hand count's words, since the
     estimate counts them as English tokens (critique 1.5).
4. **The bar.**
   - On the same covered lines (critique 1.4): `folded` has a lower mean absolute error than `notInTranslation`, and
     no line is worse by more than 0.10.
   - The abstentions are known glosses: one in each set (critique 1.6).
   - Subgroups are reported: Errata and the others.

## Design (pre-run)

- `languageShare` returns `{ tokens, notInTranslation, folded, translationShort, canonical }`. The old fields are
  unchanged.
- `results/evaluate.mjs [--held-out]` prints, per line, the exact hand count, both estimates and their errors. It
  also prints coverage, the means on the covered lines, the subgroups, and the lines that got worse.
- `results/collisions.mjs <reports>` checks critique 1.1 and 1.3. Over every NPC line in the repo, it lists every
  token that only folding makes English, and every length warning, for reading.
- `tour-measure.mjs` and other round scripts are not changed.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 8894675c…; Codex, effort high (bundle without the draft); raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | Folding can merge target words with English | + | In part: a collision scan over 613 lines; the collapse is limited to 4+ letters (fixes *al*/"all"); the two accent cognates (*opinión*, *precisión*) are documented as a small undercount | **Accepted in part** (autonomous, pending owner review) | Decision 1, Design |
| 1.2 | Risk | Glitch coverage; decomposed marks split words | + | Accept: NFC before tokenizing; æ œ ı mapped; tested | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.3 | Risk | The 60% rule is unvalidated | 0 | In part: named a length warning; its frequency is measured (3 in 613 lines, all glosses by reading); no threshold sweep (no labelled set of glosses) | **Accepted in part** (autonomous, pending owner review) | Decision 2 |
| 1.4 | Error | Abstentions can manufacture improvement | + | Accept: both estimates on the same covered lines; coverage and the old error on abstained lines reported | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.5 | Error | Hand counts leave names out; the estimate does not | + | Accept: names added to the hand count's words | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.6 | Error | The second gloss is not in the 20 lines | + | Accept: it is in the held-out set; the bar says one per set | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.7 | Risk | Overfitting to 20 lines, half Errata | + | In part: a held-out set (iteration 8) and subgroups; no other glitched speaker exists | **Accepted in part** (autonomous, pending owner review) | Decision 3–4 |
| 1.8 | Risk | Hand counts lack reproducibility | 0 | In part: exact numerators and denominators in `evaluate.mjs`, with the source of each line; token labels and adjudication deferred | **Accepted in part** (autonomous, pending owner review) | Design |
| 1.9 | Suggestion | Tests at the boundaries | + | Accept: "al"/"all", Italian double letters, a decomposed accent, the threshold at and below 60%, a gloss, the empty shape | **Accepted** (autonomous, pending owner review) | Tests |

Net change from plan-v1:
- NFC, and a collapse limited to 4+ letters;
- names in the denominators;
- an identical-row comparison, a held-out set and subgroups;
- a collision and length-warning scan;
- boundary tests.

## Tests (pre-run)

`server/test/play-market.test.js`:
- the old fields keep their values;
- Errata's line: old 0.71, folded 0.14;
- an Italian line reads the same both ways;
- "al" against "all", "nonno" and "vent'anni", a decomposed accent;
- the 60% boundary;
- a gloss gives `translationShort` and `folded: null`;
- the empty shape.

Evaluation: `evaluate.mjs` on both sets, and `collisions.mjs` over every report.

## Outcome (2026-11-05)

Built as designed, with no Amendments. On the same covered lines, `folded` cuts the mean error against the hand count
from 0.175 to 0.003 (development) and from 0.350 to 0.021 (held out). It abstains only on the two known glosses. See
[findings](findings.md).
