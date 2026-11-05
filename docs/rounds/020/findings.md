# Round 020 findings

## Question

Does a character-sheet quirk that puts Portia's short formalities in the target language (using her free
vocabulary, never the visitor's words) raise her share of target language (backlog E1)?

## Finding

**No.** Italian lines 0.17 against 0.16 in round 019 (requested mean 0.28), greeting 0.13 against 0.12 (0.20
requested), Spanish lines 0.17 against 0.18. The narrator follows the quirk only in form: it opens most lines with
"Benvenuto!" and code-switches a noun ("Il mercato can wait", "Before you enter the mercado"), then writes the rest in
English. The quirk is reverted (pre-run decision 2). Two content changes (round 019's ambient words, this quirk) have
now left the share where it was, so E1 is a template or language-rule question.

Safety held: 5/5 runs resolved, 17/17 player lines graded as scripted (the English "Hello!" refused with feedback
that names no Italian greeting), 0 lines modelling an open objective's answer, 0 lines over requested + 0.15.

**Round 019 re-read** (this round's script, `results/compare.py`): before round 019 Portia modelled an open answer in
5 of 12 Italian lines ("Buongiorno!" as her greeting 3/3, "Come ti chiami?" before ask-back 2/3); after round 019, 0
of 12, and 0 of 17 here. Round 019's findings did not report this; ambient vocabulary gave her something else to
say.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (9 findings: 4 accepted, 5 in
  part).
- `node server/scripts/play-market.js --provider codex-cli --location market_entrance`, sequential, in-process, on
  the Linux compute node: 3 it, 1 es, 1 it variant (`--lines 'Hello!|Ciao!|Mi chiamo Robin.|E tu?'`); 37 calls, no
  usage limit. Baseline: round 019's after-runs (same model, script and settings, ten minutes earlier).
- `results/compare.py` reports both share measures per line, tokens, target tokens (tokens × not-in-translation),
  overshoot, verdicts, and lines that contain an open objective's answer forms before it passes.

## Results

| Set | Runs | Greeting (not in translation) | Lines: not in translation / canonical / requested | Tokens / target tokens per line | Open-answer lines |
|---|---|---|---|---|---|
| Round 019 baseline it | 3 | 0.10, 0.08, 0.07 (0.08) | 0.17 / 0.09 / 0.28 | 19.4 / 3.6 | 5/12 |
| Round 019 after it | 3 | 0.12, 0.06, 0.18 (0.12) | 0.16 / 0.13 / 0.28 | 18.8 / 3.2 | 0/12 |
| Quirk it | 3 | 0.16, 0.07, 0.15 (0.13) | 0.17 / 0.14 / 0.28 | 17.5 / 3.1 | 0/12 |
| Round 019 after es | 1 | 0.19 | 0.18 / 0.14 / 0.28 | 20.0 / 3.7 | 0/4 |
| Quirk es | 1 | 0.12 | 0.17 / 0.15 / 0.28 | 20.8 / 3.5 | 0/4 |
| Quirk variant it | 1 | 0.23 | 0.21 / 0.16 / 0.30 | 17.8 / 3.6 | 0/5 |

Greetings verbatim (quirk, it): "Benvenuto! Il mercato can wait. A greeting and your name first, please. There is
paperwork, even for having manners." / "Benvenuto! A greeting and your name, please. This is an entrance, not a
loophole." / "Benvenuto! The mercato can wait. First, a greeting and your name. Standards, please." Variant, after
"Hello!": "Benvenuto. Your greeting arrived in English. This desk requires Italian. Your introduction is also still
pending; the mercato can wait." Feedback: "You greeted in English. Use Italian to greet Portia, introduce yourself,
and ask her name in return."

## Decision

Revert the quirk (done by Amendment). Keep round 019's ambient vocabulary: it stopped Portia modelling open answers.
E1 next: the shared rule "Target approximately N% <language> in dialogue" seems too weak for a tutorial NPC with few
nouns to code-switch; a concrete form (e.g. "about K of every 10 words", or a per-turn count) would be a template
change that moves every NPC and regenerates Gerald's pinned prompts, so it needs its own round with a tour-wide
measurement (Mortimer, Flick and Marginalia already overshoot).

## Evidence

`results/q-{1,2,3}.json`, `results/q-es-1.json`, `results/q-variant.json`, `results/compare.py`; round 019's
`results/`; journal rows 8–9.

## Claim boundary

Three Italian runs and one Spanish per arm, rough share measures: no visible effect, not proof of none. The
open-answer count is a regex over each line against the objectives passed so far; it flags forms, and the flagged
lines were read (all five are modelled answers).

## Open items

1. E1 stays open as a template question (see Decision).
