# Round 151 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message "Let's implement the
next issue that has no dependencies"; the owner's words and the issue's are in
[`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #12; [`docs/lore-book.md`](../../lore-book.md) as it stood (ten parts);
  [round 144](../144/architecture.md) (the road's graph).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `docs/lore-book.md`.

## Goal

The lore book holds the fact that the world's graph is a web: the roads are threads, the web is stitched to other
worlds, and no character knows it. It is the reference that issues #3, #4, #6 and #7 wait for.

## Design

The book is written by a compiler who lives in the world and records what is said. Nobody in the world knows this
fact, so the compiler cannot record it. It is therefore added in two places.

1. **Part VIII, "The roads", in the compiler's voice.** What everybody believes (the roads were built long ago) and
   what anybody can see. It is the only matter in the book on which nobody says "some say". This is what a character
   may talk about (issue #3: characters know only what they can observe).
2. **"What the book does not say", outside the compiler's voice,** between the last part and the sources. It has four
   blocks:
   - the owner's three statements from the issue;
   - how the game holds them: characters speak of what can be seen, the narrator hints, a hint uses a sewing word
     where a road word is expected, and the plain statement belongs to untranslatable text;
   - what follows from parts III and VI;
   - what is not settled.

The old parts VIII to X (The Ring, The story so far, Stories all the way down) are now IX to XI. The sources table's
part numbers follow.

**What can be seen** is taken from the game where the game has it, so that a character's remark and the map agree:

| In part VIII | In the game |
|---|---|
| No road ends; the ford, the pass, the ferry | `server/src/road/graph.js`: every site keeps a forced way on |
| No two roads cross | `graph.js`: at most one diagonal in a square of four cells |
| The guild's assessor with a form and a pencil | `server/src/road/characters.js`: "Guild Assessor, Roads and Tongues" |
| The man whose road moves at night | `characters.js`: one of the quirks |
| A road carries a traveller who stops choosing | the road's travel on rails ([round 144](../144/architecture.md)) |

New in this round: nobody mends the roads, and a few roads go further than the land does.

**Not in this round.** Nothing in the game reads the lore book, and this round changes no code, prompt or content.
The lore reaches the prompts in issue #3 (characters) and issue #6 (the narrator). The copy of the owner's vault in
`parallang_obsidian/` is unchanged.

## Tests

`python3 tools/round_log_check.py 151`. No test covers the lore book.

## Claim boundary

A text, read by Claude alone. The owner has not read it. No model has been given it.

## Outcome

See [`findings.md`](findings.md).
