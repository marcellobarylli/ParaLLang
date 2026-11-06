# Round 061 findings

## Question

Can the narration be spoken, as the owner's note asks ("it is very important that everything is spoken by a quirky
narrator"), using the device's voice and no provider TTS (prototype.md Phase 4; backlog C10)?

## Finding

**Yes, on demand, checked by jest only.** Each NPC message's narration has a 🔊 beside it, "Hear the narrator". It
reads the English text with a British voice where the device has one, otherwise any English voice. It never picks
Apple's novelty or Eloquence voices, and it treats `en_GB` and `en-GB` as the same tag. A blank or missing narration
shows neither text nor button. With no English voice there is no button.

Pressing a word chip's 🔊 cuts the narration. The late stop of the narration then leaves the ambience lowered until
the word ends.

Target-language words or Errata's glitched letters inside a narration are read by the English voice, so they are
mispronounced. This is a known limitation, not a leak (decision 3). The narration does not play by itself: whether it
should is an owner question.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 8 findings, 6 accepted, 2 in part.
- New tests in `mobile/src/__tests__/narrator.test.js` (6). One existing assertion was changed on purpose: the
  lookup count in `encounter-words.test.js` went from 1 to 2, one lookup per voice tag.
- Ran the full suites (`npm test`), expo-doctor and the iOS export.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 163/163 (157 before; 6 new, 5 of which fail without the change) |
| Server / web client | 244/244 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C10 is done on demand. Reading every narration aloud as it arrives, and giving the narrator its own rate or pitch,
are left to the owner.

## Evidence

- `mobile/src/__tests__/narrator.test.js` covers:
  - the British voice and the narration text;
  - an American voice with a novelty voice listed first;
  - no English voice, so no button;
  - `en_GB` matched as `en-GB`;
  - blank narrations, and two buttons for two narrations;
  - a chip cutting the narration, with the ambience restored only by the latest utterance.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

No one has heard it yet. Which en-GB voice iOS returns (likely Daniel), how it sounds, the row layout at large Dynamic
Type sizes, and VoiceOver speaking over the narrator all need the Simulator or a device.

## Open items

1. **Owner, Simulator:** press "Hear the narrator" on an encounter line. Check the voice, the row layout, the
   ambience ducking during a long narration, and VoiceOver.
2. **Owner:** should every new narration be read automatically, behind a switch (decision 1)? Should the narrator
   have its own rate or pitch (decision 2)? Should the narration prompt avoid quoting target-language words, since the
   English voice mispronounces them (decision 3)?
