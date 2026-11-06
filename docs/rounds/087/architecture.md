# Round 087 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 076–080 (greeting prefetch, its HTTP path, the
  no-target-language retry), [`trail/review-1.md`](trail/review-1.md), as round 086 did for 081–085. No bug a player
  hits in normal play; the prefetch is off by default (`PARALLANG_PREFETCH`).
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `server/src/llm/cli-runner.js`, `server/src/llm/adapters/openai.js`,
  `server/src/llm/adapters/ollama.js`, tests.

## Goal (pre-run)

A prefetched greeting the player no longer needs stops holding the provider; a start waiting on a prefetch never
waits two timeouts; an abort after a CLI child exited sends no signal and arms no timer; the API adapters honour the
abort signal.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Drop greetings no longer needed (R1.1; critique 1.6, 1.8).** Each held greeting is `{ promise, controller,
   settled }`; one helper drops (aborts and deletes) an entry and counts it as `dropped` in `prefetchStats` (a new
   counter, pending or settled). It is used by: a committed move or launch (`scheduleArrival`), for the learner's
   greetings other than the new place's encounter; a start that reaches the greeting step (after the resume,
   gate and drill checks: a resume drops nothing, critique 10), for the learner's greetings other than this
   encounter's (party conversations: all of them); eviction; `forgetPrefetch`; `shutdown`. The serialized order
   makes "a move drops a greeting a start already took" impossible (critique Optional): the start deletes the entry
   before it awaits it.
2. **The signal reaches the call (critique 1.4, 1.5).** `narrate(messages, definition, ratio, { signal })` passes it
   to the first call; no retry when it is aborted (as when stopping); the retry's signal is `AbortSignal.any([signal,
   deadline])`. An aborted prefetch is not counted `failed` (checked by `signal.aborted`, not the error type).
3. **A start that waited on a prefetch which timed out rethrows (R1.2; critique 1.1–1.3).** The entry's promise
   never rejects: it resolves to `{ generated }` or `{ error }`. If the start took the entry while it was still
   pending and the error is a `ProviderError` of category `timeout`, the start throws it (`CLI_TIMEOUT`, retryable),
   as a plain start whose call timed out. A greeting that had already failed before the tap, or failed otherwise,
   falls back to a fresh call. Only CLI providers raise `timeout` (API adapters' timeouts become
   `PROVIDER_FAILURE` and fall back): the main providers are the CLIs.
4. **The runner ignores an abort after the child closed (R1.3; critique Optional).** `failAndTerminate` returns at
   once when the child has closed; `finish` replaces `task.cancel` with a no-op. An abort during `spec.collect` or
   the temp-dir removal is ignored (the call has its result).
5. **API adapters honour the signal (R1.4).** OpenAI: `create(body, { signal })` when given. Ollama: the request's
   controller also aborts on the caller's signal (`AbortSignal.any`, Node 22); a caller's abort is thrown as an
   interruption (`Ollama request was aborted.`), not as the timeout message, and `structuredChat` makes no further
   attempt after it.
6. **R1.6 rejected:** inline glosses flagged by the language check are uncertain and cost at most one extra call,
   bounded by round 078's deadline; ambient words count as vocabulary (`narrationEntries`).

## Claim boundary (pre-run)

Fakes and the process fixture only; no live provider. With a CLI provider an aborted child still holds the runner's
slot until it exits, up to `killGraceMs` (2 s; critique 1.7), so "the next call starts at once" holds for the fakes
only. The prefetch stays off by default; the owner's question on turning it on stands.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (6 findings). Critiqued draft: `trail/plan-v1.md`, sha256
55dbf7ea…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Gap | A prefetch for a place left behind holds the one CLI slot | + | Accept: drop and abort | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Gap | A hung prefetch doubles a start's wait | + | Accept, refined by critique 1.1–1.3 | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R1.3 | Minor | An abort after the child closed sends a stray kill and timer | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R1.4 | Minor | The API adapters ignore the signal | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| R1.5 | Gap | No tests for the timed-out prefetch and the after-close abort | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| R1.6 | Minor | Inline glosses may be flagged by the language check (uncertain) | − | Reject: one bounded extra call | **Rejected** (autonomous, pending owner review) | Decision 6 |
| 1.1 | Error | The rethrow fails a tap long after the prefetch timed out | + | Accept: only when taken while pending | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.2 | Error | The stored promise discards the error | + | Accept: `{ generated }` / `{ error }` | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.3 | Error | The field is `category`; only CLIs raise `timeout` | 0 | Accept: say so | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Error | Aborted vs failed by `signal.aborted`; no retry when aborted | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.5 | Gap | The retry needs both signals | + | Accept: `AbortSignal.any` | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.6 | Gap | Eviction, `forgetPrefetch`, `shutdown` drop without aborting | + | Accept: one helper | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.7 | Gap | A CLI child holds the slot up to `killGraceMs` after an abort | 0 | Accept: claim boundary | **Accepted** (autonomous, pending owner review) | Claim boundary |
| 1.8 | Gap | A settled greeting dropped lands in no counter | 0 | Accept: `dropped` | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.9 | Gap | A fake child with a pid could signal a real group; test the collect window | + | Accept: real fixture process, `process.kill` mocked, abort during `collect` | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Gap | Ollama caller-abort test; a resuming party start must not drop | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** document the ignored abort during `collect`, taken (Decision 4); pin the start-then-move order, taken
(Decision 1, a test).

Net change: entries keep their error and controller; the rethrow only for a greeting taken while pending; one drop
helper everywhere; `dropped` counter; safer runner test.

## Tests (pre-run)

- `server/test/greeting-prefetch.test.js`, with a provider whose held call rejects when its signal aborts:
  - a greeting being written at the cart, a move to the fountain: the call's signal is aborted, `dropped` 1, `failed`
    0, and the fountain's later start calls the provider itself;
  - a party conversation started while a greeting is pending drops it; a resume of the same conversation drops
    nothing;
  - a start that takes a pending greeting whose call then fails with `ProviderError('timeout')` rejects with
    `CLI_TIMEOUT` and makes no second greeting call; a greeting that failed with a timeout before the tap falls back
    to one fresh call;
  - a start that took a greeting, then a move: the start still returns that greeting (order pinned);
  - `forgetPrefetch`, eviction and shutdown abort a pending call.
- `server/test/cli-runner.test.js`: a run of the process fixture whose `collect` is held; aborting the signal during
  `collect` resolves the run with its result, and `process.kill` (mocked with `t.mock.method`) is never called.
- `server/test/llm-contracts.test.js`: the OpenAI adapter passes `signal` in the request options; the Ollama adapter
  aborts its fetch on the caller's signal with the interruption message and makes one request only.
- Full suite.
