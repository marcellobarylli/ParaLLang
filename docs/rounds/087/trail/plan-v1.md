# Round 087 plan v1: fixes from a review of rounds 076–080

**Source:** a read-only review of the code of rounds 076–080 (`trail/review-1.md`): no bug a player hits in normal
play; prefetch latency gaps, a stray kill timer, adapters that ignore the abort signal. Each checked by hand.
**Offline:** no LLM call. The prefetch is off by default (`PARALLANG_PREFETCH`).

## Decisions

1. **R1.1, a prefetch for a place left behind (accept).** `fireArrival` keeps an `AbortController` per held
   greeting (`this.greetingAborts`, by key) and passes its signal to `narrate`, which passes it to the first call and
   ties the retry's abort to it. A committed move to another location drops the learner's held greetings for other
   encounters and aborts the pending ones; a start (any encounter, party conversations included) aborts and drops
   the learner's held greetings for other encounters before it calls the provider. An aborted prefetch counts as
   `aborted` in `prefetchStats` (new counter), not `failed`.
2. **R1.2, a hung prefetch doubles a start's wait (accept).** If the held greeting's call failed with a
   `ProviderError` of kind `timeout`, the start rethrows it (as a plain start whose call timed out) instead of calling
   again; other failures still fall back to a fresh call. The worst case is one timeout from the prefetch's start,
   not two.
3. **R1.3, the stray kill timer (accept).** In `cli-runner.js`, `failAndTerminate` returns at once when the child has
   already closed (`closed`); `finish` also replaces `task.cancel` with a no-op.
4. **R1.4, adapters ignore the signal (accept).** OpenAI: `create(body, { signal })` when given. Ollama: the request's
   controller also aborts on the caller's signal (`AbortSignal.any`, Node 22), and an abort by the caller is thrown
   as an interruption, not as the timeout message; no further attempt in `structuredChat` after an abort.
5. **R1.5, tests (accept):** below.
6. **R1.6, inline glosses flagged by the language check (reject):** uncertain, the cost is one extra call bounded by
   round 078's deadline, and ambient words count as vocabulary (`narrationEntries`).

## Tests

- server `test/greeting-prefetch.test.js`: a prefetch held for A, a move to B: A's call is aborted (the fake provider
  sees the signal aborted), `aborted` 1, and a start at B makes its own call at once; a party conversation started
  while a greeting is pending aborts it; a prefetch whose call times out (`ProviderError('timeout')`): the start
  rejects with `CLI_TIMEOUT` and makes no second call; a prefetch failing otherwise still falls back.
- `test/cli-runner.test.js`: cancel after the child closed sends no signal and leaves no timer (fake spawn, fake
  kill counted).
- `test/llm-contracts.test.js`: OpenAI passes `signal` in the request options; Ollama aborts its fetch on the
  caller's signal and does not retry.
- Full suite.

## Claim boundary

Fakes only; no live provider. The prefetch stays off by default; the owner's question on turning it on stands.
