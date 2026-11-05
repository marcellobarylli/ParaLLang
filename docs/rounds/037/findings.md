# Round 037 findings

## Question

Can the app play a few UI sounds (prototype.md Phase 4: "minimal — even a few sounds add a lot") without third-party
assets, and only on real progress?

## Finding

Yes, in tests and in the iOS bundle. Two cues, synthesized by a committed script, play on progress only:
- `pass` (E5 then B5, 0.35 s) when the current objective is met or a review answer is correct;
- `resolve` (C5, E5, G5, 0.7 s) when an encounter is won.

A miss, a replayed attempt, a reveal, and a reply that lands after a save switch play nothing. A "Sounds" switch on
the Saves screen turns the cues off per device, and the ring/silent switch mutes them.

The critique's Error was that the server's `objectiveResults` can mark a later objective passed on a turn that makes
no progress, since objectives advance in order. "Any passed" would have chimed on that turn. The cue now follows a
change of the current objective.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 9 findings, all accepted.
- A draft was in the working tree before the critique returned (journal row 5).
- `expo-audio` ~58.0.11 added with `npx expo install`, and its config plugin set to no microphone and no background
  audio. expo-doctor then failed one check (peer `expo-asset`), so `expo-asset` ~58.0.20 was added: 20/20.
- The iOS export bundles both WAVs, with md5s equal to the committed files.
- Test trap: `newSave` returns early while a reply is out (`isLoading`). The "reply after a save switch" case is
  therefore tested by changing the learner while the reply is pending.
- Linux compute node. No LLM calls. The cues were not heard (no audio device).

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 79/79 | 86/86 (sounds 7) |
| server, web vitest, web build | 157/157, 12/12, ok | unchanged |
| `npx expo-doctor` | 20/20 | 20/20 (19/20 until `expo-asset` was added) |
| iOS export | ok | ok, `pass.wav` 15 480 B and `resolve.wav` 30 914 B bundled |

## Decision

Keep it. C4a is done. C4b (ambient audio per location) is open, with longer assets and the same no-licence approach.

## Evidence

The round's build commit; journal rows 4–9; `mobile/scripts/gen-ui-sounds.js`, `mobile/assets/sounds/`,
`mobile/src/sounds.js`, `mobile/src/__tests__/sounds.test.js`.

## Claim boundary

Tests and bundle only. Nobody has heard the cues, on a speaker or on a phone. Whether setting the app's audio session
changes how the pronunciation button (expo-speech) behaves with the silent switch is unknown (critique 1.5).

## Open items

1. Owner, device or Simulator: listen to both cues (pleasant? too loud next to speech?); check the Sounds switch on
   the Saves screen with VoiceOver.
2. Owner, device: with the ring/silent switch on silent, the cues are muted. Check whether the pronunciation button
   still speaks as before.
3. Owner: a sound on a miss, or none (none chosen).
