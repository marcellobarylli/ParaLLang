# Review 1: code of rounds 081–085 (the round's source)

- **Dispatched:** 2026-11-06 05:17:00 UTC (about)
- **Returned:** about 05:20 UTC (exact time unknown; 155 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers, do NOT make network calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo app in mobile/, YAML content in content/). Review the code changes in `git diff e7c93a1 030f35a -- server/src mobile/App.js mobile/src content prompts server/scripts` for correctness bugs: wrong behaviour, races, crashes on edge inputs (missing fields, old saves, empty lists), leaks of answers or translations to the player during an encounter, and inconsistencies between server and app. The design records for these changes are docs/rounds/081..085/architecture.md (read them for intent only). Tests live in server/test and mobile/src/__tests__; you may run single test files read-only, e.g. `cd server && node --test test/inscriptions.test.js` or `cd mobile && npx jest src/__tests__/inscriptions.test.js` (do not run bare `node --test` in server/, it hangs). Report at most 8 findings, most severe first. For each: severity (Error = a real bug a player can hit / Gap = missing guard or test / Minor), file:line, a concrete failure scenario (inputs/state → wrong output), and a suggested fix. Only report things you verified by reading the code; mark anything uncertain as such. Under 600 words. If you find nothing real, say so."
- **Reviewed input:** `git diff e7c93a1 030f35a` (code paths above), HEAD 030f35a, working tree clean
- **Findings:** 3

## Raw output (verbatim)

```text
I found no Error-level bugs, meaning nothing a player hits in normal play. I found three items worth fixing. The server inscriptions and footnotes tests and the mobile spellbook-refresh and inscriptions tests pass (16 and 19 tests).

**1. Gap: the Spellbook from a move skips round 084's encounter guard** (`mobile/src/stores/gameStore.js:136-138`)
- `refreshSpellbook` drops a reply when the app holds an ongoing encounter but the server says `inEncounter !== true`. That guard covers a server restart, which forgets in-memory encounters.
- `moveTo`, new in round 082, applies `spellbook` with no such check.
- **Scenario:** the player is mid-encounter, the server restarts, and the player goes to the map and moves.
  - The server's `spellbookSnapshot` sees no encounter and sends a Spellbook with `inEncounter: false`.
  - That Spellbook holds the card meanings, the kept lines' translations and the inscriptions' translation and glossary.
  - "Return to the encounter" then reopens the app's stale ongoing encounter, with the answers readable in the Spellbook. This is the leak round 084 critique 1.1 closed for refreshes.
- **Fix:** in `moveTo`, apply the Spellbook only if `!(get().encounter?.state === 'ongoing' && spellbook.inEncounter !== true)`. Keep the world update either way. Add a test next to the refresh guard test.

**2. Gap: the footnote filter is weaker than the answer check the same round set up for authored text** (`server/src/learning-service.js:369-374`)
- `keptFootnote` drops a footnote only when it contains one of the forms listed in a word's `surface_variants`, via `matchCanonicalVocabulary`.
- Those lists are hand-written, so some inflections are missing. For example, `buono` lists `buono/buona/buon/buonissimo/buonissima` but not `buoni` or `buone`.
- Words outside the vocabulary pack, or close forms of the words the player must say, also pass. `test/answer-check.js` catches those with its 4-letter stem check, but only for authored content.
- **Scenario:** in Italian, the LLM writes "Nobody: / Gerald: everything is buoni." It is kept and shown under the narration during the encounter. That breaks the style rule "never a target-language word in it".
- **Fix:** run the stem check for the words the player must say on the footnote too, or at least for the current encounter's targets. Add a test with an unlisted inflection.

**3. Minor, uncertain: the return-from-background refresh can be missed** (`mobile/App.js:30`)
- The refresh fires only on a direct `background` → `active` change, and `last` is overwritten on every event.
- If iOS reports `background` → `inactive` → `active`, the refresh never fires. I am not sure RN does this; it may happen on some app-switcher or notification-centre resumes.
- **Fix:** set a `wasBackground` flag on `background`, then refresh and clear it on the next `active`. Inactive-only bounces would still not refresh.

**Checked and fine:**
- The server inscriptions never show for unvisited ("known") places.
- Old saves are fine: `visitedSet` copes with missing world progress.
- Replays: receipts are stored without inscriptions, and a replay takes the current inscriptions and drill.
- The app checks the request epoch on a move.
- Out-of-order refresh replies are dropped by `seq`, epoch and spellbook object identity.
- The Saves-screen failure paths do not refresh twice: `_loadSave` catches its own errors.
- The footnote schema works with OpenAI strict mode: the openAi target lists `footnote` as required and `["string","null"]`.
- A footnote with an empty narration renders and is read aloud correctly.
- The inscriptions' `where` lines are plain English.
```
