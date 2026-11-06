# Critique 1: word class on Spellbook cards and in reviews

- **Dispatched:** 2026-11-05 23:58:38 UTC
- **Returned:** 2026-11-06 00:00:10 UTC (approximate: the subagent ran 88 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id a80198da0e31dff63
- **Prompt:** adversarial review of `plan-v1.md` against the named files (wordClass.js, ui.js, Spellbook.js,
  ReviewPanel.js, BilingualText.js, learning-service.js, mobile and server tests), round 017's rules and the frozen
  web client; numbered findings typed Error / Risk / Gap with evidence and a recommendation, then Optional items.
- **Reviewed input:** `plan-v1.md`, sha256 de221856…, HEAD 0a217ef, working tree docs/rounds/059/ only
- **Findings:** 10

## Raw output (verbatim)

```text
The plan is mostly sound, but I'd change one design choice (item 1) and close several test gaps. I checked every claim against the code. No existing test asks for a card by its "Card ..." name, and nothing in the server or the clients checks the exact fields of the review challenge, so both changes are safe on that front.

1. **Risk: the server change isn't needed; the app already has the class when a review starts.** Evidence: `mobile/src/stores/gameStore.js:272` stores `result.spellbook` next to `reviewChallenge`, and every spellbook card already carries `partOfSpeech` (`server/src/learning-service.js:200`). Recommendation: in ReviewPanel, look up the class from `spellbook.cards.find(c => c.vocabularyId === challenge.vocabularyId)`, so an older server shows the tag too. If you keep the server field, prefer it, fall back to the card, and show no tag only when neither has it.

2. **Gap: the contrast test doesn't cover the review screen's background.** Evidence: the class colours are only tested on surface (`mobile/src/__tests__/theme.test.js:62`: `['wordNoun','surface']`…). The review screen has no surface, so its tag sits on `colors.background` (`ReviewPanel.js:24`). I computed the ratios on background: noun 6.30, verb 5.81, adjective 5.50, so they pass, but nothing tests them. Recommendation: add `['wordNoun','background']`, `['wordVerb','background']` and `['wordAdjective','background']` to `pairs`.

3. **Error: new style entries can fail the theme test.** Evidence: `theme.test.js:27-31` fails any style that sets `color` or `fontWeight` without `fontSize`, unless it is listed in `MODIFIERS`. A style like `classWord: { fontWeight: '600' }` in Spellbook would fail it. Recommendation: either pass the colour inline from `wordClassStyle(cls).label` and nest it in the sized `small` Text with a `MODIFIERS` entry for any new modifier, or give the review tag style its own `fontSize: type.*`. Say which in the plan.

4. **Risk: the card's new accessible name won't reach VoiceOver.** Evidence: `Spellbook.js:107` puts `aria-label` on a plain `View` that isn't marked accessible. iOS ignores labels on non-accessible containers. Making it accessible would group the card and hide the Pronounce and Review buttons inside it. Recommendation: don't present "Card caffè, noun" as an accessibility feature. The visible class text is what VoiceOver reads, and it is also the non-colour cue. Keep the label change only if it's wanted for tests, and say so.

5. **Risk: VoiceOver could read the class word with the Italian voice.** Evidence: the target word Text has `accessibilityLanguage={language?.tag}` (`ReviewPanel.js:25`, `Spellbook.js:108`). Recommendation: put the review tag in its own Text outside the heading and the `prompt` row, with no `accessibilityLanguage`. Test that the heading's name is still just the target word.

6. **Gap: the meaning-hiding states aren't tested with the new class line and border.** Evidence: the round 017 checks are at `spellbook.test.js:30-49`. The plan only lists class, colour and border cases. Recommendation: render an inEncounter card and a due card and check two things in each:
   - the class text and border still show;
   - meanings, notes and English examples stay hidden.
   Also check that ContainmentFile and Fragment cards, which share `styles.card`, keep a 1-point `colors.border` border.

7. **Gap: the BilingualText refactor isn't specified and has no regression test.** Evidence: `BilingualText.js:38` shows the class only for uncoloured classes (`cls ? null : …`) and calls `word.partOfSpeech.replaceAll` directly, so a word without `partOfSpeech` crashes it. Recommendation: say the helper keeps the "only for uncoloured classes" rule and renders nothing when it returns null. Keep or extend the word-class test that checks the " (adverb)" note (`word-class.test.js:~60`), and add a case with no `partOfSpeech`.

8. **Risk: the class tag on a due review is a small new hint.** Evidence: today the review prompt shows no class (`ReviewPanel.js:23-27`). The plan says this matches the due Spellbook card, which is true (`Spellbook.js:115`), but it's a new cue on the recall prompt. It narrows the answer (a "verb" tag points to "to …"). Recommendation: record this as a decision in `docs/autonomy/decisions.md` (autonomous, pending owner review), with the round 017 reasoning that the class is not the meaning.

9. **Gap: the server test target is vague.** Evidence: "existing review test extended" names no test. The obvious one is `server/test/learning-flow.test.js:155-172`, which already asserts no `acceptedAnswers` or `answer`. Recommendation: if you keep the server field, assert `challenge.partOfSpeech === 'noun'` there and add a Spanish-pack case (`server/test/language-packs.test.js:129`). Also note that the frozen web client ignores the extra field: `client/src/components/ReviewPanel.jsx` has no schema check.

10. **Error (wording): design point 1 contradicts itself.** It says the card shows "the same short label as the chip ('noun', 'verb', 'adj.') replaced by the full name". The text is ambiguous, and `WORD_CLASS_NAME` already exists in `wordClass.js:11`. Recommendation: say the card and the review use `WORD_CLASS_NAME` and the chip keeps `WORD_CLASS_LABEL`. Build `wordClassText` on those maps rather than adding a third name table.

Optional:
- Coloured cards get a 2-point border and uncoloured ones keep 1 point, so the contents shift by 1 point between cards. Consider 2 points in `colors.border` for uncoloured cards, or keep 1 point for all and colour only the class text.
- A list where every card has a red, blue or green border may look busy. The coloured class word alone may be enough; consider making the border a follow-up for the owner to judge on the Simulator.
- Add a practice (not due) review case to the review tag test, and one for a drill-issued challenge.
- `wordClassText` unit cases: also cover `verb_phrase` → "verb", `adjective` → "adjective", and an empty string.
- Open items for the owner (they need the Simulator): how the dashed verb border looks with the 12-point corner radius, and how the tag and card text wrap at the largest Dynamic Type sizes.
```
