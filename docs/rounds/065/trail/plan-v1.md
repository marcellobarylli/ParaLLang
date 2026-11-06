# Round 065 plan v1: a loading line between reviews

**Source:** round 063 critique, cosmetic item: pressing "Continue reviews" briefly shows "No due review is available."

## Problem

`startReview` (`mobile/src/stores/gameStore.js:264`) first sets `reviewResult: null, isLoading: true` while
`reviewChallenge` is already null (cleared by `submitReview` / `revealReviewAnswer`). `ReviewPanel` then renders its
`!challenge` branch, "No due review is available.", until the next challenge arrives (or the view moves to the
Spellbook when none is due). The player sees a false "nothing due" message for the length of a request.

## Change

1. `ReviewPanel`: when `!result && !challenge && isLoading`, show a status line "Finding the next review…"
   (`role="status"`) with the return button, instead of "No due review is available.".
2. Unchanged: the no-due text when not loading (e.g. after an error, where the store's error alert also shows);
   the store; App's `key`.

## Tests

- Component: `isLoading` with no challenge and no result shows the loading line and not the no-due text; not loading
  still shows the no-due text.
- Flow (learning-flow.test.js): after "Continue reviews" with the next createReview held open, the loading line shows
  and "No due review is available." never does; then the next word arrives.
- Full suites, expo-doctor, iOS export.

## Live

None (app only).
