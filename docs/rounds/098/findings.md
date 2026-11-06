# Round 098 findings

## Question

A hard kill of the server, a script or a test skips the cleanup of the CLI runner's per-run temp dir, which holds
a copy of the prompt. Round 095 found five such dirs in this sandbox's 64 MB `/tmp`. Can the runner clean them up
safely?

## Finding

**Yes, and only them.**

- **What is removed:** the first run of a process on a temp root starts one background sweep. It removes this user's
  run dirs, named exactly as the runner names them (`parallang-cli-` plus six characters), that are real directories
  and were last changed an hour or more ago.
- **What is kept:** everything else, including a test's own `parallang-cli-flow-*` root, play-market's
  `parallang-play-*` saves, files, symlinks (and what they point to), dirs younger than an hour and dirs dated in the
  future.
- **Why no live run can lose its dir:** a run lasts at most its timeout (capped at 300 s) plus the kill grace, and a
  dir's mtime only gets newer while a run uses it. The runner refuses a threshold under 10 minutes.
- **A sweep never fails or delays a run.** Each entry is handled on its own, errors are swallowed, and there is one
  sweep per temp root per process, however many runners there are.
- **The test suite sweeps the real `/tmp` too.** This is stated as intended; it removes only such old run dirs.

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex
(usage limit until 2026-11-09 17:32 UTC): 7 findings (2 Error: the prefix also matched a test root, and the
background promise needed a catch), all accepted. Offline; tests with their own temp roots and a fake spawn. Each
rule was removed in turn to see a test fail.

## Results

| Check | Result |
|---|---|
| `server/test/cli-temp-sweep.test.js` (new) | 3/3: only the old run dir of eight littered entries is removed (fresh, `-flow-`, `-play-`, file, symlink and its target, future-dated kept); a run starts the sweep, a second runner shares it, `sweepTemp: false` never sweeps, the runs' own dirs are still removed; an unreadable root fails no sweep; a threshold under 10 minutes is refused |
| A rule removed → test fails | 7/7: the age, the exact name, `lstat` (no symlinks), the catch, once per root, future mtimes, the minimum threshold |
| Full suites | server 366/366 (363 before), client 12/12, mobile 279/279; `/tmp` holds no `parallang-*` entry after the suites |

## Decision

Keep the sweep (autonomous decision, pending owner review).

## Evidence

`server/src/llm/cli-runner.js` (`sweepStaleTempDirs`, `STALE_TEMP_MS`, `#sweepOnce`),
`server/test/cli-temp-sweep.test.js`, [`trail/critique-1.md`](trail/critique-1.md), round 095's
[findings](../095/findings.md) (the five dirs).

## Claim boundary

Tests only. A dir younger than an hour left by a crash stays until a later process's first run.

## Open items

- None.
