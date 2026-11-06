# Round 093 findings

## Question

Every dialogue turn and review stored a receipt (the full response: encounter with transcript, assessment and a
Spellbook snapshot) in the learner's save, and none was ever removed (round 092 review R1.5, backlog F13). How fast
does a save grow, and can receipts be bounded without letting a resent answer be applied twice?

## Finding

**Receipts were 98% of a save and grew it about 10 KB per turn; a save now keeps its 20 newest, without Spellbook
snapshots, and stays flat.**

- **Before:** in a scripted Spanish play (fixture provider, no LLM), 240 turns and reviews made a **2.50 MB** save,
  while everything but the receipts was under 19 KB. The server reads (and on a turn clones and rewrites) the whole
  file on every request, so each turn cost more than the last. A receipt's Spellbook snapshot grows with the cards,
  so in the full market it would have been worse.
- **After:** **158 KB** after the same play, flat at 20 receipts from turn 20 on. A dialogue receipt holds the
  encounter and the verdict; a review receipt is under 0.5 KB.
- **No double application.** Pruning is safe for any limit: a committed turn raises the encounter's version and an
  answered review challenge is deleted, so a resend whose receipt is gone is refused as stale (STALE_VERSION,
  STALE_ENCOUNTER, STALE_CHALLENGE) and changes nothing. The limit only decides how long a lost response can still be
  replayed; the app resends only its latest answer and the web client never resends.
- **The receipt just written is always kept**, also when the clock steps back; equal times keep the later entry
  (Amendment 1).
- **A replay carries the Spellbook as it is now**, as the kept lines and inscriptions already did.
- **Old saves shrink on their next save of any kind** (a start, a move, a turn).
- **A pre-existing bug, fixed:** an attempt id named like an object property (`constructor`) was taken for a receipt
  and refused as ATTEMPT_REUSE.
- **Still growing:** each card's `evidence` list gains an entry per graded turn and review, about 500 bytes per turn
  on disk in this play (backlog F15).

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex
(usage limit until 2026-11-09 17:32 UTC): 6 findings (3 Error), all accepted. Measured with
[`results/measure.mjs`](results/measure.mjs) (40 cycles of a restart, 4 wrong answers, 1 right answer and 1 review
reveal), at the build and with the build stashed. Offline, no LLM call. Each fix was removed in turn to see that a
test fails without it.

## Results

| Check | Result |
|---|---|
| Save after 240 receipts (fixture) | 2,497,351 bytes before, 158,057 after; receipts 240 → 20 ([before](results/before.txt), [after](results/after.txt)) |
| Growth per turn on disk | about 10,400 bytes before, about 500 after (card evidence) |
| `server/test/receipts.test.js` (new) | 9/9: newest by time out of entry order; the receipt just written kept (integer-like ids, a clock stepped back); unreadable times first; 25 turns keep 20 receipts without Spellbook; the newest replays with the current Spellbook; a pruned turn is STALE_ENCOUNTER and a pruned review STALE_CHALLENGE, cards unchanged; an old save of 60 shrinks on a start; a failed save leaves the file as it was; `constructor` as an attempt id; a review under a stepped-back clock replays |
| A fix removed → test fails | 8/8: the prune in `save`, `keepId`, the review's `keepReceiptId`, the Spellbook kept in receipts, the replay's current Spellbook, `Object.hasOwn`, the tie rule (the dialogue `keepReceiptId` is covered by the stepped-back clock test) |
| Updated tests | `inscriptions.test.js`, `kept-lines.test.js`: a receipt holds no `spellbook` (was: a Spellbook without lines or inscriptions) |
| Full suites | server 343/343 (334 before), client 12/12 and build, mobile 263/263 (mobile unchanged) |

## Decision

Keep the limit of 20 and receipts without the Spellbook (autonomous decisions, pending owner review).

## Evidence

`server/src/learning-storage.js` (`RECEIPT_LIMIT`, `pruneReceipts`, `save`), `server/src/learning-service.js`
(`forReceipt`, `receiptOf`, `replay`), `server/test/receipts.test.js`, [`results/`](results/),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests and a fixture measurement on one encounter. The byte figures are for this scripted play; the full market's
Spellbook is larger, which made the old receipts larger and does not affect the new ones. A dialogue receipt still
holds its encounter's transcript, which is bounded by the encounter's length, not by a byte limit.

## Open items

- Backlog **F15**: the cards' `evidence` lists grow per turn (about 500 bytes per turn here). SM-2 needs only the
  schedule; measure what reads `evidence` before pruning it.
- Deferred: the in-memory review challenges per learner (fetched, never answered) are not capped.
