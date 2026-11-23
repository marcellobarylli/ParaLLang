# Round 154 findings

## Question

Does a light conversation run three to five turns and end by itself, on the server and on the screen?

## Finding

Yes, with a scripted model. The headless run: Settings switched to Light, three answers to Portia, the second of
which met the last objective; the card then read "Keep talking" and the third answer ended the conversation.

## Method

Server tests; `client/scripts/light-check.mjs` on the built client in headless Chromium at 390×844.

## Results

| Check | Result |
|---|---|
| Server tests | 523 of 523 (515 before, 8 new) |
| Web client tests | 260 of 260 |
| `light-check.mjs` | 10 checks, 0 problems |

Pictures: [Settings](shots/01-settings-light.jpg), [the objective card](shots/02-objective-light.jpg),
[what was understood](shots/03-understood.jpg), ["Keep talking"](shots/04-keep-talking.jpg),
[the end](shots/05-ended.jpg). The character's lines in the pictures are the test fixture's (Spanish coffee talk):
the scripted model returns the same narration for every character.

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **Three is a floor, five a ceiling, and the objectives decide between.** The issue says "3-5 turns" and "ends
  naturally … tied to the curriculum exercise".
- **The fifth turn ends the conversation even with an objective open.** The road then scores that objective as
  missed, and the pacing offers the lesson again if the score is low.
- **Both the prompt and the screen nudge** the player to ask questions back (the issue allows either).
- **Round 153's check in a browser was done here**, for both rounds.

## Evidence

`server/test/light-exchange.test.js`, `client/scripts/light-check.mjs`, [`shots/`](shots/).

## Claim boundary

No live model: its follow-ups and goodbyes are not seen. Not on a phone. The experience of a three-turn lesson
against a one-turn strict one (is it faster in all, or only per turn?) is the owner's to judge.

## Open items

- A live light conversation, read for whether it feels like an exchange.
- Not on `main`.
