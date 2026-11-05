# Round 055 findings

## Question

Can the player hear each word chip of an encounter line in the target-language voice, as on Spellbook cards and in
reviews, without spending a hint or revealing a meaning (backlog C5, prototype.md Phase 4 "TTS … for words")?

## Finding

**Yes, in the app; checked by jest only, not by ear.** Each chip under an NPC line now has a 🔊 beside it. It
speaks the chip's own word with the pack's voice. It is a separate button, so it stays enabled in all three cases
where the chip is disabled: loading, meaning shown, and no hints left. When no voice is installed, the chip rows
show no speaker at all; Spellbook and reviews keep their 🔇. Three side changes from the critique:

- one voice lookup per language, shared by every button;
- a previous word's late callback no longer raises the ambience under the next word;
- leaving the encounter stops the voice.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 10 findings, 9 accepted (all 3 Errors), 1 in part.
- Checks: mobile jest, server and client tests, `npx expo-doctor`, `npx expo export --platform ios`.
- No live LLM runs: nothing on the server or LLM side changed. There is no iOS Simulator here.

## Results

| Check | Result |
|---|---|
| Mobile jest | 139/139 (131 before; 8 new in `encounter-words.test.js`) |
| Server / web client | 228/228 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C5 is done for words. Speaking a whole NPC line is not planned: the lines are mixed-language, and one voice would
read the English parts badly.

## Evidence

- `mobile/src/__tests__/encounter-words.test.js`: chips, the three disabled paths, no voice, the cache, speech
  generations, stop on unmount.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

The chain is tested in jest with mocked expo-speech; untested on a device:

- the sound itself;
- the layout of chip rows that wrap;
- VoiceOver order;
- the iOS case where voices load late.

A miss is looked up again only when a button mounts, so an already open line keeps no speaker until its row mounts
again.

## Open items

1. **Owner, Simulator:** an encounter line with several chips. Check the wrapping, that each 🔊 speaks its own
   chip's word in Italian and Spanish, VoiceOver order (chip, then speaker), and a cold start where voices arrive
   late (critique 1.5).
2. Owner: whether the spoken form should be the chip's dictionary form (now) or the inflected form in the line.
