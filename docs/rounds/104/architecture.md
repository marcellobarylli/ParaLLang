# Round 104 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (raw review, journal) is in
`trail/`; it is not needed to implement this round.

- **Source:** a review of rounds 100–103's code by a fresh read-only subagent (Codex limited until 2026-11-09 17:32
  UTC): 8 findings, raw text in [`trail/review-1.md`](trail/review-1.md). No Error; five Gaps in the leak scan's
  counting, three Minors.
- **Offline round:** no LLM call; code, tests and a rescan of the committed reports.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/leak-scan.js`, `server/test/leak-scan.test.js`, `client/src/components/Spellbook.jsx`,
  `mobile/src/__tests__/send-retry.test.js`, `results/`.

## Goal (pre-run)

The leak scan's kinds and old-leak count mean what rounds 100–101 say, also on reports not yet written; the web
Spellbook hides a card that falls due while it is open.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **R1.1: *espresso* is English only in "espresso shot(s)".** `NPC_ENGLISH_FORMS` becomes a list of
   `{ form, context }` with `context` a pattern over the folded line (`/\bespresso shots?\b/`); a hit is `english` only
   when its line matches. All 32 soft *espresso* lines in the committed reports hold "espresso shot(s)" (checked), so
   the rescan must not change them. A test: "Vuoi un espresso?" is `leak`.
2. **R1.5: one soft predicate.** The same `english` test is passed to `scanLine`'s `soft`, so an English *espresso*
   no longer stops word hits of its objective, like a frame word.
3. **R1.3: `near` whenever a fresh word hit exists** (after `leak`), whatever the exact hits are. This also changes
   the pre-101 rule, under which any exact hit (an echo too) kept a line from `near`; `leak` is unaffected.
4. **R1.2: the old leak is counted, not summed.** Each hit line carries `oldLeak` (a fresh exact hit of any kind,
   the pre-101 rule); scenes count `oldLeakLines`; the printed line reads `leak N (+soft M; old leak K)`, by era too.
   Round 101's findings sentence ("equal today's leak plus soft") is corrected here, not in round 101's record.
5. **R1.4: every form per objective in English texts.** `scanText` keeps one hit per (objective, folded form); a
   text is fresh if any hit is fresh.
6. **R1.6: the web Spellbook's due by time.** A card is hidden as due also when `nextReviewAt` is past (render time);
   Review still shows only on the server's `due` (the server decides).
7. **R1.7: wording.** The server sends meanings during an encounter; both the app and the web client hide them on
   screen. Recorded in findings as a claim correction for round 103; blanking them on the server is deferred (it
   changes the app's contract; no player sees them).
8. **R1.8: tests assert the read started** before the player's action (`currentEncounter` call count).
9. **Measure:** rescan every committed report before and after; list every line whose kind changes and every
   extra-text change.

## Claim boundary (pre-run)

Committed reports against today's content; the scan's kinds are judgements about give-aways, not grading.

## Second opinion (pre-run)

The review is the round's source; a separate plan critique was not run (each fix is the review's own suggestion,
narrowed by Decisions 1, 4 and 6).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Gap | *espresso* soft even as a real answer | + | Accept: English only in "espresso shot(s)" | **Accepted** (autonomous decision, pending owner review) | Decision 1, Tests |
| R1.2 | Gap | Old leak ≠ leak + soft | + | Accept: count it | **Accepted** (autonomous, pending owner review) | Decision 4, Tests |
| R1.3 | Gap | An echoed frame hides a fresh word hit | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| R1.4 | Gap | One form per objective in English texts | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5, Tests |
| R1.5 | Minor | English *espresso* still stops word hits | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.6 | Minor | A card due while the web Spellbook is open | + | Accept: hide by time | **Accepted** (autonomous, pending owner review) | Decision 6, Tests |
| R1.7 | Minor | Meanings still in the server's payload | 0 | Accept the wording; defer the server change | **Accepted in part** (autonomous, pending owner review) | Decision 7 |
| R1.8 | Minor | Race tests do not assert the read started | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 8 |

## Tests (pre-run)

- `server/test/leak-scan.test.js`: Gerald it "Vuoi un espresso?" → `leak`; "five espresso shots" stays `soft`;
  Errata's frame word echoed with a fresh word hit → `near`; a soft line with a fresh word hit → `near` with
  `oldLeak` true and counted in `oldLeakLines`; feedback "You said vorrei, but where is the caffè?" after "vorrei" →
  fresh.
- `client/src/components/__tests__/learning-flow.test.jsx`: a card with `due: false` and a past `nextReviewAt` hides
  its meaning.
- `mobile/src/__tests__/send-retry.test.js`: the race tests assert the read was called before the action.
- Mutations; full suites; the rescan diff.

## Outcome (2026-11-06)

Built as designed, no amendment. The rescan changes no NPC-line kind and no total; six early feedback texts list one
more form. One test was tightened during the build (R1.5's first version let its mutation pass). All suites pass
([findings](findings.md)).
