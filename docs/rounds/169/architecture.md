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

## Amendment (2026-11-23): the creation cycle

The owner's next message (Q2 of the interview) ties the part above to the book's oldest idea: every time a world
collapses a new world is born; that is a story within a story being created; it is the natural creation cycle; and
the model is the painted world of Dark Souls.

- The lore book gains **"The creation cycle"** after "Whether the followers are right", with those points. The
  painted world is from the owner's own notes; that a rotting painted world is burned so that a new one can be
  painted was looked up this round and is given as players' accounts.
- **One thing is recorded and not smoothed over.** A message earlier the owner said nobody knows whether the
  followers' belief is true; this message states the cycle. The book reads them together (this is how the parts fit
  for whoever writes, and what the followers would say; the game still does not say it) and lists, under "Not
  settled", whether the cycle is the truth of the world or the followers' doctrine. It also notes that a true cycle
  would not settle whether the followers are good: the birth costs two places and everyone in them.
- Five joins are the compiler's, each to a line already in the book or the notes: the new world is *down* (part
  XI); this world may have begun in somebody's chasm ("It hung in the nothing", part I; stories all the way up); the
  spores as the mechanism (part VI; the notes); it comes round (part I); and, if the cycle is natural, holding the
  worlds apart is the fire that was kept.
- "Not settled" gains three questions: the one above; what the trees are in the cycle; whether the player can go
  down into a new world.

## Amendment 2 (2026-11-23): what the cycle makes of this world

The owner drew the consequence (Q3 of the interview) and asked what is still to be ironed out: if every collapse
bears a world, this world was created by an earlier collision of languages; then why are there two parallel language
worlds now, how did this world come out of that as a story within a story, is a new language a mixing of the two
before it, and do we exist only because that condition exists?

- The lore book gains **"What the cycle makes of this world"**: the owner's four questions as questions, then a
  proposal marked as the compiler's and not taken by the owner.
- **The proposal.** Two motions make the cycle: a retelling makes two worlds from one (part II), a collision makes
  one from two. So this world was born as one, with a language mixed from its parents', and has branched since; the
  world of the language being learned is a relative; the new language passes through the "jumble of the two lost
  tongues" and the spores' dream (both already in part VI); the oldest inscriptions would be the parents' tongues;
  and yes, on this reading this world exists only because two collapsed.
- **A mirror in the game's own languages, looked up and offered as a mirror only:** the Romance languages are one
  language retold; English after 1066 is a meeting of a Germanic and a Romance tongue (not a creole, by most
  linguists); and mixed languages arise among people who speak both parents.
- "Not settled" gains the owner's questions and one more: what collided to make this world, and whether anything of
  it can be found.

## Tests

None: no code or content the game loads is changed. `python3 tools/round_log_check.py 169`.

## Claim boundary

- What is said of Dark Souls beyond the owner's own words rests on a web search of 2026-11-23 (fan wikis and gaming
  outlets), and is written as players' accounts.
- What is said of real languages rests on three web searches of the same day (Britannica for the Romance languages;
  encyclopedic and dictionary pages for English and for mixed languages). The share of English words from French is
  given as the range the sources give, and the classing of Michif is disputed among linguists.
- The joins are the compiler's.
- Nothing of it is built: no follower, no proponent, no sign in the void, no choice.

## Outcome

Written and recorded in one sitting. On the session branch and `main` on the owner's word ("add this and push"),
docs only.
