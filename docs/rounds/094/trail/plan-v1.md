# Round 094 plan v1: each card keeps its 20 newest evidence entries (backlog F15)

## Source

Round 093's open item: every graded dialogue evidence and every review appends an entry to its card's `evidence`
list (`learning-service.js` `submitDialogue` and `submitReview`), never pruned.

## Measurement (before any change)

`docs/rounds/094/results/measure.mjs` (round 093's script plus evidence counts; fixture provider, Spanish Coffee
Cart, no LLM): 200 cycles (1000 turns, 200 reviews): save 288 KB with receipts already bounded at 20; 4 cards, 800
evidence entries, 400 on the busiest card; about 208 bytes per turn on disk, nearly all evidence.

## Who reads `evidence`

Nobody but tests: the server only pushes to it; `spellbookSnapshot` does not send it; the app and web client never
see it; `validateEnvelope` only requires it to be an array. Scheduling is from `schedule` alone (SM-2).

## Decision (autonomous, pending owner review)

Keep each card's 20 newest entries (`EVIDENCE_LIMIT = 20`, in `learning-storage.js`), trimmed in
`JsonLearningStorage.save` (like round 093's receipts), so an old save shrinks on its next save. Entries are appended
in time order, so the newest are the tail (`slice(-20)`). Why 20: enough recent history for a future learner model
(recent qualities), bounded at 20 × cards. Alternatives: no cap (grows ~200 B per turn); counts only (loses the
recent qualities); a cap per kind (dialogue / review): more rules, no reader.

## Design

1. `learning-storage.js`: `export const EVIDENCE_LIMIT = 20;` `export function trimEvidence(spellbook, limit)`: for
   each card in words and phrases, if `evidence.length > limit`, `evidence.splice(0, length − limit)`. Called in
   `save` after validation (with `pruneReceipts`).

## Tests

- Unit: a card with 25 entries keeps the last 20 in order; 20 or fewer unchanged; both buckets.
- Service: 25 graded turns on one card (Spanish fixture): the save's `cafe` (or the graded card) has 20 entries, the
  newest last; the schedule equals that of a run with the cap off (the cap does not change scheduling).
- An old save with a card of 100 entries shrinks to 20 on a start.
- Mutation: the call removed from `save` fails a test.
- Re-measure; full suites.

## Claim boundary

Tests and a fixture measurement. After this the save's size is bounded by the number of cards, the 20 receipts, the
50 kept lines and the world and party records.
