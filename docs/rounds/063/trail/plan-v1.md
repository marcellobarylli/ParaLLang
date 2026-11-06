# Round 063 plan v1: speech stops when the Review or Spellbook view goes

Backlog: C10c (from round 062). The encounter screen (round 055) and the map (round 062) stop the speech voice when
they go; the Spellbook (word 🔊, fragment 🔊, kept-line 🔊 of round 060) and the Review screen (word 🔊) do not, so a
fragment can keep reading over the map or an encounter, with the ambience ducked. App-only, no live calls.

## Design

1. `Spellbook` and `ReviewPanel` each call `useEffect(() => () => { stopSpeech(); }, [])` at the top of the
   component, before any early return.
2. `ReviewPanel` is keyed by the challenge id in `App.js` (`key={state.reviewChallenge?.id ?? 'result'}`), so moving
   to the next challenge or to the feedback remounts it and stops a word still being spoken: intended (a new card).

## Tests

- Spellbook: press a fragment's 🔊, unmount, `Speech.stop` called after the press and the ambience restored.
- Review: press the word's 🔊, unmount, `Speech.stop` called; the "no challenge" and "result" renders also stop on
  unmount (early returns).
- Full suites; expo-doctor; iOS export.

## Live

None.
