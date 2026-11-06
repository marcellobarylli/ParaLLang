# Review 1: round 106's build (the Spellbook payload withholds meanings)

- **Dispatched:** 09:00:16 UTC
- **Returned:** before 09:02:38 UTC (not timed separately; the time is when this file was saved)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, Agent tool; Codex at its usage limit until 2026-11-09 17:32 UTC
- **Input:** the uncommitted diff on HEAD 10e6e3a plus `server/test/spellbook-withheld.test.js`, with the goal and design stated

Verbatim:

I found no Errors. Nothing a player meets breaks, and I found no answer leak the change introduces. I found three Gaps and two Minors. The three test files you named pass: the two server files run 5 tests and the mobile Spellbook test runs 11.

**What I checked and found clean**
- **Every path that returns a spellbook goes through `spellbookSnapshot`.** That covers start, resume, restart, the help reveal, the turn, the replayed turn, moving, `GET /api/spellbook`, review start and review submit. Nothing bypasses it. Stored receipts drop the spellbook (`forReceipt`, learning-service.js:81), and a replayed turn builds a fresh snapshot (line 843), so no saved snapshot holds meanings.
- **The resolving turn shows meanings.** Line 1050 passes `stagedEncounter`, which is already marked resolved, so meanings come back. The test covers this through `finishEncounter`.
- **Start and help set the new encounter before taking the snapshot** (lines 688 and 879), so neither sends a snapshot that predates it.
- **Nothing else reads the blanked fields.** In the app, only `Spellbook.js` reads `meanings`, `note` or `example.english`; `reviewPartOfSpeech` reads only `partOfSpeech`. In the web client, only `Spellbook.jsx` reads them. In server/scripts, `verify-cli` reads only `vocabularyId`. The prompt builder reads the content, not the snapshot. `keptLines` reads only `due`, and `dueCount` is unaffected.
- **The review result screen does not rely on card meanings.** It uses `result.canonicalAnswer` and `acceptedAnswers` from the entry.
- **Stale snapshots behave as before.** The app takes its encounter state from `spellbook.inEncounter`, so an old in-encounter snapshot kept after leaving or a stale reload (`_applyLatest`, gameStore.js:338) shows "under way" with or without this change, until `refreshSpellbook` runs when the Spellbook or map opens. A card withheld because it, or a card in its form, was due also stays due on the app's clock, so the app hides it anyway. I found no case where the app shows "no meaning" where it used to show one.
- **web-client.test.js:77** only checks that the `meanings` key exists, so `null` passes.

**Gaps**

1. **A server restart during an encounter still sends meanings** (learning-service.js:273 and 282). Encounters are kept only in memory. After a restart the server knows no encounter, so `GET /api/spellbook` or `moveTo` sends full meanings, notes and example English while the app still holds an ongoing encounter. The app's `leaksMeanings` guard (gameStore.js:32) blocks the display, but the payload still carries the answers, which falls short of the round's goal. This predates the change and is the only remaining payload leak I found. Fix: record it as a known limit in Amendments or findings. Alternatively, keep a persisted "encounter ongoing" flag in the save and use it when the in-memory map has no entry.

2. **The resume path has no test** (learning-service.js:657). Resuming the same encounter with `startEncounter` and no restart returns `spellbookSnapshot(envelope)` and is not covered; nor is a repeated help reveal (line 870). Both work today, but a later change to the default argument would not be caught. Fix: in the withheld test, call the start route a second time and the help route, then run the same in-encounter checks.

3. **The JSON-text leak check is weak** (spellbook-withheld.test.js:28-33). It searches only for each card's own accepted translations, in quotes. It would not catch a single meaning embedded in a longer string, such as a note or an example's English that contains another card's meaning. Fix: also assert that every card's `example.english` and `note` are null, and that no string in the payload equals any accepted translation of any discovered entry.

**Minors**

4. **The app shows a blank line, not "Meaning hidden", if the server withholds a card the app treats as readable** (mobile/src/components/Spellbook.js:186). With today's rules this cannot happen, because what the app hides covers everything the server withholds. Even so, the guard leaves an empty space rather than an explanation. Fix: treat `card.withheld?.meaning` as a wait, for example `waits.meaning || card.withheld?.meaning`, so the existing hidden message shows. The new mobile test's comment cites "an older snapshot rule, a clock skew"; neither can actually cause this.

5. **The web client calls a form-waiting card "Meaning hidden" with no reason** (client/src/components/Spellbook.jsx:24). This is acceptable for a frozen client; I note it only because it differs from the app's "until you review its words" wording.
