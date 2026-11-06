# Round 063 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C10c, from [round 062](../062/findings.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/speech.js`, `Spellbook.js`, `ReviewPanel.js`, tests.

## Goal (pre-run)

No voice keeps speaking after the screen that started it goes: the Spellbook and the Review screen stop it as the
encounter (round 055) and the map (round 062) do, and a stop that comes while `speak` is still waiting for the
previous stop wins. App-only, no live calls.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Choosing Review on a Spellbook card cuts a word still being spoken** (critique 1.3): the Review card shows the
   same word with its own 🔊.

## Design (pre-run)

1. **`speak`** (critique 1.1, Error): after `await speech.stop()`, `if (mine !== generation) return;` before ducking
   and speaking, so a `stopSpeech` (or a newer `speak`) during that wait wins and the ambience stays restored.
2. **`Spellbook`** and **`ReviewPanel`** call `useEffect(() => () => { stopSpeech(); }, [])` at the top (in
   `ReviewPanel` straight after its `useState`, before the early returns).
3. `ReviewPanel` already remounts per challenge and for the result through its existing key in `App.js`
   (critique 1.4): no change there.

## Tests (pre-run)

- `speak` with a `stop` held open: `stopSpeech` during the wait, then release: `speech.speak` never called, the last
  `duck` call `false`. A newer `speak` during the wait: only the newer one speaks (critique 1.2).
- Spellbook: a fragment's 🔊 pressed, unmount: `Speech.stop` called and the ambience player at full volume.
- Review: the word's 🔊 pressed, unmount: stop and full volume; the result render and the brief "no challenge"
  render also unmount cleanly (hook order; critique 1.5).
- Full suites; expo-doctor; iOS export.

## Live (pre-run)

None.

## Success (pre-run)

All tests pass; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 5c43fd82…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `speak` ignores a stop that comes during its wait | + | Accept: generation check after the wait | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Gap | Tests would pass with the bug | + | Accept: a held-open stop | **Accepted** (autonomous, pending owner review) | Tests |
| 1.3 | Risk | Review cuts a Spellbook word | 0 | Accept: intended, recorded | **Accepted** (autonomous, pending owner review) | Owner decision 1 |
| 1.4 | Gap | Step 2 described an existing key | 0 | Accept: reworded | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.5 | Gap | The "no challenge" render is a loading state | 0 | Accept: test kept for hook order | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred** (Optional): an App-level Spellbook → Review → Continue → Return test (the component tests cover each
unmount); stopping speech when the app goes to the background (backlog C10d); a loading line instead of the "No due
review" flash (cosmetic, backlog note).

Net change: the race in `speak` is fixed, and the tests hold the stop open.

## Outcome (2026-11-06)

Built as designed. Mobile 172/172, server 244/244, client 12/12, expo-doctor 20/20, iOS export built. No live runs.
See [findings.md](findings.md).
