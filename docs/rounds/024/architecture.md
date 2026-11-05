# Round 024 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog F1 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md) (`/tmp` is a 64 MB tmpfs and
  filled during round 023).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `server/test/helpers.js`, `server/test/language-packs.test.js`, `server/test/temp-dirs.test.js`.

## Goal (pre-run)

`node --test server/test/*.test.js` leaves no test directory behind in the temp dir. Measured at HEAD 31bb5ef: 34
per run, 33 `parallang-test-*` from `createRuntime` (`server/test/helpers.js:88`) and 1 `parallang-languages-*` from
`language-packs.test.js:140`. Every other `mkdtemp` site in the server tests and scripts already removes its dir.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Remove at process exit, not on `close()`.** Tests reopen a runtime's save dir to simulate a restart
   (`party.test.js:88`, `world.test.js:112`, `learning-storage.test.js`), sometimes before the first runtime is
   closed (critique 1.5), so `close()` must not delete it. `node --test` runs each file in its own process, so the
   dirs live for one file.
2. **No per-file teardown hook** (critique 1.5, rejected in part): every file would have to remember to call it; the
   exit hook needs no change in the test files.

## Claim boundary (pre-run)

Covers normal exits of the test processes (including failing tests). A process killed by a signal (SIGKILL, a
test-runner timeout that kills the child) still leaves its dirs (critique 1.3); dirs leaked by earlier runs are not
removed. Mobile jest and Metro caches in `/tmp` are bounded caches, not in scope.

## Design (pre-run)

1. `server/test/helpers.js` exports `makeTempDir(prefix)`: `mkdtemp(join(tmpdir(), prefix))`, adds the path to a
   module-level Set, and on first use registers `process.once('exit', removeTempDirs)`. `removeTempDirs` calls
   `rmSync(path, { recursive: true, force: true })` for each path inside its own `try`, so one failure does not stop
   the rest, and writes a failure to stderr (critique 1.2; the exit code is left alone, since a test result should
   not depend on a cleanup error).
2. `createRuntime` uses `makeTempDir('parallang-test-')` when no `saveDir` is given; a caller's `saveDir` is never
   tracked or removed.
3. `language-packs.test.js` uses `makeTempDir('parallang-languages-')`.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 f4857b2a…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `ls /tmp \| grep -c parallang` counts unrelated and older dirs | 0 | Accept: measure with a fresh `TMPDIR` for the suite and require it empty after | **Accepted** (autonomous, pending owner review) | Tests |
| 1.2 | Risk | One `rmSync` throw stops the loop | 0 | Accept: per-dir `try`, report on stderr; reject a nonzero exit code | **Accepted in part** (autonomous) | Design 1 |
| 1.3 | Risk | Signals and kills still leak | 0 | Reject: not catchable; named in the claim boundary | **Rejected** (autonomous) | Claim boundary |
| 1.4 | Risk | Peak usage within one run is not bounded | 0 | Accept as a measurement: record the suite's peak size (34 small save dirs) | **Accepted** (autonomous) | Tests |
| 1.5 | Suggestion | File-level teardown with exit as fallback; party.test.js reopens before close | 0 | Reject the hook (every file must call it); accept the correction | **Accepted in part** (autonomous) | Owner decisions 1, 2 |
| 1.6 | Suggestion | Stronger subprocess tests: several dirs, caller's dir survives, natural exit, language-pack path | + | Accept | **Accepted** (autonomous) | Tests |

Net change: the acceptance check uses a fresh `TMPDIR`; cleanup is per-dir `try`; the test covers several dirs, a
caller's dir and natural child exit.

## Tests (pre-run)

- `server/test/temp-dirs.test.js` spawns a child `node --input-type=module -e` (cwd the repo) that imports
  `helpers.js`, makes two dirs with `makeTempDir`, creates a runtime without `saveDir`, a runtime with a caller's
  `saveDir`, closes both, prints the paths and ends naturally. The test asserts exit code 0, the three tracked dirs
  are gone, and the caller's dir still exists (then removes it).
- Acceptance: `TMPDIR=$(mktemp -d) node --test server/test/*.test.js` green, and that dir holds no `parallang-*`
  entry afterwards (34 at HEAD 31bb5ef with the same check, to be measured); peak size noted.
- Full suites: server, mobile, web client.

## Outcome (2026-11-05)

Built as designed, with no amendment. Server 131/131, mobile 37/37, web client 12/12 and build. The full suite now
leaves 0 test dirs in a fresh `TMPDIR` (34 before). Backlog F1 is done. See [findings](findings.md).
