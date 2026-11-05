# Round 024 plan v1: test temp dirs are removed (backlog F1)

## Goal
`node --test server/test/*.test.js` leaves no `parallang-*` directory in `/tmp` (today 34 per run: 33
`parallang-test-*` from `createRuntime` in `server/test/helpers.js`, 1 `parallang-languages-*` from
`language-packs.test.js`). `/tmp` is a 64 MB tmpfs here and filled up in round 023.

## Design
1. `server/test/helpers.js` gets `makeTempDir(prefix)`: `mkdtemp(join(tmpdir(), prefix))`, records the path in a
   module-level Set, and on first use registers `process.once('exit', ...)` that `rmSync(path, { recursive: true,
   force: true })` each recorded dir (synchronous: 'exit' handlers cannot await).
   - Why process exit, not `close()`: tests reuse a closed runtime's save dir (`party.test.js:88`
     `createRuntime({ saveDir: runtime.saveDir })` after close; `world.test.js:112`; `learning-storage.test.js`).
     Removing on close would break them. `node --test` runs each file in its own process, so the dirs live for one
     file only.
2. `createRuntime` uses `makeTempDir('parallang-test-')` when no `saveDir` is given.
3. `language-packs.test.js` uses `makeTempDir('parallang-languages-')`.
4. The other `mkdtemp` sites already `rm` in `finally`/`t.after` (checked: after a run only the two prefixes above
   remain). Scripts (`play-market.js`, `verify-cli.js`) and `cli-runner.js` already remove theirs.

## Tests
- New test in a new file `server/test/temp-dirs.test.js`: spawn `node -e` importing helpers, call `makeTempDir`,
  print the path, exit; assert the path no longer exists after the child exits. Also assert a dir made by
  `createRuntime` (no saveDir) is removed after the child process exits (child calls createRuntime, close, exit).
- Acceptance: full server suite green; `ls /tmp | grep -c parallang` is 0 after the suite (it was 34).

## Not in scope
Mobile jest caches in /tmp (`jest_s2`, metro caches) — they are bounded caches, not leaks.
