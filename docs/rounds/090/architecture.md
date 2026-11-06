# Round 090 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 029–039 (drill, fragments, save slots, unlocks,
  polish, sounds, removing saves), never reviewed after their builds, [`trail/review-1.md`](trail/review-1.md): two
  Errors, one Gap, two Minor, each checked by hand at HEAD. (1) After a relaunch the app does not know an encounter
  the server still holds (`initialize` stores `encounter: null`), so at the Rift with a drill pending the map offers
  a review that answers 409 and disables Talk. (2) A readable card shows its example's English (and a phrase its
  meaning) while a card whose form stands in it is due: "Cento grammi di prosciutto. (A hundred grams of ham.)" on
  *cento* while *prosciutto* is due.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/App.js`, `mobile/src/components/Spellbook.js`,
  `server/src/learning-service.js`, `server/src/learning-storage.js`, tests.

## Goal (pre-run)

A relaunch knows the server's encounter; no readable card shows the answer of a due card through its example or its
own form; a device whose current save cannot be loaded can still continue another save or start a new one, and
removing an unreadable save keeps its file aside.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Startup asks for the current encounter (R1.1, critique 1.4–1.6).** `initialize` calls `api.currentEncounter`
   (when the api has it) instead of `getSpellbook`, as `_loadSave` does, and takes both its encounter and its
   Spellbook (one server snapshot, critique 1.5); without the function, or if it fails, `getSpellbook` as before and
   no encounter. A resolved encounter is stored too, as `_loadSave` does (the map's `ongoing` is only an ongoing one).
   The view stays the map. Stated: once an encounter is held from startup, a later server restart makes Spellbook
   refreshes wait as after any turn (round 084).
2. **Per-card answer ids (R1.2, critique 1.7, 1.8).** The server sends per card `formCardIds` (the learner's other
   cards whose entry stands in the card's own target, alone or inflected, `lineEntryIds`' rule) and `exampleCardIds`
   (the same over `example.target`); the card's own id is excluded. The entry-level lists are computed once per
   entry (content is fixed) in their own map, not the 500-native line cache. The app, by the clock: the meaning
   waits ("Meaning hidden until you review its words.", no Review button for it) while a `formCardIds` card is due;
   the example's English waits while a card of either list is due. Older servers send no lists: no extra hiding.
   False hides are accepted as in round 088 decision 2 (stem collisions such as *otto*/*ottimo*; same-form entries),
   and measured on both packs.
3. **Known leaks, not fixed (critique 1.9):** a readable *caffè* and *nero* answer a due *caffè nero*; a card's note
   could name a due word's meaning. Both are open items.
4. **Saves after a failed start (R1.3, critique 1.2, 1.3).** On a failed start `initialize` still sets `saves` and
   `savesFloor` from the device record (`withActive(record, storedId)`, in memory, when there is a stored id). The
   header offers Saves on the map when there is a learner or any save. `switchSave` and `newSave` work without a
   learner; `newSave` then records the new slot as active (`activeId: learnerId ?? identity.learnerId`). Remove
   needs a loaded save (App passes `onRemove` only with a learner). Stated: with the server down, Continue and New
   only show errors; the onboarding statement is not shown on a device that recovers this way.
5. **An unreadable save is kept aside on removal (critique 1.1).** `JsonLearningStorage.remove` first loads the save;
   if that fails with SAVE_UNREADABLE, the file is renamed to `<id>.unreadable-<ms>.json` in the save directory
   (never loaded) instead of deleted, so "The original file was preserved" stays true. Temp copies are still deleted.
6. **R1.4 rejected (critique 1.10):** a removed save coming back empty needs a failed device write and a close
   before the next write; a tombstone would go to the storage that just failed; the player can remove it again.
7. **R1.5:** `deleteLearner` also clears `turnProgress`.

## Design (pre-run)

1. `gameStore.js` `initialize`: `const loadCurrent = typeof api.currentEncounter === 'function' ?
   api.currentEncounter(id).catch(() => null) : Promise.resolve(null)`; with a result, `encounter` and `spellbook`
   from it; else `getSpellbook`. The failure path sets `saves`/`savesFloor` from the record. `newSave` and
   `switchSave` lose their `!learnerId` guard; `kept.activeId = learnerId ?? identity.learnerId`.
2. `App.js`: `onSaves` when `state.view === 'map' && (state.learnerId || state.saves.length > 0)`; `onRemove` only
   with a learner.
3. `learning-service.js`: `entryCardLists(entryId)` → `{ form: Set, example: Set }` of entry ids (cached per id);
   `spellbookSnapshot` intersects them with the learner's card ids (minus self) into `formCardIds`,
   `exampleCardIds`. `deleteLearner` clears `turnProgress`.
4. `Spellbook.js`: `cardWaits(card, spellbook, now)` → `{ meaning, example }`; `Card` uses it.
5. `learning-storage.js` `remove`: the quarantine rename.

## Claim boundary (pre-run)

Tests and a content measure only. Not covered: a phrase answered by its readable words, notes, cards whose content
version is stale. Removing an unreadable save keeps its file aside but off the device's list.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (5 findings). Critiqued draft: `trail/plan-v1.md`, sha256
9ecbeae5…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | A relaunch forgets the server's ongoing encounter; stuck at the Rift drill | + | Accept: `initialize` asks `currentEncounter` | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Error | A due card's meaning shows in other cards' examples and phrase meanings | + | Accept: `formCardIds`, `exampleCardIds` | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.3 | Gap | An unreadable current save locks out every other save | + | Accept: Saves after a failed start | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R1.4 | Minor | A removed save can come back empty | 0 | Reject: rare, the tombstone would hit the failing storage | **Rejected** (autonomous, pending owner review) | Decision 6 |
| R1.5 | Minor | `deleteLearner` keeps `turnProgress` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 7 |
| 1.1 | Error | Removing an unreadable save destroys the file the message says was preserved | + | Accept: rename aside | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.2 | Error | `newSave` without a learner records `activeId` null; guards unchanged | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4, Design 1 |
| 1.3 | Gap | Server down, onboarding, the only-broken-save and legacy-id cases | 0 | Accept: stated, tests | **Accepted** (autonomous, pending owner review) | Decision 4, Tests |
| 1.4 | Gap | A resolved encounter from the server | 0 | Accept: stored as `_loadSave` does, tested | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.5 | Error | Spellbook and encounter from two parallel calls can disagree | + | Accept: one `currentEncounter` snapshot | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.6 | Gap | Refreshes wait after a restart once an encounter is held | 0 | Accept: stated, tested | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.7 | Gap | Stem and same-form false hides; measure | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.8 | Gap | Compute per entry once, not in the line cache | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2, Design 3 |
| 1.9 | Gap | The reverse phrase case and notes are known leaks | 0 | Accept: open items | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.10 | Cut | R1.4's rejection is sound; a "started fresh" notice is possible | − | Accept the rejection; the notice not now | **Accepted** (autonomous, pending owner review) | Decision 6 |
| 1.11 | Gap | Test that a delete clears progress | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** a server test of the quarantine (accepted); an app test that `newSave` from the failed state records
the new id as active (accepted).

## Tests (pre-run)

- mobile `saves.test.js`: `initialize` with the server holding an ongoing encounter stores it and its snapshot's
  Spellbook; a resolved one is stored and the map's `ongoing` is null; without `currentEncounter` `getSpellbook` is
  used. A failed start with two slots sets `saves`; the header gets `onSaves`; `switchSave` loads the other;
  `newSave` creates and loads one and records it active; `removeSave` does nothing without a learner; only the broken
  save (and a legacy id not in the record) still lists it.
- server `kept-lines.test.js` (or a new `card-answers.test.js`): `exampleCardIds` holds *prosciutto* on *cento*
  (it), a phrase's `formCardIds` holds its word, never self, never a card the learner lacks; a measure script counts
  the listed pairs per pack, alone vs inflected.
- mobile `spellbook.test.js`: example English waits for a due card of `exampleCardIds`, meaning shown; a phrase with
  a due word hides meaning and example, no Review; nothing due shows both; no lists shows both; due by the clock.
- server `delete-learner.test.js`: an unreadable save is renamed aside, a readable one deleted; `turnProgress`
  cleared.
- Full suites; each fix removed in turn fails a test.
