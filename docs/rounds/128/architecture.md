# Round 128 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's instruction in a Claude
Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit
that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 007's [architecture](../007/architecture.md) (the style guide in the prompt) and round
  081's (footnotes).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `content/narration/style_guide.yaml`, `content/characters/enemies/*.yaml`,
  `content/languages/*/encounters/mortimer_tasting.yaml`, `server/test/`, `parallang_obsidian/GAME MECHANICS.md`,
  `docs/lore-book.md`.

## Goal (pre-run)

The characters and the narrator stop using internet slang and meme formats. The humour is in Terry Pratchett's
manner throughout.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- "we have to get rid of the gen z speak "mid" etc. instead,please make the humour pratchett style" (Q0).

This reverses half of the owner's earlier tone note, "Terry Pratchett × meme culture" (round 007): Pratchett stays,
the meme texture goes.

Claude's decisions:

- **Decision 1: what "Pratchett style" means in the prompt.** Dry wit and understatement; footnotes; satire of the
  mundane; trades, guilds and paperwork taken more seriously than magic; the absurd treated as ordinary; characters
  who are funny because of who they are (pedantic, pompous, weary, literal-minded, cheerfully wrong) and not because
  of how they talk. The manner only: no quotations and no names from his books.
- **Decision 2: the rule is stated as what to do, with one short ban.** "No internet slang, meme formats or
  references to the present day." The prompt does not list the banned words, which would put them in front of the
  model.
- **Decision 3: footnotes stay.** They are Pratchett's own device. Only the meme formats leave their rule.
- **Decision 4: memes as lore stay.** In the lore a meme is a life form in a language and an infohazard is its
  predator. That is the world's biology, not a way of speaking. The class name "Brainrot (mild)" on the Fountain's
  containment file is the owner's lore term and is left for the owner to rename or keep.
- **Decision 5: the owner's notes get a dated decision, not a rewrite.** `GAME MECHANICS.md` keeps its text and
  gains a line recording the change.

## Design (pre-run)

- **Style guide.** `tone` and `narrator_voice` lose the meme texture and say Decision 1. The rule allowing internet
  register is replaced by Decision 2's. The footnote rule keeps its limits (length, frequency, no target-language
  word, no hint) and describes a dry aside. The "evergreen meme formats" rule goes.
- **Character sheets.** Four quirks say how a character talks in internet terms and are rewritten in kind:
  - Gerald rated translations "like a food critic ("mid", "no notes")". He now delivers verdicts like a wine taster
    addressing a court.
  - Mortimer rated meat "like an influencer". He now grades it like a guild examiner: Certified Ham, Ham by
    Association, Ham in Spirit.
  - Flick talked "like an endless feed". It now talks like a street hawker who never reaches the goods. Its nature
    (distraction, later, one more) is unchanged.
  - Marginalia talked "like a reader online". She now talks like a librarian of long standing.
- **Authored text.** Mortimer's tasting ends "certified ham-tier" in both packs; it becomes "Certified Ham, First
  Class".
- **Tests.** Gerald's pinned prompts are regenerated as a round 128 fixture. The assertions on the style guide ask
  for the new tone and for the absence of the old. A new test reads the style guide and every character sheet and
  fails on internet slang.
- **Documents.** The lore book's three slang lines are rewritten. The vault note gets its dated decision.

## Claim boundary (pre-run)

The round changes what the model is told. What the model then writes is not seen: the session has no subscription
token, so no live line is produced. Whether the lines are funny in the intended way is the owner's reading after
the deploy. The server deploy this needs wipes the saves on the free Render plan.

## Tests (pre-run)

- The prompt built for Gerald carries the new tone and none of the old wording, and matches the new fixture.
- No style-guide line and no character sheet holds internet slang (a word list in the test).
- All server suites keep passing; the client is unchanged.

## Outcome (2026-11-19)

Built as designed, as `83534c8`, and deployed with the server. The style guide asks for Terry Pratchett's manner and
bans internet slang, meme formats and references to the present day; the footnote rule describes a dry aside. Four
character quirks and one authored line are rewritten in kind. A new test reads the style guide, every character
sheet and the encounters' English for internet slang. The owner's note carries the dated decision, and the lore book
lost its three slang lines. The server's 442 tests pass. Also fixed: a second test with the prefetch race of round
126 (`target-language-guard.test.js`), which failed CI once on the round 127 merge. The claim boundary held: no line
from the live model was seen. See [`findings.md`](findings.md); the owner's words are in
[`trail/interview.md`](trail/interview.md).
