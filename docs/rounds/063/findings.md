# Round 063 findings

## Question

Does any voice keep speaking after the screen that started it goes (backlog C10c)?

## Finding

**It did, in two ways. Both are fixed and checked by jest.**

1. **The Spellbook and Review screens never stopped speech.** A fragment or a kept line could go on reading over the
   map or an encounter, with the ambience lowered. Both screens now stop the voice when they go, as the encounter
   and the map already did.
2. **`speak` had a race.** The critique found it. `speak` waits for the previous utterance to stop. A stop that
   arrived during that wait, from a screen being left, was ignored: the word then started anyway, and the ambience
   stayed lowered until the next utterance. `speak` now gives way to any stop or newer word that comes during the
   wait. This covers the encounter and map stops as well.

Choosing Review on a Spellbook card cuts a word still being spoken. That is intended, since the Review card has its
own 🔊 (decision 1).

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 5 findings, all accepted.
- New tests in `mobile/src/__tests__/speech-stops.test.js` (4). In two of them, `stop` is held open so the race
  window really opens.
- Ran the full suites (`npm test`), expo-doctor and the iOS export.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 172/172 (168 before; 4 new, all 4 fail without the change) |
| Server / web client | 244/244 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C10c is done. Speech going on after the app moves to the background is a new backlog line, C10d.

## Evidence

- `mobile/src/__tests__/speech-stops.test.js` covers:
  - a stop during `speak`'s wait, and a newer word during the wait;
  - leaving the Spellbook during a fragment;
  - leaving the review during a word;
  - the result render and the "no challenge" render unmounting cleanly.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

On a device, how long `Speech.stop` takes is unknown, so how often the race happened before this round is unknown
too. The jest mock resolves at once. Not checked on the Simulator.

## Open items

1. **Owner, Simulator:** start a fragment's 🔊 in the Spellbook, then return to the map at once. The voice should stop
   and the ambience come back up.
