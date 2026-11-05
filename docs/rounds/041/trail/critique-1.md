# Critique 1: ambient audio per location (Claude subagent; Codex at its usage limit)

- **Dispatched:** unknown, between 20:03:34 and 20:04:10 UTC
- **Returned:** unknown, before 20:05:55 UTC (115 s after dispatch by the agent's own duration)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only by instruction, repo access
- **Prompt:** adversarial read-only review of `docs/rounds/041/trail/plan-v1.md` and the code it touches (sounds.js,
  gen-ui-sounds.js, gameStore.js, App.js, jest.setup.js, sounds.test.js, app.json, package.json, expo-audio types,
  content/world/locations/); numbered Error / Risk / Suggestion items with fixes, Optional unnumbered, under 700 words
- **Reviewed input:** `plan-v1.md`, sha256 d74fdaa1e816d6dbaf9b97eb37908ede8939e9af79b2fa5b8a3f54ee8198db67, HEAD 71d9ee3,
  working tree: docs/rounds/041/ plus a draft generator in mobile/ (written during the critique)
- **Findings:** 10 (1 Error, 6 Risks, 3 Suggestions)

## Raw output (verbatim)

```text
I found 1 error, 6 risks and 3 suggestions. The biggest problem is the bass: the low tones the plan relies on will not be heard on an iPhone speaker.

1. **Error: the bass parts fall below what an iPhone speaker can play.**
   The rift drone (55 vs 55.5 Hz), the coffee hum (100 Hz) and the cleaver thunks (90 Hz) are under what the built-in speaker reproduces (it rolls off below roughly 200–300 Hz). Two of the six locations would come out close to silent, and the rift loses its beating, which is its whole effect.
   Fix: build the tonal parts from higher harmonics, such as 220/222 Hz partials, or 110 Hz plus strong 2nd–4th harmonics. Keep the whole-cycles rule: 222 Hz × 6 s = 1332 cycles, and the 2 Hz beat gives 12 beats per loop.

2. **Risk: the loudness target is set by peak, so noise beds end up nearly inaudible.**
   Low-passed noise normalized to a -20 dBFS peak averages about -32 dBFS. With player volume 0.5 it plays at about -38 dBFS.
   Fix: normalize by average level (for example RMS around -30 dBFS with a peak ceiling of -12). Test both bounds instead of a ±1 dB peak window.

3. **Risk: the seam method is underspecified and the seam test is weak.**
   "Tail cross-faded into head over 0.5 s" only gives a seamless loop if you render 6.5 s and mix the extra 0.5 s into the first 0.5 s. With uncorrelated noise, a linear fade also dips by about 3 dB in the middle.
   Fix: say "render L + F, blend samples [L, L+F) into [0, F) with equal-power (sin/cos) gains, keep L". For the test, have the generator expose the unwrapped render and check the wrapped head equals the blend. Comparing only the last and first samples says little about noise.

4. **Risk: native expo-audio already pauses and resumes on background.**
   `ios/AudioModule.swift` runs `OnAppEntersBackground` → `pauseAllPlayers()` when `shouldPlayInBackground` is false, and `OnAppEntersForeground` → `resumeAllPlayers()`, which resumes whatever it paused. Adding JS AppState handling on top is mostly redundant. It also pauses the ambience on `inactive` (Control Center, notification shade, Face ID). It is still useful for re-playing after a phone call or Siri interruption.
   Fix: keep only an `active` handler that reconciles (item 5), drop the `inactive` pause, and document that the native module does the background pause.

5. **Risk: rapid location changes can race.**
   `setAmbience` waits for `ensureAudioMode()`. Quick sequences such as A→null→A, or a move during first start-up, can play or pause in the wrong order if "old" is captured before the wait.
   Fix: store `wanted = id` synchronously. After the wait, run a single reconcile that pauses every player except `players.get(wanted)` and plays that one if it isn't playing. The AppState handler calls the same reconcile. Add a test for A→B→null in the same tick.

6. **Risk: the jest mock lacks what the ambience code uses, and swallowed errors hide that.**
   `jest.setup.js`'s `createAudioPlayer` mock has no `pause`, `loop` or `volume`. Because `setAmbience` swallows every error, tests could pass while nothing happens.
   Fix: add `pause: jest.fn()`, `loop: false`, `volume: 1` and `playing` to the mock. Assert exact `play` and `pause` call counts and that `loop === true` and `volume === 0.5` after the call.

7. **Risk: the store's default ambience is a shared singleton.**
   `createGameStore({ ambience = setAmbience })` plus the module-level `useGameStore` means every test store in the 6 files that create one drives the same `ambience.js` state and AppState listener.
   Fix: add a `resetAmbienceForTests()` (like `resetSoundsForTests`), register the AppState listener lazily, and pass `ambience: jest.fn()` in the existing store tests.

8. **Suggestion: lower the ambience while the pronunciation button speaks.**
   `expo-speech` uses the app's audio session by default (`usesApplicationAudioSession`), so speech mixes with a 0.5 loop during dialogue. That hurts the very sound the learner is listening to. Also note: once the ambience sets the mode at start-up, the ring/silent switch mutes speech from the first screen, not only after the first cue. That was already true for the default category, but it should be written down.
   Fix: pass `onStart`/`onDone`/`onStopped` in `speech.js` and drop the ambience to about 0.15 while speaking. At minimum, list "speech audible over ambience, silent switch behaviour" as a Simulator/device check for the owner.

9. **Suggestion: the stored "Sounds off" setting can lose a race on start-up.**
   `initialize` defaults `soundsOn: true` and reads `SOUNDS_KEY` without waiting for it. If the world arrives first, a player who turned sounds off hears a brief burst of ambience.
   Fix: add a `soundsKnown` flag (set when that read settles) to the `want` condition.

10. **Suggestion: take the id list from the YAML, not file names.**
    The location test should read each file's `id:`. The ids match the file names today (`market_entrance` … `the_rift`), but that is a coincidence. Also assert that `world.start` gets ambience before the player's first move (on a fresh save `currentLocationId` falls back to `world.start` on the server).

## Optional
- Keep the files as WAV/PCM. Native looping enqueues the next copy on an AVQueuePlayer, and PCM avoids the encoder padding gaps MP3/AAC would add at the seam. Say so in the plan so nobody "optimizes" to AAC later.
- The plan says `scripts/gen-ui-sounds.mjs` in `sounds.js`'s header, but the file is `.js`. Fix that comment while you are in there.
- Byte-exact comparison depends on `Math.sin`/`Math.exp` giving the same results across Node and V8 versions. The int16 rounding makes a mismatch unlikely but not impossible. A ±1 LSB tolerance fallback would stop the test flaking.
- 1.15 MB is fine. 11025 Hz would roughly halve it, at the cost of the droplets and hiss above 5.5 kHz.
- Six never-removed players are fine. Note that `setSoundsOn(false)` pauses but does not `remove()` them, and that is intentional.
- Add an expo-doctor and iOS export check that the six WAVs are in the bundle. List looping without gaps on a device as an open item for the owner.
```
