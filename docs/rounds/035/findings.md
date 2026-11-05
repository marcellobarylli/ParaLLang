# Round 035 findings

## Question

Can the app gain small transitions (backlog C3b) that never move anything under Reduce Motion and never hide or
replay content, checked by tests without a Simulator?

## Finding

Yes, as far as tests can show. These now fade in over 200 ms with a 6-point rise: a new dialogue line, a new
assessment, the victory banner, and a new screen.
- Under Reduce Motion nothing animates. The same holds before the setting is known, and when reading it fails.
- Lines already on screen when an encounter session first appears do not fade: the opening line, a resumed
  transcript, a restart. A recycled list cell does not fade again.
- The list's auto-scroll follows the setting.
- Line heights are tokens paired with their sizes.

The critique found three ways the plan would have failed. Each `FadeIn` holding its own setting would never animate,
or would flash content already shown. A restart would fade its opening line. A changed assessment would not fade.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 8 findings, 6 accepted and 2 in part.
- A draft was in the working tree before the critique returned (journal row 5). It already had the app-wide setting
  and the per-session reset.
- Test trap: `screen.unmount()` is async in this Testing Library version. Left unawaited, it caused "overlapping
  act()" errors, and later queries missed text that `screen.debug()` showed.
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 74/74 | 78/78 (motion 4; scroll `animated: false`; theme: line heights) |
| server, web vitest, web build | 157/157, 12/12, ok | unchanged |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

`Animated.timing` calls in the dialogue test:
- 0 for the opening line;
- 2 for a new line together with a new assessment;
- 1 for a changed assessment alone;
- 0 for a new session's transcript.

## Decision

Keep it. C3 (visual polish) is done as far as can be done without a Simulator. C4 (sound) needs assets and a licence
check.

## Evidence

The round's build commit; journal rows 4–9; `mobile/src/motion.js`, `mobile/src/__tests__/motion.test.js`,
`mobile/src/components/DialoguePanel.js`, `mobile/App.js`.

## Claim boundary

Tests only. Jest has no layout and no frames: the tests show which elements start an animation and with what
parameters, not how it looks or performs. VoiceOver's behaviour during a fade (opacity 0.02 at the start) is
unverified.

## Open items

1. Owner, Simulator: the feel of the fades (dialogue, assessment, victory, screen change); that nothing moves with
   Reduce Motion on (Settings → Accessibility → Motion); a restart and a save switch show no fade on the opening line.
2. Owner, Simulator: VoiceOver reads a new NPC line during its fade.
