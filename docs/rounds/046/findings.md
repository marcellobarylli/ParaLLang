# Round 046 findings

## Question

Can a second share estimate agree with the hand counts where `notInTranslation` fails (Errata's glitched English,
gloss translations), without changing it elsewhere (round 026 open item 2)?

## Finding

**Yes.** `folded` folds glitch letters and marks on both sides before it compares, and abstains when the translation
is under 60% of the line.

On the 19 development lines it covers, its mean absolute error against the hand count is **0.003**, against 0.175
for the old estimate. On the 8 held-out lines it covers, it is **0.021** against 0.350. Every gain is in Errata's
lines (0.329 → 0.003 and 0.350 → 0.021). On the other lines both estimates were already right (0.003). No line got
worse.

It abstains on exactly the two known glosses, one per set, where the old estimate erred by 0.54 and 0.58. Across all
613 NPC lines in the repo, the length warning fires 3 times, and all three are Marginalia glosses or summaries by
reading.

The collision scan found one way the first fold was wrong. Collapsing double letters turned English "all" into
*al*, so Spanish *al* read as English (4 times). The collapse now applies only to words of 4+ letters. Two Spanish
cognates still fold into English, *opinión* and *precisión* (once each in 613 lines). This is a known small
undercount.

## Method

- Plan [v1](trail/plan-v1.md); Codex [critique 1](trail/critique-1.md): 9 findings, 5 accepted and 4 in part. Codex
  saw a bundle without the draft. The draft and its first results came before the critique (journal row 5).
- Ground truth: the hand counts in `docs/rounds/026/results/hand-count.md`. Names are added to each count's
  denominator (critique 1.5).
  - Development set: 20 greetings from iteration 12.
  - Held-out set: 9 lines from iteration 8.
- `results/evaluate.mjs` (with `--held-out`) and `results/collisions.mjs` over every report.
- Linux compute node, no LLM calls.

## Results

| Set | Lines | Covered | Old error, covered | Folded error | Errata (old → folded) | Others (old → folded) | Abstained (old error) |
|---|---|---|---|---|---|---|---|
| Development (iteration 12) | 20 | 19 | 0.175 | 0.003 | 0.329 → 0.003 (10) | 0.003 → 0.003 (9) | Marginalia es tour gloss (0.54) |
| Held out (iteration 8) | 9 | 8 | 0.350 | 0.021 | 0.350 → 0.021 (8) | — | Marginalia es replay gloss (0.58) |

Collision scan over 613 lines (`results/collisions.txt`):
- 134 distinct tokens become English only by folding, and all but 4 carry glitch letters. Those 4 are *ítem* (an
  Errata glitch), *nnot* (an Errata glitch), and *opinión* and *precisión* (cognates).
- 3 length warnings, all glosses.

Tests: server 177/177 (play-market 1 new), mobile and web unchanged.

## Decision

Keep `folded` and `translationShort` beside the old estimate. Future measurement scripts should report `folded`, and
fall back to a hand count when it is null. Existing round scripts (`tour-measure.mjs`, `compare.py`) are not
changed: their recorded results stay as they were.

## Evidence

`results/evaluate.txt`, `results/evaluate-held-out.txt`, `results/collisions.txt`; journal rows 4–8.

## Claim boundary

- 29 hand-counted lines, half of them Errata's, counted by the same agent, unblinded, without token-level labels.
- The 60% threshold was not swept: there is no labelled set of glosses.
- The estimate is still blind to cognates and loanwords that are spelled the same in English ("espresso",
  *chocolate*).

## Open items

1. Report `folded` in the next measurement script (e.g. a `tour-measure` successor), and hand-count any null line.
2. A blinded second annotator for the hand counts (owner or another agent), if share measurements start deciding
   prompt changes again.
