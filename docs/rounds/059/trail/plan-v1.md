# Round 059 plan v1: word class on Spellbook cards and in reviews

Backlog: next candidate named in docs/autonomy/STATE.md ("the word class (`wordClass`, round 056) on Spellbook cards
and in reviews"). App-first, no live LLM calls (Codex at its usage limit). The web client stays frozen.

## Goal

Round 056 coloured the word chips under NPC lines by class (noun, verb, adjective; the owner's note "R/G/B for
noun/verb/adjective"). The same word shows elsewhere without that cue: the Spellbook card prints the raw
`part_of_speech` in muted text, and the review screen shows no class at all. Make the class read the same way in
all three places.

## Design

1. **Spellbook card.** The card's class line ("noun · Mastery: discovered") shows the class word in the class
   colour (weight 600) for coloured classes, with the same short label as the chip ("noun", "verb", "adj.") replaced
   by the full name ("noun", "verb", "adjective") since there is room. Uncoloured classes keep today's muted text
   ("adverb", "prepositional phrase"). The card border takes `wordClassStyle(cls).chip` (2-point, class colour,
   dashed for verbs) so the class is visible at a glance down the list; uncoloured cards keep `colors.border` at
   1 point (today's look). The card's accessible name gains the class: "Card caffè, noun".
   The card's state rules (round 017: meanings hidden during encounters and on due cards) are unchanged; the class
   was already shown in every state.
2. **Review prompt.** The server adds `partOfSpeech` to the review challenge (`createReviewChallenge` response,
   additive). The review screen shows, under the target word, a class tag in the class colour (coloured classes)
   or muted text (others), e.g. "noun". It is a hint of the same size the Spellbook already gives on a due card.
   An older server sends no `partOfSpeech`: no tag.
3. **Review feedback.** No change.
4. A helper `wordClassText(partOfSpeech)` in `mobile/src/wordClass.js` returns `{ cls, text }` (text: the full name
   for a coloured class, else the part of speech with underscores as spaces; null for a missing value), used by the
   Spellbook, the review and the chip's meaning note in BilingualText (which already does the underscore replace).

## Tests

- Spellbook: a noun card, a verb card and an adverb card; class text colours (`wordNoun`, `wordVerb`, muted),
  border colour, width and dashed verb border; accessible names "Card salame, noun", "Card molto, adverb".
- Review: a challenge with `partOfSpeech: 'verb'` shows "verb" in `wordVerb`; without it, no tag.
- Server: the review challenge carries `partOfSpeech` (existing review test extended).
- `wordClassText` unit cases (noun_phrase → noun, prepositional_phrase → "prepositional phrase", undefined → null).
- All mobile, server and client tests pass; expo-doctor; iOS export.

## Live

None (no gameplay or content change).
