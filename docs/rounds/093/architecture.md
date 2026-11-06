# Round 093 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** backlog **F13** (round 092 review R1.5): assessment receipts (`spellbook.processedAssessments`) are
  never pruned.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-storage.js`, `server/src/learning-service.js`, tests,
  `results/measure.mjs`.

## Measurement before the change (pre-run)

`results/measure.mjs` (fixture provider, Spanish Coffee Cart, no LLM; cycles of a restart, 4 wrong answers, 1 right
answer, 1 review reveal): after 240 receipts the save is **2.50 MB** on disk (pretty-printed), while the envelope
without receipts is 5.8 KB; about 10.4 KB per turn. A dialogue receipt is 3.5 KB compact (encounter 1.8 KB, of which
transcript 1.2 KB; Spellbook 1.2 KB), a review receipt 2.6 KB (Spellbook 2.1 KB). Every request reads, validates and
(on a turn) clones and rewrites the whole file, so a turn's cost grows with every turn ever played.

## Goal (pre-run)

The number of receipts in a save is bounded, a receipt holds no Spellbook snapshot, and no turn or review can be
applied twice because a receipt was pruned.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Keep the 20 newest receipts** (`RECEIPT_LIMIT = 20`), the one just written always among them (critique 1.2);
   the others by `committedAt`, ties in an arbitrary but fixed order (critique 1.3: integer-like attempt ids reorder
   object keys). Pruned in `JsonLearningStorage.save` on every save (critique 1.6), so an old save shrinks on its
   next write of any kind; the service passes the id it just wrote (`keepReceiptId`). Load does not prune.
2. **Why it is safe (critique 1.1).** Not because of the count: every receipt-writing path makes the same input
   unreplayable once committed. A dialogue turn raises the encounter's version before it returns (a resend is
   STALE_VERSION, or STALE_ENCOUNTER after a restart or another start, each a fresh id); an answered review challenge
   is deleted (STALE_CHALLENGE). So the limit only decides how long a lost response stays replayable. The app reuses
   an attempt id only for the same encounter, version and text and clears them on success; the web client never
   resends. A comment at the prune states this rule for future receipt writers.
3. **Receipts hold no Spellbook (critique 1.4).** Dialogue and review receipts are stored without `spellbook`; a
   replay carries the Spellbook as it is now (`spellbookSnapshot(envelope)`), as the kept lines and inscriptions
   already were (round 060, 082). Receipts from older saves keep theirs until pruned; their replay is rebuilt too.
   The bound is then about 20 × (encounter snapshot + assessment); the transcript is bounded by an encounter's length.
4. **Attempt ids by own property (Optional, accepted):** the receipt lookup uses `Object.hasOwn`, so an id such as
   `constructor` is not taken for a receipt.
5. **Rejected / deferred:** compact JSON saves (rejected: saves stay readable for debugging); `reviewChallenges` in
   memory (deferred, small); the cards' `evidence` arrays, the next growth in the save (deferred: backlog **F15**).

Alternatives considered: a time window (a long day still grows); a receipt per encounter only (reviews need their
own); stripping the Spellbook alone (still unbounded). The count limit bounds the size and is simple to test.

## Design (pre-run)

1. `learning-storage.js`: `export const RECEIPT_LIMIT = 20;` `export function pruneReceipts(processed, { keepId,
   limit = RECEIPT_LIMIT })` deletes in place all but `keepId` and the newest `limit − 1` others (stable sort by
   `Date.parse(committedAt)`, unparseable as oldest), using own keys. `save(envelope, { keepReceiptId } = {})` prunes
   after validation, before writing.
2. `learning-service.js`: `withoutLines` becomes `forReceipt` (drops `spellbook` entirely); `replayWithLines`
   becomes `replay`, setting `spellbook: this.spellbookSnapshot(envelope)` when the response had one or is a dialogue
   or review response; both receipt writers call `storage.save(staged, { keepReceiptId: attemptId })`; lookups via
   `Object.hasOwn`.
3. Test storages that wrap `save` keep working (the option is ignored by wrappers that pass one argument; checked).

## Claim boundary (pre-run)

Tests and the fixture measurement. A count bound on receipts and a smaller receipt; the cards' `evidence` arrays still
grow per turn (F15).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 fa90b94d…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The safety argument names the wrong rule (version bump, deleted challenge) | 0 | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 2 |
| 1.2 | Error | Sorting by `committedAt` can drop the receipt just written | + | Accept: always keep it | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.3 | Error | Ties in entry order are unreliable (integer-like keys) | + | Accept: arbitrary tie order, tested | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.4 | Gap | The bound is a count, not bytes; the Spellbook snapshot grows | + | Accept: no Spellbook in receipts | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.5 | Gap | Tests would miss broken implementations | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | Old saves stay big until a turn or review | + | Accept: prune in `save` | **Accepted** (autonomous, pending owner review) | Decision 1 |

**Deferred / Optionals:** `Object.hasOwn` for attempt ids: accepted (Decision 4); `reviewChallenges` cap: deferred;
compact JSON: rejected; `evidence` arrays: deferred to backlog F15 (Decision 5).

## Tests (pre-run)

- Unit (`server/test/receipts.test.js`): `pruneReceipts` keeps the newest 20 of 25 by `committedAt` out of entry
  order; ids `"3"`, `"10"`, `"a"` with equal times keep `keepId`; a `keepId` older than all others (clock went back)
  is kept; an invalid `committedAt` goes first; under the limit nothing changes.
- Service (Spanish fixture): 25 dialogue turns across restarts: 20 receipts in the save, none with `spellbook`; the
  newest attempt resent replays (`replayed: true`, a Spellbook present); the first attempt resent with its own input
  is STALE_ENCOUNTER or STALE_VERSION, and the save's cards (evidence counts, schedules) are unchanged by it.
- Review: a review attempt followed by 20 more receipts, resent: STALE_CHALLENGE, card evidence unchanged.
- A clock that steps backwards: the newest dialogue attempt still replays.
- An old save written with 60 receipts (with Spellbook snapshots) shrinks to 20 after a start (no turn).
- A failed save (`io.writeFile` throws) leaves the file's receipts as they were.
- Mutations: the prune call removed from `save` fails a test; `keepId` ignored fails the backward-clock test;
  the Spellbook kept in receipts fails a test.
- Re-measure with `measure.mjs`; full suites (server, client, mobile).

## Amendment 1 (2026-11-06, during the build): equal times keep the later entry

Decision 1 left ties in an arbitrary order. The first service test (fixed test clock, so every receipt has the same
`committedAt`) showed that a plain stable sort then keeps the *oldest* 19, since the sort keeps entry order. Ties now
go to the later entry (`position` in `pruneReceipts`), which is write order for the UUID attempt ids the app and web
client send; integer-like ids still enumerate first (critique 1.3), so for them the tie order stays arbitrary, and the
receipt just written is kept in every case. A test for it (removing the tie rule fails a test).

## Outcome (2026-11-06)

Built as designed with Amendment 1, plus a test for the review path under a clock that steps back (the review's
`keepReceiptId` had no failing test without it). In the fixture measurement the save after 240 turns and reviews is
158 KB instead of 2.50 MB and holds 20 receipts from turn 20 on; what still grows (about 500 bytes per turn on disk) is
the cards' `evidence` arrays (backlog F15). Each fix removed in turn fails a test; full suites pass
([findings](findings.md)).
