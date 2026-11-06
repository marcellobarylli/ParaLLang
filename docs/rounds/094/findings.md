# Round 094 findings

## Question

After round 093 bounded the receipts, each card's `evidence` list still grew by one entry per graded turn and
review, without bound (backlog F15). Can it be bounded without changing anything the player sees or the scheduler
uses?

## Finding

**Yes: each card keeps its 20 last-written entries, and the save stops growing.**

- **No reader.** Only tests read the history: not the server, the scripts, the app, the web client or the design
  notes. SM-2 schedules from `schedule` alone.
- **Before:** in a scripted Spanish play (1000 turns, 200 reviews), the save reached 288 KB with 800 entries, 400 of
  them on one card, and grew about 208 bytes per turn.
- **After:** 138 KB, flat from turn 250 to turn 1000 (6 bytes apart, timestamps).
- **What is kept:** the entries written last, whatever the clock said; trimmed on every save, so an old save shrinks
  on its next write (a start, move, turn, review, help reveal or recruit). Recovering a learner does not write.
- **What is left:** the save is now bounded by its cards (every vocabulary id ever shipped stays), 20 entries per
  card, 20 receipts (each with its encounter's transcript), 50 kept lines and the world and party records. The
  receipts are most of the file now (8 KB of the 138 KB is the rest, as compact JSON).

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex
(usage limit until 2026-11-09 17:32 UTC): 5 findings (2 Error), all accepted. Measured with
[`results/measure.mjs`](results/measure.mjs) (200 cycles of a restart, 4 wrong answers, 1 right answer, 1 review
reveal), before and after. Offline, no LLM call. Each part of the fix was removed or broken in turn to see that a
test fails.

## Results

| Check | Result |
|---|---|
| Save after 1000 turns and 200 reviews (fixture) | 288,463 bytes before, 137,833 after; evidence entries 800 → 60, busiest card 400 → 20 ([before](results/before.txt), [after](results/after.txt)) |
| Growth from turn 250 to turn 1000 | 6 bytes (flat) |
| `server/test/evidence-limit.test.js` (new) | 4/4: the last 20 in order (25, 20, 21 and 30 entries, words and phrases); 25 graded turns keep 20 with the last turn's last and a replay changes no card; a clock stepping back keeps the last written; an old save of 100 keeps them on recovery, has the 20 newest after a start, and loads again |
| A fix broken → test fails | 4/4: no trim in `save` (3 fail), keeping the oldest (4), off by one (4), sorting by `at` (1) |
| Full suites | server 347/347 (343 before), client 12/12 and build, mobile 263/263 (mobile unchanged) |

## Decision

Keep the cap of 20 (autonomous decision, pending owner review).

## Evidence

`server/src/learning-storage.js` (`EVIDENCE_LIMIT`, `trimEvidence`, `save`), `server/test/evidence-limit.test.js`,
[`results/`](results/), [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests and a fixture measurement on one encounter. The bound covers what this server writes; unknown keys in a save are
kept as they are.

## Open items

- None from this round. Stale cards (ids no longer in any pack) are kept in the save by design.
