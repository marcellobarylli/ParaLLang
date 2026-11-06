# Review 1: code of rounds 054–064 (the round's source)

- **Dispatched:** 2026-11-06 about 05:41:51 UTC
- **Returned:** about 05:45 UTC (exact time unknown; 222 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo/React Native app in mobile/, YAML packs in content/languages/{it,es}/). Review the code changes in `git diff 8b87bde 8f8094b -- server/src mobile/src mobile/App.js` (excluding tests) for correctness bugs: wrong behaviour, crashes on edge inputs (empty or overlapping spans, missing fields from older servers or saves, Unicode/apostrophe handling, very long lines), answers or translations leaking to the player during an encounter or on due cards (a core rule: the Spellbook hides meanings during encounters and on due cards; kept lines are hidden while a card in them is due), races in speech (expo-speech start/stop, a stop during a wait), save-schema compatibility (learning-storage.js), and server/app inconsistencies. Design records: docs/rounds/054..064/architecture.md (intent only: 054 typographic apostrophes, 055 pronounce chips, 056–057 word class and spans in the line, 058 matcher longest-first, 059 class on cards, 060 kept lines, 061–064 narrator speech and stops). Current code may have changed since; check that a bug still exists at HEAD before reporting it. Tests: server/test (single files only, e.g. `cd server && node --test test/kept-lines.test.js`; never bare `node --test` in server/), mobile `cd mobile && npx jest src/__tests__/<file>`. Report at most 8 findings, most severe first: severity (Error = a bug a player can hit / Gap / Minor), file:line at HEAD, a concrete failure scenario, a suggested fix. Only what you verified; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `git diff 8b87bde 8f8094b` (code paths above), checked at HEAD c4cbf24, working tree clean
- **Findings:** 3

## Raw output (verbatim)

```text
I found one bug a player can hit and two smaller items. Most of the range checks out at HEAD.

**1. Error: a kept line can give away a due card's answer**
- Where: `server/src/learning-service.js:302-306` (`keptLines`) and `:321` (`keepLine`). The app's own check in `mobile/src/components/Spellbook.js:54-58` (`lineHiddenBy`) has the same hole.
- Why: a kept line stores only the ids of its chip words. Those come from matching the line against the current encounter's word list only. The loader does this on purpose (`content-loader.js:249`) so one encounter's words never become chips in another's lines. The line's translation is then hidden only while one of those stored ids is due.
- I checked the Italian pack: `gerald_coffee_break` matches only `buono`, `ottimo` and `grazie`. `caffe` belongs to `imp_coffee_greeting`.
- Scenario: Gerald says "Grazie, il caffè è ottimo." The player pays for the sentence, so the line is kept with ids `[grazie, ottimo]`. Later the `caffe` card is due. The Spellbook shows "Thanks, the coffee is great", which is the answer to that card.
- A second path: the matcher takes the longest form first and spans can't overlap. So "caffè nero" is stored as `caffe_nero` only. A due `caffe` card (or `latte` inside "senza latte") does not hide the line.
- Fix: work out the hiding ids when the snapshot is built, not from the stored ids. For each due card, test whether any of its surface forms appears in `line.native`, matching each card alone (no exclusion between overlapping words). Join that with the stored ids. The app should then trust the server's `hidden` flag, or the server should send the full list of ids that hide the line.

**2. Minor: the app keeps the shorter of two overlapping spans**
- Where: `mobile/src/wordClass.js` (`segmentLine`). It sorts spans with the same start shortest first, so the shorter one wins.
- This is the opposite of the server's longest-first rule (round 058). Today it never happens, because the server never sends overlapping spans. It would only matter with a different server.
- Fix: sort `b.end - a.end` for spans with the same start.

**3. Minor: a very long line can be cut mid-character**
- Where: `server/src/learning-service.js:316` (`keepLine`'s cap).
- `slice(0, 500)` can split a character made of two UTF-16 units, and it cuts the native text and the translation at different points. A line over 500 characters would be saved with a broken last character and a translation that stops mid-sentence.
- Fix: cut at a whole character (or a word boundary), or skip keeping lines over the limit.

**Checked and fine**
- **Speech:**
  - Each new utterance or stop invalidates the previous one, so a stop during the wait inside `speak` returns before speaking.
  - A late `onStopped`/`onDone` from an older word can't bring the ambience back up.
  - Going to the background stops the voice. On return, the ambience comes back up only if nothing is speaking and nothing new started (fixed in round 065).
  - The Map stops speech on a move, and its hook sits above the early return.
  - The Dialogue, Review and Spellbook screens stop speech when they close.
  - The voice cache drops a failed lookup, so the next button looks again.
- **Spans and matching:**
  - Offsets point into the original line, not the folded copy (I tried decomposed accents and the `ʼ` apostrophe).
  - Spans that are out of range or not whole numbers are dropped. Old messages with no spans render as plain text.
  - A missing `partOfSpeech` no longer crashes the chips, the Spellbook cards or the review screen.
- **Apostrophes and grading:**
  - Folding apostrophes keeps every offset in place and runs before NFKC.
  - The grader-evidence check folds both texts the same way.
- **Saves:**
  - `lines` is optional in the save, bad entries are dropped and the list is capped at 50.
  - Receipts are stored without lines, and replays add the current lines, inscriptions and drill.
  - Saves are kept separately per language.
- **Encounters:** meanings and line translations are hidden during an ongoing encounter in both server and app. The store also refuses snapshots that would leak meanings.
- **Tests:** server `kept-lines.test.js` and mobile `kept-lines`, `speech-stops` and `word-class` pass.
```
