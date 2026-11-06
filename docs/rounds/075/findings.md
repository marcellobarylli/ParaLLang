# Round 075 findings

## Question

Can the three minor notes from iteration 20's review of rounds 070–073 be fixed without new risk?

## Finding

**Yes, by tests.** All three are fixed:

1. **A reconciled replay clears its verdict.** After a replay, if the server holds a newer version of the same
   conversation, the app shows that version without the older turn's Assessment box. A reconcile that finds the
   same version keeps the replayed verdict.
2. **"Counted."** When a verdict was shown as provisional and the turn commits, the Assessment box mounts anew, ends
   with "Counted." and is announced once to the screen reader. iOS has no live regions, so the announcement is the
   only way VoiceOver hears the change (critique 1.2). A failed send never marks a verdict counted, so the previous
   turn's verdict that shows again is plain (critique 1.3). A turn with no provisional verdict shows no note.
3. **Progress ids.** `progress()` compares the attempt id as a string without trimming. A numeric id in the POST
   body is now readable as its string form, and `" abc "` and `"abc"` stay distinct (critique 1.1). The server
   test fails without the fix.

The Codex critique changed the plan in all three places. A read-only review after the build found three low
findings, handled by Amendment 1.

## Method

The plan was critiqued by Codex (effort high, bundle on stdin): 3 findings, 2 accepted, 1 in part (see the
[Second opinion](architecture.md#second-opinion-pre-run) table and [critique 1](trail/critique-1.md); plan as sent
in [plan-v1](trail/plan-v1.md)). Then the build, the tests, and a review by a Claude subagent. No live LLM calls:
nothing that reaches the provider changed.

## Results

| Suite | Before | After |
|---|---|---|
| Server | 257 | 258 |
| Client | 12 | 12 |
| Mobile | 209 | 218 |

## Decision

Keep all three fixes. The "Counted." line and its announcement are autonomous decisions, pending owner review.

## Evidence

Tests: `server/test/turn-progress.test.js` (numeric and spaced ids), `mobile/src/__tests__/send-retry.test.js`
(reconcile), `mobile/src/__tests__/turn-progress.test.js` (`counted`: store flag, panel line, one announcement,
remount, failure after a counted turn, fade key by phase).

## Claim boundary

Jest and node tests only. The fade, the line's layout and the VoiceOver announcement have not been seen on an
iPhone.

## Open items

- **Simulator (owner):** send an answer at Gerald's cart and watch the provisional box become the one ending
  "Counted.", with Reduce Motion on and off; with VoiceOver on, check that "Counted." is announced once, and not again
  after opening the map and coming back.
