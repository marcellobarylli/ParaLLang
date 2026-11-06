# Round 092 findings

## Question

The core server paths built in rounds 001–016 (language engine, world, routes and the token check, the turn, help,
review and move paths) were never reviewed after the autonomous run began. Does an independent review at HEAD find
bugs, and can they be closed offline?

## Finding

**One security bug, closed; two smaller fixes; three findings kept as designed; one deferred.**

- **The optional server token could be skipped.** With `PARALLANG_TOKEN` set, the check let through any path not
  starting with `/api/`, compared case-sensitively, while Express 5 routes case-insensitively: `/API/world` reached
  the service without the token. The check is now an allowlist of one path: every request needs the token except the
  health check (any case, trailing slash allowed). Unknown paths are 401 without the token instead of 404; CORS
  preflights still pass. The server only binds 127.0.0.1 in this sandbox, but the token is what guards a save on a
  shared network.
- **Grader evidence out of context.** A grader quoting "pane" from "vorrei un panettone" passed the objective, since the
  evidence only had to be a substring of the answer. It must now stand at word boundaries. The critique's tighter
  rule (the evidence equal to a match of the entry) broke two grading stubs that quote words around the form ("No
  estás sola" for *sola*), which live graders may do as well. Amendment 1 keeps the word-boundary rule and the
  existing excerpt match.
- **The reveal cap.** In an ordered encounter, a sentence reveal capped only the current objective, so a turn closing
  two objectives scheduled the second at full quality. Every objective graded in that turn is now capped, as unordered
  encounters already were.
- **Kept as designed:**
  - the review response's Spellbook carries the challenged card's meanings (round 017: the app hides them);
  - an earlier NPC line's translation shows while its objective is open (round 001);
  - a review reveal is quality 0 while a wrong answer is 2 (SM-2's scale).

  The last two are owner questions.
- **Deferred:** dialogue receipts are never pruned, so the save grows every turn (backlog F13; measure first).

The review's "checked and fine" list covers SM-2 intervals and the ease floor, typo matching, saves written before
memory changes, receipt replay, learner id validation, grader id checks, world moves and gates, hint limits and
masked errors.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 7 findings (3 accepted, 3 rejected, 1 deferred), critique 6 (1
Error), all accepted, then Amendment 1. Offline, no LLM call. Each fix was removed in turn to see that a test fails
without it.

## Results

| Check | Result |
|---|---|
| `server/test/world.test.js` | 8/8 (1 new): `/API/world`, `/Api/onboarding`, `/api/world/`, `/API/WORLD/`, `/nope` and `HEAD /API/world` are 401 without the token; `/api/health`, `/api/health/`, `/API/HEALTH/` are 200; an OPTIONS preflight is 204; with the token `/API/world` is 200 |
| `server/test/evidence-context.test.js` (new) | 3/3: `atWordBoundaries` (inside a word no; around the form, apostrophes, a later occurrence yes); "una cafetera" quoted as *cafe* is INVALID_GRADING with nothing recorded, "un café" then passes; a sentence reveal caps both objectives of a turn that closes two |
| A fix removed → test fails | 4/4: the old token check, a case-sensitive allowlist, the word-boundary check, the per-objective cap |
| Full suites | server 334/334 (330 before), client 12/12, mobile 263/263 |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/app.js` (`isHealth`, `requireToken`), `server/src/learning-service.js` (`atWordBoundaries`, the
evidence loop and the cap in `submitDialogue`), the tests, [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests only. The stricter evidence rule is unmeasured against live graders: a grader that quotes a form glued inside a
longer word now makes the turn retry.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): `npm run verify:cli` in Italian and Spanish (verdicts must stay 9/9) and
  one `play-market.js --tour`, counting INVALID_GRADING retries, to check the word-boundary rule against real graders.
- Owner: whether earlier NPC lines should stay protected while their objective is open (R1.4), and whether a review
  reveal should score like a wrong answer (R1.7).
