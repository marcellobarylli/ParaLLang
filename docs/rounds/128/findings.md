# Round 128 findings

## Question
The owner asked to get rid of the gen-Z speak ("mid" and the like) and to make the humour Pratchett style. Is the
slang gone from what the model is told, and does the prompt now ask for that manner?

## Finding
Yes for everything the model is told and every authored English line. What the model writes in answer has not been
seen: the session cannot call it.

## Method
The tone reaches the model through `content/narration/style_guide.yaml`, which is filled into every narration
prompt, and through each character's quirks. Both were rewritten. A new test (`server/test/tone.test.js`) scans the
style guide, the seven character sheets and the encounters' English in both packs against a list of internet
register and meme formats.

## Results
- **Style guide.** Before: Pratchett's structure "with a contemporary meme-culture texture", characters who "talk
  like the internet", and footnotes in meme formats. Now: "in the manner of Terry Pratchett: dry wit and
  understatement, satire of the mundane, trades, guilds and paperwork taken more seriously than magic, the absurd
  treated as perfectly ordinary", with the rule "No internet slang, meme formats or references to the present day,
  from the characters or the narrator". The manner only: the prompt says never his words or his characters.
- **Characters.**

  | Character | Before | Now |
  |---|---|---|
  | Gerald | rates translations like a food critic ("mid", "no notes") | delivers a verdict like a wine taster addressing a court: adequate; a brave attempt; I have had worse, though not recently |
  | Mortimer | rates meat like an influencer: ham-adjacent, a ham-tier vibe | grades meat like a guild examiner: Certified Ham, Ham by Association, Ham in Spirit |
  | Flick | talks like an endless feed: this is so random | talks like a street hawker who never reaches the goods, and announces how long you paid attention |
  | Marginalia | talks like a reader online: no spoilers, tl;dr | talks like a librarian of long standing, and marks your reading as a schoolmistress would |

  Portia, Bambieshart and Errata had no internet slang and are unchanged.
- **Authored line.** Mortimer's tasting ends "Certified Ham, First Class" (it said "certified ham-tier"), in both
  packs.
- **Kept.** Footnotes, as a dry aside. Memes as lore: life forms in a language, infohazards, and the Fountain file's
  class "Brainrot (mild)".
- **Documents.** `parallang_obsidian/GAME MECHANICS.md` and the combined note carry the owner's decision with its
  date; the earlier bullets are left as the earlier idea. `docs/lore-book.md` lost "a whole vibe", the one-syllable
  verdict and "slang".
- **Tests.** Server 442 passing (438 before). Gerald's pinned prompts are a new fixture, `gerald-prompts-r128.json`.
- **A flaky test.** CI failed once on the round 127 merge in `target-language-guard.test.js` ("the start made no
  call", 3 calls for 2). It is the race round 126 fixed in `greeting-prefetch.test.js`: the entrance's 20 ms dwell
  ended before the test's move. Fixed the same way; 15 runs in a row pass.

## Decision
Kept and deployed. The wording of the new tone and of the four quirks is Claude's.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- The prompt as the model gets it: `server/test/fixtures/gerald-prompts-r128.json`.
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
No live line was produced. A model told "in the manner of Terry Pratchett" may still reach for a modern phrase now
and then; nothing checks its output for slang. Lines already saved in a conversation keep their old wording, though
the deploy wipes the free plan's saves anyway. The word list in the test is a list: slang not on it would pass. No
Codex critique was made.

## Open items
- **Owner:** play a few conversations after the deploy and say whether the voice is right, Gerald's and Flick's
  first.
- **Owner:** "Brainrot" is itself a word of that register. It is the lore's name for the Lethargers' mild
  infohazard, so it was left. Say if it should be renamed.
- The mobile app's test fixtures still hold a "POV:" footnote as sample text; no player sees it.
