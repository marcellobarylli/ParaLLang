# Round 169 architecture

**Conversational round, recorded with the writing.** Opened on 2026-11-23 by the owner's message after the deploy of
round 168; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is
frozen. A round of lore: no code and no content the game loads is changed.

- **Design source:** the owner's message (no GitHub issue); [round 167](../167/architecture.md) (the followers of
  the void), [round 168](../168/architecture.md) (the religion); [`docs/lore-book.md`](../../lore-book.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `docs/lore-book.md` ("Whether the followers are right").

## Goal

The owner sets the moral centre of the story. It is not clear whether the followers of the void are good or bad.
They believe the void is the birthplace of everything, so that collapsing regions creates new worlds and new life.
Nobody knows whether that is true; perhaps there are signs. The player chooses to foster it or prevent it. As in
Dark Souls, the early encounters lead the player to believe the collapse must be prevented, and only later do its
proponents speak.

## Design

**A new part, "Whether the followers are right"**, in "What the book does not say", after the followers and before
the religion, with the owner's six points: not clearly good or bad; what they believe; nobody knows, though there
may be signs; the player chooses; the order of the telling; nobody who tells the player anything is neutral.

**The model is given as its shape, in the owner's words, and its particulars as players' accounts.** The owner:
the player is told at the start that the Age of Fire must be kept and that the followers of the dark are evil, by
characters who believe it; later it is no longer clear that extending the fire was natural. Looked up this round:
the two serpents (one gives the quest to link the fire; the other, met later in the Abyss, wants an Age of Dark and
says the old king resisted nature), the two endings, and that players disagree about whom to trust.

**Three earlier statements are changed because of it.**

- The join of round 167 that called the followers "a sect" that has "left its own teaching" gave only the case
  against them. It is now two joins: their book read against them, and read for them (being born of non-being,
  chapter 40; the valley spirit as the mysterious female whose gate is the root of heaven and earth, chapter 6).
- "Left open on purpose" had "whether they want an end or a beginning". The owner has now said what they want and
  believe: a beginning. What is open is whether they are right, and whether they are good or bad.
- "Not settled" had, as a tension, that the player's own progress brings the chasms while part VI calls translating
  the work that holds Collision back. It is no longer a tension. It is the design: an early telling and a later one.

**Four joins, marked as the compiler's:** the lore book's own part VI is one of the early voices, and its compiler
is not neutral; the religion is another; the pale mushrooms and their spores (part VI) are a sign already in the
book; and the player has been doing the followers' work from the first conversation.

**"How the game holds the stitch"** says what is true of the game today: neither case is put in it yet.

**"Not settled" gains three design questions:** what the signs are; when the proponents first speak; what fostering
and preventing are in play, and how each ends.

## Tests

None: no code or content the game loads is changed. `python3 tools/round_log_check.py 169`.

## Claim boundary

- What is said of Dark Souls beyond the owner's own words rests on a web search of 2026-11-23 (fan wikis and gaming
  outlets), and is written as players' accounts.
- The joins are the compiler's.
- Nothing of it is built: no follower, no proponent, no sign in the void, no choice.

## Outcome

Written and recorded in one sitting. On the session branch and `main` on the owner's word ("add this and push"),
docs only.
