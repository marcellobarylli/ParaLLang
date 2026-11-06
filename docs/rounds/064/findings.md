# Round 064 findings

## Question

Does the speech voice stop when the player leaves the app, and does coming back leave the ambience lowered (backlog
C10d)?

## Finding

**Both are handled now, checked by jest only.**

- **Leaving the app.** When the app goes to the background, the voice stops and the ambience comes back up. A word
  that was still waiting to start never starts. Pulling down Control Centre or peeking at the app switcher
  (`inactive`) does not cut a word.
- **Coming back.** On return, the ambience is raised again if nothing is speaking. An interruption such as a call or
  Siri can cut the voice without a callback, and that no longer leaves the ambience lowered. The critique found this
  path.
- **What is still unknown.** Whether Expo Go on iOS would otherwise keep the voice going or resume it is not known
  here. The fix covers both cases.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 5 findings, all accepted.
- New tests in `mobile/src/__tests__/speech-background.test.js` (4). The jest mock of `expo-speech` gains
  `isSpeakingAsync`.
- Ran the full suites (`npm test`), expo-doctor and the iOS export.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 176/176 (172 before; 4 new, 3 of which fail without the change; `ambience.test.js` unchanged) |
| Server / web client | 244/244 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C10d is done. The narrator series (rounds 061–064) is complete.

## Evidence

- `mobile/src/__tests__/speech-background.test.js` covers:
  - stopping on `background` and not on `inactive`, with one subscription;
  - `background` during `speak`'s wait;
  - return to `active` while the voice still speaks, after it stopped, and when `isSpeakingAsync` fails;
  - a throwing `addEventListener`.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Untested on a device. Expo Go's background audio behaviour and how iOS reports `isSpeakingAsync` after an
interruption are unverified.

## Open items

1. **Owner, Simulator or device:** start a fragment's 🔊, then press Home. The voice should stop. Come back: the
   ambience should be at full volume. Also check a peek at Control Centre (the voice should go on) and an incoming
   call on a device.
