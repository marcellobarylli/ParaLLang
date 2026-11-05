# Round 026 findings

## Question

Does a concrete language-mix rule ("in a 20-word line, about K words", in `prompts/system/base.txt`) bring NPC lines
nearer the requested target-language share, under and over, without new open-answer lines (backlog E1)?

## Finding

**Yes. The rule is kept, with Amendment 2** ("greetings" dropped from its list of phrases).
- **Paired greeting replays** (80 calls): the mean gap fell from 0.108 to 0.095 (it) and from 0.133 to 0.108 (es).
  Portia's greeting, short since round 009, rose from 0.14 to 0.21 (it) and from 0.10 to 0.18 (es).
- **After-build tours** against the baseline tours: the mean line gap fell from 0.12 to 0.07 (it) and from 0.15 to
  0.14 (es). Lines more than 0.10 under target fell from 5 to 1 (it) and from 3 to 2 (es). Both tours passed: 6/6
  resolved, the Rift sealed before and open after, every verdict as scripted.
- **By hand, every greeting in both after-build tours is within 0.07 of its target**: mean gap 0.018 (it) and
  0.032 (es). Portia is at 0.19 and 0.18 against 0.20.

Amendment 2's check passed. Under the amended rule, Portia gave her greet answer in 0 of 4 replays (2 of 4 before
the Amendment). By hand, the three-encounter greeting gap fell in both languages.

Reading the tours found no new kind of open-answer line. The after-build Italian tour has three scanner hits that
its baseline lacks:
- Portia's "Ciao! Benvenuto!";
- Errata's "Sono Errata";
- Errata's "Non basta", which uses its `basta` target in another sense.

All three kinds occur before this round, under the old rule. In round 044's scan, Portia's greeting holds a greet
word in 11 of 22 earlier runs. The bar "no new open-answer line" is read as no new kind (autonomous decision,
pending owner review).

**E1 is done.** The estimate (`notInTranslation`) misreads two cases, and the hand counts overturn it in both:
- Errata's glitched English, counted as target language (0.91 against 0.45 by hand);
- Marginalia's one-line `translation` gloss (0.92 against 0.40).

## Method

- Plan v1, a Codex critique (9 findings: 4 accepted, 5 in part) and the rule in `base.txt`. Gerald's golden prompts
  were regenerated as r026 on purpose.
- Baseline tours on the old rule. 80 paired greeting replays, alternating variants.
- Amendment 1 kept the rule when the estimate flagged two cells that the hand count overturned.
- Amendment 2 dropped "greetings" from the rule, after `replay-leaks.mjs` found Portia saying her greet answer.
  Its check was 24 paired replays (Portia, Gerald, Errata).
- After-build tours on 2026-11-05: it 20:41–20:48 UTC, es 20:49–20:56 UTC, 60 calls each.
- Measured with `tour-measure.mjs` and round 044's `server/scripts/leak-scan.js`; every greeting hand-counted.
- codex-cli 0.166.0 (ChatGPT subscription) on a Linux compute node. About 330 calls in all, across iterations 8 and
  12, with one usage-limit stop (18:17–20:35 UTC).

## Results

| Measure | it before → after | es before → after |
|---|---|---|
| Greeting replays: mean gap, 10 encounters | 0.108 → 0.095 | 0.133 → 0.108 |
| Portia's greeting, replays | 0.14 → 0.21 | 0.10 → 0.18 |
| Amendment 2 replays, Portia greet-answer lines | 2/4 → 0/4 (both languages together) | |
| Tours: mean line gap (estimate) | 0.12 → 0.07 | 0.15 → 0.14 |
| Tours: lines > 0.10 under / over | 5 / 13 → 1 / 10 | 3 / 13 → 2 / 12 |
| Tours: greetings by hand, mean gap | — → 0.018 | — → 0.032 |
| Tours: resolved, gate, calls | 6/6, held and opened, 60 | 6/6, held and opened, 60 |
| Tours: `drillCards` (round 029) | array, length 0 | array, length 0 |

Overshoot remains: the share is 0.47 against 0.42 requested (it) and 0.52 against 0.42 (es). Most of it is Errata
(estimate artifact), Marginalia's passages (authored) and the Fountain's refrain (round 025).

## Decision

- Keep the rule (with Amendment 2). Gerald's r026 golden prompts stay.
- Close E1.
- Use hand counts or a better estimate before acting on Errata's or Marginalia's share.
- The tours report `drillCards` as an empty array: a straight tour leaves no card due at the Rift (round 029 open
  item 1).

## Evidence

- `results/after-tour-it.json`, `results/after-tour-es.json`, `results/baseline-tour-*.json`;
- `results/replay-*.json`, `results/replay2-*.json`, `results/hand-count.md`;
- journal rows 12–21.

## Claim boundary

One tour per side and two replays per cell are small samples. The hand count is not blinded. The share estimate
misreads glitched English and summary translations. The tour reports do not record `journeyFragments`, so round
030's resolving-turn check was not read from them. No claim is made about learning effects or the app.

## Open items

1. Owner: review the rule text in `prompts/system/base.txt` and the reading of the integration bar (no new kind of
   open-answer line).
2. A better share estimate: one that ignores glitched English and uses the NPC line's own word count when the
   `translation` is a gloss. A later round.
3. Portia still greets with a greet word in about half of the greetings outside these replays ("Ciao!"). A
   content or rule change that keeps her from saying the open answer is not tried here.
