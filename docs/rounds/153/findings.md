# Round 153 findings

## Question

Can a turn be answered with one call to the model, with strict mode left exactly as it is?

## Finding

Yes. A light answer makes one call (`light_turn`) and no grader call. Strict mode's code path changed only by a
split of `submitDialogue` into its two halves; its prompts are byte-identical and its 505 tests pass.

## Method

Server tests with a scripted model; client tests in jsdom.

## Results

| Check | Result |
|---|---|
| A light answer | 1 provider call (`light_turn`), 0 `dialogue_assessment` calls |
| A strict answer | 2 calls as before (`dialogue_assessment`, then `encounter_narration`) |
| Server tests | 515 of 515 (505 before, 10 new) |
| Web client tests | 260 of 260 (258 before, 2 new) |
| Gerald's pinned prompts (`gerald-prompts-r131.json`) | unchanged |

## Decision

Built as designed in [`architecture.md`](architecture.md). The issue names the two modes and the single call; these
points were open and Claude decided them, for the owner to overrule:

- **Strict is the default.** The issue says strict behaviour stays unchanged, and every player today is on it. Light
  is one tap in Settings.
- **Light replaces beginner mode while it is on.** Beginner mode is a way of marking, and light marks nothing.
- **Objectives still close, on the model's word.** The conversation needs an end, and the road needs to know that a
  lesson was done. Round 154 (issue #2) changes the end to a count of turns.
- **A gate of the road can be passed in light mode.** Its score is the model's `clean` flag, not a grader's. If gates
  should stay strict, that is one line in `lightTurn`.
- **The Spellbook records only words the player wrote**, found by the matcher.
- **The web client only.** The iPhone app has no Settings entry for it.

## Evidence

`server/test/light-mode.test.js`, the two client tests named in the architecture, `prompts/encounter/light_turn.txt`.

## Claim boundary

No live model. Not seen in a browser or on a phone in this round. The speed-up is by construction (one call in place
of two in a row); no turn was timed.

## Open items

- A live run in light mode: does the model's `objectives_met` agree with what a grader would have passed?
- The owner's word on the default.
- Not on `main`: the session branch holds it. A merge to `main` deploys the page and restarts the server.
