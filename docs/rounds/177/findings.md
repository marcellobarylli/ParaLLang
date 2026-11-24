# Round 177 findings

## Question

Do the road's characters keep a beginner to the task and the beginner's words, talk with the player (not about their
own work) from A2 on, and stay funny?

## Finding

Mostly yes, against the live model (Sonnet through claude-cli). "What do you think of my work" went from about 74 % of
lines to none; stacked questions from 204 of 218 lines to none; goodbyes from refused to answered. The characters stay
funny and from A2 on ask about the player and keep a thread. What remains: at A1 a lesson's character still says most
target phrases before the player (the curriculum's input-before-output rule), each character leans on one gag, and
grading takes hearts for accents and passes correct answers it does not credit.

## Method

Subagents played learners at the unit's level through `server/scripts/playtest.js` (beginner mode, immersion 1, the
game's defaults; one run at immersion 0.2; one in light mode) and scored every character line against a fixed brief
(level fit, answerable, conversational pull, natural, task focus, charm, and flags). Before: six agents, 32
conversations. After: four agents on the first version of the rules, then two on the final version, each blind to
the earlier reports.

## Results

The full table, reports and transcripts are in
[`docs/playtests/2026-11-24-conversations`](../../playtests/2026-11-24-conversations/README.md).

| Measure | Before (218 lines) | Final (36 lines) |
|---|---|---|
| Ends on a question about the character's own work | about 157 | 0 (3 borderline) |
| More than one question | 204 | 0 |
| Goodbyes refused | most (5 of 7 in the hello-and-goodbye unit) | 0 of 4 |
| A1 lines off level or too long | most | 3 of 17 |
| "Che cosa c'è che non va?" | INVALID_GRADING | accepted |

## Claim boundary

- Small samples: 36 lines on the final version. One model (Sonnet); Gemini (friends' turns) was not played.
- Players were subagents, not learners; the judgement of level is theirs.
- Italian only; the Spanish prompts are the same templates and were not played.
- The market's and the dungeons' authored encounters get the A1 rules and were not played.

## After the owner's decisions

One live A1 conversation (greetings) at the new default, Follow my level: lines mostly English with Italian woven in
("Sto bene, but my boots are così così. E tu?"), one question a line, the goodbye answered ("Arrivederci, Tom! I will
keep the rain company, since nobody has told it goodbye."). "Si, bene." was corrected to "Sì, sto bene." and cost a
heart: the grader added a word, so it is not an accent-only correction. Not played again at A2 or B1.

## Open items

- **Grading** still rewrites some correct answers ("Si, bene." to "Sì, sto bene.") and misses some ("Ieri pioveva
  molto", "Sì, volentieri"); the prompt now forbids the first, untested at scale.
- **Repetition across characters** is reduced, not removed: characters are drawn independently per site and step, so
  two in a row may still share a name or quirk.
- **Narration.** Off-level Italian words in the narration at A1, repeated images, objectives whose cue the character
  never acts out (the Fast Talker who never talks fast).
- **The iPhone app** (`mobile/`) does not have Follow my level; it sends no share and so already speaks the stage's.
