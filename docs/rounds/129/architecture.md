# Round 129 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's report from a run on the
iPhone, in a Claude Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome
section, added later. The full record (the owner's words, timeline) is in `trail/`; it is not needed to implement
this round.

- **Design source:** round 008's [architecture](../008/architecture.md) (the grader never gives the answer away),
  round 051's (ordered objectives), round 126's (speech).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `prompts/language/grading_beginner.txt` (new), `server/src/llm/`, `server/src/learning-service.js`,
  `client/src/components/`, `client/src/stores/gameStore.js`, `client/src/display.js`.

## Goal (pre-run)

A beginner who tries to say the right thing and gets the Italian wrong is understood, shown the correct sentence,
and moves on, at the cost of one heart.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0). The owner answered Portia with "Bungiorno! Me chiamo
Luigione. Come te chiame?", got three refusals with no correction, and decided:

- The strict verdict "is very harsh for someone who has never spoken Italian", and the player does "not know what
  to do from here, since there are no hints or corrections".
- "For beginner mode, it should recognise what I tried to say and correct it for me, using up a 'heart'."
- "If anything in my sentence is wrong, I lose a heart, see the correction and move on."
- "I can only lose up to one heart per response."
- "I should get the option to correct my mistake for that response (speak it or type it), but cannot lose another
  heart in the correction, I will move on either way."

This reverses, for beginner mode, the rule of rounds 008 and 012 that the grader's feedback never writes the answer.

Claude's decisions, where the owner's words leave a gap:

- **Decision 1: beginner mode is a setting, on by default.** "Beginner mode" in Settings, stored with the display
  preferences and sent with each answer. Off gives the strict grading of before. The iPhone app does not send it
  and is unchanged.
- **Decision 2: three hearts a conversation.** They come back with each new conversation and with "Start over".
  The number is one constant.
- **Decision 3: with no heart left, a mistake is still corrected, and it no longer moves the player on.** The
  correct sentence is on the screen, so the player can send it. Ending the conversation at zero hearts would be the
  harsher rule the owner is removing.
- **Decision 4: an answer that does not try is not forgiven.** English only, off the subject or empty: nothing
  closes, no heart is lost, and the feedback says in English what is wanted, without the answer. A heart pays for a
  mistake in an attempt, not for the answer itself.
- **Decision 5: the practice costs no call.** The player may say or type the corrected sentence. The app compares
  it with the correction itself, ignoring case, accents and punctuation, and says whether it matched. Nothing is
  sent to the server, so it takes no time, cannot cost a heart and cannot hold the player back.
- **Decision 6: a corrected objective earns its experience and no review credit.** The 10 XP for an objective is
  kept, since the player moved on. The spaced-repetition schedule moves only on words the player wrote correctly,
  as before.

## Design (pre-run)

### The grader in beginner mode

A second grading prompt, `prompts/language/grading_beginner.txt`, and a second response schema. For every
objective the grader returns, beside `passed`, `feedback` and the evidence of before:

- `attempted`: the learner clearly tried to do what the objective asks, in the target language, even with wrong
  spelling or grammar. Not for an English-only answer, a quotation, another person's words or another subject.

and for the whole answer:

- `correction`: the learner's own answer rewritten in correct, simple target language, keeping what they tried to
  say and adding nothing; null when nothing in it is wrong or nothing was attempted.
- `correction_translation`: its English, or null.

Its feedback is short and kind, names the slip and may write the correct form. For an objective not attempted it
says what is wanted in English and still does not write the answer.

### The turn in beginner mode

- An objective **closes** when it is passed, or when it is attempted, a correction came with it and a heart is
  left. In an ordered conversation the leading run of such objectives closes, as the leading run of passes did.
- **A heart is lost** when a correction came and a heart is left: one for the answer, however many slips it has.
- The character is told which objectives were closed by correction, and to answer what the player meant, without
  mocking the slips and without repeating the correction.
- The response carries the correction (text, translation, whether a heart was lost) and the conversation's hearts
  (used, limit). The request's `beginner` flag is not part of the attempt's fingerprint, so a resent answer replays.

### The screen

- The objective card shows the hearts while beginner mode is on.
- After a corrected answer the assessment shows "What you meant", the corrected sentence with a 🔊, its English,
  and "−1 ♥" when a heart was lost. Under it, "Say it yourself": a box and, where the browser listens, a 🎤. "Check"
  compares with the correction and answers "That's it" or shows where to look. The conversation has already moved
  on; the next reply box is there as always.
- Settings: "Beginner mode", on by default.

## Claim boundary (pre-run)

The session cannot call the model, so the new grading prompt is not run against it. Tests use a scripted grader
that returns what the prompt asks for; whether the real model recognises a beginner's attempt, writes a faithful
correction and stays kind is seen only after the deploy, in the owner's play. A model that marks too much as
"attempted" would let a wrong answer through for a heart; one that marks too little would be as harsh as before.

## Tests (pre-run)

- **Server:** the owner's answer to Portia, with a scripted grader: all three objectives close, one heart is lost,
  the correction is returned, the character is told they were corrected. A correct answer costs no heart and
  returns no correction. An answer that attempts nothing closes nothing and costs nothing. A fourth mistake, with
  no heart left, is corrected and does not close. One heart at most for an answer with several slips. "Start over"
  restores the hearts. Without the flag the strict prompt and verdict are byte-identical to before. A resent
  answer replays its response and costs no second heart. Corrected objectives earn their XP and move no review
  schedule.
- **Client:** the hearts on the objective card; the correction card with its heart; the practice box accepts the
  correction with other case, accents and punctuation, refuses another sentence, and sends nothing; the Settings
  box; the flag is sent only while the mode is on.
- All server and client suites and the build keep passing.

## Outcome (2026-11-19)

Built as designed, as `2363b42`, and deployed with the server. With "Beginner mode" on (the default), the grader is
asked as a teacher of beginners: it says which objectives the player tried and returns their answer in correct
target language. A corrected answer costs one of three hearts and closes the objectives it tried; with no heart left
it is corrected and has to be said right. The screen shows the hearts, "What you meant" with the corrected sentence,
its English and a 🔊, and a box to say or type it again, checked in the app. The owner's own answer to Portia, with a
scripted grader, resolves the tutorial for one heart. Server 452 and client 193 tests pass, and the flow passes in a
real browser. The claim boundary held: the new grading prompt has not been run against the model. See
[`findings.md`](findings.md); the owner's words are in [`trail/interview.md`](trail/interview.md).
