# Round 129 findings

## Question
The owner answered Portia with "Bungiorno! Me chiamo Luigione. Come te chiame?" and was refused three times over
with no correction. In beginner mode, is such an answer now understood, corrected for one heart, and let through,
with an optional try at the correction that costs nothing?

## Finding
Yes, with a scripted grader standing in for the model. Whether the real model plays the teacher as asked is not
known until the owner plays the deployed build.

## Method
A second grading prompt (`prompts/language/grading_beginner.txt`) and response schema add `attempted` for each
objective and a `correction` for the answer. `submitDialogue` closes an objective that was passed, or tried and
corrected while a heart is left. The client sends `beginner: true`, shows the hearts and a correction card, and
checks the practice itself (`client/src/practice.js`). Server tests script the grader's verdicts;
`client/scripts/beginner-check.mjs` plays the owner's answer through the built client and the real server code in
headless Chromium.

## Results
- **The owner's answer.** All three of Portia's objectives close, one heart is used, and the screen shows "What you
  meant: Buongiorno! Mi chiamo Luigione. Come ti chiami?" with its English ([picture](shots/02-corrected.jpg)).
  Portia is told the objectives were met with slips, to answer what the player meant, not to mock the slips and not
  to repeat the correction.
- **The rules, as tested.**

  | The answer | What happens |
  |---|---|
  | Correct | Closes its objectives. No correction, no heart |
  | Tried, with a slip, a heart left | Corrected, one heart, its objectives close |
  | Several slips in one answer | One heart |
  | Tried, with a slip, no heart left | Corrected, nothing closes; "Put it in the reply box" offers the sentence |
  | In English, or mixed, saying what is asked (Amendment, after the owner played) | Put into Italian in the correction, one heart, its objectives close |
  | Does not try (another subject, a quotation) | Nothing closes, no heart, told in English what is wanted |
  | Resent after a lost reply | The same response again, no second heart |

- **Hearts.** Three a conversation, shown on the objective card ([picture](shots/01-hearts.jpg)); a new
  conversation and "Start over" have all three.
- **The practice.** A box under the correction, with a 🎤 where the browser listens
  ([picture](shots/03-practice.jpg)). The app compares the try with the correction, ignoring capitals, accents and
  punctuation: "That's it", or the words to look at. Nothing is sent, so it is instant and cannot cost a heart.
- **In order.** Portia's objectives are met in order. An objective tried after one not tried waits, as before.
- **Kept.** A corrected objective earns its 10 XP. Only words written correctly move the review schedule.
- **Off.** With "Beginner mode" unticked the strict prompt is sent exactly as before, and nothing is corrected.
- **Tests.** Server 452 passing (442 before), client 193 (185 before). Real browser: 10 checks, 0 problems.

## Decision
Kept and deployed. Three hearts, the rule at zero hearts and the rule for an answer that does not try are Claude's;
the owner's words cover the rest.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/`](shots/).
- The prompt: `prompts/language/grading_beginner.txt`.
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
The grader in every test is scripted. The model may mark too much as tried (a wrong answer passes for a heart), too
little (as harsh as before), or write a correction that says more than the player meant. Its feedback may still be
long. None of this is seen until the owner plays. The iPhone app (`mobile/`) does not send the flag and is
unchanged. The mobile suite and the full playthrough were not run. No Codex critique was made.

## Open items
- **After the owner played (Amendment):** English now counts as an attempt and is corrected for a heart. The
  microphone listens in one language at a time and has a switch between Italian and English; one English word
  inside an Italian sentence is not heard correctly by the browser's recogniser.
- **Owner:** send the same answer to Portia on the deployed build and say what comes back.
- **Owner:** three hearts, and what zero hearts does, are first choices (`BEGINNER_HEARTS` in
  `server/src/learning-service.js`).
- The hearts are per conversation. A stock across the whole run, refilled by reviews or by time, would be a design
  of its own.
- Strict mode is as harsh as it was. If it should also show corrections without forgiving, that is a small change.
- A corrected answer shows the Italian answer in the feedback, which rounds 008 and 012 forbade; in beginner mode
  that is now intended.
