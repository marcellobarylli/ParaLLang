# Round 026 plan v1: a concrete language-mix rule (backlog E1, template round)

## Evidence so far (backlog E1)
The narration prompt says "Target approximately N% <Language> in dialogue." (`prompts/system/base.txt`). Measured
share of target-language words per NPC line (estimate `notInTranslation`: tokens of the line absent from its
English translation):
- Portia (tutorial, requested 0.20–0.30): lines 0.11–0.17, greeting 0.07–0.13 (rounds 014, 019, 020); two content
  fixes (ambient vocabulary, a quirk) did not move it. Her lines are long English around one Italian formula.
- Flick's party lines 0.24–0.28 against 0.38 (round 023), long English riddles around short phrases.
- Mortimer es party 0.60 against 0.38, Marginalia 0.49–0.54 against 0.42 (round 023): overshoot.
- Round 025: with Flick's refrain on every line, share 0.46 against 0.45 but 0.39 without the refrain (0.53 before):
  the model counts a repeated formula toward the quota.

## Goal
NPC lines land nearer the requested share, both under and over, in every encounter, without new answer leaks and
without breaking the tour. A template change, so it affects every encounter; Gerald's pinned prompts are
regenerated on purpose.

## Design
1. `server/src/llm/prompt-builder.js`: add `language.targetPerTen = Math.max(1, Math.round(targetRatio * 10))` to the
   system template's variables (ratio 0.25 → 25%, 3 in every 10).
2. `prompts/system/base.txt`: replace "- Target approximately {{language.targetRatio}}% {{language.name}} in
   dialogue." with:
   - "- Language mix: about {{language.targetRatio}}% of the words in each dialogue line are {{language.name}},
     roughly {{language.targetPerTen}} in every 10 words, the greeting included. Stay within about 10 points of it,
     under or over."
   - "- Reach it with short, whole {{language.name}} phrases (greetings, questions, reactions, remarks) that the
     English around them explains, not one {{language.name}} formula inside a long English line. A refrain or
     catchphrase repeated from earlier lines does not count toward it. Extra {{language.name}} never names an open
     objective's answer: every rule about open objectives still applies."
3. Regenerate Gerald's golden prompts as `server/test/fixtures/gerald-prompts-r026.json` (the generator: the test's
   arguments for `buildNarrationMessages`, it and es, greeting and one turn), point the test at it, delete r012.
4. No content change. The grading prompt is untouched.

## Tests
- Golden test with the r026 fixture; a new unit test that `buildNarrationMessages` renders "about 25%" and "roughly
  3 in every 10 words" for ratio 0.25, and "1 in every 10" for ratio 0.05 (floor at 1).
- Full server, mobile and web client suites.

## Live runs (codex-cli)
- Baseline on HEAD (before the change): `play-market.js --tour` in it and es (45 calls each; running now).
- After: the same two tours.
- Measures per encounter and language: mean share against mean requested, the greeting's share, mean absolute gap
  |share − requested|, lines more than 0.10 under / over; tour pass (all resolved, Rift gate held and opened);
  verdicts as before; open-objective targets used by the NPC (surface forms of each still-open objective's targets
  in the line).
- Pass bar: the mean absolute gap falls over both tours, Portia's greeting rises, overshoot does not grow, no new
  leaks, both tours pass. Otherwise revert by Amendment (as round 020) and record what moved.

## Claim boundary
One tour per language before and after is a small sample (about 40 lines per side); the share estimate is rough.
