# Review 1: code of rounds 076–080 (the round's source)

- **Dispatched:** 2026-11-06 about 05:29:40 UTC
- **Returned:** about 05:32 UTC (exact time unknown; 138 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node/Express server in server/, Expo app in mobile/, YAML content in content/). Review the code changes in `git diff 037c49e e7c93a1 -- server/src server/*.js server/scripts mobile/App.js mobile/src` for correctness bugs: wrong behaviour, races and lock/timeout problems (the server serializes per-learner work; LLM calls can take 10-20 s or hang), crashes on edge inputs, resource leaks (timers, child processes, promises never settled), answers or translations leaking to the player during an encounter, and server/app inconsistencies. Design records: docs/rounds/076..080/architecture.md (intent only: 076 greeting prefetch behind PARALLANG_PREFETCH, 077 the prefetch over HTTP, 078 a one-time retry for an NPC line with no target language, 079–080 live runs). Tests: server/test (run single files, e.g. `cd server && node --test test/greeting-prefetch.test.js`; never bare `node --test` in server/, it hangs). Report at most 8 findings, most severe first. For each: severity (Error = a bug a player can hit / Gap = missing guard or test / Minor), file:line, a concrete failure scenario, a suggested fix. Only report what you verified by reading code; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `git diff 037c49e e7c93a1` (code paths above), HEAD 1f5e17c, working tree clean
- **Findings:** 6

## Raw output (verbatim)

```text
I found no bug a player can hit in normal play. There are two latency gaps around the prefetch, one test gap, and two minor items. I didn't edit anything, start a server or make network calls. I read the diff and the code around it but didn't run the tests.

**1. Gap: a prefetch for a place the player has left still holds the single CLI slot.** `server/src/learning-service.js:619` (`fireArrival`), `:576` (`scheduleArrival`).
- **Scenario:** the player arrives at A and the greeting call starts 1.5 s later. The player walks on to B and opens B's encounter. The A call is never cancelled, so B's greeting queues behind it in `CLIProcessRunner`. That adds roughly 10–20 s (more if the A line is retried).
- **Same problem mid-conversation:** a party conversation can start anywhere, and the busy check only runs when the dwell ends. So a prefetch can fire while the player reads the member's first line, and their first turn then waits behind it.
- **Fix:** give each prefetch an `AbortController` (the runner now accepts `signal`). Abort it when `scheduleArrival` replaces the arrival for a different place, and when a start or turn for another encounter begins. Drop the held greeting entry when it is aborted.

**2. Gap: a hung prefetch can roughly double the time a start takes.** `server/src/learning-service.js:530-531`, `:566-569`.
- **Scenario:** with the CLI default `LLM_CLI_TIMEOUT_MS=120000`, the prefetch call hangs. The player taps start 2 s later, and `prefetchedGreeting` waits about 118 s for it.
- It then returns `null` and `narrate` makes a fresh call with its own 120 s timeout. Before round 076 the worst case was one timeout.
- **Fix:** either give up on the prefetch when it fails with a timeout (surface the error), or cap the wait on a pending prefetch and then abort it and call fresh.

**3. Minor: aborting just after the CLI child has exited arms a stray kill timer.** `server/src/llm/cli-runner.js:132-137` and `:183`.
- `task.cancel` still points at `failAndTerminate` after `finish` has run, while `spec.collect` and `rm` are still running and `this.active === task`.
- **Scenario:** the 20 s `narrate` deadline lands in that window. The runner sends SIGTERM to the dead process group's id, and starts a `forceTimer` that is never cleared or `unref`'d. Two seconds later it sends SIGKILL, keeping the event loop alive and posing a small risk if that pid has been reused.
- **Fix:** have `finish` set `task.cancel = () => {}`, or make `failAndTerminate` return early when `closed` is set.

**4. Minor: the API adapters ignore the abort signal.** `server/src/llm/adapters/openai.js:23`, `ollama.js:42`.
- After a timed-out retry the request keeps running, and `providerCallsInFlight` stays above 0 until it settles. Prefetch and atmosphere then count the provider as busy for up to the adapter's 20 s timeout.
- The result is discarded, so nothing wrong reaches the player.
- **Fix:** pass `options.signal` through to the OpenAI SDK request options and to Ollama's fetch.

**5. Gap (test): two paths have no test.**
- A prefetch whose own line is retried and times out, with a start waiting on it.
- The abort-after-close window in item 3.

**6. Minor, uncertain: the language check may flag lines whose translation glosses the target words inline.** `server/src/language-engine.js:105` (`lacksTargetLanguage`).
- **Example:** native "Il signore is late again today", translation "Il signore (the gentleman) is late again today". Every native word appears in the translation, and if "signore" is only an ambient word rather than a vocabulary entry, the line is flagged and retried.
- The cost is one extra call and a skewed `flagged` count, nothing worse. I didn't check whether ambient words are inside `narrationEntries`.

**Checked and fine:**
- **Arrival races:** the `latest()` check after awaits; A → B → A replacement; delete and shutdown during a prefetch (`forgetPrefetch`, `stopping`).
- **Starts and the held greeting:** the `starting` flag covers the start's save. The greeting is taken only after the gate, drill and resume checks; never for party conversations; and the prefetch prompt matches a plain start's.
- **Retry deadline:** the timer is cleared on both outcomes and `unref`'d; the retry's rejection is caught; the first line is kept on timeout, failure or a second flag; a failed first call still fails the start; no retry while stopping.
- **Runner abort handling:** the listener is removed on every settle; the queued-task abort clears `queueTimer`; an abort before spawn is honoured after `prepare`; an already-aborted signal is rejected at once.
- **Leaks:** the correction note and the rejected reply go only to the LLM, never to the player.
- **Scripts:** `verify-cli` and `play-market` read `narrationStats` from a `service` that is in scope. The budget grows by one per flagged line, which is slightly lenient when a line was kept without a retry.
- **Bounds:** at most 100 greetings are held and the oldest is evicted first.
- **Flag:** `PARALLANG_PREFETCH` parsing matches `PARALLANG_ATMOSPHERE`.
```
