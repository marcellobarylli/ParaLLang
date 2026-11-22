# Round 155 findings

## Question

What is the smallest change that puts the world into a character's prompt, and does the prompt carry it everywhere?

## Finding

One content file, one prompt block and one optional entry on a character's sheet. Every narrator call of every
conversation carries the block: authored and generated characters, the greeting, strict replies and light turns.

## Method

Server tests that read the prompts the service sends to a scripted model.

## Results

| Check | Result |
|---|---|
| Server tests | 529 of 529 (523 before, 6 new) |
| Web client tests | 260 of 260 (nothing of the client changed) |
| Gerald's pinned prompts | unchanged: a prompt built without the layers is as before |
| The block's size | about 350 words, of which the `global` blurb is about 190 |

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **The texts are Claude's**, written from the lore book: the `global` blurb, three region blurbs, eight authored
  lines and eighteen lines for the road. They are the first thing to edit.
- **Three regions**: the road, the dead branch (the market's cast, who also stand in Ta Prohm and The Kiln) and
  Micromort Mountain.
- **Castile** stands in for Tuscany in the Spanish pack.
- **"About one reply in three"** is the rate asked of the model.
- **The issue's "Deployed" is not met.** The work is on the session branch. A merge to `main` deploys the page and
  restarts the server, which is the owner's word to give.

## Evidence

`content/world/knowledge.yaml`, `prompts/system/world.txt`, `server/test/world-knowledge.test.js`.

## Claim boundary

No live model. The issue's own test ("characters mention world details naturally and answer 'what do you mean?' in
character") needs one and is open.

## Open items

- A live conversation in which the player asks "what do you mean?".
- The owner's read of the texts.
- Not on `main`, so not deployed.
