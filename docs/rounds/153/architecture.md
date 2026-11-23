# Round 153 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message "Pls implement all
open issues one after the other […] Finish all issues autonomously, I am going to sleep"; the owner's words and the
issue's are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen. The owner was
asleep, so every open point was decided by Claude and is listed in the findings.

- **Design source:** GitHub issue #1, "Strict mode / light mode toggle for encounters" (step 3 of the issues' build
  order).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js` (`lightTurn`, `commitTurn`), `server/src/llm/schemas.js`
  (`lightTurnSchema`), `server/src/llm/prompt-builder.js`, `prompts/encounter/light_turn.txt`,
  `client/src/display.js`, `client/src/stores/gameStore.js`, `client/src/components/SettingsSheet.jsx`,
  `DungeonScreen.jsx`, `DialoguePanel.jsx`, `CorrectionCard.jsx`, `README.md`.

## Goal

A **light mode** beside the existing **strict mode**, so that a turn is one call to the model instead of two. In
light mode nothing is checked: the model works out what the player meant, gives it in the target language, and
replies in character.

## Design

**The mode travels with each answer.** The web client sends `light: true` with an answer while Settings says Light,
as it sends `beginner: true` for beginner mode; light takes beginner's place. Nothing is stored on the server, and a
conversation may be answered in one mode and then the other. The choice is a display preference of the browser
(`parallang.display`, `light`), Strict unless changed.

**One call.** `LearningService.lightTurn` asks the narrator once, with the narration's own system prompt (the
character, the style guide, the learning data of the objectives still open) and a new turn template,
`prompts/encounter/light_turn.txt`. The reply is the narration's schema with a `player` block (`lightTurnSchema`):

| Field | What it is |
|---|---|
| `player.meant` | what the player meant, in English |
| `player.target` | the same in correct, simple target language |
| `player.clean` | whether the player's own text was already that |
| `player.objectives_met` | the ids of the open objectives that meaning fulfils |
| `narrative`, `dialogue`, … | the character's reply, as in strict mode |

**Nothing is validated.** No grader call, no evidence rules, no order, no hearts, and no second try at a line that
has no target language in it. An objective closes when the model names it, in any order; an id the conversation
does not have open is ignored. The conversation resolves when no objective is left, as in strict mode.

**Out of order.** An ordered conversation counts its place by an index. A light turn sets `loose` on the session,
and from then on its open objectives are the ones not yet passed, whatever their order. A strict answer later in
the same conversation grades those, without the order rule.

**What a light turn still records.**
- *The Spellbook.* The vocabulary matcher (a lookup, not a judge) reads the player's own text; a target of an
  objective the turn closed that stands in it is recorded as said, at quality 4 (2 after a hint), and a due card is
  rescheduled on it. A word that only the model's rendering holds is not recorded.
- *The road's score.* An objective closed by an answer that was not clean counts as corrected, as beginner mode's
  corrections do, so the pacing still sees how well a lesson went.
- *Experience* as in strict mode: 10 for an objective, 25 for a finished conversation.

**The turn's end is shared.** What a turn does to the save and the session (the transcript, the Spellbook, the
receipt, the road, the dungeon's site, experience) was the second half of `submitDialogue`. It is now `commitTurn`,
which the strict turn and the light turn both call.

**On the screen.** Settings has "How answers are checked": Strict or Light, with a line saying what each does.
Beginner mode's box is disabled under Light. In a conversation the objective card says that nothing is marked and
shows no hearts. The reply's banner is headed "Understood" with what the player meant, the sentence in the language
under it ("In Italian", with the practice box of beginner mode) when the answer was not clean, and a tick for each
objective the answer covered; an objective it did not cover is not listed.

## Tests

- `server/test/light-mode.test.js` (10 tests): one call and no grader; what the model is told; closing in any order;
  an unknown id; an answer that fulfils nothing; the Spellbook's record; strict mode unchanged; a strict answer after
  a loose light one; a replayed attempt; a reply without the `player` block; the schema; a road lesson in light mode.
- `client/src/components/__tests__/settings-sheet.test.jsx`: the choice, its storage, beginner mode stepping back.
- `client/src/components/__tests__/camera-wiring.test.jsx`: the answer's body, the banner, no hearts.
- The server's 505 earlier tests pass unchanged, Gerald's pinned prompts among them: strict mode's prompts are byte
  for byte the same.

## Claim boundary

No model was called: the model in the tests is scripted and returns what `light_turn.txt` asks for. Whether a live
model reads a beginner's meaning well, marks objectives sensibly and keeps to the rules has not been seen. Not seen
in a browser in this round (round 154, which builds on it, looks at both). The iPhone app is unchanged.

## Outcome

See [`findings.md`](findings.md).
