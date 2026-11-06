# Round 096 plan v1: fixes from a review of the mobile store

Source: `review-1.md` (11 findings) on `mobile/src/stores/gameStore.js` at HEAD f23481c; R1.1–R1.4 checked by hand.

## Accepted

1. **R1.1 (Error): a review resent after a lost reply replays.** `submitReview` and `revealReviewAnswer` take their
   attempt id from `reviewRetryIds` keyed by learner, challenge id, action and trimmed answer (as `retryIds` for
   sends); the map is cleared on a success. On `STALE_CHALLENGE` the store drops `reviewChallenge`, goes back to the
   Spellbook (`view: 'spellbook'`), shows "This card was already answered or has expired. Pick it again from the
   Spellbook." and refreshes the Spellbook. Test: a first submit rejects (network), the second is sent with the same
   attempt id and its replayed result is shown; a different answer gets a new id; `STALE_CHALLENGE` returns to the
   Spellbook with the message.
2. **R1.2 (Error): a start does not pull the player out of another screen.** `_startNamed` records `from = get().view`;
   on success it sets `view: 'dialogue'` only if the view is still `from`. Otherwise the encounter is stored and the
   map card's "Return to …" leads back. Same for `restartEncounter` (below). Test: start held, open the Spellbook,
   start resolves: view stays `spellbook`, `encounter` is the new one; without a view change it opens the dialogue.
3. **R1.3 (Gap): restart guarded.** `restartEncounter` returns when `isLoading`; clears `assessment`,
   `assessmentCounted` and `earlyAssessment` only on success (a failed restart keeps the verdict). Test: two calls
   in the same tick send one request; a failed restart keeps the assessment.
4. **R1.4 (Error, rare): reads do not undo writes.** Counters `worldWrites` and `partyWrites`, raised by every action
   that writes them (`moveTo`, `recruit`, a send that resolves, a start or switch that loads them); a read
   (`openMap`'s world, `openParty`'s party, the post-resolve world + party) applies each part only if its counter did
   not move since the read began. Test: resolve, then a recruit that returns before the post-resolve reads: the
   party stays the recruited one; `openMap` racing a `moveTo`: the move's world stays.
5. **R1.5 (Gap): a stale help reveal recovers.** `revealHelp` on `STALE_VERSION`, `STALE_ENCOUNTER` or
   `STALE_MESSAGE` reloads like the send (`currentEncounter`; the conversation, or back to the map if it closed),
   through a helper shared with `sendMessage` (`_reloadStale`), leaving the draft as it is. Test: a reveal rejected
   with `STALE_VERSION` loads the server's encounter and shows `STALE_RELOADED`-like text for help ("This
   conversation had moved on, so it was reloaded. Ask for help again."); a closed one returns to the map.
6. **R1.6 (Gap): `revealHelp`'s guard.** Applied only for the same epoch, learner, encounter id and version; a
   dropped reply for the same learner and epoch still clears `isLoading`. Test: a reply after the encounter changed
   is not applied and loading ends.
7. **R1.9 (Minor): a save the server lost is said so.** When the app asked for a stored id and the server answers
   `recovered: false`, a notice says "This save was not found on the server, so it starts again from the
   beginning." (initialize and switch). Test: both paths; a first launch (no stored id) shows nothing.

## Deferred or rejected

- R1.7 (no request timeout): deferred; iOS's own request timeout and a fitting value per call (starts take 20 s+ on
  CLI providers) need the Simulator; an owner open item.
- R1.8 (review Spellbooks without the meaning guard): rejected; the server refuses reviews during its encounters,
  and when it has forgotten the app's encounter that conversation is dead (the next send closes it).
- R1.10 (a removed save comes back after a failed device write): deferred (needs a storage failure and an app kill).
- R1.11 (`retryIds.clear()` drops other learners' ids; `startDrill` sets `returnView` when the review bails):
  deferred, harmless (a switch already drops in-flight sends; the drill returns to the map anyway).

## Claim boundary

Jest with fake APIs; no Simulator. Every change is in the store; components unchanged except text the store sets.
