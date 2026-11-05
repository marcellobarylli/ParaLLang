# Claude subagent critique 1: two UI sounds and a sound switch

- **Dispatched:** 2026-11-05, after 19:40:36 (journal row 3)
- **Returned:** unknown (the notification came after the draft's first full mobile run; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/037/trail/plan-v1.md` against the store, `SavesPanel.js`, `App.js`, `jest.setup.js`, `package.json`, `app.json`, the mobile tests and the server's assessment and review shapes; expo-audio API, wrong-event cues, the epoch, asset bundling, the theme test, the switch's accessibility; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 450 words
- **Reviewed input:** `plan-v1.md`, sha256 f0287184e64b8844a6d66bd804bfe6140f1661f74b67056c3c573b51a4949ca8, HEAD 770bd4c, working tree: the draft (generator, WAVs, expo-audio install, sounds.js, store and Saves changes) was being written while it ran
- **Findings:** 9

## Raw output (verbatim)

```text
I found 9 problems in the plan: 1 Error, 4 Risks and 4 Suggestions. I edited no files, started no servers and installed nothing. I checked expo-audio's API against its installed package (58.0.11, in `node_modules`, though not yet in `package.json`).

1. **Error: "any objective passed" is the wrong trigger.** `objectiveResults` holds only this turn's grading of the objectives not yet done. Objectives passed on earlier turns are not in it. The server advances in order and stops at the first miss (`learning-service.js` 477-483). So a turn where a later objective passes but the current one fails gets `passed: true` and still makes no progress. The plan would chime on that turn. On the resolving turn every remaining objective is `passed: true`. Fix: play `pass` only when the turn advanced. Compare `currentObjective?.id` before and after the reply, or check whether the first remaining objective's result passed.

2. **Risk: the review rule can be simpler.** `effectiveQuality >= 3` is the same as `result.correct` (quality 5 exact, 3 minor typo, 2 wrong, 0 reveal). Use `correct`, which is clearer. Note that practice reviews will chime too.

3. **Risk: replays.** The mobile store makes a fresh `attemptId` on every send, so `replayed: true` never reaches it today. Add a `!result.replayed` guard anyway and test it. Resumes, restarts and the save-switch loader never call the cue path, so they are fine.

4. **Risk: when the cue plays relative to the epoch.** Play only after the existing epoch/learner/version check, and before the resolved-turn world/party refresh `await`. That gives exactly one cue per reply. A test should send, switch saves, then resolve the reply and expect no cue.

5. **Risk: the audio-mode settings are correct, but may affect pronunciation.** `playsInSilentMode`, `interruptionMode: 'mixWithOthers'`, `createAudioPlayer(require(...))`, `seekTo(seconds): Promise` and `remove()` all match the installed types. The catch is that `setAudioModeAsync` sets the app-wide iOS audio session. That may change how the expo-speech pronunciation button behaves with the silent switch (I'm unsure about this part). Add it as an open Simulator/device item. Also, `seekTo` is async, so do `await player.seekTo(0); player.play()`. The jest mock's `seekTo` must return a Promise.

6. **Suggestion: inject the sounds module.** Pass it like api and storage: `createGameStore({ api, storage, sounds })`. Store tests then assert on a fake instead of the global `expo-audio` mock. Without this, the module-level player cache in `sounds.js` leaks between tests, so add a reset hook or `jest.isolateModules`. Check the switch in the store, not in `playCue`.

7. **Suggestion: startup read of the switch.** Read `parallang.soundsOn` separately from the learner startup, and don't let it overwrite a toggle made while the read is pending. The fake storage in `party.test.js` returns the learner id for every key. That still reads as "on" only because the rule treats just `'off'` as off, so keep that rule. A failed write must not throw.

8. **Suggestion: use a stable label for the switch.** "Sounds: On / Off" puts the state in the label, so VoiceOver says it twice. Use a fixed name ("Sounds") and give the state through `aria-checked`. RN's built-in `Switch` already gives role and state. Set its colours with `colors.*` tokens, because `theme.test.js` rejects literal hex outside `ui.js`. Any new text style needs `fontSize: type.*` (plus a matching `leading.*` if it sets a line height), or it must be added to MODIFIERS.

9. **Suggestion: make the WAV generator testable.** Tests can't easily import an `.mjs` script under jest-expo, and the test must not rewrite the files in `assets/`. Make the generator a CommonJS module that exports a pure `renderWav(name)` function, with a thin CLI wrapper. The test then compares its bytes with the committed files.

Optional: `.wav` needs no metro config change. It is in Metro's default `assetExts` and in jest-expo's asset list, and the app has no `metro.config.js`. Running `npx expo export --platform ios` and checking the asset map is enough. Also consider a short cooldown so two quick replies don't overlap their cues.
```
