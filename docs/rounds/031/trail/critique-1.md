# Claude subagent critique 1: save slots

- **Dispatched:** 2026-11-05T19:01:35Z
- **Returned:** 2026-11-05T19:03:00 (notification)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/031/trail/plan-v1.md` against the named store, app, api and server files; numbered Error / Risk / Suggestion list, Optional unnumbered, under 700 words
- **Reviewed input:** `plan-v1.md`, sha256 068aeaf3dd5149a293ba0eecc437ad6d5d7f102c1d0707bd0ce984743b648c23, HEAD f24c35e, working tree: draft `SavesPanel.js`, `saveSlots.js` and store changes were uncommitted while it ran
- **Findings:** 10

## Raw output (verbatim)

```text
1. **Error — Review actions have no stale-response guard**
`startReview`, `submitReview` and `revealReviewAnswer` (mobile/src/stores/gameStore.js:221-249) check neither `requestEpoch` nor `learnerId`. Bumping the epoch, as `switchSave` plans to, does not stop them. If a review request for save A resolves after a switch, A's `spellbook` and `reviewChallenge` are written into save B, and the view jumps to `review`. Fix: capture the epoch and learnerId in all three actions and return early when either has changed. Add a test that switches saves while `createReview` is pending.

2. **Error — Stale failures still clear the new save's loading state**
The catch blocks of `moveTo` (:91), `_startNamed` (:117), `restartEncounter` (:162) and `revealHelp` (:201) call `set({ error, isLoading: false })` with no check. So a failure from save A that arrives during `switchSave` clears B's `isLoading` and shows A's error. Fix: give every catch the same guard that `recruit` and `sendMessage` use (:143, :187).

3. **Error — Restoring the snapshot puts stale data in place**
A snapshot holds `{ encounter, spellbook }` and is written only by encounter actions (:111, :160, :177, :199). Reviews never update it. If the restore follows the fresh `getSpellbook`, the restored due count and drill are out of date. The snapshot encounter can also be out of date. A `sendDialogue` dropped as stale was still committed on the server (learning-service.js:543). A server restart empties the in-memory `encounters` map (learning-service.js:23). Either way the next send fails with STALE_VERSION or STALE_ENCOUNTER (learning-service.js:362-365). Fix: on switch, call `api.currentEncounter(id)` (learning.js:398), which returns the encounter and spellbook from the server, and drop the snapshot.

4. **Error — The plan resets too little state on a switch**
The plan clears only review, assessment and draft. `notice` (for example "X joined your party.", :141) is cleared only by `openMap` (:122), so it would carry into the other save. `pendingInput`, `reviewResult`, `returnView`, `error` and `onboarding` would also carry over. A leftover `returnView: 'dialogue'` plus B's encounter makes the return label point at the wrong NPC (App.js:22). Fix: list every field the switch sets, with `returnView: 'map'`, `view: 'map'` and `isLoading: false`. Add one test that seeds every field and checks each is reset.

5. **Error — `switchSave` skips `createLearner`, so a slot can become unusable**
`getWorld` and the other reads throw "Unknown learner ID" when the server has no file for the id (learning-service.js:50-55). `createOrRecoverLearner` would recreate it (learning-service.js:36-47). If the server's save folder is wiped, or the app points at another server, the slot fails every time. The plan's rollback then keeps the player off that slot for good. Fix: call `api.createLearner(id)` first in `switchSave`, as `initialize` does (:52), and take `language` from its reply.

6. **Error — `switchSave` has no busy guard**
The plan guards `newSave` against loading but not `switchSave`. Two quick taps, or a switch while `sendMessage` is in flight, run overlapping loads that both write the device record. Fix: refuse while `isLoading` or while `learnerId` is null (during startup). Disable the Saves button and the Continue buttons while loading.

7. **Risk — A corrupt record silently drops saves 2 and 3**
The plan treats a bad record as missing and rewrites it from the legacy key on the next write. That permanently loses the other slots, even though their server files still exist. The plan also does not say what "validate" checks. Fix: keep each slot that still parses (ids matching the server's `LEARNER_ID_PATTERN` in learning-storage.js:10, no duplicate ids, at most 3 slots, `activeId` in the list). Do not rewrite the record until the player acts.

8. **Risk — `newSave` can leave orphan learners and split writes**
`createLearner(null)` creates the server file at once (learning-service.js:43-44). If the loads then fail, nothing on the device records that id, and a retry creates a second learner. The record and the legacy key are also two separate `setItem` calls, so a write can fail halfway. Fix: add the new slot to the record (still inactive) right after `createLearner`, then switch. Write the record before the legacy key, and decide whether a failed write rolls back or shows a notice.

9. **Suggestion — Header crowding and accessibility**
The header already holds up to four buttons (Header.js:13-19). A fifth will crowd an iPhone-width screen. Several identical "Continue" buttons are also ambiguous to VoiceOver. Fix: show Saves only on the map, or place it on MapPanel. Give each button an accessibleName such as "Continue Save 2", mark the active slot with `accessibilityState={{ selected: true }}`, and confirm a switch with a status notice ("Now playing Save 2").

10. **Suggestion — Test gaps**
The `fakeApi` in learning-state.test.js:27 returns the same `identity` every time, so `newSave` tests need a `createLearner` that returns distinct ids. The plan's tests miss these cases:
- stale review and failure responses arriving after a switch (items 1-2);
- a server-side encounter version that moved while the player was on another save (item 3);
- a switch to an id the server does not know (item 5);
- record validation: duplicate ids, 4 slots, an `activeId` not in the list;
- the Saves button hidden on onboarding.

Optional
- Save the place and Spellbook count in each slot entry so the other slots can be told apart, not just the current one.
- Scope fits one round if items 3 and 5 reuse the existing `currentEncounter` and `createLearner` endpoints rather than adding new ones.
- Remove `switchLearnerForTest` (:251) or rebuild it on `switchSave`, so tests run the code that ships.
```
