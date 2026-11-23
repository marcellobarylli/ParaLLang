# Round 167 findings

## Question

Does the owner's picture of what is under the world fit the lore book as it stands, and what does it leave open?

## Finding

It fits, and it tightens three things already there: the graph of issue #12, the roots of part VI and the pulls of
round 164. It first left one real tension (the trees hold the worlds apart; the stitches pull them together), which
the owner settled the same day: a stitch pulls on the tree and shrinks it, and past a certain force the tree
collapses and a void expands where it stood. What that leaves open is listed under "Not settled".

## Method

The lore book read against the owner's message; the statements about Dark Souls looked up before being written.

## Results

| What the owner said | Where it is now |
|---|---|
| The valleys eventually turn into abyssal chasms | "Where the pulls are going" |
| The graph is an analogue of the world trees that carry Lordran | "Under the world", "The model is Dark Souls" |
| An explicit mechanism reveals the world skeleton: a magical event, or going underground | "Under the world", last point; "Not settled"; issue #25 |
| The roads on top are the surface manifestation of the actual graph | "Under the world", first point |
| A huge cave; a world tree at each node from its ceiling to its floor, where it touches the other world; the trees support the gap | "Under the world" |
| No trees on the edges, where no stitches happen; the edges run along the ceiling and the floor as roots | "Under the world" |
| Open an issue to generate a view of it, to look and feel like Dark Souls | [issue #25](https://github.com/marcellobarylli/ParaLLang/issues/25) |
| (Final clarification) The trees hold the world up and the worlds apart; stitching pulls on them and shrinks them, which shows as valleys; a tree collapses past a certain force, both worlds are destroyed there, and space expands into a massive dark void, the chasm | "What a pull does, and where the pulls are going"; issue #25, updated |

| (Later) There have to be followers of the void: a faction within the world that seeks to accelerate the collapse and create the void, like the Abyss, with roots in Taoism | "The followers of the void", "What they took from the Taoists", "Why it fits this world" |

| (Correction) The book should not say no character knows: most do not, and special characters know more, the followers among them | "Most characters do not know this", "A few know more"; "How the game holds it" |
| (Later) Kept open: born here or came through; an end or a beginning or both; enemy or instrument. A player can oppose them or join them, and if they join, are they being used | "Left open on purpose"; the choice under "The followers of the void" |

| Statement about Taoism | What the lookups returned |
|---|---|
| Chapter 40: all things are born of being, and being of non-being (*wu*) | Confirmed in several translations |
| Chapter 11: thirty spokes meet in one hub; the wheel's use depends on the empty space; the pot and the room | Confirmed (Legge's translation and others) |
| Chapter 16: emptiness to the utmost, stillness guarded; things return to their root, and that is stillness | Confirmed (Legge's translation and others) |
| Chapter 6: the valley spirit never dies; its gate is the root of heaven and earth | Confirmed in several translations |
| *Wu wei* is non-action or effortless action, not literal doing nothing | Confirmed as the usual gloss; one source says the classical philosophers shared no single definition |

| Statement about Dark Souls | What the lookups returned |
|---|---|
| The opening names "gray crags, archtrees and everlasting dragons" | Confirmed by several transcriptions |
| Ash Lake is the lowest place, reached only down the Great Hollow, the inside of a tree | Confirmed |
| Dozens of great trees stand in the distance, in fog | Confirmed as descriptions of the place |
| The archtrees carry all of Lordran | **A reading, not stated by the game.** Found as players' interpretation; one source calls it "potentially" so, another proposes a different reading |
| The Abyss is sealed under flooded New Londo; a pit under Oolacile is called the Chasm of the Abyss | Confirmed |

## Decision

- **The reading is written as a reading.** The owner's parallel holds either way; the book says the game does not
  state it.
- **The tension was listed, not resolved, and the owner resolved it** (the amendment): a pull shortens the tree and
  in the end breaks it.
- **One thing is flagged for the owner rather than smoothed over:** by this lore the player's own progress brings
  the chasms, while part VI has translating as the work that holds Collision back. Both are in the book.
- **The issue asks for a view and a way to reach it**, and leaves the choice between an event and a way down open,
  since the owner named both.
- **The followers are written as a sect that has left its teaching.** The owner asked for roots in Taoism. Its book
  praises emptiness and counsels stillness; a faction that accelerates a collapse is not following it. The lore
  book says so and marks it as the compiler's reading.
- **Two kinds of open question are kept apart.** "Left open on purpose" is what the game is never to answer;
  "Not settled" is what the design has still to decide. The owner's message drew that line.
- **No name, no character.** "The followers of the void" is the owner's working name and is kept.
- **On `main`, without a deploy.** The owner asked for everything to be pushed to `main`. Nothing the page or the
  server serves has changed, so the push carries `[skip ci] [skip render]` and starts no workflow.

## Evidence

- `docs/lore-book.md`, issue #25.
- The trail: [`trail/interview.md`](trail/interview.md) (the owner's words).

## Claim boundary

As in the architecture: the statements about Dark Souls rest on web searches; the joins are the compiler's; nothing
of it is built.

## Open items

The questions in the lore book's "Not settled" as amended, and the open questions of issue #25.
