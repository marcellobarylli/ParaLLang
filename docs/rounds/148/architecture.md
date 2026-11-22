# Round 148 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's reply to round 147's report;
the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen.

- **Design source:** the owner's request; [round 142](../142/architecture.md) (the translation whose sentences share
  colours with the line); [round 129](../129/architecture.md) (beginner mode, a preference that travels with each
  answer); [round 126](../126/architecture.md) (the voices); [round 001](../001/architecture.md) (a protected
  line's translation costs a hint).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `prompts/system/dialogue_full.txt` and `dialogue_mixed.txt`; `IMMERSION` in
  `server/src/language-engine.js`; the session's share in `server/src/learning-service.js`;
  `client/src/display.js`, `client/src/components/SettingsSheet.jsx`, the stores; the tests;
  `docs/rounds/148/shots/`.

## Goal

The characters speak the language being learned only, by a slider in Settings that goes up to 100 % and starts
there. The coloured translation carries the understanding. The voices stay.

## Design

### The slider (`display.js`, `SettingsSheet.jsx`)

"How much Italian the characters speak" (the name is the language's own): 10 % to 100 % in steps of ten, **100 %
unless moved**. It is a preference of the browser, stored with the others, and it does not reconnect. Under it the
sheet says what the value does. The web client sends it as `immersion` (0.1 to 1) with every start of a
conversation and every answer, so a change applies from the character's next line.

### The share on the server (`learning-service.js`)

- A start or an answer may carry `immersion`. It is kept on the conversation and **replaces the content's share**: a
  character's own, its rise by the turn, the level's addition in a dungeon, the stage's on the road. A value that
  is not a number from 0.1 to 1 is refused.
- **Without it nothing changes.** The iPhone app sends none and plays as before; the pinned prompts of Gerald's
  encounter are byte for byte what they were.
- A conversation taken up again takes the share asked for now. A greeting written ahead (the app's prefetch) was
  written at the content's share and is dropped when a share is asked for.

### What the narrator is told (`prompts/system/`)

The three lines of the system prompt about the mix of the dialogue moved to `dialogue_mixed.txt`, unchanged. From
95 % up (`IMMERSION.full`) the narrator gets `dialogue_full.txt` instead:

- every word of every dialogue line, the greeting included, is in the language; no English, not in brackets, not as
  an aside; names stay;
- within a beginner's reach all the same: short, plain sentences, common words;
- `dialogue.translation` is the same line in English, sentence for sentence in the same order, which is what lets
  the page colour each sentence with its translation.

Below 95 % the mixed rules apply at the share chosen ("about 60% of the words"), and it does not climb with the
turns. The narration around the line is as round 130 made it: English with a few words of the language, at most
30 %.

### The translation at full immersion

The translation of the line being answered has been a help since round 001: "Translate sentence" spends a companion
hint and caps the mark of the words answered at 2, and a gate on the road allows no hints. With the line wholly in
the language, a beginner could not read a gate's question at all. So **at full immersion the translation comes with
the line**: no hint is spent and no mark is capped. The line never holds the words of the answer (the narrator's
rules forbid it, a first lesson excepted), so the translation gives the question, not the answer. Word helps cost
what they did. Below full immersion the translation is a help as before.

### The voices

Unchanged. A voice reads the whole line in the language's own voice (round 126), which is right for a line that is
wholly in it.

## Tests

- `server/test/immersion.test.js`: what a share is; a road conversation without one is as before; at 1 the greeting
  and the reply are asked for in the language only, the translation comes with the line, no reveal is recorded and
  the answer is marked in full; at 0.6 the mixed rules say 60 % on every turn; the slider moved during a
  conversation; a bad share refused; the market's conversations.
- `server/test/web-client.test.js`: the real store against the real server as first opened; the help rules with the
  slider at one half.
- `client`: the preference (`display.test.js`), the slider in the sheet (`settings-sheet.test.jsx`), the road against
  the real service (`road-flow.test.js`), and every start and answer carrying the share.
- `client/scripts/road-shots.mjs`: the slider at 100 % in Settings, and the first line in Italian only with its
  translation and no "Translate sentence".

## Claim boundary

**No model was called.** What a model writes when told to speak the language only is not shown here: the tests
check what the narrator is told, and the pictures' Italian lines are the script's own. The first conversation on
the live server is the check.

## Outcome

See [`findings.md`](findings.md).
