# Round 057 plan v1: the chip words highlighted inside the NPC line

Backlog C7 (new), from the owner's note `parallang_obsidian/GAME MECHANICS.md`: "The backbone of simpler, more crucial
stuff is colour coded (needs to be translated)" and Option A ("each sentence / word will be highlighted (words
colored R/G/B …)"). Round 056 coloured the chips under a line; the line itself (`dialogue.native` in
`mobile/src/components/BilingualText.js`) is still plain text, so the player has to find each chip's word in it.
App only; no server change; no live calls; the web client is frozen.

## Design

1. `segmentLine(native, words)` in `mobile/src/wordClass.js`: returns `[{ text, word|null }]` covering the line
   exactly once. Each `word.target` is the server's excerpt, an exact slice of `native`
   (`canonicalizeNarration`, `matchCanonicalVocabulary`), and `words` arrive in order of first occurrence. Search
   sequentially from a cursor, case-sensitively, accepting only an occurrence with no letter or digit on either
   side (so *dopo* is not found inside *dopodomani*). A word not found is skipped (no highlight, chip unchanged).
   Only the first occurrence of each word is highlighted (the server dedupes by id).
2. Rendering: the line stays one `<Text>` (one VoiceOver element, line wrapping unchanged); highlighted spans are
   nested `<Text>` with the class colour (round 056 tokens) and an underline (non-colour cue); uncoloured classes get
   the underline in `colors.ink`. Weight unchanged.
3. Nothing is revealed: the highlighted words are already chips under the line.

## Tests

- `segmentLine`: segments concatenate to the line; boundary check (dopo / dopodomani); a missing excerpt is
  skipped; case and accents exact; empty words → one plain segment; words out of order still terminate (a word whose
  excerpt lies before the cursor is skipped).
- Render: a line with a noun and an adverb shows nested spans with the noun colour and underline, the adverb's
  underline in ink; the full text is still readable by `getByText` on the line.
- Theme test passes (no literal colours).

## Success

All mobile, server and client tests pass; expo-doctor 20/20; iOS export builds.
