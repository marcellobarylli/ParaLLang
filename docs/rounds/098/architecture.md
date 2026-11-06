# Round 098 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** round 095's deferred review finding R1.9: a hard kill leaves `parallang-cli-*` temp dirs behind
  (five were found in this sandbox's 64 MB `/tmp` in round 095; each holds a copy of a prompt).
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/cli-runner.js`, `server/test/cli-temp-sweep.test.js`.

## Goal (pre-run)

A process that runs the CLI removes, once per temp root, the run dirs a killed process left there an hour or more
ago, and nothing else.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **What is swept (critique 1.1, 1.5, 1.6).** In the runner's `tempRoot`, entries whose name has the exact `mkdtemp`
   shape `/^parallang-cli-[A-Za-z0-9]{6}$/` (not a test's `parallang-cli-flow-*` root, not `parallang-play-*`), that
   `lstat` shows as a real directory (no symlink), owned by this user where `process.getuid` exists, and whose mtime
   is at least `staleTempMs` (1 hour) in the past; a future mtime is skipped. Why an hour is safe: a run lasts at
   most the timeout (capped at 300 s by config) plus the kill grace, and a dir's mtime only gets newer while a run
   uses it (the invocation files at its start, Codex's result at its end); the constructor refuses a `staleTempMs`
   under 10 minutes.
2. **When (critique 1.3).** Once per resolved temp root per process (a module-level map of promises), started by the
   first `run()` of any runner on that root, in the background; `runner.sweep` is that promise.
3. **Never fails a run (critique 1.2).** Each entry in its own try; the promise ends in `.catch(() => {})`.
4. **The test suite sweeps the real temp dir too (critique 1.4):** stated as intended. It only removes this user's
   run dirs older than an hour, which no live run can own. The new tests use their own roots.
5. **Rejected:** a per-user parent dir for run dirs (Optional; a layout change for every run and a migration of old
   dirs, for a risk the exact name shape already removes); a count log line (the runner has no logger).

## Design (pre-run)

`cli-runner.js`: `export const STALE_TEMP_MS = 3_600_000`; `const sweeps = new Map()`; `export function
sweepStaleTempDirs(tempRoot, { staleMs, now = Date.now() })` (the sweep itself); constructor options `staleTempMs`,
`sweepTemp = true`; `run()` calls `#sweepOnce()` which sets `this.sweep` from the map (creating the entry the first
time).

## Claim boundary (pre-run)

Tests only. A dir younger than an hour left by a crash stays until a later process's first run.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 ababbf24…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The prefix matches a test's `parallang-cli-flow-*` root | + | Accept: the exact `mkdtemp` shape | **Accepted** (autonomous decision, pending owner review) | Decision 1, Tests |
| 1.2 | Error | The background promise needs a catch; per-entry try | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.3 | Gap | One sweep per root per process | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.4 | Gap | The suite sweeps the real `/tmp` | 0 | Accept: stated as intended | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.5 | Gap | Tie the age to the timeout cap; skip future mtimes | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.6 | Gap | `getuid` on Windows; only real directories | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.7 | Cut | An unreadable root via chmod is meaningless as root | − | Accept: a file as the root | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** a per-user parent dir: rejected (Decision 5); a count log line: rejected (Decision 5).

## Tests (pre-run)

`server/test/cli-temp-sweep.test.js`, each with its own temp root:
- Old `parallang-cli-AbC123` removed; fresh `parallang-cli-New123`, old `parallang-cli-flow-abcdef`, old
  `parallang-play-AbC123`, an old file `parallang-cli-File12`, an old symlink `parallang-cli-Link12` to a dir outside
  (the target survives), and a dir with a future mtime all kept.
- After a run with a fake spawn, `await runner.sweep` has done it; a second runner on the same root shares the
  promise (one sweep); `sweepTemp: false` never sweeps; a regular file as the root does not fail the run (it fails
  `mkdtemp` as before) and the sweep promise resolves.
- `staleTempMs` under 10 minutes throws.
- Mutations: no age check, the loose prefix, following symlinks, no catch each fail a test. Full suites.
