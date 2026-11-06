# Critique 1: round 087 plan v1 (fixes from a review of rounds 076–080)

- **Dispatched:** 2026-11-06 about 05:33 UTC (exact time unknown)
- **Returned:** about 05:34 UTC (exact time unknown; 60 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/087/trail/plan-v1.md (repo /work/ParaLLang, Node server in server/). Read the code it touches: server/src/learning-service.js (narrate, callProvider, startEncounter/_startEncounter, prefetchedGreeting, scheduleArrival, fireArrival, forgetPrefetch, moveTo and party conversation starts), server/src/llm/cli-runner.js (task.cancel, failAndTerminate, finish, abort signal handling), server/src/llm/provider-error.js, server/src/llm/adapters/{openai,ollama,codex-cli,claude-cli}.js, and tests server/test/greeting-prefetch.test.js, cli-runner.test.js, llm-contracts.test.js. Look for: designs that do not close the gap or introduce new races (abort vs a greeting already resolved; a start taking a greeting while a move aborts it; the per-learner serialization; stats counters), the timeout rethrow surprising a player (e.g. the prefetch timed out long before they tapped), how ProviderError categories are actually named and how an aborted CLI call surfaces, Node API assumptions, breaking existing tests, missing tests. Output a numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 450 words."
- **Reviewed input:** `plan-v1.md`, sha256 55dbf7ea…, HEAD 1f5e17c, working tree: docs/rounds/087/ new
- **Findings:** 10

## Raw output (verbatim)

```text
I found 4 errors and 6 gaps in plan v1, and nothing to cut. The biggest problem is R1.2: as written, it makes a start fail because of a prefetch that timed out long before the player tapped.

1. **Error: the R1.2 rethrow can surprise the player.** A prefetch fires after the dwell, times out at T, and the player taps start several minutes later. The start then rejects with `CLI_TIMEOUT` without trying a fresh call, and the claim "one timeout from the prefetch's start" no longer holds. The failed entry also stays in `greetings`: nothing removes it until a start takes it or it is evicted (learner-service.js:665-669). Fix: rethrow only when the start took the greeting while it was still pending, or when the failure is recent (under the timeout plus a small margin). Otherwise fall back to a fresh call. Add a test for "timed out before the tap → fresh call".

2. **Error: the plan has no way to keep the error.** `fireArrival` stores `narrate(...).catch(() => { failed += 1; return null; })` (learning-service.js:663-664). The error is gone, and `prefetchedGreeting` only sees `null` (:613-614). The plan must change what is stored, for example `{ generated, error, settledAt }`. That also changes how `used` and `fallback` are counted.

3. **Error: wrong field name, and timeouts are CLI-only.** The field is `category`, not "kind" (provider-error.js:65). Only the CLI runner throws `ProviderError('timeout')` (cli-runner.js:79, 92, 137). OpenAI SDK timeouts and Ollama's plain `Error('timed out')` (ollama.js:27) are turned into `PROVIDER_FAILURE` by `callProvider` (:481-482). So R1.2 closes the gap only for CLI providers. Either say so or give Ollama a timeout category.

4. **Error: deciding `aborted` vs `failed`.** The catch must check `signal.aborted`, not the error type. A CLI abort surfaces as `ProviderError('interrupted')` (cli-runner.js:65, 170). An OpenAI abort (`APIUserAbortError`) is turned into `PROVIDER_FAILURE`. Also, an abort that lands during `narrate`'s retry window is swallowed (`.catch(() => null)` at :502). The prefetch then resolves with `first` and is counted as neither failed nor aborted. `narrate` should also skip the retry when `signal.aborted`, the same way it does for `this.stopping` (:495).

5. **Gap: the retry needs both signals.** The retry's signal must combine the caller's signal and the retry deadline's controller (`AbortSignal.any([outer, abort.signal])`). Node is v22.23.4, so that API is available.

6. **Gap: other places that drop greetings don't abort them.** Eviction (:666-669), `forgetPrefetch` (:689-695, whose comment says a running call is not stopped) and `shutdown` (:1204-1209) delete greetings without aborting them, and nothing removes `greetingAborts` entries when a call settles. Abort and remove in one helper.

7. **Gap: "a start at B makes its own call at once" is not true for CLI providers.** An aborted child holds the one runner slot until it closes, which can take up to `killGraceMs` = 2 s (cli-runner.js:26, 133). This holds with fakes only; the claim needs that hedge.

8. **Gap: a greeting that resolved and is then dropped isn't counted.** `abort()` on a settled controller does nothing, so that greeting lands in no counter. Count it as `aborted` (or a new `dropped`).

9. **Gap: the cli-runner test plan is unsafe as worded.** "Fake spawn, fake kill counted": `killProcessGroup` calls `process.kill(-pid)` (cli-runner.js:13). A fake child with a pid could signal a real process group, so the fake needs no pid or a stubbed `process.kill`. The test should also cover the real window: an abort while `spec.collect` or `rm` run after `finish` (:206-210), while the task is still `active`.

10. **Gap: two missing tests.**
    - Existing Ollama tests (llm-contracts.test.js:93) expect `/timed out/`; the caller-abort path needs its own test.
    - Add a test that starting a party conversation that only resumes (no provider call) does not abort.

**Optional**
- After R1.3, an abort during `collect` is silently ignored; document it.
- The serialized start-then-move order makes "a move aborts a greeting a start already took" impossible. Say this in the plan and pin it with a test.
```
