# Critique 1: the CLI runner sweeps its stale temp dirs (plan v1)

- **Dispatched:** about 07:46:40 UTC 2026-11-06
- **Returned:** about 07:47:50 UTC (68 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id a6a4a90297310e23f
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `cli-runner.js`, its tests, the adapters and
  scripts: deleting a live dir, mtime semantics, symlink and TOCTOU races, cross-user deletion, races with
  `mkdtemp`, flaky or slow tests, unhandled rejections, Windows, a simpler design; numbered Error / Gap / Cut with
  file:line evidence, Optional separate, under 450 words.
- **Reviewed input:** `plan-v1.md`, sha256 ababbf24…, HEAD 81f2c2f, working tree: docs/rounds/098/ new
- **Findings:** 7 (2 Error, 4 Gap, 1 Cut), 2 Optional

## Raw output (verbatim)

```markdown
I found 2 Errors, 4 Gaps and 1 Cut. The overall design holds up: deleting another process's live dir is not a real risk, because `LLM_CLI_TIMEOUT_MS` is capped at 300 s (`src/config.js:22`). Nothing was edited and nothing is left running; I created no `/tmp/rv6` files, so there was nothing to delete.

1. **Error: the prefix also matches a test's own root dir.** `test/cli-learning-flow.test.js:20` calls `makeTempDir('parallang-cli-flow-')`. That dir holds the fake CLIs and `calls.json`, so a sweep matching `parallang-cli-*` treats it as a runner dir. An old flow root left by a hard-killed test, or one in a long-lived process, gets deleted by any other process's sweep. Fix: match only the exact `mkdtemp` shape, `/^parallang-cli-[A-Za-z0-9]{6}$/`. Add a test with an old `parallang-cli-flow-abcdef` that must survive.

2. **Error: the background promise needs a catch.** "Errors are ignored" must be done in code. Build the promise as `this.sweep = this.#sweepOnce().catch(() => {})`, with a try around each entry. One `rm` hitting EBUSY/EPERM, or an orphaned child's cwd on Windows, must not stop the rest of the sweep. Otherwise a rejection at `run()` time with no one awaiting it crashes the server under Node's default `--unhandled-rejections=throw`.

3. **Gap: one sweep per runner, not per process.** Every adapter builds its own runner when none is passed (`src/llm/cli-adapter.js:52`), so a server with claude and codex adapters sweeps twice. The suite also builds more than ten runners on the real `tmpdir()` (`test/cli-runner.test.js:24-119`, `test/llm-layer.test.js:202`). Fix: keep a module-level `Map<resolvedTempRoot, Promise>` so each root is swept once per process, and test it with two runners on one root.

4. **Gap: the existing tests will sweep the real `/tmp`.** `node --test test/*.test.js` (`package.json:9`) runs files in parallel processes. Every default runner sweeps the sandbox's shared `/tmp` (sticky, owned by another user), so the suite starts deleting real leftovers as a side effect. Fix: either state this in the plan as intended, or make the module helper skip `tmpdir()` under the test runner. Either way the new tests should use their own root, as planned.

5. **Gap: base the age rule on the timeout cap.** The live-dir argument is "max timeout 300 s plus kill grace is far below 1 h". `prepare` writes and the codex `--output-last-message` file land at the start and end of a run, so a dir's mtime only gets newer while it is in use. Write this into the plan, and add a check (or comment) that `staleTempMs` is greater than the config maximum. Also skip entries with a future mtime: a clock skew should never cause a deletion.

6. **Gap: the uid check and symlink safety.** Write the uid check as `typeof process.getuid === 'function' ? stat.uid === process.getuid() : true`, since `getuid` does not exist on Windows. The lstat-then-rm race is benign: in a sticky `/tmp` only the same user can swap an entry, and `rm` unlinks a symlink rather than following it. One thing to add: also skip a dir whose `lstat` shows it is not a directory.

7. **Cut: the unreadable-temp-root test as written.** A `chmod 000` root is meaningless if the tests ever run as root (uid 0 can still read it); here they run as uid 1010. Inject a failing readdir instead, through a `fsImpl` option or by pointing `tempRoot` at a regular file, which gives ENOTDIR on any uid.

**Optional**
- Simpler, safer layout: create run dirs under a per-user parent `tempRoot/parallang-cli-<uid>/` (mode 0700) and sweep only its children. That removes the prefix collision, the cross-user question and the scan of all of `/tmp`. It costs a migration note for old top-level dirs.
- Log a single count line (`swept N stale CLI temp dirs`) so the claim can be checked in a live run.
```
