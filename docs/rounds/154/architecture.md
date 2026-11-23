# Round 154 architecture

**Conversational round, recorded with the build.** The second of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #2, "Light mode: 3-5 turn back-and-forth, encourage questions back" (step 4 of the
  build order); [round 153](../153/architecture.md), which it builds on.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js` (`LIGHT_EXCHANGE`, `lightTurn`), `prompts/encounter/light_turn.txt`,
  `server/src/llm/prompt-builder.js`, `server/src/road/pacing.js` (`scoreOf`), `server/src/road/service.js`,
  `client/src/components/DialoguePanel.jsx`, `client/scripts/light-check.mjs`, `client/scripts/lib/play.mjs`,
  `docs/rounds/154/shots/`.

## Goal

In light mode a conversation is a real exchange of three to five turns: the character follows up on what the player
said, the player is encouraged to ask questions back, and the conversation ends by itself.

## Design

**The turn counter is the one the session has** (`committedPlayerTurns`, the player's answers so far).
`LIGHT_EXCHANGE` is `{ min: 3, max: 5 }`.

**The end condition** of a light turn, where round 153 had "no objective left":

| The player's turn | Ends the conversation |
|---|---|
| 1, 2 | never, also when every objective is met |
| 3, 4 | when no objective is left open after it |
| 5 | always |

So the curriculum exercise (the objectives) decides whether the talk stops at three turns or runs on to five, and a
conversation that has said everything at once still becomes a conversation.

**The model is told where the turn stands.** The turn data carries `exchange: { turn, min, max, ending }`, and
`ending` is one of three sentences the server picks by the table above ("Not yet …", "If no objective is left open
after this answer, this reply is the last …", "Now: this reply is the last …"). The server, not the model, decides
that the conversation is over; the sentence lets the last reply read like a goodbye.

**The nudges** are a block of `light_turn.txt`, "THE EXCHANGE": respond first to what the player actually said and
build the next question on it; answer a question of the player's before anything else; bring an open objective in as
part of the follow-up; and invite the player to ask something back, in the character's own way.

**On the screen** the objective card in light mode reads "Turn 2 of 3 to 5. You can ask Portia questions back."
When everything asked for has been said and the exchange is still going, the card says "Keep talking" in place of
"Conversation complete" and the reply box stays.

**Edges.**
- With no objective open there is nothing to hint at: a hint is refused (`HINTS_EXHAUSTED`) and the limit reads 0.
- A strict answer sent while no objective is open (the player changed Settings mid-way) is read as a light turn:
  there is nothing to grade.
- Strict conversations are unchanged: they end when their objectives are met, on any turn.
- **The road's score.** A light conversation can end with an objective never met. `scoreOf` takes `missed`: such an
  objective counts nothing (a corrected or hinted one still counts half).

## Tests

- `server/test/light-exchange.test.js` (8 tests): the three rows of the table, what the model is told of each turn,
  the prompt's nudges, hints with nothing open, a strict answer with nothing open, strict mode's end, the road's
  score with a missed objective.
- `server/test/light-mode.test.js`: two tests changed for the new end (they resolved on the turn that met the last
  objective).
- `client/src/components/__tests__/camera-wiring.test.jsx`: the turn line, "Keep talking".
- `client/scripts/light-check.mjs` plays three light turns with Portia in headless Chromium at a phone's size.

## Claim boundary

No model was called. That a live model follows up, invites questions and says goodbye on the right turn is asked of
it by the prompt and has not been seen. Seen in headless Chromium, not on a phone.

## Outcome

See [`findings.md`](findings.md).
