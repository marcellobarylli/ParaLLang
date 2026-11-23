# Round 167 architecture

**Conversational round, recorded with the writing.** Opened on 2026-11-23 by the owner's message after the deploy of
round 166; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is
frozen. A round of lore: no code is changed.

- **Design source:** the owner's message (no GitHub issue before it; [issue #25](https://github.com/marcellobarylli/ParaLLang/issues/25)
  is opened by it); [round 164](../164/architecture.md) (the stitch and the pulls); [`docs/lore-book.md`](../../lore-book.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `docs/lore-book.md` ("Where the pulls are going", "Under the world"), GitHub issue #25.

## Goal

The owner refines the lore of round 164 with what is under the world and with its model, Dark Souls, named outright;
asks for it in the lore book; and asks for an issue to generate a view of it.

## Design

**Two new parts in "What the book does not say"**, after "The pulls", in the owner's words restated:

- **Where the pulls are going**: a valley is the first sign; pulled further, the valleys become abyssal chasms.
- **Under the world**: the roads are the surface manifestation of the true graph, which is under the ground; there
  is one huge cave whose ceiling is the underside of this world and whose floor is where it touches the other; a
  world tree stands at every node from ceiling to floor, and the trees hold the gap between the worlds; nothing
  stands along an edge, because no stitch is made there; the edges run along the ceiling and the floor as roots; and
  the skeleton has to be revealed by an explicit mechanism, a magical event or a way underground.

**The model is named, and what is the game's is kept apart from what is a reading of it.** Dark Souls 1: Ash Lake
and its archtrees, the Great Hollow, the Abyss. That the archtrees carry all of Lordran is the owner's reading and
a common one, and the lore book says so: the lookups made this round found it as players' interpretation, not as
something the game states. The book notes that this silence is itself part of what is borrowed.

**Joins, marked as the compiler's and for the owner to overrule:** part VI's roots "thick as trees" are these roots;
part II's tree of worlds; the web shown at each pull is the cave seen from above; a character sent back "down
through the ground" goes down the tree; the cloaked figures are needle heads and the trees and roots the thread.

**"Not settled" gains four questions**, the first a real tension between two things the owner has said: the trees
hold the worlds apart and the stitches pull them together, so what a pull does to a tree is not said.

**Issue #25** asks for the view: the picture, the look and feel (scale, fog, almost no colour, silence, no
caption), a suggested approach on the code as it is (the same graph read from below, a third scene in `aesthetic/`),
the two ways the owner named for getting there, acceptance and open questions. It says that the feel and the
composition are the brief and that models, textures and music must be the project's own or licensed.

## Amendment (2026-11-23): what a pull does to a tree

The owner sent a final clarification the same day (Q2 of the interview). It settles the tension this round had
listed: the trees, joined by the roots, support the separation of the worlds, holding this one up and the two apart;
a stitch pulls on the tree under it and shrinks it, which is the valley on the surface; past a certain force the
tree collapses and both worlds are destroyed at that place; space is warped there, so what is left is not an open
gate but an expansion into a massive dark void, and that is what an abyssal chasm is.

- The lore book's "Where the pulls are going" becomes **"What a pull does, and where the pulls are going"**, after
  "Under the world", with those five points. The tree's point in "Under the world" says the trees hold the worlds
  apart as well as up.
- Two joins are added, marked as the compiler's: a collapsed tree is part VI's Collision at one place, so Collision
  can come a chasm at a time; and a chasm, unlike a rift, cannot be stepped through.
- "Not settled" drops the tension and gains what the clarification leaves open: how many pulls a tree bears; what a
  collapse does to the trees next to it; what is in the void and whether a chasm can be mended; and that the
  player's own progress is what brings the chasms, where part VI has translating as what holds Collision back.
- Issue #25 is updated to match: a stitched tree is a shorter tree, a collapsed one leaves a void, and how a void
  is drawn is among its open questions. `docs/proposals/2026-11-23-the-first-pull.md` gains an amendment: a pull's
  depth is the tree's shortening and has a limit; a chasm is its own piece of work.

## Amendment 2 (2026-11-23): the followers of the void

The owner added a faction (Q3 of the interview): followers of the void, within the world, who seek to accelerate
the collapse and create the void, like the Abyss, with roots in Taoism.

