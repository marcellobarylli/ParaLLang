# Round 055 plan v1: hear the words of an encounter line

Backlog C5 (new; prototype.md Phase 4 "TTS integration: … for words"). Today the app pronounces a word only in the
Spellbook (cards, fragments) and in reviews (`PronounceButton`, `mobile/src/speech.js`, expo-speech). In an
encounter, where the player meets a word first, the chips under an NPC line (`BilingualText`) translate but do not
speak. No live LLM calls, no server change.

## Design

1. `BilingualText` takes `language` (passed down from `DialoguePanel`, which has it) and renders a
   `PronounceButton` after each word chip, speaking `word.canonicalTarget` (the chip's own label), named
   "Hear <word> in <Language>" as elsewhere.
2. Hearing a word is free: it spends no hint, reveals no meaning, and stays enabled while the chip is disabled
   (loading, no hints left, meaning already shown). It is a pronunciation of a word already on screen.
3. Voice lookup is cached per tag in `speech.js` (a found voice only; a miss is looked up again next mount), since
   a transcript can mount dozens of buttons, each calling `getAvailableVoicesAsync`. `resetVoiceCacheForTests()`
   for jest; `pronunciation.test.js` calls it in `beforeEach`.
4. Speaking ducks the ambience as today (`speak`).
5. The web client is frozen: unchanged.

## Tests (mobile jest)

- An NPC line with two chips shows "Hear X in Italian" for both; pressing one speaks the canonical form with the
  Italian voice; no hint request (`onHelp` not called).
- The pronounce button stays enabled when the chip is disabled (loading).
- No voice: the button is disabled with the fallback label; the chip still works.
- Cache: several buttons for one tag call `getAvailableVoicesAsync` once; a miss is not cached.
- Existing theme test (no literal styles outside `ui.js`), the held / fragments / motion tests pass.

## Open items (owner)

Simulator: the chip row layout with the extra buttons (wrapping), VoiceOver order (chip, then its 🔊), the Italian
and Spanish voices.

## Success

All mobile, server and client tests pass; `npx expo-doctor` as before; `npx expo export --platform ios` builds.
