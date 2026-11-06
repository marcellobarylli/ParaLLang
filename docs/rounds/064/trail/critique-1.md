# Critique 1: speech stops when the app goes to the background

- **Dispatched:** 2026-11-06 00:40:47 UTC
- **Returned:** 2026-11-06 00:42:17 UTC (recorded on return; the subagent ran 63 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id ac9ea7ba6e7d6445e
- **Prompt:** adversarial review of `plan-v1.md` against speech.js, ambience.js, the jest setup files and the speech
  and ambience tests (ordering with ambience's reconcile, background vs inactive, Expo Go background speech,
  subscription leaks, lazy subscription); numbered findings with evidence and a recommendation, then Optional.
- **Reviewed input:** `plan-v1.md`, sha256 2c8611fa…, HEAD 779c154, working tree docs/rounds/064/ only
- **Findings:** 5

## Raw output (verbatim)

```text
I found five things in plan v1 that need changing before you build it. None of them is fatal. One test case can't be observed the way the plan writes it, and one ducked-ambience path is still left open. I only read code; I ran no tests, and I couldn't find react-native's jest AppState mock in node_modules, so I didn't check it.

**Findings**

1. **Gap: the test can't observe the stop through injected fakes.** The `background` handler would call `stopSpeech()` with its defaults, which are the global `expo-speech` mock and the real `duckAmbience` (speech.js:51). The existing stop tests pass their own `speech` and `duck` fakes to `speak` (speech-stops.test.js:20-35). A test that does the same will see neither the `Speech.stop` call nor the "last duck `false`" that plan Tests §1 expects.
   - Recommendation: state in the plan that the handler always uses the module defaults. Write the test against the global `Speech.stop` mock and the ambience player's `.volume`, as ambience.test.js:113-126 does. Don't make the handler call the fakes from whichever `speak` subscribed first.

2. **Risk: the new subscriber lands in ambience.test.js's listener list.** That file spies on `AppState.addEventListener` and collects every listener into `appStateListeners` (ambience.test.js:21-24). It then reaches ambience's listener as `appStateListeners[0]` and asserts the list has length 1 (:87-94). Today only the test at :113 calls `speak`, so nothing breaks now. Any later test that calls `speak` before `setAmbience` will make `[0]` speech's listener and break the length check without a clear error.
   - Recommendation: the reset must call `subscription?.remove?.()` and then null it, the same way `resetAmbienceForTests` does (ambience.js:77-79). Keep it in the jest.after-env.js `beforeEach`, which runs before the file's own `beforeEach`. Add a comment in ambience.test.js that the list can hold speech's listener, or have its helper filter by owner.

3. **Risk: the ambience can stay ducked even with this fix.** The plan says an incoming call or Siri raises `inactive`, not `background`. Those are audio-session interruptions that can cut the voice off without `onStopped` or `onDone` firing. Nothing then calls `duck(false)`. On return to `active`, ambience's `reconcile` → `player(id)` re-applies the stale `ducked` flag (ambience.js:34, :56). This is the symptom C10d is about, reached by a path the plan leaves alone.
   - Recommendation: on `active` in speech.js, call `Speech.isSpeakingAsync()` and run `duck(false)` if nothing is speaking. The jest-expo mock (jest.setup.js) needs `isSpeakingAsync` added. Or record this as an explicit open item.

4. **Gap: it's unknown whether the voice keeps speaking in the background at all.** app.json sets `expo-audio` with `enableBackgroundPlayback: false`, and ambience sets `mixWithOthers`. Whether `AVSpeechSynthesizer` keeps going after backgrounding depends on Expo Go's own `UIBackgroundModes` and on the session expo-audio leaves behind, which I couldn't check here. If iOS already suspends it, the speech resumes mid-word on return, and the real bug is that resume plus the stale duck. Stopping on `background` fixes both, so the design holds. But the plan's motivation ("could keep going") is unverified.
   - Recommendation: reword it as "may resume or keep going" and list a Simulator or device check for the owner.

5. **Risk: the subscription must come before `speak`'s first await.** `listen()` has to run at the very top of `speak`, before `await speech.stop()` (speech.js:43). Then a press made just before backgrounding is caught by the generation guard at :44. Without a subscription, the `stopSpeech` calls on unmount (DialoguePanel.js:14, MapPanel.js:62, Spellbook.js:10, ReviewPanel.js:11) never subscribe. That's correct, since nothing has spoken yet.
   - Recommendation: say "first statement of `speak`" in the plan, and add a test of a `background` arriving during `speak`'s `await` that never calls `Speech.speak`.

**Optional**
- Stopping only on `background` is defensible. `inactive` also fires briefly on every app switch on its way to `background`, and when Control Centre is pulled down. Say in the plan that a switcher peek without leaving keeps the voice.
- Rename `resetVoiceCacheForTests` to something like `resetSpeechForTests` now that it also drops the subscription, or have it call a second reset. Update the comment in jest.after-env.js either way.
- Add a test that a throwing `addEventListener` doesn't stop `speak` from speaking. Match ambience.js:57.
- Call `stopSpeech()` from the handler without waiting on it, and keep its `.catch`, so no unhandled rejection comes out of an AppState callback.
```
