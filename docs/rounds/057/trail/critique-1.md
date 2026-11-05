# Codex critique 1: chip words highlighted inside the NPC line (a Claude subagent stood in for Codex)

- **Dispatched:** journal row 3
- **Returned:** 23:49:12 (notification; the subagent ran 130 s)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5), repo read access, read-only instructions. Codex was at its usage limit (reset 01:36 UTC 2026-11-06)
- **Prompt:** adversarial review of `plan-v1.md` against `language-engine.js`, `learning-service.js` (canonicalizeNarration, serializeEncounter), `BilingualText.js`, `wordClass.js`, `ui.js`, `theme.test.js` and the mobile tests, and older saves; numbered Error/Risk/Gap items, then Optional
- **Reviewed input:** `plan-v1.md`, sha256 a62d2301…, HEAD ad02200, working tree docs/rounds/057/ only
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — Searching from a cursor can highlight an occurrence the server rejected.** `canonicalizeNarration` (server/src/learning-service.js:270-273) drops later matches of an id it has already seen. The spans of those dropped matches stay marked as used in `matchCanonicalVocabulary` (language-engine.js:80-92), but the app never learns where they were. The content triggers this today, because `caffè` and `caffè nero` are separate entries (content/languages/it/vocabulary/gerald_coffee.yaml:39,86). Take "Un caffè nero? Sì, caffè nero, non un caffè.": the server sends `[caffè nero@3, caffè@38]`. After the first match the cursor is at 13, so a search for `caffè` lands on the `caffè` inside the second "caffè nero". That occurrence passes the boundary check, so the noun colour goes on part of a phrase the server matched as `caffè nero`. **Fix:** serialize `start`/`end` per word, which is a two-field addition at learning-service.js:274 and :307. Use the offsets when they are present and `native.slice(start,end) === target`. Fall back to the search only for old saves.

2. **Error — The boundary check splits decomposed accents.** Since round 052 an excerpt ends on a whole cluster (language-engine.js:67-72). The app's check is still "no letter or digit on either side", and a combining mark (`\p{M}`) is neither. In an NFD line `è … e`, a search for the excerpt `e` stops at the base `e` of `è`: it is followed by U+0300, which is not a letter, so it is accepted. The underline then cuts a grapheme and the wrong word is highlighted. **Fix:** use the server's class `[\p{L}\p{M}\p{N}_]` with the `u` flag, and test it with an NFD fixture.

3. **Risk — `\p{…}` with the `u` flag is untested on Hermes.** No app code under mobile/src uses property escapes yet, and jest runs on Node, so a Hermes gap would not show up in tests. **Fix:** confirm Hermes support for RN 0.88 (the iOS export builds but does not execute the regex). Otherwise list it as a Simulator check for the owner.

4. **Gap — The test fixtures never exercise a real excerpt.** encounter-words.test.js:11 and word-class.test.js:26 set `target: canonicalTarget`. In learning-flow.test.js:17,19 the line says "Senza latte" while `target` is "senza latte", so a case-sensitive search silently skips it. Nothing tests an inflected excerpt (`buona` with the chip `buono`), a capital letter at the start of the sentence, a typographic apostrophe (`l’etto`), a no-break space inside `senza latte`, adjacent excerpts (`caffè,`), the case in item 1, or NFD text. **Fix:** add those cases. Also add one contract test that runs `matchCanonicalVocabulary` → `canonicalizeNarration`'s output → `segmentLine` on the same strings, so the two sides cannot drift apart.

5. **Risk — Verbs are told apart by hue alone in the line.** Round 056 made verb chips dashed because red and green differ only in hue (ui.js:23-30, critique 1.3). The plan underlines every class the same way, so the verb/adjective distinction in the line is red against green only. **Fix:** set `textDecorationStyle: 'dashed'` for verbs, which iOS supports, and derive the underline style from `wordClassStyle` so line and chips cannot diverge.

6. **Risk — Uncoloured underlines and first-only highlights mislead.** Six classes (adverbs, numerals, phrases such as `senza latte`, which is `prepositional_phrase`) all get the same ink underline. The chips show `canonicalTarget` (BilingualText.js:21), so the player cannot tell which ink-underlined span belongs to which chip. Also, because only the first occurrence is highlighted, a repeated `caffè` shows once marked and once plain, which suggests two different words. **Fix:** at least state both limitations as decisions. Better: have the server send every matched span per id (item 1's change), not just the first.

7. **Gap — The theme test rule is misread.** The plan checks only for literal colours. A new StyleSheet entry such as `mark: { color: …, textDecorationLine: 'underline' }` with no `fontSize` fails the "unsized style" test (theme.test.js:30-34) unless it is added to `MODIFIERS`. **Fix:** put the colour in `wordClassStyle` (computed, so it is not matched), or add `BilingualText.js:&lt;name&gt;` to `MODIFIERS` with a comment.

8. **Gap — Older saves.** `target` has been the excerpt since round 003. But before round 052 (commit a1fbd5e) the excerpt was sliced with folded offsets, so in NFD lines an old save's `target` can be a shifted fragment of the line. It is usually rejected by the boundary check, but not always. Saves from before round 054 simply lack excerpts with typographic apostrophes. **Fix:** with item 1, use offsets only when the slice matches. Add a test with a target that is not a slice of the line.

9. **Risk — Ambiguous queries in tests.** Nested `&lt;Text&gt;` spans become host Text nodes. In the fixtures the chip label and the excerpt are equal, so `getByText('caffè')` would now find several elements. **Fix:** in the new tests, query the line with `within(line)` or use role and label queries.

## Optional
- The line `&lt;Text&gt;` (BilingualText.js:12) has no `accessibilityLanguage={language?.tag}` the way Spellbook.js:77 does, so VoiceOver reads Italian with an English voice. It would cost one prop while this file is open.
- Set `textDecorationColor` explicitly for coloured spans too. Don't rely on the colour being inherited.
- If folding ever conflates `e`/`è`, the server's accent folding could attribute `è` to a conjunction entry. There is no such pair in the content today, but highlighting would make it visible as a teaching error. A content lint for surface forms that collide after folding would catch it.
- Test that a line with only unmatched words renders as one plain string, with no nested spans.
```
