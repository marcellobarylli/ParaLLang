# Round 041 findings

## Question

Can each Crumbling Market location have a quiet looping ambience (prototype.md Phase 4), made without third-party
assets, that follows the player and never gets in the way of play or of the pronunciation voice?

## Finding

Yes, in tests and in the iOS bundle. Six loops are synthesized by a committed script, one per location, each 6 s at
16 kHz. The loop for the current location plays on every screen but the first-launch statement. It goes quiet when
the Sounds switch is off, and drops to 0.15 volume while the pronunciation voice speaks.

The critique's Error was the bass. The first draft used 55–100 Hz tones (the Rift's beating drone, the coffee hum),
which a phone speaker barely plays, so two loops would have been near silent. All tones are now 180 Hz or above. The
Rift beats at 220 against 222 Hz.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 10 findings, 9 accepted and 1 in part.
- A draft was in the working tree before the critique returned (journal row 5).
- `wav()` in the cue generator takes a rate now. The regenerated cues are byte-identical (`cmp`).
- The iOS export bundles all six WAVs, with md5s equal to the committed files.
- Linux compute node. No LLM calls. Nobody has heard the loops (no audio device).

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 95/95 | 105/105 (ambience 10) |
| server, web vitest, web build | 163/163, 12/12, ok | unchanged |
| `npx expo-doctor` | 20/20 | 20/20 |
| iOS export | ok | ok, six loops of 192 044 B bundled |

Levels as rendered:

| Location | Peak dBFS | RMS dBFS |
|---|---|---|
| Market Entrance | -16.7 | -30.0 |
| Coffee Cart | -19.8 | -30.0 |
| Butcher's Stall | -12.0 | -34.8 |
| Cracked Fountain | -15.3 | -30.0 |
| Old Bookshop | -12.0 | -38.3 |
| The Rift | -20.0 | -30.0 |

The thunks (Butcher's Stall) and the clock ticks (Old Bookshop) hit the -12 dBFS peak ceiling before the average
reaches -30 dBFS, so those two loops are quieter.

## Decision

Keep it. C4 (Sound design) is done.

## Evidence

The round's build commit; journal rows 4–8. Files: `mobile/scripts/gen-ambient.js`, `mobile/assets/ambience/`,
`mobile/src/ambience.js`, `mobile/src/__tests__/ambience.test.js`.

## Claim boundary

Tests and bundle only. Nobody has listened to the loops. The following are unknown:
- whether they please and loop without a gap on a device;
- whether 0.5 volume is right beside the cues and the voice;
- how expo-speech and the silent switch interact (round 037's open item).

## Open items

1. Owner, device or Simulator: listen to all six loops (character, level, a gap or click at the seam), with the
   Sounds switch on and off. Check that moving on the map changes the loop.
2. Owner, device: check the pronunciation voice over the ducked ambience and, with the ring/silent switch on silent,
   whether the voice is muted too. Check that the loop resumes after the app returns from the background or a call.
3. Owner: are synthesized loops acceptable, or should real recordings replace them later?
