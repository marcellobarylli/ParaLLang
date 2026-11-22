# Round 151 findings

## Question

Can the lore book hold a fact that nobody in its world knows, without breaking the voice of a compiler who lives
there?

## Finding

Yes, by splitting it. Part VIII, "The roads", records the belief and what can be seen, in the compiler's voice.
"What the book does not say" states the fact plainly, outside that voice.

## Method

The issue's three statements were checked against the book's ten parts and the road's code for anything they
contradict or already imply.

## Results

| What | Result |
|---|---|
| Contradictions with the book | One, avoided. Part VII says of the Bone Dome "No road leads there yet", so part VIII says that every place a traveller *can reach* stands at a meeting of roads |
| Already in the book | Threads with a slight pull, and every spell a stitch (part III); old threads as roots in a dead branch (part VI); Journathan's threads "the oldest in the weave" (part IV); a realm "laid across all the branches like a web" (the Ring, now part IX) |
| Contradictions with the game | None found in `server/src/road/` or `content/curriculum/`: no character there says what a road is |
| The round-log check | passes |
| Tests | Not run: no code, prompt or content changed |

## Decision

Built as designed in [`architecture.md`](architecture.md). The three statements are the owner's. Claude's
decisions, for the owner to overrule:

- The split into a part in the compiler's voice and a section outside it.
- Everything under "What can be seen" in part VIII.
- The three joins: a thread's pull makes a road easy to follow; a road and a root are the same thing at different
  ages; "the wake of a stitch" is the thread a stitch leaves and the place where it went through.
- The rule that a hint uses a sewing word where a road word is expected.

## Evidence

[`docs/lore-book.md`](../../lore-book.md): part VIII, "What the book does not say", and the sources.

## Claim boundary

The owner has not read the text. Nothing in the game uses it yet.

## Open items

Listed in the book under "Not settled", for the owner:

- Who stitched the web, and whether the player's own spells add to it.
- Whether it is the same web as the realm of the Ring (part IX).
- Where on the map the stitches to other worlds are (issue #8's dungeons beside the road may be them).

Also open: the vault's `LORE.md` does not have the fact; it is in the owner's own vault to add. Issue #12 stays open
until the round is on `main`.
