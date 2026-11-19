# Round 130 findings

## Question
The owner asked whether the narration follows the rule that a share of the words is Italian, and proposed that it
should, with a tap on a word to translate it. Does it now?

## Finding
It did not: the prompt said "Narrative text is always English" and the share applied to the character's line only.
It is now asked for, and a listed word can be tapped. Whether the model writes such narration well is not known:
the tests script its replies.

## Method
The narration rule in `prompts/system/base.txt` was rewritten and given a share and a count. The reply schema
gained `narrative_words`. `keptNarrativeWords` in the server filters the list; `NarrativeText` in the web client
draws the words. Server tests script narrations and lists; `client/scripts/narrative-check.mjs` taps the words in
headless Chromium.

## Results
- **The share.** Half of the character's line at that moment, at most 30%. A line at 25% gives a narration at about
  13%: about 5 words in 40. It rises as the line does, through a conversation and with the player's level.
- **What is asked of the model.** Single common words or short phrases, standing where the English word would and
  plain from the sentence; never whole sentences; never a word the objectives ask the player to say; every one
  listed with its meaning in that sentence.
- **What the server keeps.** A listed word that stands in the narration at word boundaries, up to 40 characters,
  with a meaning up to 80, once, 12 at most. A word that is a form of a target of any objective of the conversation
  is left off the list: it shows in the text and cannot be tapped, so a tap never gives an answer's meaning.
- **On the screen.** The words are gold with a dotted line under them. A tap puts the meaning after the word in
  brackets; another tap takes it away ([before](shots/01-narration.jpg), [tapped](shots/02-tapped.jpg)). It costs
  no hint and no heart.
- **Unchanged.** The footnote stays English. The words of the character's line keep their own buttons and hint
  cost. The iPhone app ignores the new field.
- **Tests.** Server 459 passing (453 before), client 197 (194 before). Real browser: 5 checks, 0 problems.

## Decision
Kept and deployed. The share, the limits and the look are Claude's first choice.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/`](shots/).
- The prompt as the model gets it: `server/test/fixtures/gerald-prompts-r130.json`.
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
No reply from the model was seen. It may ignore the share, drop in words a beginner cannot guess, forget to list
one (it then shows without a tap), or use an answer word despite the rule (it shows, untappable). Nothing counts
the share of what it writes. The reply is longer, so a turn takes the model a little longer. The iPhone app's
narrator reads the narration with an English voice and will mispronounce the Italian words. The mobile suite and
the full playthrough were not run. No Codex critique was made.

## Open items
- **Owner:** read a few narrations after the deploy: are there Italian words, about the right number, guessable,
  tappable?
- The share is `NARRATIVE_SHARE` in `server/src/llm/prompt-builder.js` (`ofLine` 0.5, `max` 0.3).
- Tapped narration words are not kept in the Spellbook. Keeping them, as paid sentence reveals are kept (round
  060), would be a small addition.
