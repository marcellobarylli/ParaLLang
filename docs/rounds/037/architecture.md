# Round 037 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` Phase 4 ("Sound design: ambient audio, UI sounds (minimal — even a few sounds
  add a lot)"). Backlog C4 is split: C4a (this round) is UI cues, and C4b (ambient audio) comes later.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** the following, plus tests. No server or prompt change.
  - `mobile/scripts/gen-ui-sounds.js` and `mobile/assets/sounds/{pass,resolve}.wav`;
  - `mobile/src/sounds.js`;
  - `expo-audio` ~58.0.11 (`package.json`, `app.json` plugin options);
  - the store, `SavesPanel.js`, `App.js`, `jest.setup.js`.

## Goal (pre-run)

Two short cues reward progress: `pass` when the current objective is met or a review is correct, and `resolve` when
an encounter is won. A per-device switch turns them off.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Sounds made here.** They are synthesized by a committed script: no third-party assets, no licence question.
   `pass` is E5 then B5 (0.35 s). `resolve` is C5, E5 then G5 (0.7 s). Both are sines with a soft octave, a 5 ms
   attack, exponential decay and a 10 ms end fade, with a peak of -12 dBFS.
2. **No sound on a miss.** It would feel punishing.
3. **The switch lives on the Saves screen**, the app's only settings-like page. It is on by default, and only a
   stored `'off'` turns it off.
4. **The ring/silent switch mutes the cues** (`playsInSilentMode: false`), and cues mix with the player's own audio.
5. **The expo-audio config plugin is set to** no microphone permission, no Android record permission, and no
   background audio. The app records nothing and plays nothing in the background. Expo Go ignores plugins anyway.
6. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **Cues.** `playCue(name)` sets the audio mode once and keeps one player per cue. Each play awaits `seekTo(0)`,
   then calls `play()`. Every error is swallowed.
2. **When.** The cue plays after the store's epoch, learner and version checks, and before the resolved-turn
   refresh (critique 1.4):
   - after a dialogue reply that is not a replay: `resolve` if the encounter resolved; otherwise `pass` if the
     current objective changed. A later objective passing alone advances nothing (critique 1.1).
   - after a review answer: `pass` when `result.correct` (critique 1.2). A reveal plays nothing.
3. **Switch.** The store holds `soundsOn` and checks it in `_cue` (critique 1.6). The cue function is injected
   (`createGameStore({ cue })`).
   - It is persisted as `parallang.soundsOn` (`on` or `off`). A failed write is ignored.
   - The startup read runs beside startup, and a switch made before it lands wins (critique 1.7).
   - The Saves screen shows it as a `role="switch"` with the fixed name "Sounds" and `aria-checked` (critique 1.8).
4. **Generator** (critique 1.9). The generator is CommonJS and exports `cueBytes(name)`. The test compares its output
   with the committed files, byte for byte.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 f0287184…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "Any objective passed" chimes without progress | + | Accept: `pass` only when the current objective changed | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.2 | Risk | Use `correct` for reviews | + | Accept (practice reviews chime too) | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Risk | Replay guard and test | + | Accept | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.4 | Risk | Cue after the epoch check, before the refresh | + | Accept (tested with a switch while the reply is out) | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Risk | The audio session may change speech with the silent switch | 0 | Accept: await `seekTo`; device open item | **Accepted** (autonomous, pending owner review) | Design 1, open items |
| 1.6 | Suggestion | Inject the sounds; check the switch in the store | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.7 | Suggestion | Startup read must not undo a switch | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.8 | Suggestion | Fixed switch name, state via `aria-checked` | + | Accept (custom Pressable with token colours) | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.9 | Suggestion | Testable CommonJS generator | + | Accept | **Accepted** (autonomous, pending owner review) | Design 4 |

**Deferred / optional:** a cooldown between cues (rejected: replies are seconds apart); no metro config needed for
`.wav` (confirmed by the iOS export).

Net change from plan-v1: progress-only `pass`, `correct` for reviews, an injected cue, a startup read that a switch
outranks, a fixed switch name, and a byte-compared generator.

## Tests (pre-run)

- `sounds.test.js`:
  - the committed WAVs equal the generator's bytes: RIFF/WAVE, PCM 16-bit mono 22 050 Hz, 0.2–1.0 s, peak between
    -13 and -11 dBFS;
  - `playCue` sets the mode once, makes one player per cue, rewinds and replays, and survives a throwing player;
  - store: a turn where a later objective alone passes plays nothing; progress plays `pass`; resolution plays
    `resolve`;
  - no cue for a replay, a miss, a reply after a save switch, or a correct review with the switch off;
  - a correct review plays `pass`, a reveal nothing;
  - the switch persists, is read at startup, and outranks a pending read; any stored value but `off` means on;
  - Saves screen: the switch's name, state and toggle.
- Theme test: the new styles are sized (`switchOn` is a modifier).
- All suites, expo-doctor, iOS export with the WAVs in the bundle.

## Outcome (2026-11-05)

Built as designed, with no Amendments. One addition: `expo-asset` (expo-audio's peer, required by expo-doctor). Cues
play on progress only, behind a persisted switch. Mobile 86/86, server 157/157, web client 12/12 and build,
expo-doctor 20/20, iOS export with both cues. See [findings](findings.md).
