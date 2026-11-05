# Round 037 plan v1: two UI sounds and a sound switch (C4, first part)

Backlog C4 (prototype.md Phase 4 "Sound design: ambient audio, UI sounds (minimal — even a few sounds add a lot)"),
split: C4a is UI sounds; ambient audio (C4b) needs longer assets and is later. Codex is at its usage limit (until
about 20:35 UTC). No server or prompt change, no LLM call.

## Design

1. **Assets made here, no licence question.** `mobile/scripts/gen-ui-sounds.mjs` writes two short WAVs
   (16-bit PCM, mono, 22 050 Hz) to `mobile/assets/sounds/`: `pass.wav` (two rising sine notes with a soft
   harmonic, about 0.35 s) and `resolve.wav` (three rising notes, about 0.7 s), each with a fast attack and
   exponential decay, peak at about -12 dBFS. Deterministic (no randomness); the script is committed and the files
   are its output.
2. **Playback** in `mobile/src/sounds.js` with `expo-audio` (new dependency, `npx expo install expo-audio`, SDK 58):
   `playCue(name)` creates (once) and replays an `AudioPlayer` per cue; any error is swallowed (a sound never breaks
   play). The audio mode is set once: `playsInSilentMode: false` (the ring/silent switch mutes cues) and mixing with
   other audio (`interruptionMode: 'mixWithOthers'`), so it never stops the player's music or VoiceOver speech.
3. **When:**
   - after a dialogue turn: `resolve` if the encounter resolved, else `pass` if any objective in the assessment
     passed; nothing on a miss (no punishing sound);
   - after a review answer: `pass` when `effectiveQuality >= 3`; nothing on a reveal.
   Replies dropped by the request epoch (save switch) play nothing.
4. **A switch.** `soundsOn` in the store, persisted as `parallang.soundsOn` (default on; a stored `'off'` turns it
   off). A "Sounds: On / Off" switch (`role="switch"`, `aria-checked`) on the Saves screen, the app's only settings
   page today.
5. **Jest:** `expo-audio` mocked in `jest.setup.js` (`createAudioPlayer` returning `{ seekTo, play, remove }`,
   `setAudioModeAsync`).

## Tests

- `sounds.test.js`: the WAVs are valid (RIFF/WAVE, PCM 16-bit mono 22 050 Hz), 0.2–1.0 s long, peak between -18 and
  -9 dBFS; the script regenerates identical bytes; `playCue` creates one player per cue and replays it; a throwing
  player does not throw.
- Store: a passing turn plays `pass`, a resolving turn plays `resolve` (once), a miss plays nothing; a good review
  plays `pass`, a reveal nothing; with the switch off nothing plays; the switch persists and is read at startup; a
  reply after a save switch plays nothing.
- Saves screen: the switch's state and label.
- All suites; expo-doctor; iOS export (assets bundled).

## Not in scope

Ambient audio (C4b), haptics, per-cue volume settings.
