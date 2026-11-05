# Round 035 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` Phase 4 ("transitions"); backlog C3b; round [034](../034/architecture.md)'s
  deferred line heights (its critique 1.7).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/src/motion.js` (new), `DialoguePanel.js`, `App.js`, `ui.js` (`leading`), five components'
  line heights, `mobile/jest.setup.js`, tests. No server or prompt change.

## Goal (pre-run)

New dialogue lines, a new assessment, the victory banner and a screen change fade in briefly, and nothing moves under
Reduce Motion. Line heights become tokens.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A 200 ms fade with a 6-point rise.** Under Reduce Motion there is no fade at all, not even opacity alone
   (critique optional item). This is the most conservative reading of the setting.
2. **No stagger** between the player's line and the NPC's reply (critique optional item), to keep it simple.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **One app-wide setting** (critique 1.1). `motion.js` reads `AccessibilityInfo.isReduceMotionEnabled()` once and
   follows `reduceMotionChanged`. Until the value is known, motion counts as reduced, and a failed read keeps it
   reduced. `useReduceMotion()` subscribes components to it.
2. **`<FadeIn>` decides once, at mount.** It fades only if motion is known to be allowed at that moment. It starts at
   opacity 0.02, not 0, so VoiceOver never meets a fully transparent view (critique 1.7). If Reduce Motion turns on
   mid-fade, or the element unmounts, the animation stops at opacity 1. Other props pass through, so `aria-live`
   still works.
3. **Dialogue** (critique 1.2–1.4):
   - Lines that are already there when an encounter session is first shown appear as they are: the opening line, a
     resumed transcript, and a restart (new `encounter.id`). A line fades only on its first render, so a recycled
     FlatList cell does not fade again.
   - The assessment box is keyed by its content, so each new assessment fades.
   - The victory banner fades when it appears.
   - `scrollToEnd` animates only when motion is allowed.
4. **Screens.** The active panel sits in `<FadeIn key={state.view} style={styles.shell}>`, which has `flex: 1`
   (critique 1.5). The key loses no state, because each view was already its own conditional and the draft lives in
   the store.
5. **Line heights.** `leading = { subhead: 21, callout: 23, body: 25 }`. The theme test refuses a numeric
   `lineHeight` and a `leading.X` that does not sit with `type.X` (critique 1.8).
6. **Jest** (critique 1.6) runs with Reduce Motion on by default (`jest.setup.js`). The motion tests turn it off
   themselves.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 29e36dbc…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A per-component hook never settles (no fade, or a flash) | + | Accept: one module-level value, decided at mount, no fade while unknown, stop at 1 | **Accepted** (autonomous, pending owner review) | Design 1, 2 |
| 1.2 | Error | The mount-time id set breaks on restart | + | Accept: reset on `encounter.id` | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.3 | Risk | FlatList recycling refades lines | + | Accept: fade on first render only | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Error | A changed assessment does not fade | + | Accept: key by content | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.5 | Risk | Screen wrapper needs `flex: 1` | + | Accept in part: `styles.shell`; no layout test (jest has no layout) | **Accepted in part** (autonomous, pending owner review) | Design 4 |
| 1.6 | Risk | Jest animates by default | + | Accept in part: Reduce Motion on in `jest.setup.js`; `Animated.timing` spied instead of fake timers | **Accepted in part** (autonomous, pending owner review) | Design 6 |
| 1.7 | Risk | VoiceOver at opacity 0 unverified | + | Accept: start at 0.02; Simulator open item | **Accepted** (autonomous, pending owner review) | Design 2, open items |
| 1.8 | Suggestion | Tie line heights to sizes | + | Accept | **Accepted** (autonomous, pending owner review) | Design 5 |

**Deferred / optional:** an opacity-only fade under Reduce Motion (rejected: Owner decision 1); a 60 ms stagger
(rejected: Owner decision 2); the scroll test asserting `animated: false` (taken).

Net change from plan-v1: one app-wide setting decided at mount; fade on first render per session; the assessment
keyed; jest defaults to Reduce Motion; start opacity 0.02; line-height pairing checked.

## Tests (pre-run)

- `motion.test.js`:
  - the setting follows the system, and a failed read stays reduced;
  - `FadeIn` calls `Animated.timing` (to 1, 200 ms, native driver) only when motion is known to be allowed, never
    under Reduce Motion, never with `animate={false}`, and never before the setting is known;
  - the dialogue fades a new line and a new assessment, not the lines present at first showing, and resets for a new
    session.
- `learning-flow.test.js`: `scrollToEnd({ animated: false })` under Reduce Motion.
- `theme.test.js`: no numeric `lineHeight`; each `leading.X` sits with `type.X` and is 1.3–1.6 times it.
- All mobile suites, expo-doctor, iOS export; server and web unchanged.
