# Round 041 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` Phase 4 ("Sound design: ambient audio, UI sounds"). Backlog C4b; C4a (UI cues)
  was round 037.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** the following, plus tests. No server, content or prompt change.
  - `mobile/scripts/gen-ambient.js` and `mobile/assets/ambience/<locationId>.wav` (six);
  - `mobile/src/ambience.js`; `ensureAudioMode` in `mobile/src/sounds.js`; ducking in `mobile/src/speech.js`;
  - the store (`ambience` injected, `soundsKnown`); `jest.setup.js` (player mock: `pause`, `loop`, `volume`);
  - `wav(samples, rate)` in `mobile/scripts/gen-ui-sounds.js` (the cues' bytes are unchanged).

## Goal (pre-run)

A quiet looping ambience for the player's current location (the six Crumbling Market nodes), behind the existing
Sounds switch.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Sounds made here**, by a committed deterministic script (seeded PRNG): no third-party assets, no licence
   question. 16 000 Hz mono 16-bit PCM WAV, 6 s per loop, 192 KB each, 1.15 MB in all. WAV on purpose: compressed
   formats pad the start and end, which would put a gap in every loop.
   - Market Entrance: crowd murmur (low-passed noise, slow swells) with a chatter band.
   - Coffee Cart: machine hum (200, 400, 600 Hz) and a steam hiss that swells once per loop.
   - Butcher's Stall: room tone and two cleaver thunks (180 + 360 Hz decaying, with a noise click).
   - Cracked Fountain: trickling water (band-passed noise) and fourteen droplets (short rising blips).
   - Old Bookshop: near-silent room tone and a clock tick each second.
   - The Rift: a beating drone (220 Hz against 222 Hz, twelve beats per loop) and five bit-crushed glitches.
   All tones sit at 180 Hz or above, in the range a phone speaker plays (critique 1.1).
2. **One switch.** The Sounds switch on the Saves screen turns cues and ambience on and off together.
3. **Ambience follows `world.currentLocationId`** on every screen except the first-launch statement, including
   encounters and party conversations held there (the player still stands at the node). Without a learner or a
   world, and until the stored switch has been read, it is silent.
4. **Level.** Each loop is levelled to an average of -30 dBFS RMS, with peaks never above -12 dBFS (critique 1.2).
   The Old Bookshop and the Butcher's Stall come out quieter (their ticks and thunks hit the ceiling first). The
   player volume is 0.5, and 0.15 while the pronunciation voice speaks (critique 1.8). It loops and mixes with other
   audio, and the ring/silent switch mutes it (the cues' audio mode).
5. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **Generator** (`gen-ambient.js`, CommonJS). Each recipe renders `LENGTH + FADE` samples (6 s + 0.5 s) of
   continuous bed. `loop(bed)` keeps `LENGTH` samples and blends `[LENGTH, LENGTH + FADE)` into `[0, FADE)` with
   equal-power sin/cos gains, so the loop's end runs on into its start (critique 1.3). Tones use whole cycles per
   loop. Events (thunks, ticks, drops, glitches) are added afterwards and wrap across the seam. Exports `AMBIENCE_IDS`,
   `LENGTH`, `FADE`, `loop`, `render`, `ambienceBytes`.
2. **Player** (`ambience.js`). `setAmbience(id | null)` stores the wanted id at once and runs one reconcile: it
   pauses every player but the wanted one, awaits the shared audio mode, and plays the wanted one unless a later
   change came meanwhile (critique 1.5). It keeps one lazily created looping player per location. An unknown id
   means silence, the same id twice is a no-op, and every error is swallowed. expo-audio pauses players in the
   background and resumes them on return. An AppState `active` handler also reconciles, for a call or Siri; there
   is no pause on `inactive` (critique 1.4). `duckAmbience(on)` sets the volume to 0.15 or back to 0.5.
3. **Speech** (`speech.js`). `speak` ducks before speaking and restores on `onDone`, `onStopped` and `onError`.
4. **Store.** `createGameStore({ ambience })` subscribes to itself. The wanted id is
   `soundsOn && soundsKnown && view !== 'onboarding' && learnerId ? world?.currentLocationId : null`, and the
   ambience is called only when that id changes. `soundsKnown` turns true once the stored switch's read settles, or
   on a switch (critique 1.9). Nothing is called before a location is known.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 d74fdaa1…; Claude subagent (general-purpose, claude-opus-5-5), read-only;
raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | 55–100 Hz tones are inaudible on a phone speaker | + | Accept: all tones 180 Hz or above; Rift 220/222 Hz | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.2 | Risk | Peak normalisation leaves noise beds near silent | + | Accept: RMS -30 dBFS, peak ceiling -12 | **Accepted** (autonomous, pending owner review) | Decision 4, Tests |
| 1.3 | Risk | Seam method underspecified; seam test weak | + | Accept: equal-power blend of the rendered tail; `loop` tested directly | **Accepted** (autonomous, pending owner review) | Design 1, Tests |
| 1.4 | Risk | expo-audio already pauses in the background; `inactive` pause is wrong | + | Accept: only an `active` reconcile | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Risk | Rapid changes can race | + | Accept: wanted set at once, one reconcile, generation check; A→B→null test | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.6 | Risk | Player mock lacks `pause`, `loop`, `volume` | + | Accept: mock extended, exact counts asserted | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Risk | Default ambience is a shared singleton across test stores | 0 | In part: `resetAmbienceForTests`, lazy listener, `ambience: jest.fn()` in the cue tests (which count players); other store tests keep the default (they assert nothing about audio, and the mock is harmless) | **Accepted in part** (autonomous, pending owner review) | Tests |
| 1.8 | Suggestion | Duck under the pronunciation voice | + | Accept: 0.15 while speaking; device check open | **Accepted** (autonomous, pending owner review) | Decision 4, Design 3 |
| 1.9 | Suggestion | Stored "off" can lose to an early world | + | Accept: `soundsKnown` | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.10 | Suggestion | Read ids from the YAML; start location gets ambience | + | Accept: ids from `id:`; the startup test plays the start location | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** WAV kept and the reason written down (accepted); the `.mjs` comment in `sounds.js` fixed;
a ±1 LSB tolerance in the byte comparison (rejected: the cue test has held byte for byte since round 037, and a
mismatch should be seen); 11 025 Hz (rejected: droplets and hiss sit above 5.5 kHz); players are paused, never
removed (intentional); the bundle check and a device loop check (accepted: Tests, open items).

Net change from plan-v1: higher tones, loudness by RMS, an equal-power seam tested directly, an `active`-only
AppState reconcile, a race-safe reconcile, ducking under speech, and `soundsKnown`.

## Tests (pre-run)

- `ambience.test.js`:
  - the ids read from every location YAML equal `AMBIENCE_IDS` in the app and in the generator;
  - committed bytes equal the generator's; 16-bit mono 16 kHz; 6 s; peak at most -12 dBFS; RMS between -40 and
    -29.5 dBFS;
  - `loop` on a synthetic bed: the head starts as the tail's continuation, the middle of the fade is the
    equal-power mix, and the rest is unchanged;
  - `setAmbience`: one looping player per id at volume 0.5, a change pauses the old one, the same id twice does
    nothing, null and unknown ids are silent; A→B→null in one tick ends silent; `active` reconciles, `inactive`
    and `background` do nothing; a throwing player is swallowed;
  - ducking: 0.15 while speaking, restored on done, stopped and error; a new place while ducked starts ducked;
  - store: the start location after startup, a move, no call for a screen change; the switch off and on; a stored
    off that arrives after the world plays nothing; the statement screen is silent until the market is entered.
- `pronunciation.test.js`: the speak call carries the callbacks (`objectContaining`).
- All suites, expo-doctor, the iOS export with all six WAVs bundled (md5).
