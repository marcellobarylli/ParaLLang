# Round 041 plan v1: ambient audio per location (backlog C4b)

Design source: prototype.md Phase 4 ("Sound design: ambient audio, UI sounds"). C4a (round 037) added two UI cues,
`mobile/src/sounds.js`, `mobile/scripts/gen-ui-sounds.js` and a per-device "Sounds" switch on the Saves screen.
Codex is at its usage limit; no live LLM call is needed (no server or prompt change).

## Goal

A quiet looping ambience for the player's current location (six Crumbling Market nodes), behind the same switch.

## Decisions (autonomous, pending owner review)

1. Synthesized by a committed, deterministic script (seeded PRNG), like round 037: no third-party assets.
   `mobile/scripts/gen-ambient.js` writes `mobile/assets/ambience/<locationId>.wav`: 16 000 Hz mono 16-bit, 6 s,
   seamless loop (the tail is cross-faded into the head over 0.5 s; tonal parts use whole cycles per loop), peak
   -20 dBFS (cues are -12). About 190 KB each, 1.15 MB in all.
   - market_entrance: crowd murmur (low-passed noise, slow periodic swell).
   - coffee_cart: machine hum (100 Hz + harmonics) and a steam hiss that swells once per loop.
   - butchers_stall: low room tone and two cleaver thunks (decaying 90 Hz bursts with a noise click).
   - cracked_fountain: trickling water (band-passed noise) and random droplets (short high sine blips).
   - old_bookshop: near-silent room tone and a clock tick each second.
   - the_rift: detuned drone (55 Hz against 55.5 Hz, three beats per loop) and sparse bit-crushed glitches.
2. One switch: the existing "Sounds" switch turns cues and ambience on and off together (no second setting).
3. Ambience follows `world.currentLocationId` on every screen except onboarding, including encounters and party
   conversations held elsewhere (the player is still standing at the node). No learner or no world: silence.
4. Player volume 0.5; loops; mixes with other audio; the ring/silent switch mutes it (same audio mode as cues).
   No background playback (round 037's plugin config): it pauses when the app goes to the background and resumes
   on return.

## Design

1. `mobile/src/ambience.js`: `setAmbience(locationId | null)`. One player per location, created lazily, `loop =
   true`, `volume = 0.5`. A change pauses the old player and plays the new one; null pauses. An unknown id is
   silence. Every error is swallowed. AppState: on `background`/`inactive` pause the current; on `active` play the
   current again. Shares the audio-mode promise with `sounds.js` (export `ensureAudioMode`).
2. Store: `createGameStore({ ambience = setAmbience })`. After creating the store, `store.subscribe` computes
   `want = soundsOn && view !== 'onboarding' && learnerId ? world?.currentLocationId ?? null : null` and calls
   `ambience(want)` only when it changes. Errors swallowed.
3. Generator: CommonJS, exports `ambienceBytes(id)` and `AMBIENCE_IDS`; the test compares committed bytes.

## Tests

- Every location in `content/world/locations/` has a committed ambience file and `ambience.js` lists exactly those
  ids; committed bytes equal the generator's; header 16-bit mono 16 kHz; 5–7 s; peak between -21 and -19 dBFS;
  seam continuity: |last sample − first sample| small relative to the peak.
- `setAmbience`: one player per id, loop and volume set, change pauses the old and plays the new, null pauses,
  unknown id silent, throwing player swallowed, AppState background pauses and active resumes.
- Store: ambience follows the location after initialize and after a move; switch off → null, on → back; the
  onboarding view → null.
- All suites, expo-doctor, iOS export with the WAVs in the bundle.
