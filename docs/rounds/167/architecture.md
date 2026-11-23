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

## Tests

None: no code or content the game loads is changed. `python3 tools/round_log_check.py 167`.

## Claim boundary

- What is said of Dark Souls rests on web searches of 2026-11-23 (fan wikis, guides and encyclopedic pages), not on
  the game played or on any statement by its makers.
- The joins are the compiler's, not the owner's.
- Nothing of the cave, the trees or the way down exists in the game.

## Outcome

Written and recorded in one sitting. The lore book has the two parts; issue #25 is open.
