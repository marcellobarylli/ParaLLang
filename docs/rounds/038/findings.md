# Round 038 findings

## Question

Can the player remove a save from the device (round 031's deferred owner question) without a removed save coming
back, and without the app claiming more than it does?

## Finding

Yes, in tests. The Saves screen has a "Remove" button on each card except the current save's. It asks through the
system alert ("Remove Save 2?", "This device forgets Save 2. You cannot open it again from this app.", with "Keep
Save 2" and a destructive "Remove"). Only the destructive button removes the save.

A removed save does not come back:
- The removal locks the store, so no switch or new save can run against the old list.
- `_loadSave` refuses an id that is no longer listed.
- The legacy key is moved off the removed id.
- Its number is not given out again ("Save 4" follows a removed "Save 2", also after a restart).

The server keeps the learner's file. The message says only what the device does.

The critique found 4 Errors in the first plan. The worst was a race that could re-add the removed save as the active
one. The others were the claim that progress "cannot be recovered", lost VoiceOver focus, and a missing danger style.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 7 findings, all accepted.
- A draft (write first, then update the list; an inline question) was in the working tree before the critique
  returned (journal row 5). It was reworked.
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 86/86 | 90/90 (removing a save 4; round 031's save tests unchanged) |
| server, web vitest | 157/157, 12/12 | unchanged |
| `npx expo-doctor` | 20/20 | 20/20 |

## Decision

Keep it. A11b is done for the device. Renaming is not built.

## Evidence

The round's build commit; journal rows 4–9; `mobile/src/stores/gameStore.js`, `mobile/src/stores/saveSlots.js`,
`mobile/src/components/SavesPanel.js`, `mobile/src/__tests__/saves.test.js`.

## Claim boundary

Tests only. The server still holds a removed save's file, with the player's answers. Anyone with its id and access to
the server could open it. The system alert was mocked in jest, so its look and focus are untested.

## Open items

1. Owner: should the server delete a removed save's file? That needs a `DELETE /api/learner` with the learner's id.
   Should saves be renameable?
2. Owner, Simulator: Remove on the Saves screen, the alert with VoiceOver, and the hint on the current save.
