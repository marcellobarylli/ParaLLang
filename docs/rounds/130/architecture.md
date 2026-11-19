# Round 130 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's remark on a narration, in
a Claude Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the
commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later.
The full record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 026's [architecture](../026/architecture.md) (the language mix of a dialogue line), round
  081's (the footnote, an optional field the server keeps or drops), round 017's (meanings hidden in a conversation).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `prompts/system/base.txt`, `content/narration/style_guide.yaml`, `server/src/llm/`,
  `server/src/learning-service.js`, `client/src/components/`.

## Goal (pre-run)

The narration carries a share of target-language words, and the player can tap one to see what it means.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0):

- The owner asked whether the narration follows the rule that a share of the words is Italian. It does not: the
  prompt says "Narrative text is always English", and the share applies to the character's line only.
- "I think it would be cool to have this, with the option of tapping the word to translate it."

Claude's decisions:

- **Decision 1: the narration stays English prose with words dropped in.** Whole Italian sentences would turn the
  narration into a second line to translate. Single common words and short phrases, used where the English word
  would stand and guessable from the sentence, keep it readable and teach by context.
- **Decision 2: half the line's share.** The narration's share is half of the character's line at that moment (a
  line at 25% gives a narration at about 12%), and never over 30%. It rises with the line as the conversation and
  the player's level go on.
- **Decision 3: the model lists what it used.** Narration words are free prose, not pack vocabulary, so the server
  cannot know their meanings. The reply carries `narrative_words`: each target-language word or phrase of the
  narration with its English meaning in that sentence.
- **Decision 4: a tap is free.** It costs no hint and no heart: the narration is not graded.
- **Decision 5: no free answers.** The model is told not to use a word that an open objective asks the player for.
  If one is listed anyway, the server leaves it out of the list, so the word shows in the narration and cannot be
  tapped for its meaning. This is the rule of round 017 for the Spellbook.
- **Decision 6: the footnote stays English.** Its rule of round 081 ("never a target-language word in it") is kept.

## Design (pre-run)

- **Prompt.** "Narrative text is always English" becomes: English sentences with a few target-language words
  dropped in, about the stated share (with the count for a 40-word narration beside it), each a single common word
  or short phrase standing where its English word would, never a word an open objective asks for; and every one
  listed in `narrative_words` with its meaning. The style guide's rule and the schema's description say the same.
- **Schema.** `narrative_words`: an optional list of `{ word, meaning }`.
- **Server.** A listed word is kept when it is short (40 characters), has a meaning (80 characters), stands in the
  narration as written at word boundaries, is not a second entry for the same word, and is not a form of a target
  of any of the conversation's objectives. At most 12. The kept list is stored with the line and sent as
  `narrativeWords`.
- **Client.** The narration is drawn with each listed word as a button in the text, dotted under. A tap shows its
  meaning after it, in brackets; another tap hides it. The iPhone app ignores the field.

## Claim boundary (pre-run)

The session cannot call the model. Tests prove the prompt, the keeping and dropping of listed words, and the
tapping, with scripted replies. Whether the model drops Italian words into the narration at about the share, picks
guessable ones, lists them faithfully and keeps the answers out is seen only in the owner's play. A longer reply
takes the model a little longer to write.

## Tests (pre-run)

- **Prompt:** the narration rule with its share and count, at two ratios; the old "always English" line is gone;
  Gerald's pinned prompts are regenerated.
- **Server:** listed words are kept, stored and sent; dropped when absent from the narration, inside a longer word,
  too long, without a meaning, repeated, over the limit, or a form of an objective's target; a reply without the
  field is as before.
- **Client:** the listed words are buttons inside the narration; a tap shows the meaning and a second hides it; a
  narration without the list is plain text; a word listed twice in the text is a button each time.
- All server and client suites and the build keep passing.
