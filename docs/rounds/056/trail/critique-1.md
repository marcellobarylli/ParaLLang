# Codex critique 1: word chips coloured by part of speech (a Claude subagent stood in for Codex)

- **Dispatched:** 23:41:04 (journal row 3)
- **Returned:** 23:43:14 (notification; the subagent ran 84 s)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5), repo read access, read-only instructions. Codex was at its usage limit (reset 01:36 UTC 2026-11-06)
- **Prompt:** adversarial review of `plan-v1.md` against the owner's GAME MECHANICS note, `BilingualText.js`, `ui.js`, `DialoguePanel.js`, `PronounceButton.js`, `theme.test.js`, the name queries in mobile tests, the part_of_speech values and `serializeEncounter`; numbered Error/Risk/Gap items, then Optional
- **Reviewed input:** `plan-v1.md`, sha256 ff593597…, HEAD df464d4, working tree docs/rounds/056/ only
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — The chip label can't be added the way the plan describes.** `Button` (ui.js:51–64) shows one `&lt;Text&gt;` with `styles.label` only when `children` is absent (ui.js:62). To put "noun" after the word, BilingualText has to pass `children`. That drops the default label style, which is private to ui.js. The word would then lose its ink colour, subhead size and 600 weight, unless BilingualText copies them (allowed only with `fontSize: type.*`, theme.test.js:31–36). **Fix:** add a `suffix` (or `badge`) prop to `Button` that renders a second sized `Text` next to the label, and give the new style a `fontSize` so the unsized-style rule passes.

2. **Error — Revealed chips are faded, so on most lines the colour and label are too.** A chip is disabled whenever `word.meaning` is set (BilingualText.js:19). Every non-active line and every narration line gets meanings from the server (learning-service.js:308, :280). A disabled chip with `dim` on gets `opacity: 0.45` (ui.js:58, :73). Past lines and the active line once hints run out (DialoguePanel.js:70) would show greyed borders and labels well under 4.5:1. The "disabled controls are exempt" reasoning (theme.test.js:69) doesn't fit here, because the label is information, not control state. **Fix:** pass `dim={false}` on word chips (as the map does) and show disabled state another way, or put the class label outside the Pressable.

3. **Risk — Red/green fails for colour-blind players, and the hues clash with existing colours.** A red and a green that both reach 4.5:1 on `#f6f1e7` end up dark with similar luminance. For deuteranopes and protanopes they look nearly identical, so only the text label separates verb from adjective. Also, "distinct from `danger`/`success`" is hard to achieve: a dark red at 4.5:1 sits next to `danger #9b1c1c` and `accent #8a3b12`. The green adjective border would sit right above the meaning text, which is itself `colors.success` green (BilingualText.js:46). **Fix:** test a simulated deuteranopia/protanopia difference (e.g. a minimum ΔE or luminance gap between `wordVerb` and `wordAdjective`), or use blue/orange/purple-style hues and note the change from "R/G/B" as an autonomous decision. Also add a non-colour difference in the border (e.g. dashed for verbs).

4. **Risk — Free part of speech on the active line narrows answers and undercuts the hint economy.** Today the part of speech is paid information: it shows only with a revealed meaning, "coffee (noun)" (BilingualText.js:25). Protected lines hide meaning, but the server sends `partOfSpeech` anyway (learning-service.js:306). No objective literally asks for "a noun", but several answers are found by class:
   - `name_meat` needs a noun among the chips (it/encounters/butchers_stall_charcutier.yaml:18–22).
   - `quantity` needs unit nouns (:43–46).
   - "tell it to stop" / "wake up" need verbs (flick_lotus, cracked_fountain_letharger).

   A labelled noun chip among uncoloured interjections and numerals points to the paid word. **Fix:** either show classes only on non-protected lines (and after a reveal), or keep them on protected lines and justify it in the decision row with the objectives above. A test should pin whichever is chosen.

5. **Error — The content counts are wrong.** The YAMLs give noun 43, noun_phrase 3, verb 13, verb_phrase 6, adjective 14 (79 coloured). The rest are adverb 12, adverbial_phrase 2, interjection 14, numeral 24, phrase 4, prepositional_phrase 4, pronoun 5, question 5, which is 70, not 82. The total is 149. **Fix:** correct the count and list each uncoloured value by name. That also makes the decision to leave `adverbial_phrase` and `prepositional_phrase` uncoloured explicit. `senza latte` (prepositional_phrase) is a key word in the coffee encounter and will look different from `caffè`.

6. **Gap — The revealed "(noun)" duplicates the new label.** After a reveal the chip says "noun" and the meaning line still says "(noun)" (BilingualText.js:25). VoiceOver reads it twice. **Fix:** decide on one. Keep the suffix only for uncoloured classes, or drop it when a chip label exists.

7. **Gap — Layout with the round-055 speaker button is unchecked.** `chipRow` is a row that doesn't wrap (BilingualText.js:44). Chip, label and 🔊 (title3 size, padding 6) side by side with a phrase like "senza latte verb" will be wide. On a 320-pt screen, long chips may squeeze or wrap the word mid-chip. Also, a 2-point border on a chip whose base style already has `borderWidth: 1` (ui.js:70) adds 2 points to the size and shifts the text against uncoloured chips. **Fix:** give uncoloured chips the same 2-point width in `colors.border` so chips line up. Add a Simulator item for the narrowest width.

8. **Gap — Tests are missing for edge cases and the other name queries.**
   - (a) `wordClass(undefined)` / missing `partOfSpeech` should return null without crashing.
   - (b) The name changes break encounter-words.test.js:51 and :65 and learning-flow.test.js:125 and :128, because the fixtures use `partOfSpeech: 'noun'` (encounter-words.test.js:11; learning-flow.test.js:13). Only the `senza latte` query at :132 keeps its name. List these explicitly.
   - (c) The protected-line behaviour chosen in item 4.
   - (d) `dim` / opacity on revealed chips from item 2.
   - (e) The theme test's literal-colour regex (theme.test.js:16) means `borderColor` must come from `colors.*`. State that the class-to-token map lives in ui.js or uses `colors[...]`, not hex in wordClass.js.
   - (f) Reading the YAMLs: mobile has no declared YAML dependency. Follow ambience.test.js:28–29 (regex over the files) rather than importing `js-yaml`, which is only transitive.

9. **Risk — The border needs 3:1 non-text contrast against the chip fill.** The chip fill is `surface` and the NPC bubble is also `surface` (DialoguePanel.js:102). The plan tests the tokens as text on `surface`/`background`, which covers this only if those pairs are added. **Fix:** add `[wordX, 'surface']` and `[wordX, 'background']` to the pairs (theme.test.js:66), and remove `background` if chips never sit on it, to avoid a vacuous test.

## Optional

- For VoiceOver, keep "adj." visual-only and say "adjective" in the name, as planned. Make sure the label `Text` inside the Pressable isn't announced separately (the `aria-label` override already handles this, but assert the name exactly).
- Testing border colour through `Pressable`'s function `style` can be brittle in RNTL. Assert on a `testID`'d inner view or flatten the style explicitly.
- Note for later rounds: the Spellbook and reviews show `partOfSpeech` too and could reuse `wordClass` to stay consistent. Out of scope here.
- Leaving `phrase` (4) uncoloured is fine, but some entries are verb-like. Flag them in the owner open item rather than guess.
```
