# Round 087 findings

## Question

Does an independent review of the code of rounds 076–080 (the greeting prefetch, its HTTP path, the
no-target-language retry) find bugs, and can they be closed offline?

## Finding

**No bug a player hits in normal play; four gaps closed.** The prefetch is off by default, so items 1–2 only matter
with `PARALLANG_PREFETCH=on`.

1. **A prefetched greeting for a place left behind kept the one CLI slot.** Walking on and starting elsewhere queued
   the new greeting behind the old call (10–20 s). Every way a held greeting goes now aborts its call: a move or
   launch elsewhere, a start of another encounter (after the resume check, so a resume drops nothing), eviction, a
   deleted save and shutdown. Dropped greetings are counted (`prefetchStats.dropped`), and an aborted call is not
   counted as `failed`.
2. **A start waiting on a hung prefetch could wait two timeouts** (the prefetch's, then a fresh call's). A start that
   took a greeting while it was still being written, whose call then timed out, now fails with that timeout
   (`CLI_TIMEOUT`, retryable), as a plain start would; a greeting that had already failed before the tap still falls
   back to a fresh call (the critique's main correction to the plan, which would have failed a tap minutes after a
   timeout). Only the CLI runner raises `timeout`.
3. **The CLI runner sent a stray SIGTERM and armed an un-cleared SIGKILL timer** when an abort arrived after the child
   had exited (during `collect` or the temp-dir removal). It now ignores it.
4. **The OpenAI and Ollama adapters ignored the abort signal**, so an aborted retry kept them busy until their own
   20 s timeout. Both honour it now; Ollama reports a caller's abort as an abort and makes no further attempt.

The caller's signal also reaches `narrate`'s retry (`AbortSignal.any` with its deadline), and no retry starts once it
is aborted. Rejected: an uncertain case where the language check might flag a line glossing its target words inline
(at most one bounded extra call).

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 6 findings (5 accepted, 1 rejected), critique 10 (4 Errors, all
accepted), both Optionals taken. Offline, no LLM call. Each change was removed in turn to see that a test fails
without it.

## Results

| Check | Result |
|---|---|
| `server/test/greeting-prefetch.test.js` | 19/19 (6 new): a move away aborts and drops the pending greeting, `failed` 0; a start of another encounter drops one, a resume drops nothing; a pending greeting that times out fails the start with `CLI_TIMEOUT` and no second call; one that timed out before the tap falls back to one fresh call; a start that took a greeting keeps it with a move queued behind it; delete and shutdown abort a pending call. Four existing tests updated to the new entry shape; one now expects the deleted learner's call aborted (0 completed calls instead of 1) |
| `server/test/target-language-guard.test.js` | 13/13 (1 new): no retry with an aborted signal; aborting during the retry ends it in under 1 s with a 5 s deadline |
| `server/test/cli-runner.test.js` | 1 new: an abort during `collect` keeps the result, `process.kill` (mocked) never called |
| `server/test/llm-contracts.test.js` | 2 new: OpenAI passes `signal` in the request options (none when not given); Ollama aborts on the caller's signal with one request, and sends none when already aborted |
| A change removed → test fails | each of: drop on move, drop on start, rethrow, the pending check, aborted-not-failed, drop on delete (2 tests), drop on shutdown, no retry once aborted, `AbortSignal.any` (after the test was tightened: at first the retry deadline ended the call and hid it), runner close check, both adapters |
| Full suites | server 314/314 (304 before), client 12/12, mobile 242/242 |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/learning-service.js` (`narrate`, `prefetchedGreeting`, `dropGreeting(s)`, `scheduleArrival`,
`fireArrival`, `forgetPrefetch`, `shutdown`), `server/src/llm/cli-runner.js`, `server/src/llm/adapters/openai.js`,
`server/src/llm/adapters/ollama.js`, the tests, [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Fakes and the process fixture only; no live provider. With a CLI provider an aborted child holds the runner's slot
until it exits (up to `killGraceMs`, 2 s), so the next call does not start at once there. The timeout rethrow covers
CLI providers only. The prefetch stays off by default.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): with `PARALLANG_PREFETCH=on` and codex-cli, arrive at the cart, walk on
  after 3 s and talk at the next place: the Talk wait should not include the cart's greeting; read `prefetchStats`.
- Owner: round 076's question (prefetch on by default) stands.
