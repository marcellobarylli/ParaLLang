# Round 090 plan v1: fixes from a review of rounds 029–039

Source: `review-1.md` (5 findings), checked by hand at HEAD 7dc6133.

## R1.1 (Error): after a relaunch the app does not know the server's ongoing encounter

`initialize` (mobile/src/stores/gameStore.js:96–113) stores `encounter: null`; `_loadSave` asks
`api.currentEncounter`. At the Rift with a drill pending, `DrillNote` then offers "Review N words" (409
IN_ENCOUNTER) instead of "Return to …", and "Talk to" is disabled. Fix: `initialize` asks `api.currentEncounter`
alongside world, spellbook and party (if the api has it; a failure counts as none) and stores its encounter in the
state and the snapshot; the view stays the map (the map's drill note and the header's return offer the way back).
The Spellbook stays `getSpellbook`'s.

## R1.2 (Error): a due card's meaning shows in other cards' examples and in phrase meanings

The app hides a card's meaning and example English only by the card's own due state (Spellbook.js:47–50, 177–180).
Measured by the reviewer: 57 it / 42 es example sentences hold another entry's form ("Cento grammi di prosciutto. (A
hundred grams of ham.)" on *cento* while *prosciutto* is due), and phrase meanings give their words ("black coffee"
on *caffè nero* while *caffè* is due); the drill becomes answerable from the Spellbook. Fix, as round 088 did for
kept lines: the server sends per card `formCardIds` (the learner's other cards found in the card's own target,
`lineEntryIds`, so alone or inflected) and `exampleCardIds` (in `example.target`), self excluded. The app, by the
clock: the meaning waits ("Meaning hidden until you review its words.", no Review button for it) while any
`formCardIds` card is due; the example's English waits while any card of either list is due. Older servers: no
lists, no extra hiding. Notes are not checked (they are English explanations, round 017), named in the claim
boundary. Not covered: a word card's meaning that is part of a due phrase's meaning (*nero* = black while *caffè
nero* is due): the phrase's review asks for the phrase.

## R1.3 (Gap): an unreadable current save locks out every other save

If the current slot fails to load (SAVE_UNREADABLE, or any start failure), `learnerId` stays null and the Saves
button (App.js:50, `state.learnerId`) never shows. Fix: on a failed start, `initialize` still sets `saves` and
`savesFloor` from the device record (`withActive(record, storedId)` when there is a stored id); the header offers
Saves when `learnerId` or any save exists; `switchSave` and `newSave` work without a current learner (the new slot
becomes the record's active one); Remove needs a loaded save (App passes `onRemove` only with a `learnerId`), so
the broken save is removed after continuing another or starting a new one. The server's DELETE unlinks without
reading, so a corrupt file can be removed.

## R1.4 (Minor): a removed save can come back empty — rejected

Needs the server delete to succeed, the device record write to fail, and the app to close before the next record
write; then "Continue" recreates an empty save under the old label, which the player can remove. A tombstone would be
written to the same storage that just failed. Rejected, stated.

## R1.5 (Minor): `deleteLearner` keeps `turnProgress`

Fix: delete it too.

## Tests

- mobile store: `initialize` with a server-held ongoing encounter sets `encounter` (and the map's `ongoing`);
  without `api.currentEncounter` or with it failing, `encounter` stays null and start succeeds.
- server `spellbook` test: a card whose example holds another card's form carries its id in `exampleCardIds`; a
  phrase card carries its word's id in `formCardIds`; self never listed; a card not of the learner is not listed.
- mobile Spellbook: *cento* readable with *prosciutto* due hides the example English, shows the meaning; *caffè nero*
  readable with *caffè* due hides meaning and example, no Review button; nothing due shows both; no lists (older
  server) shows both; due by the clock in a stale snapshot hides.
- mobile store: a failed start with a record of two slots sets `saves`; the header gets `onSaves`; `switchSave` to
  the other loads it; `newSave` without a learner creates and loads one; `removeSave` without a learner does nothing.
- server: `deleteLearner` clears `turnProgress`.
- Full suites; each fix removed in turn fails a test.
