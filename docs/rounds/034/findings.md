# Round 034 findings

## Question

Can the app's typography and palette be made consistent and checked by tests (backlog C3, first part), without a
Simulator?

## Finding

Yes, as far as tests can show. The app now has one type scale (`type` in `ui.js`, ten sizes named after Apple's text
styles) and no literal font size or colour outside `ui.js`. Tests check both.
- Every text style names a size. 15 styles had no size and so got React Native's default of 14. They, and the six
  styles set to 14 by hand, now use 15 (`subhead`).
- Every text colour meets 4.5:1 on each background it is used on. The lowest pair is `muted` on `dangerSurface`, at
  5.04.
- Map nodes you cannot walk to used to fade to 45% opacity (2.7:1 for ink on surface), and that included "you are
  here". They now stay at full opacity. An unreachable node's label is shown in `muted`.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 8 findings, 6 accepted and 2 in part. Its three Errors were:
  - a second colour literal in `App.js`;
  - text styles with no size at all;
  - map labels faded by `disabled`.
- The first draft was written before the critique returned (journal row 7). It changed only the sizes written out.
- Each scan was shown to be live. A planted file with `fontSize : 14`, `'#fff'` and `color: 'white'` failed it.
  Setting the map's `dim` back to on failed the map test (opacity 0.45).
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| distinct literal font sizes in components | 12 (plus unset: RN default 14) | 0 (10-step scale in `ui.js`) |
| colour literals outside `ui.js` | 2 | 0 |
| map labels you cannot walk to | 45% opacity (ink 2.74:1) | full opacity; muted 5.82:1 on surface |
| mobile jest | 69/69 | 74/74 (theme test 4, map labels 1) |
| server, web vitest, web build | 157/157, 12/12, ok | unchanged |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

Sizes that moved: 14 → 15 (about 21 styles, set or unset), 18 → 17 (the NPC's line) and 18 → 20 (Spellbook section
headings). Everything else keeps its size.

## Decision

Keep it. C3a is done. C3b (transitions, respecting Reduce Motion) is next in C, and the hand-set line heights go with
it.

## Evidence

The round's build commit; journal rows 4–9; `mobile/src/components/ui.js`, `mobile/src/__tests__/theme.test.js`,
`mobile/src/__tests__/map-gate.test.js`.

## Claim boundary

Tests only; nobody has looked at the screens. The contrast list is written by hand (pairs found by reading the
styles), not derived from a render. Disabled and pressed controls elsewhere still fade, which WCAG exempts. Large
Dynamic Type sizes are capped (1.5×) only on the map labels and the badge, and other fixed boxes were not checked.

## Open items

1. Owner, Simulator: the 14 → 15 change across screens, the NPC line at 17, the Spellbook headings at 20, and the
   map's unreachable labels (muted, not faded). Check that the map still reads clearly as to where you can walk.
2. Owner, Simulator: Dynamic Type at the largest accessibility sizes (map nodes, the header badge, the review word).
