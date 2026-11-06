# Round 093 plan v1: dialogue receipts are pruned (backlog F13)

## Source

Round 092's review R1.5: every dialogue and review turn stores a receipt (`spellbook.processedAssessments[attemptId]`
= kind, payloadHash, committedAt, the full response: encounter with transcript, assessment, Spellbook snapshot) and
none is ever removed.

## Measurement (before any change)

`docs/rounds/093/results/measure.mjs` (fixture provider, Spanish Coffee Cart, no LLM): cycles of a start, 4 wrong
answers, 1 right answer, 1 review reveal. After 240 receipts the save is 2.50 MB on disk (pretty-printed JSON);
without receipts the envelope is 5.8 KB. About 10.4 KB per turn on disk; one dialogue receipt is 3.5 KB compact (the
encounter 1.8 KB, of which transcript 1.2 KB; the Spellbook 1.2 KB), a review receipt 2.6 KB (the Spellbook 2.1 KB).
The Spellbook snapshot grows with the cards, so in the full market a receipt is larger. Every turn reads, validates,
clones and rewrites the whole file: the cost per turn grows linearly with the turns played, without bound.

## What receipts are for

Idempotent resends (rounds 001, 071): the app reuses an attempt id only for the same learner, encounter, version and
text (`retryIds` in `mobile/src/stores/gameStore.js`), so a resend can only succeed against the encounter version it
was made for; review attempts get a fresh id each time (no resend). A receipt also turns a reused id with different
input into ATTEMPT_REUSE.

## Decision (autonomous, pending owner review)

Keep the 20 most recent receipts (`RECEIPT_LIMIT = 20`, in `learning-storage.js`), by `committedAt`, ties in entry
order. Pruned when a receipt is written (both `submitDialogue` and `submitReview`), before the save; a save from
before this round with thousands of receipts shrinks on the learner's next turn or review. No schema change (still 3);
load does not prune (a read never writes).

Why safe: a resend whose receipt was pruned falls through to the normal checks. Dialogue: the encounter has since
moved to another version or id (STALE_VERSION / STALE_ENCOUNTER, the app's guarded reload of round 071), or is no
longer ongoing (400 "already complete"), or the server restarted (STALE_ENCOUNTER); 20 later receipts imply 20 later
turns or reviews, and reviews wait until no encounter is under way. Review: the challenge was deleted when answered
(memory only), so STALE_CHALLENGE. No turn is applied twice. What is lost: an old id resent gets an error instead
of its replay, and an old id reused with other input is no longer ATTEMPT_REUSE (ids are random UUIDs).

Alternatives: keep receipts for N days (time-based; a heavy day still grows); store receipts without the Spellbook
and rebuild it on replay like the kept lines (round 060) (halves a receipt, still unbounded); a receipt per encounter
only (the review path needs its own). Rejected for the count limit, which bounds the size and is easy to test.

## Design

1. `learning-storage.js`: `export const RECEIPT_LIMIT = 20;` and `export function pruneReceipts(spellbook, limit =
   RECEIPT_LIMIT)` that deletes all but the `limit` newest entries of `spellbook.processedAssessments` (stable sort by
   `Date.parse(committedAt)`, unparseable as oldest).
2. `learning-service.js`: call it on the staged envelope right after each receipt is added.

## Tests

- Unit: `pruneReceipts` keeps the newest 20 of 25 (by committedAt, out of entry order), ties keep the later entries,
  a missing/invalid committedAt goes first; under the limit nothing changes.
- Service: 25 dialogue turns (Spanish fixture): 20 receipts in the save; the newest attempt id resent replays
  (`replayed: true`); the first attempt id resent with its own message and version is STALE_VERSION (not replayed, no
  extra turn in the transcript); a review attempt after 20 more receipts resent is STALE_CHALLENGE.
- An old save (written with 60 receipts) shrinks to 20 after one turn.
- Re-measure with `measure.mjs`: size flat after 20 receipts.
- Full suites (server, client, mobile); the limit removed fails a test.

## Claim boundary

Tests and the fixture measurement. The bound is on receipts; the Spellbook's `evidence` arrays also grow per turn
(much more slowly; not addressed).
