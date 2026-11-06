# Round 060 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C9 (new), from the owner's note `parallang_obsidian/GAME MECHANICS.md` (Main Gameplay
  Loop, Option A): "Translated sentences and words need to be stored somewhere for voluntary retrieval and practice
  (gamify as a personal spellbook somehow)". Words have been Spellbook cards since round 001; translated sentences
  were kept nowhere (encounters live in memory).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `server/src/learning-storage.js`, `mobile/src/components/Spellbook.js`,
  tests.

## Goal (pre-run)

When the player pays a hint to translate the active NPC line ("Translate sentence"), the line is kept in the save
and shown in the Spellbook under "Lines you translated", newest first, with a 🔊 and its translation behind a toggle,
for re-reading between encounters. The game still never shows an answer it is asking for (round 017). No live LLM
calls; the frozen web client keeps working (it ignores the new field).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Only paid sentence reveals are kept.** Not the free translations of past lines, not word reveals (they already
   make cards), not player lines. The player chose to translate those lines, so they are the ones worth re-reading.
2. **A kept line's translation is withheld while any card it contains is due, and during encounters** (critique 1.1):
   the line is the card's answer in context. The native line and 🔊 stay.
3. **The translation sits behind a "Show translation" toggle** (critique Optional), as fragments do (round 030), so
   re-reading can be recall.
4. **At most 50 lines, 500 characters per text** (critique Optional): the newest are kept.

## Design (pre-run)

1. **Save.** The envelope gains an optional `lines` array (no schema bump; missing means `[]`). Entry:
   `{ id, encounterId, locationId, speaker, native, translation, vocabularyIds, savedAt }`. `locationId` is
   `sceneLocationId(current)` at the time (critique 1.5: party conversations take place where the player stands) or
   null. `vocabularyIds` are the active message's word ids (critique 1.1).
   **Validation** (critique 1.4): a non-array `lines` is `SAVE_UNREADABLE`; on load, invalid entries (non-empty
   strings, string-array ids, parsable `savedAt`, `locationId` string or null) are dropped and the save is kept.
2. **Write.** In `revealEncounterHelp`, for `kind === 'sentence'` only after the `alreadyRevealed` return, the line
   goes into `stagedEnvelope` only (critique 1.6), so a failed save stores nothing and charges nothing. Dedupe key:
   the native text NFC-normalised, lowercased, whitespace collapsed, plus the speaker (critique 1.7); a match is
   removed and the new entry (all fields) goes to the front. Then the cap (decision 4). No receipt is needed: a retry
   with the old version is `STALE_VERSION` (critique 1.8).
3. **Snapshot.** `spellbookSnapshot` adds `lines: [{ id, speaker, native, translation, locationName, vocabularyIds,
   savedAt, hidden }]` newest first. `hidden` is true, and `translation` null, during an encounter or when any card
   with one of the line's ids is due now (decision 2). `locationName` from `locationsById`, null when unknown.
4. **Receipts** (critiques 1.2, 1.3): dialogue and review receipts store the response with `spellbook.lines`
   removed, and a replay re-attaches the lines built from the current envelope and encounter. Receipts written before
   this round have no `lines`; their replays get the current ones too.
5. **App.** A "Lines you translated" section in `Spellbook.js` after the cards: per line the speaker and place
   (small text), the native line (`accessibilityLanguage` the pack's tag) with a `PronounceButton`, and either a
   "Show translation" toggle or "The translation waits until the encounter is over." / "The translation waits until
   you review its words." The app also hides it when a card with one of the line's ids is due by the clock
   (`cardState`), for a stale snapshot. No section for an empty or missing list.

## Tests (pre-run)

- Server: a sentence reveal stores the line in the save and the snapshot (hidden during the encounter; shown with
  translation after it ends); a word reveal stores nothing; a repeated reveal (already revealed) stores nothing new;
  dedupe moves the entry to the front with the new fields, whitespace and case folded; a different speaker is a
  separate line; cap 50 and 500 characters; a failed save stores nothing and charges nothing, and a retry stores once;
  a due card hides the line; a save without `lines` loads; invalid entries dropped on load; a non-array is
  `SAVE_UNREADABLE`; a party conversation's line has the scene's place; receipts hold no `lines` and a replay gets the
  current ones.
- Mobile: section with toggle between encounters, hidden during one, hidden while a card falls due by the clock, no
  section when empty or missing; 🔊 and `accessibilityLanguage` on the native line.
- All mobile, server and client tests pass; expo-doctor; iOS export.

## Live (pre-run)

None: the kept text is what the provider already returned; the fixture provider covers it.

## Success (pre-run)

All tests pass, with the new ones; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 482518aa…; a Claude general-purpose subagent standing in for Codex
(Codex at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | A kept line's translation answers a due card | − | Accept: hide while a card in it is due (server and app clock) | **Accepted** (autonomous, pending owner review) | Decision 2, Design 3, 5 |
| 1.2 | Gap | Receipts would copy the lines, never pruned | + | Accept: strip `lines` from stored receipts | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | A replay returns old visible translations | + | Accept: re-attach current lines on replay | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Risk | One bad line makes the save unreadable | + | Accept: drop bad entries, strict container only | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.5 | Error | Wrong place for party conversations | 0 | Accept: `sceneLocationId` at save time | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.6 | Gap | Staging and rollback unstated | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.7 | Gap | Dedupe by native text alone | 0 | Accept: normalised text plus speaker, overwrite | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.8 | Gap | No receipt; retry untested | 0 | Accept: stated; covered by the failed-save retry test | **Accepted in part** (autonomous, pending owner review) | Design 2 |
| 1.9 | Gap | Mobile store tests | 0 | In part: component tests; the store keeps the server's snapshot per save, unchanged | **Accepted in part** (autonomous, pending owner review) | Tests |

**Deferred** (Optional): none. Taken: 500-character cap, translation toggle, `accessibilityLanguage` test, client
tests run, removal with the save (`remove` deletes the file; noted in findings).

Net change: lines hidden while their cards are due, kept out of receipts, tolerant validation, scene place, normalised
dedupe, a toggle and size caps.
