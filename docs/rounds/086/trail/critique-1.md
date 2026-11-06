# Critique 1: round 086 plan v1 (three fixes from a review of rounds 081–085)

- **Dispatched:** 2026-11-06 about 05:21 UTC (exact time unknown)
- **Returned:** about 05:24 UTC (exact time unknown; 158 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network). Critique the plan /work/ParaLLang/docs/rounds/086/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Expo app in mobile/, YAML packs in content/languages/{it,es}/). Read the code it touches: mobile/src/stores/gameStore.js (moveTo, refreshSpellbook), mobile/App.js (the AppState effect), server/src/learning-service.js (keptFootnote, canonicalizeNarration and their callers), server/src/content-loader.js (foldWords), server/test/footnotes.test.js, mobile/src/__tests__/spellbook-refresh.test.js, and a sample of encounter YAML and vocabulary under content/languages/it/. Look for: designs that do not actually close the gap, false positives/negatives of the 4-letter stem rule on realistic English footnotes and target words (check real target words: short ones, ones that are English words, multi-word phrases), what "the current encounter's targets" means for party conversations and the Rift boss (which reviews all files), breaking existing tests, and missing tests. Output a numbered list, each typed Error / Gap / Cut with brief reasoning and file:line evidence, then an Optional list. Under 450 words."
- **Reviewed input:** `plan-v1.md`, sha256 fb9061e7…, HEAD 030f35a, working tree: docs/rounds/086/ new
- **Findings:** 7

## Raw output (verbatim)

```text
I found 2 Errors and 4 Gaps in the plan; the move fix itself is sound. I ran the plan's 4-letter rule over the real `it` and `es` target forms (a script in /tmp loading `loadGameContent`).

1. **Error: the stem rule drops common English words in the very encounters footnotes are written for.** The narrator's footnotes are about the scene and the character (`content/narration/style_guide.yaml:11`). Collisions per encounter:
   - it, `mortimer_oath`: translation, translate, transcript (from `tranquillo`, `it/vocabulary/mortimer_oath.yaml:15`). This is a game about translation.
   - it, `market_entrance_tutorial` (the first encounter): come, comes, comedy.
   - it, `butchers_stall_charcutier`: child, children, central, century, salad, grammar.
   - it, `flick_slow_walk`: inside, insist, settle, novel.
   - es, `imp_coffee_greeting`, `cracked_fountain_letharger` and the Rift: quiet, quietly.
   - es, `gerald_coffee_break`: much, delicious.
   - es, `flick_lotus`: animal, despite, desperate.

   "A dropped footnote costs nothing" ignores that some encounters would lose most of their footnotes. The plan should list each pack's collisions in a test and pick a mitigation (item 2 is one).
2. **Error: multi-word forms are split into all their words, so function words become stems.** `come ti chiami` (`it/vocabulary/entrance_greetings.yaml:128`) gives `come`. `muchas gracias` (`es/vocabulary/gerald_break.yaml:40`) gives `much`. `come ti chiami` also gives `chia`. Stemming only single-word forms, or only the head word of a phrase, removes the worst of these.
3. **Gap: short targets get no check.** The plan only stems words of 4+ letters. `test/answer-check.js:22,28` also exact-matches 3-letter words. Unlisted forms of tre, sei, due, ora, soy, dos, mas or vez are covered only if `surface_variants` happens to list them, and the review's whole point is that those lists are incomplete.
4. **Gap: the claim boundary overstates the coverage.** Review 2 also named words outside the pack, which still pass. Words from other encounters (e.g. `buoni` during the tutorial or the Rift) also still pass. The goal "never a target-language word" stays open.
5. **Gap: party conversations and the Rift are safe, but no test covers them.** `definition` in `canonicalizeNarration` is the conversation's own definition, and there is one active encounter per learner (`learning-service.js:542`), so that part is right. The Rift's targets are its 3 objectives (16 stems), not everything its pre-fight drill reviews. The greeting call (`learning-service.js:560`) also has to pass `definition`; one test should cover the greeting path.
6. **Gap: the Gerald test needs setup the helper lacks.** `play` only starts the default encounter (`footnotes.test.js:22`). Gerald needs the party (`learning-service.js:525`). Calling `service.keptFootnote(gen, undefined, content.encounters.get('gerald_coffee_break'))` directly is simpler. The existing footnotes (POV/decaf, "First aside", padded "Nobody") do not collide with the tutorial's stems, so they survive.
7. **Gap: the App flag can regress a launch from the background.** Today `last = AppState.currentState` (`App.js:26`), so an app mounted in `background` still refreshes on `active`. A flag set only by a `background` event loses that. The flag should start as `currentState === 'background'`. The existing test at `spellbook-refresh.test.js:165` passes either way.

**Optional**
- The `moveTo` test should also check that the snapshot is untouched (`gameStore.js:137`). Otherwise a save switch-back restores the leaked Spellbook.
- `startReview`, `submitReview` and `revealReviewAnswer` (`gameStore.js:394-423`) apply Spellbooks unguarded too. They can only be reached after a leaked Spellbook, so a comment saying so is enough.
- "(open or met)": a passed objective's targets no longer need hiding. Keeping them is harmless, but it adds false positives.
- Reuse `answerLeaks`'s stem logic, or move it into `src/`, so the footnote rule and the authored-text rule cannot drift apart.
```
