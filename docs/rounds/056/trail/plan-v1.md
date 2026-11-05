# Round 056 plan v1: word chips coloured by part of speech

Backlog C6 (new), from the owner's note `parallang_obsidian/GAME MECHANICS.md` (Main Gameplay Loop, Option A):
"each sentence / word will be highlighted (words colored R/G/B for noun/verb/adjective)". Today every chip under
an NPC line (`mobile/src/components/BilingualText.js`) looks the same; the part of speech is shown only after the
meaning is revealed ("coffee (noun)"). App only; no server change (the server already sends `partOfSpeech` on every
word, revealed or not); no live LLM calls. The web client is frozen: unchanged.

## Design

1. `wordClass(partOfSpeech)` in `mobile/src/wordClass.js`: `noun`, `noun_phrase` → `noun`; `verb`, `verb_phrase` →
   `verb`; `adjective` → `adjective`; anything else (adverb, interjection, numeral, phrase, pronoun, question, …) →
   null (the chip keeps today's look). Content counts (both packs): noun 43 + 3, verb 13 + 6, adjective 14, the other
   82 entries uncoloured.
2. Palette tokens in `ui.js`: `wordNoun` (blue), `wordVerb` (red), `wordAdjective` (green), each at least 4.5:1 on
   `surface` and `background` (added to the theme test's contrast list), and distinct from `danger`/`success` so a
   verb never reads as an error.
3. The chip: a 2-point border in the class colour, and a short label inside after the word ("noun", "verb", "adj."),
   caption size, same colour, so colour is never the only cue (WCAG 1.4.1). Uncoloured chips unchanged.
4. Accessible name: "Translate word: caffè, noun" for a coloured chip; unchanged otherwise. The 🔊 (round 055) is
   untouched.
5. Giving the part of speech before a reveal is intended (the owner's note); it does not give the meaning, and
   costs no hint. Recorded as an autonomous decision.

## Tests (mobile jest)

- `wordClass` for every part of speech in both packs (read from the YAMLs), and unknown → null.
- A line with a noun, a verb, an adjective and an adverb: three chips carry their label and name, the adverb chip
  has neither; border colours are the tokens.
- Contrast of the three tokens on surface and background ≥ 4.5 (theme test list).
- Existing tests updated for the new names (learning-flow, encounter-words).

## Open items (owner)

Simulator: the colours and labels on chips, wrap, VoiceOver; whether R/G/B is the palette the note meant; whether
other parts of speech (adverbs, phrases) should get colours.

## Success

All mobile, server and client tests pass; expo-doctor and the iOS export as in round 055.
