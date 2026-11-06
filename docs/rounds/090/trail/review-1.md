# Review 1: code of rounds 029–039 (the round's source)

- **Dispatched:** 2026-11-06 about 06:06:50 UTC
- **Returned:** about 06:12:40 UTC (exact time unknown; 348 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo/React Native app in mobile/, YAML packs in content/languages/{it,es}/). Review the code changes in `git diff 4e6f153 b0a87e9 -- server/src mobile/src mobile/App.js` plus commit 2a45e89 (excluding tests) for correctness bugs: wrong behaviour, crashes on edge inputs or missing fields from older servers or saves, answers or meanings leaking to the player during an encounter or on due cards (core rule: the Spellbook hides meanings and fragment translations during encounters and on due cards; nothing gives an open objective's answer), the drill before the Rift (one due card per required target group, DRILL_REQUIRED; can a player get stuck, or skip it), lore fragments and relationship unlocks by conversation count, save slots on the device and switching (stale state from the previous learner, races between switch and in-flight requests), removing saves (DELETE /api/learner, server first, temp copies, the current save), UI sounds and their switch, visual polish/motion (Reduce Motion), save-schema compatibility (learning-storage.js: older envelopes, migrations), and server/app inconsistencies. Design records: docs/rounds/029..039/architecture.md (intent only: 029 drill, 030 fragments, 031 save slots, 032–033 unlocks, 034–035 polish and motion, 036 fragment teller, 037 sounds, 038–039 removing saves). Current code may have changed since; check that a bug still exists at HEAD before reporting it, and cite HEAD file:line. Tests: server/test (single files only, e.g. `cd server && node --test test/<file>.test.js`; never bare `node --test` in server/), mobile `cd mobile && npx jest src/__tests__/<file>`. Report at most 8 findings, most severe first: severity (Error = a bug a player can hit / Gap / Minor), file:line at HEAD, a concrete failure scenario, a suggested fix. Only what you verified; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `git diff 4e6f153 b0a87e9` and commit 2a45e89 (code paths above), checked at HEAD 7dc6133, working tree: docs/rounds/090/ new
- **Findings:** 5

## Raw output (verbatim)

```text
I found 5 issues at HEAD. Two can leave a player stuck and one shows a due card's meaning. I ran the content checks with throwaway scripts in /tmp (since deleted); the rest comes from reading the code. I edited nothing and started no servers.

**1. Error: the player can get stuck at the Rift's drill after relaunching the app** (mobile/src/stores/gameStore.js:98-112, mobile/src/components/MapPanel.js:66,88-92,125-135)
- `initialize` never calls `api.currentEncounter`; it stores `encounter: null` (line 107). `_loadSave` does call it (line 515). So after a relaunch, the app doesn't know about an encounter the server still holds as ongoing.
- On the Rift map, `DrillNote` then shows "Review N words" because `ongoing` is null. That review returns 409 IN_ENCOUNTER, and the "Talk to" button is disabled whenever `drillHere` is set.
- Worst case: the ongoing session is the Rift's own. New cards are due as soon as they are found (`initialSchedule` sets `dueAt = now`, language-engine.js:126-129), so if the Rift's NPC shows a required word the player hasn't met yet, a drill becomes pending mid-fight. The server would resume the session (learning-service.js:588-590 returns before the drill check), but the app gives no way to ask. The player stays stuck until the server restarts.
- Fix: fetch `currentEncounter` in `initialize` as `_loadSave` does. Also keep "Talk to" enabled (or offer "Return") when the server says the encounter is ongoing, or have the snapshot name it.

**2. Error: a due card's meaning shows in other cards' examples** (mobile/src/components/Spellbook.js:177-180)
- A card the player can read shows its example with the English. `cardState` only looks at the card's own `due` flag.
- Content check: 57 cases in it, 42 in es. For example, with *prosciutto* due, the *cento* card reads "Cento grammi di prosciutto. (A hundred grams of ham.)". Phrase meanings do it too: `caffe_nero` gives "black coffee" while *caffè* is due.
- This makes the drill answerable from the Spellbook. Round 088 fixed the same problem for kept lines (`cardIds`), but not for card examples or phrase meanings.
- Fix: hide the English example or meaning when the example or phrase contains a form of a due card. Do it on the server, and in the app by the clock.

**3. Gap: an unreadable current save locks out every other save** (gameStore.js:96-118, App.js:50)
- If the current slot's file is corrupt (SAVE_UNREADABLE) or fails to read, `initialize` fails and `learnerId` stays null.
- The Saves button needs `learnerId`, so the other slots can't be continued and the bad one can't be removed. Every launch fails the same way.
- Fix: on a failed start, still open the Saves screen from the device record so another save can be continued or the bad one deleted.

**4. Minor: a removed save can come back empty** (gameStore.js:483-492)
- If the server delete succeeds but writing the device record fails, the old record still lists the deleted slot.
- If the app is closed before the next record write, the slot reappears on the next launch. "Continue" then calls `createLearner(target)`, which quietly creates a fresh, empty save under the old label.
- Fix: retry the record write during `initialize`, or remember removed IDs and drop them from the list.

**5. Minor: `deleteLearner` leaves some memory behind** (learning-service.js:141-151)
- It clears the encounter, review challenges and prefetch, but not `turnProgress`. This is only leftover memory, not a leak to the player.

**Checked and fine**
- **Drill:** the server picks drill cards first, a revealed or failed review still pushes the card a day out (so nobody is stuck reviewing forever), and restarting or moving can't skip it. Cards from an older content version never block. Party conversations can't require a drill (enforced when content loads).
- **Fragments:** translation and glossary are withheld during encounters. Unlocking by conversation count uses the right conversation tier, and loading checks that a first tier exists. Older saves without `conversations` count as 0, and an older server without `toldBy` is handled.
- **Saves:** answers that arrive after a switch are dropped (request epochs). Removing the current save is refused. The server delete runs first, waits for any request in flight for that learner, and also removes temp copies; a missing file counts as deleted. The legacy key is repointed. The slot list never grows past `MAX_SAVES`.
- **Save files:** v1 and v2 saves are migrated, and party and world are validated.
- **Sounds:** every failure is swallowed, a switch made during startup wins over the stored setting, and there's no cue on a replayed answer.
- **Reduce Motion:** motion counts as reduced until the setting is known, and a change mid-fade ends it at full opacity.
```
