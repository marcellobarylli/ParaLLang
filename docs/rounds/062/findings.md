# Round 062 findings

## Question

Can the narrator voice of round 061 also read the other English narrator texts on screen: the map card and the
companion briefing (backlog C10b)?

## Finding

**Yes, checked by jest only.**

- **The map card.** It has "Hear the place" beside the title. The button reads the place's name, its description and
  its atmosphere line (when one is shown for that place), as one utterance. It reads what the card shows at the moment
  of the press.
- **Stopping.** Moving to another place or leaving the map stops the voice, so an old description no longer plays
  under the new card. The new place's ambience then plays at full volume.
- **The companion card.** It has "Hear the briefing", which reads the companion's lines joined, each ending in
  punctuation. The name says it is the narrator voice reading the briefing, not the companion's own voice.
- **A known limit.** Capitals and target-language words in descriptions are read by the English voice as it pleases.
  Examples are MERCATO at the Market Entrance and PLEASE DO NOT HUM at the Fountain.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 7 findings, all accepted.
- New tests in `mobile/src/__tests__/narrator-places.test.js` (5).
- Ran the full suites (`npm test`), expo-doctor and the iOS export.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 168/168 (163 before; 5 new, 3 of which fail without the component changes) |
| Server / web client | 244/244 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C10b is done. One follow-up is left as C10c: the Review and Spellbook views still let a word keep speaking after they
are left.

## Evidence

- `mobile/src/__tests__/narrator-places.test.js` covers:
  - `speechText`;
  - the place read at press time, with and without the atmosphere line, and never another place's line;
  - no voice, so no button;
  - the voice stopping on a move and on unmount, and the ambience volume after a move;
  - the briefing joined.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

No one has heard it yet. How the voice says MERCATO and the capitals, the title row at large Dynamic Type sizes, and
VoiceOver all need the Simulator.

## Open items

1. **Owner, Simulator:** "Hear the place" at the Market Entrance and the Fountain (capitals, MERCATO), and "Hear the
   briefing" at the Entrance. Check the title row layout and VoiceOver.
2. **Owner:** should descriptions avoid capitals and target-language words for the voice, or keep them for the page
   (decision 2)?
