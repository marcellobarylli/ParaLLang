# Round 065 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round 063 critique (cosmetic): "Continue reviews" flashes "No due review is available.".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/components/ReviewPanel.js`, `mobile/src/stores/gameStore.js`, `mobile/App.js`, tests.

## Goal (pre-run)

Between two reviews, the review screen never claims that nothing is due when something is: it says it is loading
while it loads, and says the review could not load when the request fails. A reply that arrives after the player
left the screen no longer pulls them back. App-only, no live calls.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Texts:** "Finding the next review…" while loading; "The next review could not load." with "Try again" after a
   failure. The plain "No due review is available." stays for the case it describes.
2. **A late reply is dropped when the view changed** (critique 1.2): checked against the view at the start, rather
   than bumping `requestEpoch` in every navigation action (that would also drop unrelated in-flight replies, such as
   an encounter turn sent before opening the Spellbook).

## Design (pre-run)

1. **`ReviewPanel`** with no `result` and no `challenge`: `isLoading` → the status line (`role="status"`, first,
   `styles.body`; critique 1.6, 1.7) and the return button; else `error` (new prop, from App's `state.error`) → the
   failure line, "Try again" (`onContinue`) and the return button (critique 1.1); else the no-due text as today.
2. **`startReview`** remembers `get().view` before the request. After it, when the view differs (the player went to
   the map, the encounter, the Spellbook or the Party screen), it only sets `spellbook` and `isLoading: false`: no
   view change, no challenge, no error. Save switches keep the `requestEpoch` check.

## Tests (pre-run)

- Component: loading line without the no-due text; failure line with "Try again" calling `onContinue`; no-due text
  otherwise.
- Flow, with the next `createReview` held open (critique 1.3): the loading line shows and the no-due text is absent
  before the reply; then the next word (critique 1.3), or the Spellbook when nothing is left (critique 1.4); a 503
  shows the alert and the failure line, and "Try again" loads the word (critique 1.5).
- Flow: "Return" during the held request stays on the screen returned to after the reply (critique 1.2).
- Full suites; expo-doctor; iOS export.

## Live (pre-run)

None.

## Success (pre-run)

All tests pass, the new flow tests fail without the change; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 7b37e461…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | A failed load would still say nothing is due | + | Accept: failure line and Try again | **Accepted** (autonomous, pending owner review) | Decision 1, Design 1 |
| 1.2 | Risk | A late reply pulls the player back | + | Accept: drop it when the view changed | **Accepted** (autonomous, pending owner review) | Decision 2, Design 2 |
| 1.3 | Gap | The flow test must assert while the request is held | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.4 | Gap | Nothing left due: untested | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Gap | Error path untested | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Risk | VoiceOver may not announce the line | 0 | Accept: line first; Simulator open item | **Accepted** (autonomous, pending owner review) | Design 1, Open items |
| 1.7 | Risk | The theme audit needs `type.*` sizes | 0 | Accept: reuse `styles.body` | **Accepted** (autonomous, pending owner review) | Design 1 |

**Deferred** (Optional): a 300 ms delay before the line (it replaces a message that showed anyway); disabling the
header's Spellbook and Party buttons while loading (2 now drops the late reply); the "Continue reviews" label after
practice; a ScrollView for the empty branch.

Net change: a failure state with Try again, and late replies dropped after navigation.
