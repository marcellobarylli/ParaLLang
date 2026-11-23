# Round 168 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-23 by the owner's message after round 167; the
owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); [round 155](../155/architecture.md) (what the people of
  the world know, issue #3); [round 167](../167/architecture.md) (what is under the world);
  [`docs/lore-book.md`](../../lore-book.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `docs/lore-book.md` ("The religion of the place below"), `content/world/knowledge.yaml`,
  `server/test/world-knowledge.test.js`.

## Goal

The owner adds a main religion to the world. It sort of knows of the gap between the worlds, and perhaps its
higher-ups know the world's actual nature, but its canon is that the place below is hell or Hades. That makes the
general population afraid of the place, keeps them from going there and keeps them in the dark. Ordinary people met
in encounters can be its followers ("I don't wanna go to hell") or sceptics ("I'm not sure I've never seen it for
myself"): natural characters with their own relationship to religion. Then deploy.

## Design

**The lore book** gains "The religion of the place below" in "What the book does not say", with the owner's five
points, five joins marked as the compiler's, a line under "How the game holds the stitch" and five questions under
"Not settled". No name is invented for the religion.

**The game.** Round 155 gave every character three layers of knowledge of the world
(`content/world/knowledge.yaml` through `prompts/system/world.txt`): what everybody knows, what the region knows,
and one thing the character has noticed. The religion goes into two of them.

- **What everybody knows** gains the teaching, in 60 words: most people keep the one faith, more or less; it
  teaches that the place under the ground is hell and that nobody should go down looking for it, so caves, wells and
  deep cellars get a wide berth; people differ as people do, devout and afraid, going along, or doubting what they
  have never seen for themselves. Every character of the game is told this, in every language pack.
- **What a character has noticed.** The road's ordinary people (A levels) draw from 14 lines, 10 before: two of the
  new ones are afraid, one goes along, one has never seen it. Its people who have seen more (from B1) draw from 10
  lines, 8 before: the two new ones doubt the people who teach it. So about three in ten of the road's ordinary
  characters have the faith as the thing on their mind, and all the others know it without dwelling on it.

**How it shows is unchanged.** `world.txt` already has a character let one small detail of the world show now and
then, in passing, never as a lecture, and answer a question with what they have seen or been told. The religion
comes up the same way. Nothing tells a character to bring it up.

**What no character is told.** What is truly below. No line about the faith names a tree, a cave, a void or a
chasm, and a test keeps it so. The canon is the one thing in that part of the lore book that people say aloud.

**The word limit.** A test kept "what everybody knows" under 220 words so that prompts stay short; it was 206. It is
266 now and the limit is 280.

**Not built:** the religion's name, houses and clergy as places or characters; anyone high up in it; its relation to
the followers of the void; what it says when the valleys come.

## Tests

`server/test/world-knowledge.test.js`, one new test: the teaching is in what everybody knows; the road's pools hold
the afraid, the one who goes along and the doubter, and the two lines about its teachers; the faith is fewer than
half the lines; none says what is below; and it reaches a character's prompt.

## Claim boundary

- No live model was called. That a character mentions hell naturally, and not too often, rests on the prompt's
  existing rule and has not been heard.
- The noticed lines are English for the model; what a character says of the faith in Italian or Spanish is the
  model's and is unreviewed.
- Adding lines to the pools changes which line each generated character of the road draws, for every seed.

## Outcome

Built and recorded in one sitting. Server 568 tests, web client 288, the aesthetic package's 95, the iPhone app's
320. Deployed, page and server, on the owner's word.
