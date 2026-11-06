# Round 098 plan v1: the CLI runner sweeps its stale temp dirs (round 095 R1.9)

## Source

Round 095 review R1.9: a hard kill of the server (or of a test or script around it) leaves `parallang-cli-*` dirs in
the temp root, since their removal is in a `finally` that never runs. Round 095 found five such dirs in this
sandbox's `/tmp` (a 64 MB tmpfs): one from a live run at 04:13, the others from a reviewer's repro and mutation
timeouts. Each holds the invocation files (instructions, schema), i.e. a copy of a prompt.

## Decision (autonomous, pending owner review)

On its first `run()`, a `CLIProcessRunner` starts one background sweep of its `tempRoot`: it removes directories
whose name starts with `parallang-cli-`, that are owned by the current user (`stat.uid === process.getuid()` where
available) and whose mtime is older than `staleTempMs` (default 1 hour, far beyond the 120 s run timeout, so another
live runner's dir is never taken). It never blocks or fails a run: errors are ignored; the promise is kept as
`runner.sweep` for tests. Not swept: `parallang-play-*` (play-market's temp saves, a script's own) and anything
else. Alternatives: a sweep at server start in `server.js` (misses scripts that build their own adapter); a sweep at
process exit (does not run on a hard kill).

## Design

`cli-runner.js`: constructor option `staleTempMs = 3_600_000`, `sweepTemp = true`; `#sweepOnce()` called from
`run()` the first time; uses `readdir(tempRoot, { withFileTypes: true })`, `lstat` (no symlink following; only real
directories), `rm(..., { recursive: true, force: true })`.

## Tests

- A temp root (made by the test) with an old `parallang-cli-old` (mtime 2 h ago via `utimes`), a fresh
  `parallang-cli-new`, an old `parallang-play-x`, an old file `parallang-cli-file`, and an old symlink
  `parallang-cli-link` pointing at a dir outside: after one run (fake spawn) and `await runner.sweep`, only
  `parallang-cli-old` is gone; the symlink's target still exists.
- A second run does not sweep again; `sweepTemp: false` never sweeps; an unreadable temp root does not fail the run.
- Mutations: no age check, no prefix check, following symlinks each fail a test.

## Claim boundary

Tests only. A dir younger than an hour left by a crash stays until the next process's first run after that.
