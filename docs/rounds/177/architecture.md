# Round 177 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-24 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; the playtest of 2026-11-24
  ([`docs/playtests/2026-11-24-conversations`](../../playtests/2026-11-24-conversations/README.md)); rounds 131 (the
  conversation rules), 144 (the curriculum), 153 and 174 (light turns, keep chatting).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `prompts/system/conversation_a1.txt`, `conversation_a2.txt`, `conversation_b1.txt`,
  `conversation_shared.txt`; `prompts/system/base.txt`, `prompts/encounter/light_turn.txt`, `greeting.txt`;
  `server/src/llm/prompt-builder.js` (`conversationRules`, `conversationLevel`); `server/src/learning-service.js`
  (`sceneExtras` passes the level; `LIGHT_ENDING.go_on`); `server/src/road/encounters.js` (how a lesson models its
  words); `content/languages/it/curriculum/05_b1_1.yaml` (`che_succede`); `server/scripts/playtest.js`.

## Decisions

1. **A playtest harness.** `server/scripts/playtest.js serve` runs the game's service on the claude-cli provider
   with one extra route that places a new learner at any unit or lesson; `start` and `say` play it over HTTP and log
   every turn. The CLI child gets the whole environment and the adapter's sign-in check is skipped: it is for a
   development machine or a cloud session, never the game's server.
2. **Conversation rules by level.** The CONVERSATION block of the system prompt is now the stage's rules and the
   shared ones. A road conversation's level is its stage's CEFR (`definition.road.cefr`); every other conversation
   (the market, the dungeons) is spoken at A1.
   - **Shared:** at most one question a line, at its end (most lines end on one; now and then a line ends on a remark
     that invites a reply); the open objectives one at a time; the character may talk of its trade but never asks
     what the player thinks of it or wants to know about it; never a model answer; varied openers, no praise opener
     again; a gag used once; the weather and time as given; a goodbye answered; plain text.
   - **A1:** one or two short sentences in the present; questions the player can answer with the conversation's
     words, yes/no allowed; once the objectives are met, the same words in a new small way, not new subjects; simpler
     when the player is lost; one short absurd touch in the dialogue.
   - **A2:** react to a detail of what the player said, one remark of the character's own (the weather, what is going
     on, the trade) as a statement, one question about the player an elementary learner can answer.
   - **B1:** as A2, remembering earlier answers, using the unit's grammar in the character's own lines, and an open
     question about the player's experience, opinion or story.
3. **Removed:** "what they make of {name}'s trade", "ask in one go for everything", "a good answer is about a
   paragraph", "never a question that yes or no would answer", and light turns' "invite the player to ask something
   back … a trade, a place and opinions".
4. **A goodbye in keep-chatting.** `LIGHT_ENDING.go_on` said "Do not say goodbye", which overrode the rule: now the
   character does not end the conversation itself but answers the player's goodbye.
5. **How a lesson models its words.** About the character's own situation; never as an instruction, never as what
   someone says or should say, never in the line that asks for them.
6. **"Che cosa c'è che non va?"** and its variants are forms of `che_succede`. The grader passed them by meaning with
   evidence the matcher did not know, and the turn failed with `INVALID_GRADING`.

7. **Words said first only when never met** (the owner's decision). A taught objective carries a `recall_intent`;
   when the conversation starts, the objectives of which some word is already in the learner's Spellbook are fixed as
   `known` on the session and are told to the narrator as recall (the character does not say the words first). The
   teaching note goes only while some taught objective's words are new.
8. **Unverifiable evidence no longer fails a turn.** Evidence for an unrelated item, a form the vocabulary lacks, a
   quote not in the answer or a repeat is dropped and never recorded; a pass left without its required evidence is
   *understood*: it closes as a corrected objective does (half credit, no word recorded, no heart). A malformed,
   unknown or incomplete grading still fails with INVALID_GRADING.
9. **Accent-only corrections cost no heart.** A correction whose letters equal the answer's once accents,
   apostrophes, capitals, punctuation and spacing are folded (`sameLetters`) is shown, closes what was tried, and
   costs nothing. The beginner grader is told never to swap a correct word or construction for one it prefers.
10. **Follow my level** (Settings, on by default, and for a display saved before it): no share is sent with a start or
   an answer, and the server speaks the stage's share (20 % at A1.1, rising 5 points a turn); moving the slider
   chooses a share and turns it off. Before, the default was 1: every line wholly Italian at every stage.
11. **Repetition.** Five quirks worded to recur in every line ("mentions the fund at every opportunity") now show once;
   the shared rules say a quirk shows now and then; the name pools grew from 36 to 60 first names and 59 surnames.

## Tests

`npm test -w server` (592; `known-words.test.js` new; `conversation-levels.test.js` new; Gerald's pinned prompts regenerated as
`gerald-prompts-r177.json`; `immersion` and `light-exchange` tests follow the new wording);
`node server/scripts/check-curriculum.js`; `npx vitest run` in `client/` (305; the default share and the display's shape follow Follow my level); `npm test -w aesthetic` (95); `npx vite build`. The tests that pinned INVALID_GRADING for unverifiable evidence now pin that nothing of it is recorded. Live: 44 conversations by subagents through the harness (findings).

## Status

Built, tested, playtested against the live model; merged to `main` and pushed on the owner's word ("merge and
deploy").
