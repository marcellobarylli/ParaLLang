# Round 096 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review, at HEAD f23481c, of the mobile store as a whole
  (`mobile/src/stores/gameStore.js`), [`trail/review-1.md`](trail/review-1.md): 3 Error, 5 Gap, 3 Minor; R1.1–R1.4
  checked by hand.
- **Offline round:** no LLM call; jest with fake APIs, no Simulator. Critic: a fresh read-only subagent (Codex limited
  until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/__tests__/store-review.test.js`.

## Goal (pre-run)

A review answered while its reply was lost can be sent again and shows its verdict; a slow start never takes the
player off the screen they opened; a stale read never undoes a recruit or a move; a help reveal on a stale
conversation reloads it; a save the server lost is said so.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **R1.1 (critique 1.3): review attempt ids are reused for a resend.** `reviewRetryIds` by learner, challenge id,
   action and trimmed answer; cleared on success. The server looks up the receipt before the challenge, so the same
   id replays. A replayed result plays no cue. On `STALE_CHALLENGE` the store drops `reviewChallenge` and the key's
   entries and stays on the review screen with the error "This card was already answered or has expired. Try again
   for the next one." (the panel's "Try again" starts the next review, drill cards first on the server).
2. **R1.2 (critique 1.2): a start keeps the player's screen.** `_startNamed` records `from = get().view`; on success
   it opens the dialogue only if the view is still `from`. Otherwise it stores the encounter and sets `returnView:
   'dialogue'`, so the Spellbook's or Party's return button reads "Return to X" and opens it.
3. **R1.3 (critique 1.4): Restart is a restart start.** `restartEncounter` calls `_startNamed(encounterId,
   { restart: true })`: the loading guard, `starting`, the view guard; the verdict is cleared only on success (a
   restart's encounter is always a new id, so `fresh` holds).
4. **R1.4 (critique 1.5, 1.6): one shared counter for world and party writes** (`placeWrites`), raised when a write is
   applied: `moveTo`'s world, `recruit`'s party, the load of a save (`initialize`, `_loadSave`), and a resolving send
   before its post-resolve read starts. The reads (`openMap`'s world, `openParty`'s party, the post-resolve world and
   party) apply only if the counter and the epoch did not move since they began. A dropped read is harmless (the
   next opening reads again).
5. **R1.5 (critique 1.1, 1.7): a stale help reveal reloads.** On `STALE_VERSION` / `STALE_ENCOUNTER` only (not
   `STALE_MESSAGE`, which an older line's chip gives with the version current) `revealHelp` reloads through
   `_reloadStale({ learnerId, owns, message, draft })`, shared with `sendMessage`: loading stays on until it settles;
   the caller's `owns()`; the send passes its text as the draft and clears `retryIds`, help leaves the draft alone.
   Help's message: "This conversation had moved on, so it was reloaded. Ask for help again."
6. **R1.6 (critique 1.9): `revealHelp`'s guard** is the epoch, learner, encounter id and version; a reply dropped
   for the same learner and epoch clears `isLoading`.
7. **R1.9 (critique 1.8): a lost save is said so.** When the app sent a stored id and the server answers `recovered:
   false`: at launch a notice "This save was not found on the server, so it starts again from the beginning."; on a
   switch one line, "Now playing X. This save was not found on the server, so it starts again from the beginning."
   A first launch and a new save show nothing.
8. **Deferred or rejected:** R1.7 (request timeouts: needs the Simulator; owner open item); R1.8 (review Spellbooks
   unguarded: rejected, the forgotten conversation is dead; also the Optional to drop it); R1.10 (a removed save
   returning after a failed device write: deferred); R1.11 (`retryIds.clear()` across learners, `startDrill`'s
   `returnView`: deferred, harmless); the Optional to disable help on older lines: deferred (a component change, a
   Simulator check).

## Design (pre-run)

All in `gameStore.js`: `reviewRetryIds` (Map) and `reviewAttempt(learnerId, challengeId, action, answer)`;
`placeWrites` counter; `_reloadStale`; the `from` check and `returnView` in `_startNamed`; `restartEncounter` as a
restart start; `revealHelp`'s `owns()` and reload; `recovered` read in `initialize` and `_loadSave`.

## Claim boundary (pre-run)

Jest with fake APIs; no Simulator. Components unchanged; only the store and the text it sets.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (11 findings). Critiqued draft: `trail/plan-v1.md`, sha256
b1c15e4e…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | A review resent after a lost reply is always STALE_CHALLENGE | + | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Error | A slow start pulls the player out of the Spellbook | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.3 | Gap | Restart has no store-side guard; a failed restart loses the verdict | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R1.4 | Error | A stale party or world read overwrites a recruit or move | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R1.5 | Gap | A stale help reveal cannot recover | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| R1.6 | Gap | `revealHelp`'s guard is weaker; a dropped reply keeps loading | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 6 |
| R1.7 | Gap | No request timeout | 0 | Defer: Simulator | **Deferred** (autonomous, pending owner review) | Decision 8 |
| R1.8 | Gap | Review Spellbooks skip the meaning guard | − | Reject | **Rejected** (autonomous, pending owner review) | Decision 8 |
| R1.9 | Minor | A save the server lost is silently replaced | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 7 |
| R1.10 | Minor | A removed save can come back | 0 | Defer | **Deferred** (autonomous, pending owner review) | Decision 8 |
| R1.11 | Minor | `retryIds.clear()` across learners; `startDrill`'s `returnView` | 0 | Defer | **Deferred** (autonomous, pending owner review) | Decision 8 |
| 1.1 | Error | Reloading on `STALE_MESSAGE` misfires on older lines | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.2 | Error | The way back after a kept screen: `returnView` | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.3 | Gap | STALE_CHALLENGE: stay on the review; clear keys; no cue on a replay | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.4 | Cut | Restart through `_startNamed` | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.5 | Gap | When the counters rise; one shared counter | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.6 | Gap | Tests that an undisturbed read applies | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Gap | The shared reload helper's parameters | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.8 | Gap | The lost-save notice and "Now playing X." | 0 | Accept: one line | **Accepted** (autonomous, pending owner review) | Decision 7 |
| 1.9 | Gap | How to test R1.6 | 0 | Accept: a held reply around `newSave` | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** drop the encounter on an `inEncounter: false` review reply: rejected (Decision 8); disable help on
older lines: deferred (Decision 8); a held restart while the Party screen opens: accepted (Tests).

## Tests (pre-run)

`mobile/src/__tests__/store-review.test.js`, fake APIs with deferred promises:
- R1.1: a submit rejects (network), the second uses the same attempt id and shows the replayed result with no cue; a
  different answer gets a new id; the reveal path likewise; `STALE_CHALLENGE` clears the challenge, stays on
  'review', sets the message.
- R1.2: a start held, the Spellbook opened, the start resolves: view 'spellbook', the encounter stored, `returnView`
  'dialogue', `returnToDialogue` opens it; with no screen change it opens the dialogue; a restart held while the
  Party screen opens keeps 'party'.
- R1.3: two restarts in one tick send one request; a failed restart keeps the assessment.
- R1.4: a resolve, then a recruit that returns before the post-resolve reads: the recruited party stays; `openMap`
  racing a `moveTo`: the move's world stays; and each read with nothing in between applies (`openMap`, `openParty`,
  post-resolve).
- R1.5: a reveal rejected `STALE_VERSION` loads the server's encounter with the help message, the draft untouched; a
  closed one returns to the map; `STALE_MESSAGE` makes no `currentEncounter` call. The send's stale tests pass
  unchanged.
- R1.6: a reveal held, `newSave` run (the held reply is dropped; loading follows the new save).
- R1.9: launch with a stored id and `recovered: false` shows the notice; a first launch does not; a switch to a lost
  slot shows the combined line; a new save does not.
- Mutations: each fix removed fails a test. Full suites.

## Outcome (2026-11-06)

Built as designed, no amendment. Review resends replay; a start keeps the player's screen and the return button
leads back; Restart is a restart start; one write counter keeps stale world and party reads from undoing a recruit or
a move; a stale help reveal reloads (not on `STALE_MESSAGE`); a save the server lost is announced at launch and on a
switch. Each fix reverted in turn fails a test; full suites pass and the iOS export bundles
([findings](findings.md)). Not checked: any of it in the Simulator.
