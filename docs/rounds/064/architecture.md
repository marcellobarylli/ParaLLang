# Round 064 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C10d, from [round 063](../063/findings.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/speech.js`, `mobile/jest.setup.js`, `mobile/jest.after-env.js`, tests.

## Goal (pre-run)

Leaving the app stops the speech voice, and coming back never leaves the ambience lowered under a voice that is no
longer speaking. Whether iOS keeps the voice going, or resumes it, in Expo Go is not known here (critique 1.4); stopping
on `background` covers both. App-only, no live calls.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Only `background` stops the voice** (critique Optional): `inactive` (the app switcher on its way out, Control
   Centre, an incoming-call banner) does not, so a peek without leaving keeps it.

## Design (pre-run)

1. **One lazy subscription** in `speech.js`, made by the first statement of `speak` (critique 1.5), before its first
   await. A throwing `AppState.addEventListener` is swallowed (as in `ambience.js`).
2. **On `background`:** `stopSpeech()` with the module defaults (critique 1.1), not awaited, its rejection caught.
3. **On `active`** (critique 1.3): `Speech.isSpeakingAsync()`; if nothing is speaking (or the call fails), the
   ambience is undocked (`duckAmbience(false)`), so an interruption that cut the voice without `onDone` or
   `onStopped` does not leave it lowered. The jest mock gains `isSpeakingAsync`.
4. **Tests' reset** (critique 1.2): `resetVoiceCacheForTests` also removes the subscription; the after-env comment
   says so.

## Tests (pre-run)

- `speak`, then `background`: `Speech.stop` called, the ambience player back at full volume, the word's late `onDone`
  harmless; `inactive` does not stop. One subscription for many `speak` calls.
- `background` during `speak`'s wait (stop held open): `Speech.speak` never called (critique 1.5).
- Return to `active` while ducked and not speaking: full volume; while speaking: stays ducked.
- A throwing `addEventListener`: `speak` still speaks.
- `ambience.test.js` unchanged and passing.
- Full suites; expo-doctor; iOS export.

## Live (pre-run)

None.

## Success (pre-run)

All tests pass; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 2c8611fa…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Gap | Fakes cannot observe the handler's stop | 0 | Accept: module defaults, test via the global mock and volume | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.2 | Risk | A second AppState listener in ambience tests | 0 | Accept: reset removes it | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | An interruption can leave the ambience ducked | + | Accept: undock on `active` when nothing speaks | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.4 | Gap | Background speech in Expo Go unverified | 0 | Accept: reworded, Simulator open item | **Accepted** (autonomous, pending owner review) | Goal |
| 1.5 | Risk | Subscribe before the first await | 0 | Accept, with a test | **Accepted** (autonomous, pending owner review) | Design 1, Tests |

**Deferred** (Optional): renaming the reset (kept; comment updated). Taken: `inactive` stated, throwing-listener test,
the handler's stop not awaited.

Net change: undock on return, reset drops the listener, the subscription before the first await, tests on the global
mocks.
