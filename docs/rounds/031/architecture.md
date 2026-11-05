# Round 031 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A11 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md) ("Save slots, if still
  wanted after A1's save format"); `prototype.md` Phase 3 ("Save/load system | JSON persistence, save slots");
  rounds [005](../005/architecture.md) (world progress in the save) and [021](../021/architecture.md) (save schema 3).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/src/stores/saveSlots.js`, `mobile/src/stores/gameStore.js`,
  `mobile/src/components/SavesPanel.js`, `mobile/src/components/Header.js`, `mobile/App.js`, tests.

## Goal (pre-run)

Up to three saves on one device, each a separate journey through the market, with a Saves screen to start a new
save or continue another. App only: no server, LLM or prompt change.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Still wanted:** yes. A1's save is per learner, so a slot is a learner id and the server needs no change.
2. **Three slots, no delete or rename** this round. Deleting would leave the server file behind and needs a
   confirmation step; it is deferred.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **Device record** (`saveSlots.js`). The AsyncStorage key `parallang.saveSlots` holds
   `{ version: 1, activeId, slots: [{ learnerId, label, createdAt }] }`, with at most 3 slots. Labels are
   "Save N", taking the lowest unused N.
   - **Parsing keeps what is valid** (critique 1.7). It drops a slot with an id that is not a v4 UUID (the server's
     pattern), a duplicate id or a missing field, and keeps the first 3. If `activeId` is not among the slots, the
     first slot is active. Only a record that does not parse at all, or has no valid slot, counts as missing.
   - **Migration.** With no record, the legacy `parallang.learnerId` (or the id the server creates on first launch)
     becomes "Save 1".
   - **Writes.** The record is written first and the legacy key second; the legacy key always holds the active id,
     so an older build opens the active save (critique 1.8).
2. **Store.**
   - `initialize` takes the active slot's id.
   - `openSaves()` opens view `saves`, which returns to the map.
   - `newSave()` is refused at 3 slots, while loading, or before startup. It calls `api.createLearner(null)`, then
     writes the record with the new slot added at once, still inactive, so a failed load leaves no orphan (critique
     1.8). Then it switches.
   - `switchSave(id)` is refused while loading, before startup, for the active id or an unknown id (critique 1.6).
     It:
     1. bumps `requestEpoch`;
     2. calls `api.createLearner(id)`, which recreates a save the server lost, and takes `language` from the reply
        (critique 1.5);
     3. loads `getWorld`, `currentEncounter` (the server's encounter and spellbook, not the in-app snapshot,
        critique 1.3) and `getParty`;
     4. writes the record, then sets every per-save field (critique 1.4): `learnerId`, `language`, `world`,
        `spellbook`, `party`, `encounter`, `saves`, `view: 'map'`, `returnView: 'map'`, `reviewChallenge`,
        `reviewResult`, `assessment`, `draft`, `pendingInput`, `error`, `onboarding: null`, `isLoading: false`, and
        `notice: "Now playing Save N."` (critique 1.9).
     On a failure the current save stays, with the error shown.
   - **Stale guards** (critique 1.1, 1.2). `startReview`, `submitReview` and `revealReviewAnswer` capture the epoch
     and the learner, and drop a reply that comes after a switch. The catch blocks of `moveTo`, `_startNamed`,
     `restartEncounter` and `revealHelp` apply only to the same learner and epoch.
3. **App.** A "Saves" button in the header, on the map only (critique 1.9: the header is full elsewhere). The Saves
   screen lists the slots:
   - the current one has `accessibilityState.selected`, its place and its due count;
   - each other slot has a "Continue Save N" button, disabled while loading;
   - "Start a new save" appears below 3 slots, and "Three saves is the most this device keeps." at 3;
   - "Return to the map".
4. **Web client** frozen and unchanged.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 068aeaf3…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Review actions lack stale-response guards | + | Accept: epoch and learner checks in all three | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.2 | Error | Stale failures clear the new save's loading state | + | Accept: guarded catch blocks | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Error | The in-app snapshot can be stale | + | Accept: load `currentEncounter` from the server | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.4 | Error | Too little state reset on a switch | + | Accept: every per-save field listed and tested | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Error | No `createLearner` on a switch | + | Accept | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.6 | Error | No busy guard on `switchSave` | + | Accept; buttons disabled while loading | **Accepted** (autonomous, pending owner review) | Design 2, 3 |
| 1.7 | Risk | A corrupt record drops the other saves | + | Accept in part: keep valid slots; a record that does not parse is still treated as missing (nothing to keep) | **Accepted in part** (autonomous, pending owner review) | Design 1 |
| 1.8 | Risk | Orphan learners, split writes | + | Accept: slot recorded right after creation; record before legacy key | **Accepted** (autonomous, pending owner review) | Design 1, 2 |
| 1.9 | Suggestion | Header crowding, VoiceOver names, selected state, switch notice | + | Accept | **Accepted** (autonomous, pending owner review) | Design 2, 3 |
| 1.10 | Suggestion | Test gaps | + | Accept all listed cases | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** a place and due count stored per slot (deferred: the server is the source; a later round
can show them by fetching); `switchLearnerForTest` is kept, because existing tests use it, and new tests use
`switchSave`.

Net change from plan-v1: the server's encounter on a switch, a full state reset, stale guards on every action, a
tolerant record parser, and a slot recorded before it loads.

## Tests (pre-run)

- `saveSlots` unit: parse keeps valid slots (bad id, duplicate, 4 slots, missing active), rejects unparsable JSON,
  `nextLabel`, `withActive`.
- Store (`mobile/src/__tests__/saves.test.js`, a fake api with distinct ids):
  - legacy key → one-slot record; fresh install → "Save 1";
  - `newSave` → two slots, both keys written, map with the new world, notice;
  - `switchSave` back → the first save's world and the server's encounter;
  - every per-save field is reset;
  - a review reply after a switch is ignored, and so is a stale failure;
  - an unknown id on the server is recreated through `createLearner`;
  - 3 slots → `newSave` is a no-op;
  - a failed switch keeps the save and the record;
  - busy → refused.
- App: Saves on the map only (not on onboarding); the screen's Continue, Start a new save and limit line; the
  selected state.
- All server, mobile and web tests, expo-doctor, iOS export.

## Outcome (2026-11-05)

Built as designed. Up to three saves per device, each a learner on the server. They are kept in
`parallang.saveSlots`, and an older install's id becomes "Save 1". The Saves screen opens from the map's header. A
switch reloads world, the server's encounter, the spellbook and the party, resets every per-save field and says
"Now playing Save N." Every store action drops replies and failures that land after a switch. Mobile 67/67 (11 new),
server 154/154, web client 12/12 and build, expo-doctor 20/20, iOS export ok. Not seen in the Simulator. See
[findings](findings.md).