- The lore book gains **"The followers of the void"** (the owner's two points), **"What they took from the
  Taoists"** (four passages of the *Tao Te Ching*, chapters 6, 11, 16 and 40, looked up this round) and **"Why it
  fits this world"** (the compiler's joins).
- The joins lean on what is already in the book: a place is where roads meet, as spokes meet in a hub (chapter 11
  and part VIII); the ways are roots and things "return to their root" (chapter 16); the first sign of a pull is a
  valley and "the valley spirit never dies" (chapter 6); the world is a Telling and the void is what was not said.
- Two joins go further than the owner did and are marked for the owner to overrule: that the followers have left
  their own teaching (the old book counsels stillness and not forcing; they accelerate), and that they may need the
  foreigner, since it is the player who completes stitches.
- "Not settled" gains five questions, the first a real one against the rest of the part: no character knows the
  world is a web, and a faction that seeks the collapse must know something.
- No name is invented for them, and nothing of them is put into the game.

## Amendment 3 (2026-11-23): a few characters know more; three questions left open on purpose

The owner read Amendment 2 and corrected one thing and set another (Q4 of the interview).

- **The correction.** The section said "No character knows this" of the web, since round 151 (issue #12). The
  owner: the book should not say that; the early characters and most characters do not know, and there are special
  characters with a deeper knowledge of the world, of whom the followers of the void are one. The book now says
  "Most characters do not know this" and "A few know more", and "How the game holds it" speaks of an ordinary
  character and names what the game already has of the other kind (the more knowing line from B1 on, round 155; the
  three revelations of issue #7). The question "What the followers know", which Amendment 2 had listed as a tension,
  is gone; how much they know stays open.
- **Left open on purpose.** The owner liked three of Amendment 2's questions as questions and wants them kept so:
  whether the followers were born here or came through; whether they want an end or a beginning, or both; whether
  the player is their enemy or their instrument. The owner added the choice behind the third: a player can oppose
  them, becoming their enemy, or join them, and then the question is whether they are only using the player as a
  tool. The book has them under a new heading, apart from "Not settled", with how they are to be held: raised in
  the narrative as things nobody knows, or left implicit for the observant player.
- "Not settled" keeps what is a matter of design and not of mystery: how much the followers know, how they
  accelerate the collapse, what they are called, how the player's choice is made in play, who else knows more.
- Not changed: `content/world/knowledge.yaml`, which tells every character the belief about the roads, and the
  prompts. A character who truly knows the web would need writing; none exists.

## Amendment 4 (2026-11-23): everything under the world is written

The owner's last addition of the day (Q5 of the interview): the graph and its world trees have to mesh with the idea
that reality itself is written, and they do so by being written on. On the trees, the roots and everything under
the world there is a countless myriad of words, and the player sees it on entering the place: a narrative element
of that moment.

- The lore book gains **"Everything down there is written"**, between "Under the world" and "What a pull does",
  with the owner's three points.
- Six joins under it are the compiler's, each to a line already in the book: "Nothing was made that was not first
  said" (part I); going down "into a text" is reading (part XI); part I's cave, where "the Forms are the words";
  only a foreigner notices the page (parts II and XI); the oldest tongues are nearest the root (parts II and VI);
  and a chasm as the place where the page is blank, which ties the writing to the void and to its followers.
- "Not settled" gains four questions: what language the words are in and whether the trees are made of them; how
  much the player can read (with a suggestion marked as not the owner's: the words they have learned); whether it
  is still being written; what a pull does to the words.
- Issue #25 is updated: the writing is part of the picture, of the look (a texture from far off, lines nearer,
  words at the foot of the tree), of the suggested approach (an atlas of the game's own text) and of the acceptance.

## Tests

None: no code or content the game loads is changed. `python3 tools/round_log_check.py 167`.

## Claim boundary

- What is said of Dark Souls rests on web searches of 2026-11-23 (fan wikis, guides and encyclopedic pages), not on
  the game played or on any statement by its makers.
- What is said of Taoism rests on web searches of the same day that returned several translations of four chapters
  of the *Tao Te Ching* and encyclopedic glosses of *wu wei*. Translations differ; no scholar of the text was read
  at length, and the Zhuangzi was not looked up.
- The joins are the compiler's, not the owner's.
- Nothing of the cave, the trees or the way down exists in the game.

## Outcome

Written and recorded in one sitting. The lore book has the two parts, the owner's clarification of them and the
followers of the void; issue #25 is open. On `main` on the owner's word ("push everything to me main").
