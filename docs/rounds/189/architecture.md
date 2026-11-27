# Round 189 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 155's world layers ([architecture](../155/architecture.md)).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `prompts/system/world.txt`, `prompts/encounter/world_moment.txt`, `server/src/llm/prompt-builder.js`,
  `server/test/world-knowledge.test.js`.

## Where it stood

Since round 155 every narrator call carries the world block (what everybody knows, the region, one line the
character has noticed) and asked the model to let a detail show "in about one reply in three". The road's noticed
line is drawn from a pool of fourteen (ten from B1 on), so the same few lines came back, and nothing tied the remark
to what the conversation practises.

## Decisions

1. **The greeting is the exercise alone.** The world block now says so.
2. **The world shows once, in the reply to the player's first answer.** That reply's turn data carries
   `world_moment` (`prompts/encounter/world_moment.txt`): after answering the player, one short statement of what the
   character has seen of this world *in the thing the conversation practises*, as their trade and place meet it,
   before the closing question. Any other reply shows the world only when the player brings it up; "what do you
   mean?" is still answered in character, as in round 155.
3. **The exercise is what keeps it from repeating.** The noticed line and the global lore give the kind of oddity;
   the model is told not to repeat those lines or anything said earlier and to make the remark out of this
   conversation's subject, "so that it could be said in no other conversation". Each conversation's objectives differ,
   so the remark differs even when the drawn line is the same. No memory of past remarks, no new content, no extra call.
4. **The first answer is found from the history**: the reply answers the player's first turn when the conversation
   history holds no player message. This needs no change at any call site and covers strict, beginner and light turns,
   on the road and in the authored encounters alike, wherever a character has a world.

## Tests

`npm test -w server` (614; 2 new, 1 changed).

## Status

Merged to `main` and pushed on the owner's word ("then deploy"); GitHub Pages deploys `main` and Render redeploys the
server from it.
