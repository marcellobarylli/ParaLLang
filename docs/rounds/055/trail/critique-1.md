# Codex critique 1: hear the words of an encounter line (a Claude subagent stood in for Codex)

- **Dispatched:** 23:34:43 (journal row 3)
- **Returned:** 23:36:22 (notification; the subagent ran 81 s)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5), repo read access, read-only instructions. Codex was at its usage limit (reset 01:36 UTC 2026-11-06)
- **Prompt:** adversarial review of `plan-v1.md` against `speech.js`, `PronounceButton.js`, `BilingualText.js`, `DialoguePanel.js`, `ReviewPanel.js`, `Spellbook.js`, `ui.js`, `ambience.js`, `jest.setup.js`, the mobile tests and `serializeEncounter`; numbered Error/Risk/Gap items, then Optional
- **Reviewed input:** `plan-v1.md`, sha256 e2bb2b8c…, HEAD c7bf91f, working tree docs/rounds/055/ only
- **Findings:** 10

## Raw output (verbatim)

```text
1. **Error — Caching inside `findVoice` breaks the existing test**
`pronunciation.test.js:15-21` calls `findVoice('it-IT')` three times in one test and changes the mocked voice list between calls. It expects it-IT, then it-CH, then null. If the cache lives in `findVoice` (the plan only says "cached per tag in `speech.js`"), the second call returns the cached Alice voice and the test fails. Resetting the cache in `beforeEach` does not help because all three calls are in one test. Fix: keep `findVoice(tag, speech)` pure and add a separate cached `voiceFor(tag)` that `PronounceButton` (`PronounceButton.js:15`) uses. Apply the cache only when the default `Speech` module is used.

2. **Error — A cache that stores only finished results does not stop the burst**
`DialoguePanel` (`DialoguePanel.js:51-71`) renders the transcript's first FlatList batch in one commit. So every button's effect runs before any `getAvailableVoicesAsync` promise resolves, and a cache that stores only resolved voices is still empty when all N calls go out. The plan's own test, "several buttons for one tag call `getAvailableVoicesAsync` once", would fail. Fix: cache the in-flight promise per tag. If it resolves to null, delete the entry so the next mount looks again. Test it with two buttons rendered in one `render` call, not one after the other.

3. **Error — The cache leaks between tests in other files**
The cache is module state, and jest keeps modules for a whole test file. `fragments.test.js:51` sets an it-IT voice. Any later test in that file, or in `spellbook.test.js` or `learning-flow.test.js`, that expects the default `[]` from `jest.setup.js:3` would get a cached voice. The plan resets the cache only in `pronunciation.test.js`. Also, `jest.setup.js` is a `setupFiles` entry (`package.json:33`), where `beforeEach` is not available. Fix: add a `setupFilesAfterEnv` file with `beforeEach(resetVoiceCacheForTests)`, or call the reset in every file that renders a `PronounceButton`.

4. **Risk — A row of dimmed mute buttons when no voice is installed**
With no voice, each chip gets a disabled 🔇 named "Italian pronunciation unavailable" (`PronounceButton.js:19,21`). A six-word line then gives VoiceOver six identical dimmed buttons, which doubles the swipe stops in the most-used list. The fallback made sense for a single card; it does not scale to a chip row. Fix: add a `hideWhenUnavailable` prop for `BilingualText`, or show one "pronunciation unavailable" note per line. Change the plan's test to match.

5. **Risk — iOS returns voices late; nothing re-checks a mounted miss**
On a cold start iOS often returns `[]` from `getAvailableVoicesAsync` the first time. The plan re-queries only on the next mount. The opening line's buttons stay disabled for the whole encounter, because FlatList keeps them mounted and the effect key is `[tag]`. Fix: retry a miss once after a short delay, or re-check on AppState `active`. Do not cache misses.

6. **Gap — Where the button sits in the layout is not specified**
`styles.word` (`BilingualText.js:37`) is a column: chip, then the meaning. "After each word chip" would put the 🔊 between the chip and its meaning, or squeeze it into the wrap row as a separate item. Then a wrap could separate a word from its button, and a sighted player could not tell which word it speaks. Fix: put a row View with the chip and button inside `word`, with the meaning below. Also, the text-variant Button (`ui.js:68,71`, 10pt vertical padding, title3 emoji) is taller than the chip (6pt), so set `alignItems: 'center'` on the row. The theme test (`theme.test.js:24-37`) allows plain layout numbers, so this is fine.

7. **Risk — Ambience can come back up during rapid word taps**
`speak` (`speech.js:18-21`) awaits `stop()`. The previous utterance's `onStopped`, which calls `duck(false)`, can arrive on iOS after the new `duck(true)`, so the ambience returns to full volume mid-word. Encounter chips will be tapped in quick succession far more often than Spellbook cards, so this matters more now. Fix: put a generation counter in `speak` so only the latest utterance's callbacks restore the volume. Test: press A, then B, then fire A's `onStopped` late; the ambience must stay ducked.

8. **Gap — Speech keeps going after the screen changes**
Nothing calls `Speech.stop()` when the encounter unmounts or a turn is sent. A word can keep playing over the next screen, or over the next line as it fades in. Fix: stop speech when `DialoguePanel` unmounts, or when a turn is submitted.

9. **Gap — A disabled chip could dim the speaker too**
The plan says hearing stays enabled while the chip is disabled, but the test covers only `isLoading`. Also cover the other two disable paths, which come from separate code: the meaning already shown (`BilingualText.js:15`, `Boolean(word.meaning)`), and a protected line with no hints left (`DialoguePanel.js:67`). Also check the speaker is not dimmed: `dim` applies per Button (`ui.js:60`), so the speaker must stay outside the chip.

10. **Risk (learning design) — The lemma is spoken, not the word as it appears in the line**
The server sends `target`, the form in the sentence, and `canonicalTarget`, the dictionary form (`learning-service.js:275-276,309-310`). Speaking `canonicalTarget` gives away nothing the hint system protects. Meanings are hidden only through `meaning` (`:312`), and the in-encounter Spellbook already pronounces cards (`:180`). But on an inflected match the spoken form differs from the word in the line. That is acceptable, since it matches the chip's label. State it in the plan so a later round does not "fix" it to `target` without deciding.

## Optional
- Add `accessibilityLanguage={language?.tag}` to the `dialogue.native` Text and the chip label in `BilingualText`. VoiceOver currently reads the Italian line with the English voice, unlike the Spellbook and reviews (`Spellbook.js:97`, `ReviewPanel.js:27`).
- The same word in two NPC lines gives duplicate names ("Hear caffè in Italian"). Chips already have this problem ("Translate word: …"), so it adds no new risk. New tests should still use `getAllByRole(...)[i]` scoped with `within(line)`.
- The `aria-label="Word translations"` on the chip row (`BilingualText.js:10`) will also hold pronounce buttons. Consider "Words".
- The default `jest.setup.js` voice mock (`[]`) now puts disabled buttons into every existing DialoguePanel test, including held, motion, party and learning-flow. Run the whole suite and watch for act() warnings from the async `setVoice`.
```
