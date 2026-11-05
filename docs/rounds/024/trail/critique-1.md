# Codex critique 1: test temp dirs (round 024)

- **Dispatched:** 17:28:25 UTC (approx.; command started right after the bundle at 17:28:19)
- **Returned:** 17:29:33 UTC
- **Model:** `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol (as printed), session 01a1acc1-34c5-7f90-82a6-00039b4aa2bd
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is in the bundle on stdin (a plan and the relevant source excerpts with line numbers). Critique the plan for round 024 of the ParaLLang project: find errors (things that would break or not achieve the goal), risks, and better alternatives. Number each finding and label it Error, Risk or Suggestion. Be concise."
- **Reviewed input:** bundle `/tmp/r024-bundle.txt` (sha256 a9097ec6…, 284 lines): `plan-v1.md` (sha256 f4857b2a…), `server/test/helpers.js` 1–110, `server/test/party.test.js` 80–120, `server/test/world.test.js` 1–40 and 100–160; HEAD 31bb5ef, working tree: only `docs/rounds/024/` untracked
- **Findings:** 6

## Raw output (verbatim)

```text
1. **Error — Acceptance counts unrelated leftovers.** The exit hook removes only directories created by that process; existing leaked directories remain. `ls /tmp | grep -c parallang` also counts unrelated matches and ignores `TMPDIR`. Use a dedicated temporary root for the suite and assert it is empty afterward.

2. **Risk — One removal failure prevents subsequent cleanup.** `rmSync(..., { force: true })` can still throw. An uncaught exception inside the single exit handler stops its loop, leaving later directories behind. Catch errors per directory, attempt every removal, and report failures with a nonzero exit status.

3. **Risk — Abnormal termination still leaks directories.** Exit listeners do not cover every termination path, including SIGKILL and default signal termination. Test timeouts or cancellations can therefore recreate the leak. An owning parent process with `finally` cleanup offers stronger coverage.

4. **Risk — Exit cleanup may come too late for the capacity problem.** All directories remain until their test file exits, while files run concurrently. This prevents accumulation across completed runs but does not bound peak usage within one run. Check whether that peak fits the 64 MB tmpfs.

5. **Suggestion — Use file-level teardown, with exit cleanup as a fallback.** A top-level `node:test` teardown can remove tracked directories after that file’s tests and runtime shutdown hooks finish, preserving restart tests’ shared directories. The cited `party.test.js` excerpt actually starts the second runtime before the first is closed; it does not demonstrate the claimed after-close sequence.

6. **Suggestion — Strengthen the subprocess tests.** Verify multiple tracked directories are removed and a caller-supplied `saveDir` survives. Let the runtime child terminate naturally after awaiting `close()`, and assert successful child completion before checking deletion; forced `process.exit()` could hide open handles or incomplete shutdown. Also exercise the language-pack path so its migration cannot silently be missed.
```
