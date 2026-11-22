# Round 158 architecture

**Conversational round, recorded with the build.** The sixth of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #4, "Untranslatable Italian lore text in narration + Obsidian vault content" (step
  8 of the build order); [`docs/lore-book.md`](../../lore-book.md), "What the book does not say";
  [round 156](../156/architecture.md) (segments) and [round 157](../157/architecture.md) (the guidebook).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/it/lore/truths.yaml`, `content/languages/es/lore/truths.yaml`,
  `content/narration/passages.yaml`, `content/narration/guidebook.yaml`, `server/src/narration.js` (`toSegments`,
  `truthIds`), `server/src/content-loader.js`, `server/src/learning-service.js` (`guideFragments`),
  `server/src/road/service.js`, `client/src/components/Narration.jsx`, `Guidebook.jsx`, `client/src/index.css`,
  `parallang_obsidian/Understood Later.md`, `client/scripts/turmeric-check.mjs`, `docs/rounds/158/shots/`.

## Goal

Deep truths about the world exist only as text in the language being learned, which the game cannot translate. The
player gets them only by learning the language.

## Design

**The texts are the pack's.** `content/languages/<code>/lore/truths.yaml` holds each text as `{ id, level, text }`.
The schema is strict and has no field for a translation, so the server cannot send one: it does not hold one. Both
packs have the same ten texts, in Italian and in Spanish. The first is the owner's, from the issue: *Torna indietro!
Oltre giace la scia di un punto.*

**Deeper truths in harder language.** The texts state, bit by bit, what the lore book's last part says and no
character knows. `level` is the stage at which a learner can read the sentence:

| Level | The texts |
|---|---|
| A1 | three plain statements of three or four words (the road, a thread, a knot) |
| A2 | the owner's line; the player's own part in it; what they have been walking on |
| B1 | how the roads came to be (in the remote past tense); what the web is joined to; roots and roads; and, with an imperfect subjunctive, what happens if every thread is pulled tight |

What each one says is in the vault, not here: this record is in the repository the game is built from, and the
meanings are spoilers.

**They sit inside narration.** A written passage sets a text with `{truth:<id>}`. Eleven new passages lead up to
one each, in the manner of a message somebody left where only a traveller would see it (cut in a tree, scratched on
a stone in a ford, in charcoal on a cairn, carved along a ferry's rail), and end on a colon and the text. They say
nothing of what it means. Ta Prohm's library, whose passage already had "a line of script" on a lintel, now shows
the line.

**When they are told.** Each such passage of the road is told once. Two things pace them:

- `min_step`, new on a passage: the fewest conversations finished on the road before it can be told (2 for the
  forest's edge, 3 to 5 for the other plain ones), so that the first arrivals are not all messages.
- `cefr`, a new fact of an arrival: the stage of the curriculum the learner is in. The A2 and B1 passages ask for
  their stage, so a harder text waits until the learner could begin to read it.

**On the wire and on the screen.** `toSegments` turns a passage into plain segments and, for each text, `{ text,
kind: 'truth', lang }`. Nothing else: no id, no meaning, no gloss. The client's `Narration` (round 156) gives the
span the class `narration-truth`: turmeric (`#e8a317`), upright inside the narrator's italic, with `lang` set and
`translate="no"`. It is text. There is no button in it, the Spellbook's word matcher never sees it, and no route
takes a hint for it.

**The guidebook.**
- The entry the owner wrote in issue #5, **Turmeric text**, is entered with the first such passage told (a new
  event, `truth_shown`).
- The guidebook keeps the passages met that hold a text ("Turmeric text you have found"), oldest first, so that one
  met at A1 can be read again at B1. They come from the save's `told` (round 156); a dungeon's site passage is now
  marked as told when the player walks or talks there.

**The vault.** `parallang_obsidian/Understood Later.md` is the section for content understood only later: how the
mechanism works, every text in both languages with what it says and where it is found, and what they add up to. It
is linked from `LORE.md`. Nothing in the game reads the vault.

**A pack without texts** (no `truths.yaml`) plays without the passages that hold one. A pack with the file must
have every text a passage names, or it does not load.

## Also changed

A card of a place could grow taller than a phone's screen once it held the narrator's passage, a guidebook entry and
a long description, and its top went under the top bar. A card is now at most the screen's height under the bar and
scrolls inside. The note of new guidebook entries tells only the entries entered last and counts older unread ones.

## Tests

- `server/test/untranslatable.test.js` (8 tests): the two packs' texts; no English of them in anything the server
  loads, and all of them in the vault; the wire shape; every holding passage; the waits; a walk on the road to the
  first text, the guidebook's entry and its kept passage; the library's lintel; the loader's rules.
- `client/src/components/__tests__/guidebook.test.jsx`: the kept texts in the panel; the shorter note.
- `client/scripts/turmeric-check.mjs` in headless Chromium at a phone's size: the colour, the lack of anything to
  tap, the card's place under the top bar, the guidebook.

## Claim boundary

**The Italian and the Spanish are Claude's and have been read by no speaker.** They are short, and they are the
whole content of this issue. Seen in headless Chromium, not on a phone. The narration a model writes does not carry
these texts: only written passages do.

## Outcome

See [`findings.md`](findings.md).
