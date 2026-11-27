# Round 197 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message and picture; rounds 174 (three replies, keep chatting), 177 (conversation
  rules by level) and 189 (the world in the second line, which this replaces); the lookups in the findings.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `prompts/system/conversation_shared.txt`, `conversation_a1.txt`, `conversation_a2.txt`,
  `conversation_b1.txt`, `world.txt`; `prompts/encounter/greeting.txt`, `world_postscript.txt` (new),
  `world_moment.txt` (removed); `server/src/llm/prompt-builder.js` (`postscript`), `server/src/learning-service.js`
  (`chatTurn`); `client/src/components/DungeonScreen.jsx`; tests in `server/test/world-knowledge.test.js`,
  `conversation-levels.test.js`, `encounters.test.js` (fixture `gerald-prompts-r197.json`); the playtest in
  [`docs/playtests/2026-11-27-follow-ups`](../../playtests/2026-11-27-follow-ups/README.md).

## The order of a conversation

1. **The greeting is the exercise.** It asks for what the open objectives need, as many as one answer can give, in
   a single invitation. Round 177's "steer toward the next one only" no longer holds for the greeting.
2. **Every reply after it is a conversation.** The character reacts to one specific thing the player said, and the
   closing question is a follow-up on that same thing: one that could only be put to this player after this answer.
   Never an opening or general question ("How are you?", "How is your Italian?"), never a change of subject while
   the answer holds something to ask about, never a question the character knows the answer to or goes on to answer.
3. **An open objective comes only by a bridge** from what the player said (lives abroad: what do you speak there?).
   With no honest bridge the follow-up is asked anyway and the objective waits: the conversation comes before the
   list.
4. **The last reply** (light: `exchange.ending`; strict and beginner: the decision's `encounterState` resolved)
   reacts to the last answer, brings back one thing the player said earlier in a parting remark or wish, and says
   goodbye. No question.
5. **By level.** A1: the follow-up is put so that yes or no, one word or the conversation's words answer it; the
   last reply is as short and still names one thing the player said. A2 and B1: the closing question is a follow-up,
   never a fresh subject.

## The world is the postscript

6. **No world in the conversation itself** unless the player brings it up. Round 189's `world_moment` in the reply
   to the first answer is removed.
7. **Keep chatting carries `world_postscript`** in its turn data (`chatTurn` passes `postscript: true`): the
   character, at ease, lets a secret slip: one thing it has seen of the world that does not add up, from its noticed
   line or what everybody knows (a character with no world block confides an oddity of its trade). It is led into
   from something the player said in this conversation. One secret unasked; more only when the player asks.
8. **The button** reads "Keep chatting with <name> and you might learn a secret".

## Tests

`npm test -w server` (614; 2 replaced, Gerald's pinned prompts regenerated); `npx vitest run` in `client/` (337);
`npx vite build`. Live: four conversations through `server/scripts/playtest.js` (findings).

## Status

Built, tested, played against the live model. Merged to `main` with round 198 and pushed on the owner's word
("then deploy"); GitHub Pages deploys `main` and Render redeploys the server from it.
