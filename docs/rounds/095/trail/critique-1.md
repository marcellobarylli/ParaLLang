# Critique 1: fixes from the LLM-layer review (plan v1)

- **Dispatched:** about 07:09:50 UTC 2026-11-06
- **Returned:** about 07:12:35 UTC (162 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id a2f3acffaafc76298. No real CLI called.
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `review-1.md` and the code (`adapter.js`,
  `cli-runner.js`, `cli-adapter.js`, the Codex and Claude adapters, `provider-error.js`, `learning-service.js`
  callers, the runner/provider/prefetch tests); R1.3's exit-without-close design and its races, R1.2's lost
  mappings, test strength and feasibility, the deferrals; numbered findings Error / Gap / Cut with file:line evidence,
  Optional separate, under 700 words.
- **Reviewed input:** `plan-v1.md`, sha256 b74cd676…, HEAD ea25f58, working tree: docs/rounds/095/ new
- **Findings:** 11 (5 Error, 4 Gap, 1 Cut, 1 note on the deferrals), 2 Optional

## Raw output (verbatim)

```markdown
The plan is mostly right, but R1.2 and R1.3 need changes before anyone builds them. R1.2 skips the same bug in `claude-cli.js`. R1.3 adds a second way to settle where the existing `finish` already does the job, and the plan contradicts itself on group kills. The R1.1 test fails as written.

I tested these in node 22.23.4 (no real CLIs):
- When a spawn fails with ENOENT, Node emits `error` and then `close` (code -2), with no `exit`.
- With `/bin/sh -c 'sleep 30 & echo $!; exit 0'`, `exit` comes at about 3 ms and `close` never comes while `sleep` lives.
- If the parent destroys the child's stdin, stdout and stderr after `exit`, Node then emits `close` (code 0) about 100 ms later, while `sleep` is still alive.
- `createLLMAdapter({provider:'openai'},{})` throws "Missing credentials".

## Findings

1. **Error (R1.3): route the post-exit settle through `close`, not a second settle path.** `finish` (`cli-runner.js:144-166`) already does the cleanup: it guards double settles, resets `task.cancel`, clears the timers and attaches `internal`. Fix: on `exit`, arm `exitGraceTimer = setTimeout(..., killGraceMs)`. When it fires, send SIGKILL to the group, then destroy all three stdio streams. Node then emits `close(code, signal)`, and the existing `finish` settles with the reported code, or with `failure` if one is pending. `finish` must clear `exitGraceTimer` and the new fallback timer. Keep a direct `finish` call only as the last fallback, when nothing at all arrives after SIGKILL, mainly for fake children.

2. **Error (R1.3): `close` must stay enough to settle on its own.** ENOENT gives `close` without `exit` (test above), and the existing fakes emit only `close`. Say this explicitly. Add a test that a child emitting only `close` still settles.

3. **Error (R1.3 vs R1.9): the group-kill reasoning contradicts itself.** R1.9 rejects a group kill after `close` because "the group id may be reused once the leader is reaped". R1.3's kill also comes after `exit`, when Node has already reaped the leader. On Linux a pgid is not reused while any member is alive, and R1.3's kill only fires while a member holds the pipe. Fix: drop the reuse argument from R1.9, or restate it for an empty group. Add to R1.3 that a `setsid` escapee is not reached by the group kill at all: only destroying the stdio frees the slot, so the "no `sleep` left" check only holds for a child that stays in the group.

4. **Gap (R1.3): define an abort or timeout in the window after `exit` and before `close`.** `failAndTerminate` (`cli-runner.js:135`) only checks `closed`. So an atmosphere abort in that window turns a run that exited 0 into `interrupted`, and sends SIGTERM. Either accept that and test it, or treat `exited && code === 0` like `closed` there, after a SIGKILL to the group.

5. **Gap (R1.3): exit-path rejections must keep `internal.stdout` on `process`.** The claude preflight needs it (`claude-cli.js:59-63`). Routing through `finish` (Finding 1) gives this for free; otherwise add a test.

6. **Error (R1.2): `claude-cli.js:119-123` has the same masking, and the plan only fixes Codex.** An `output-limit` failure (stdout cut off) or an interrupted run with partial stdout comes back as `invalid-response`. Fix: apply the same rule there (re-map only when `category === 'process'` and the envelope parses), and add a test.

7. **Error (R1.1): the planned test throws.** `openai` needs `OPENAI_API_KEY` to construct. Fix: pass env `{ OPENAI_API_KEY: 'x' }`; nothing is sent over the network at construction. For the "wrapper around a stub" test: `LLMAdapter` only builds adapters from its registry (`adapter.js:15`). So build `createLLMAdapter({provider:'codex-cli'},{})` and assign `wrapper.provider = stub`. Also assert `wrapper.serial === false` for ollama.

8. **Cut (R1.4): no `codexFailure` is needed in `collect`.** `structuredChat` already runs `parseCodexEvents(result.stdout)` before it reads `collected` (`codex-cli.js:143-146`), and that maps failure events first. Fix: make `collect` return `null` when `result.json` is missing. Then failure events map as they should, and a run with neither gives `invalid-response` from the `JSON.parse(null)` → `safeParse` path. Check that that path does give `invalid-response`.

9. **Gap (R1.2): nothing the current code relies on is lost.** The existing fixture cases keep their codes (`fake-cli.mjs:155-169`):
   - `process-fail` (exit 7, complete events) stays `process`.
   - `failure-envelope` (exit 0) keeps its code through the success path.

   Note in the plan that a non-zero exit with an `error` event that has no code becomes `PROVIDER_FAILURE`, not `CLI_PROCESS_FAILURE`, as it does today. Also note that a crash leaving a partial last line now gives `process` instead of `invalid-response`, which is intended. Parse line by line and skip bad lines anywhere, not just the last one.

10. **Gap (tests): timing on a loaded box.**
    - Use `killGraceMs: 25`.
    - Assert only generous upper bounds: under 3 s against a `timeoutMs` of 10 s. Do not assert "timeout + 2 × grace" tightly.
    - For "no `sleep` left", have the shell print `$!`, then poll `process.kill(pid, 0)` until ESRCH for up to 2 s (the existing tree test waits a fixed 50 ms, `cli-runner.test.js:64`).
    - Add a fake child that emits `exit` and then a stdout chunk before `close`. Assert the chunk is in the result.

11. **Deferrals.** R1.5, R1.6 and R1.7 are reasonable. The R1.8 rejection is reasonable, but write down that the `FORBIDDEN_ENV_KEYS` check is a backstop, not dead code worth removing. The R1.9 temp-dir sweep is fine to defer.

## Optional

- A test that `task.cancel()` after settle is a no-op, now that `exit` exists. It mirrors `cli-runner.test.js:118`, aborting after `exit` but before `close`.
- Use a `killGraceMs`-sized close grace only for exit 0. A non-zero exit could settle straight away once its stdio is destroyed.
```
