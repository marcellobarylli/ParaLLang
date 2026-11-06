# Critique 1: round 088 plan v1 (fixes from a review of rounds 054–064)

- **Dispatched:** 2026-11-06 about 05:46:30 UTC
- **Returned:** about 05:47:30 UTC (exact time unknown; 62 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/088/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Expo app in mobile/, YAML packs content/languages/{it,es}/). Read: server/src/learning-service.js (keptLines, keepLine, spellbookSnapshot and every caller of keptLines, how cards are built), server/src/language-engine.js (matchCanonicalVocabulary), server/src/content-loader.js (vocabulary entries, narrationEntries), mobile/src/components/Spellbook.js (lineHiddenBy, cardState), mobile/src/wordClass.js (segmentLine), mobile/src/stores/gameStore.js (where Spellbooks are applied), tests server/test/kept-lines.test.js and mobile/src/__tests__/kept-lines.test.js. Look for: does the fix actually close the leak (cards vs vocabulary entries, Rift/glitched lines, words in the translation that are a card's answer even if the native does not contain the form, e.g. a synonym), false hides (English homographs among card forms, short forms like \"e\", \"a\", articles), performance of matching per snapshot, the cache key, older saves/servers, what the app does with a stale snapshot, and missing tests. Numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 450 words."
- **Reviewed input:** `plan-v1.md`, sha256 25c01947…, HEAD c4cbf24, working tree: docs/rounds/088/ new
- **Findings:** 8

## Raw output (verbatim)

```text
The plan's fix closes the leak it names for exact surface forms, including the `caffè nero` case. Its claim that English homographs are no issue is wrong, its cache design is unsound, and it misses inflected forms.

1. **Error: the homograph claim is false.** The plan says homographs are "not an issue (cards only)". But a kept line's `native` is mixed-language by design, with the target ratio below 1. Matching cards alone against the whole native with `matchCanonicalVocabulary` (language-engine.js:60-94) finds English words. The Italian pack has card forms `due`, `sei`, `io`, `ora`, `tu`, `tre`, plus `piano`, `media`, `cento` and others. Spanish has `soy`, `media`, `once`. All are already listed as English-colliding at learning-service.js:39-40 (`ATMOSPHERE_ENGLISH`). "The bill is due" in a native would hide the line while the *due* card is due. That errs on the safe side, but it is a false hide. The plan should state it, or exclude `ATMOSPHERE_ENGLISH` forms that already match in `line.translation`. The planned test asserts the opposite of what happens.

2. **Gap: inflections are not matched.** Only `surface_variants` match (language-engine.js:78). A due *ottimo* card does not hide "ottima", and a verb card does not hide its conjugations. Round 086 already has the heuristic for this (`inflectsAnswer`, learning-service.js:29-36). Either reuse it or name the limit in the Claim boundary. Today the boundary only mentions undiscovered words.

3. **Error: the cache key and its size.** A cache keyed on (native, card id) has three problems:
   - It ignores the entry version (`content.entryVersion`). Today a restart clears it, but any reload makes it stale.
   - It is unbounded across learners and lines.
   - It is the wrong grain. The snapshot is rebuilt on every turn, move and review (learning-service.js:564, 591, 732, 785, 949, 997, 1151, 1167, 1224). Without a cache that is up to 50 lines × about 77 entries (117 forms) of regex compiled per call.

   Simpler: compute once per native the set of every entry matched alone, keyed by `native` + `vocabulary.version`, in a bounded LRU, then intersect with the learner's card ids. Better still, cache the compiled regex per form.

4. **Gap: the rest of the matching is unspecified.**
   - The snapshot drops cards whose `contentVersion` is stale (learning-service.js:259). Those ids are then never due or in `cardIds`. That is existing behaviour, but the plan should say so.
   - The plan says nothing on segmenting or folding Rift/glitched natives. `matchCanonicalVocabulary` folds marks, so diacritic noise is fine, but inserted characters such as zero-width marks or glyph substitutions would defeat the word-boundary lookarounds (line 84). That case needs a test or an explicit exclusion.

5. **Gap: existing tests break.** The `deepEqual` on the line shape at server/test/kept-lines.test.js:25-28 has no `cardIds`. The plan does not mention updating it.

6. **Gap: tests are missing for:**
   - a stale snapshot. A card not due at snapshot time but due by the clock, present only in `cardIds`, should hide the line through `cardState` (Spellbook.js:47-58).
   - the "older server" fallback when `cardIds` is absent. It is planned but should be asserted.
   - the multiword alone-match. `caffe` inside `caffe_nero`'s span should be found in both directions.
   - a Spanish fixture. The default runtime there is `cafe`/`sin_leche`. The plan's Italian ids `caffe`, `caffe_nero`, `ottimo`, `grazie` do exist, in gerald_coffee.yaml and gerald_break.yaml, so the test needs `language: 'it'`.

7. **Cut: the synonym worry.** Review shows `target` and asks for the meaning (learning-service.js:1178). A translation that contains a card's English meaning without the card's form in the native teaches no target-to-meaning mapping. Excluding it is right, and the plan should say why in one line.

8. **Cut/clarify R1.2.** The server never sends overlaps, so this is cosmetic. Keep it, but don't claim it fixes anything.

**Optional**
- Return `cardIds` only when they differ from `vocabularyIds`, to keep the payload small.
- Compute `cardIds` at `keepLine` time against the full vocabulary and store it. That avoids per-snapshot work entirely, at the cost of a save field and a backfill for old saves.
- The frozen web `client/` does not read `lines`, so it is unaffected.
```
