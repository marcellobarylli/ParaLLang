# Round 064 plan v1: speech stops when the app goes to the background

Backlog: C10d (from round 063). Rounds 055, 062 and 063 stop the voice when its screen goes; nothing stops it when
the player leaves the app, so a fragment or a narration could resume or keep going when they come back, and the
ambience (which reconciles on return, round 041) would stay ducked under it. App-only, no live calls.

## Design

1. `speech.js` subscribes once, lazily on the first `speak`, to `AppState` `change`; on `background` it calls
   `stopSpeech()` (stops the voice, restores the ambience flag, invalidates late callbacks). `inactive` (Control
   Centre, an incoming-call banner on iOS) does not stop it.
2. A failing `AppState.addEventListener` is swallowed (as in `ambience.js`); `resetVoiceCacheForTests` also drops the
   subscription so each test starts clean.

## Tests

- `speak`, then `AppState` → `background`: `Speech.stop` called, last duck `false`, the word's late `onDone` does
  nothing. `inactive` does not stop. One subscription for many `speak` calls.
- Full suites; expo-doctor; iOS export.

## Live

None.
