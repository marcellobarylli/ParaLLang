# Round 071 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** [round 070](../070/architecture.md), deferred critique 1.2 and its
  [open items](../070/findings.md#open-items).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js` (`sendMessage`), mobile and server tests.

## Goal (pre-run)

Sometimes a dialogue POST's response is lost after the server committed the turn: Wi-Fi drops, the app is
suspended, or the phone times out. Today the player's retry gets a new attempt id with the old encounter version and
fails with `409 STALE_VERSION`: "This encounter changed in another tab. Refresh before retrying." The app has no
tabs and no refresh. After this round, a retry of the same answer replays the committed turn (the server's receipts
already support that), and a stale session reloads instead of stranding the player.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Retry ids are kept in memory only** (critique 1.9). An app relaunch loses them. A relaunch already reloads
   the current encounter from the server, so the stale-version case cannot arise there.
2. **No automatic retry and no Retry button.** The player resends as today. The text stays in the box.

## Claim boundary (pre-run)

Store logic under jest, plus the server's replay over HTTP. There is no Simulator and no real network loss, and no
live LLM calls are needed: the replay path is deterministic.

## Deferred (pre-run)

- Persisting uncertain sends across relaunches (critique 1.9).

## Design (pre-run)

1. **Attempt ids by request** (critique 1.5): `retryIds`, a `Map` in the store's closure, keyed by
   `learnerId|encounterId|version|text` (trimmed text). A send looks up its key and reuses the id if found;
   otherwise it makes one and stores it. The map is cleared when a send succeeds, when a reload replaces the
   encounter, and on a save switch (`sendSeq` bump points, round 070). A retried A → B → A keeps A's id.
2. **Guards** (critique 1.2): a response is applied only if the epoch, the learner, the encounter **id** and
   version, and `sendSeq` are all unchanged.
3. **A replayed response** (critique 1.1): after a response with `replayed: true` is applied, the store fetches
   `api.currentEncounter`. Under the same guards, it applies the server's encounter if it has the same id and a
   higher version, and updates `snapshots` too. In one app on one device this does nothing; it covers a second
   client on the same learner.
4. **Stale recovery** (critiques 1.3, 1.4, 1.6, 1.7): on `STALE_VERSION` or `STALE_ENCOUNTER`, `isLoading` stays
   true while the store fetches `api.currentEncounter`. Then, under the guards of design 2 (send sequence, learner,
   epoch):
   - **An encounter came back.** It replaces `encounter` and `spellbook`, and `snapshots` is updated. `assessment`,
     `earlyAssessment` and `pendingInput` are cleared, and the draft keeps the text. The error reads: "This
     conversation had moved on, so it was reloaded. Your answer was not sent; it is still in the box."
   - **`null` came back.** The encounter is set to null and the view goes to the map, with the error "This
     conversation is no longer open. Return to it on the map to start again." The text is kept in the draft.
   - **The reload failed.** The original error stays, and the state is otherwise unchanged.

   `isLoading` ends in every case.
5. The server and the web client are unchanged. Round 070's progress already returns null for a replayed attempt,
   tested there ("a duplicate … replays and never sets progress").

## Tests (pre-run)

Mobile (`mobile/src/__tests__/send-retry.test.js`):
- A network failure, then the same text: same attempt id, and the replayed response is applied with no cue.
- A → B → A after failures: A's id comes back, and B's differs.
- After a success, the same text later gets a new id. So does a save switch between failure and retry.
- `STALE_VERSION`: the reload is shown, the draft kept, the message shown, the snapshot updated (seen after a
  switch away and back), and `assessment` cleared.
- `STALE_ENCOUNTER` with a different encounter back: the same rules apply.
- A null reload goes to the map with its message; a failed reload keeps the original error. `isLoading` is false
  after each.
- A reload that resolves after a save switch is ignored (critique 1.3).
- A replayed response followed by a newer server version applies the newer one (critique 1.1).
- A response for another encounter with the same version is not applied (critique 1.2).

Server (`server/test/turn-progress.test.js` or a new file), over HTTP: a committed turn retried with the same attempt
id and version returns `replayed: true` and the committed encounter, and adds nothing (the save's evidence and
receipts are unchanged). The same attempt id with another message gets `409 ATTEMPT_REUSE`.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 17be6ef4…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | A receipt replay can restore an older snapshot if the server advanced again | 0 | Accept in part: reconcile with `currentEncounter` after a replay (only reachable with a second client) | **Accepted in part** (autonomous, pending owner review) | Design 3 |
| 1.2 | Error | The success guard does not check the encounter id | 0 | Accept: id and send sequence in the guard | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Risk | Reload ownership underspecified | 0 | Accept: loading through recovery, guarded by sequence | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Gap | Recovery omits snapshots and the assessment fields | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.5 | Risk | One `lastSend` loses A after A → B → A | + | Accept: ids by request key until the encounter advances | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.6 | Error | Null does not mean a restart; keeping the encounter leaves Send pointing at nothing | 0 | Accept: neutral message, encounter null, back to the map | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.7 | Risk | The kept draft must say it was not sent | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.8 | Gap | Tests miss the dangerous boundaries | + | Accept: STALE_ENCOUNTER, same-version other encounter, late reload, further advance, snapshots, null, A→B→A, no second mutation on replay | **Accepted** (autonomous, pending owner review) | Tests |
| 1.9 | Risk (Optional) | Retry ids are memory-only | 0 | Record as a limitation; a relaunch reloads anyway | **Deferred** (autonomous, pending owner review) | Decision 1, Deferred |

Net change: retry ids by request key, guards on encounter id and send sequence, a guarded reload that also handles
null and replays, and the not-sent message.
