# Round 038 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round [031](../031/findings.md) (deleting and renaming saves deferred as owner questions),
  backlog A11b. Decided here under the sandbox rules: removing is built, renaming is not.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/src/stores/saveSlots.js` (`withoutSlot`, `nextNumber`, `nextLabel` floor), the store
  (`removeSave`, `savesFloor`, a guard in `_loadSave`), `SavesPanel.js`, `App.js`, tests. No server change.

## Goal (pre-run)

The player can remove a save, other than the current one, from the device after a confirmation. A removed save
cannot come back by a race, a stale key or a reused label.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The device forgets the save, and the server keeps its file.** There is no delete endpoint, and the prototype's
   server is local. The message says only what is true: "This device forgets Save 2. You cannot open it again from
   this app." (critique 1.3). A server-side delete is an open item.
2. **Only a save that is not current can be removed.** The current save's card says "To remove this save, continue
   another one first."
3. **No renaming.** Labels stay "Save N".
4. **A removed save's number is not reused** (critique 1.4).
5. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **`removeSave(target)`** is refused with no learner, while loading, for the current save, and for an unknown id.
   - It takes a new epoch and sets `isLoading`, and it updates `saves` (and the floor) before writing (critique
     1.1). A failed write puts both back and shows an error.
   - When the legacy `parallang.learnerId` holds the removed id, it is rewritten to the current one (critique 1.2).
   - It drops the removed learner's in-app snapshot and sets the notice "Save 2 was removed from this device."
   - The record always keeps the current save, so it never becomes empty.
2. **`_loadSave` refuses a slot that is no longer on the list**, before and after the server calls, so it never adds
   one back through `withActive` (critique 1.1).
3. **Labels.** The record may carry `nextNumber`, which `parseSlots` keeps (an integer above 1). `withoutSlot`
   raises it past the removed save's number, and `nextLabel(slots, floor)` takes the lowest free number from the
   floor. A device without removals behaves as in round 031.
4. **Confirmation** (critique 1.5, 1.6). The confirmation is the system's `Alert.alert`, which takes VoiceOver focus
   by itself:
   - title "Remove Save 2?";
   - buttons "Keep Save 2" (cancel) and "Remove" (destructive);
   - so no custom danger style is needed.
   Each card that is not current has a text button "Remove", with the accessible name "Remove Save 2". It is
   disabled while loading.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 50ae6be1…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A removed slot can come back through a race | + | Accept: lock and epoch, list first, guard in `_loadSave` | **Accepted** (autonomous, pending owner review) | Design 1, 2 |
| 1.2 | Risk | The legacy key can lead back to a removed save | + | Accept | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.3 | Error | "Cannot be recovered" is false: the server keeps the file | + | Accept: honest wording; server delete as open item | **Accepted** (autonomous, pending owner review) | Owner decision 1 |
| 1.4 | Risk | A reused label reads as the old save coming back | + | Accept: `nextNumber` floor kept by `parseSlots` | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.5 | Error | Focus lost; duplicate button names | + | Accept: system alert with a destructive button | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.6 | Error | No danger button style | + | Moot with the system alert; Remove disabled while loading | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.7 | Suggestion | Tests: snapshot dropped; no learner | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** a VoiceOver check on the alert (open item); why the current save has no Remove (taken, a
line on its card).

Net change from plan-v1: a locked removal with the list updated first, a guard in `_loadSave`, the legacy key fix, no
label reuse, honest wording, and the system alert.

## Tests (pre-run)

- Store:
  - refusals: no learner, current, unknown, loading;
  - a removal: record, floor 3, snapshot dropped, notice; the next new save is "Save 4" and the floor survives a
    re-parse;
  - locked while forgetting: a switch and a new save are refused, nothing comes back, and `_loadSave` of a removed
    slot does nothing;
  - a failed write restores the list, then a retry works and rewrites the legacy key.
- Saves screen: no Remove on the current save, and its hint; the alert's title, message and buttons; only the
  destructive button calls `onRemove`.
- Round 031's save tests unchanged; all suites; expo-doctor.
