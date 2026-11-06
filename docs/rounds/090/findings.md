# Round 090 findings

## Question

Rounds 029–039 (the drill before the Rift, fragments, save slots, unlocks, polish, sounds, removing saves) were never
reviewed after their builds. Does an independent review find bugs, and can they be closed offline?

## Finding

**Two player-facing bugs and one lock-out, now closed; one minor item rejected.**

- **A relaunch forgot the conversation the server still held.** Startup stored no encounter (a save switch did ask
  the server). At the Rift with a drill pending, the map then offered "Review N words", which the server refuses
  during an encounter, and disabled Talk: stuck until the server restarted. Startup now asks for the current
  encounter and takes it with its Spellbook from one server snapshot, so the map offers "Return to …".
- **A readable card gave away a due one.** A card's example English (and a phrase's meaning) showed while a card
  whose form stands in it was due: "Cento grammi di prosciutto. (A hundred grams of ham.)" on *cento* while
  *prosciutto* is due, "black coffee" on *caffè nero* while *caffè* is due. That made the drill answerable from the
  Spellbook. Each card now carries `exampleCardIds` and `formCardIds` (the learner's other cards found in its
  example or its own form, alone or inflected); the app, by the clock, holds the example's English back while one of
  them is due, and a phrase's meaning (and note) while a word of its form is due. Measured over both packs with every
  card held: 57 it and 42 es example pairs found by form, 3 it and 2 es phrase pairs, and 4 pairs per pack only
  through round 086's inflection rule ([`results/card-answers.txt`](results/card-answers.txt)): *fermati* ← *fermo*,
  *buenos días* ← *bueno*, *café solo* ← *sola* are real stem relations; *ottimo* ← *otto* is a false hide (accepted,
  as in round 088).
- **An unreadable current save locked out the others.** The Saves button needed a loaded learner, so a corrupt
  current save meant every launch failed the same way. After a failed start the Saves screen now lists the device's
  saves; the player can continue another or start a new one (recorded as active even if it then fails to load).
  Remove waits for a loaded save. Removing a save the server cannot read now renames its file aside
  (`<id>.unreadable-<ms>-<random>.json`) instead of deleting it, so "The original file was preserved" stays true.
- **Minor:** a delete now also clears the learner's turn progress. Rejected: a removed save that comes back empty
  after a failed device write and a close (rare; the player can remove it again).

The review's "checked and fine" list covers the drill's card choice and its exits, fragment hiding and unlock counts,
old saves' migrations, switch epochs, the delete order, sounds and Reduce Motion.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 5 findings (4 accepted, 1 rejected), critique 11 (3 Errors: deleting
an unreadable save, a null active id, two snapshots that can disagree), all accepted. Offline, no LLM call. Each fix
was removed in turn (13 mutations) to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| `server/test/card-answers.test.js` (new) | 2/2: *prosciutto* in *cento*'s example, *caffè* in *caffè nero*'s form and example, never self, only the learner's own cards |
| `server/test/delete-learner.test.js` | 8/8 (2 new): bad JSON and a newer schema are set aside (temp copies still go, never loaded again); `turnProgress` cleared |
| mobile `saves.test.js` | 22/22 (7 new): startup holds the server's ongoing (or resolved) encounter and its Spellbook; without or failing `currentEncounter`, `getSpellbook`; after a failed start the saves are listed, a switch loads another, no remove without a learner; only the broken save or a legacy id: a new save, recorded active even if its load fails; a fresh install with the server down lists nothing |
| mobile `saves-recovery.test.js` (new) | 1/1: in the app, a 503 SAVE_UNREADABLE start shows the error and Saves; no Remove; Continue Save 2 plays it |
| mobile `spellbook.test.js` | 10/10 (5 new): example English waits for a due card in it; a phrase with a due word holds meaning, note and example English back, no Review of its own; due by the clock; nothing due and older servers show everything |
| mobile `send-retry.test.js` | 10/10: one mock changed, as startup now asks `currentEncounter` first |
| A fix removed → test fails | 13/13 (the active-id mutation survived the first run; a test was added) |
| Full suites | server 327/327 (323 before), client 12/12, mobile 257/257 |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`mobile/src/stores/gameStore.js` (`initialize`, `newSave`, `switchSave`), `mobile/App.js`,
`mobile/src/components/Spellbook.js` (`cardWaits`), `server/src/learning-service.js` (`entryIdsIn`,
`entryAnswerLists`, `spellbookSnapshot`, `deleteLearner`), `server/src/learning-storage.js` (`remove`), the tests,
[`results/card-answers.mjs`](results/card-answers.mjs), [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests and a content measure only. Known leaks left: a readable *caffè* and *nero* together answer a due *caffè nero*;
a word card's note could name a due word's meaning. A phrase or example may wait for a stem relative (*ottimo* for a
due *otto*). After a failed start with the server down, Continue and New only show errors; a device that recovers
this way does not see the onboarding statement.

## Open items

- Owner (Simulator): relaunch the app during a conversation, check "Return to …" on the map; at the Rift with a drill
  pending after a relaunch.
- Owner (Simulator): the Spellbook with *prosciutto* due: *cento*'s example without its English; *caffè nero*'s
  "Meaning hidden until you review its words."
- Owner: whether a phrase answered by its readable words (*caffè* + *nero*) should also wait, and whether set-aside
  unreadable saves need a way back.
