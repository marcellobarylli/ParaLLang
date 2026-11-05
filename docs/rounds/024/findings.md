# Round 024 findings

## Question

Can the server test suite stop leaving its save directories in `/tmp` (backlog F1) without breaking the tests that
reopen a save dir to simulate a restart?

## Finding

**Yes.** After the change, the full suite leaves **0** test directories behind in a fresh `TMPDIR` (34 per run
before, all from `createRuntime` and one language-pack test). The dirs are removed when each test file's process
exits, so restart tests still find their saves. The 34 dirs came to about 420 KB per run, so the tmpfs filled up
over about 40 runs, not in one. The peak during one run is small.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (6 findings: 3 accepted,
  2 in part, 1 rejected; the one Error accepted).
- Acceptance: `TMPDIR=$(mktemp -d) node --test server/test/*.test.js`, then `ls` of that dir.
- Tests: server, `npm run test:mobile`, web client vitest and build. No live LLM runs: the round changes test code
  only.

## Results

| Check | Result |
|---|---|
| Server tests | 131/131 (130 before; 1 new: `temp-dirs.test.js`) |
| Mobile / web client | 37/37 / 12/12 and build (unchanged) |
| Test dirs left after the suite | 0 (34 at HEAD 31bb5ef, 420 KB) |

## Decision

F1 is done. Cleanup runs at process exit; new test code that needs a temp dir should use `makeTempDir(prefix)` from
`server/test/helpers.js` or remove its own dir.

## Evidence

- `server/test/temp-dirs.test.js` (a child process makes two dirs and two runtimes, one with a caller's dir; the
  tracked three are gone after it exits and the caller's dir is kept).
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Covers test processes that exit normally (failing tests included). A process killed by a signal still leaks its
dirs, and dirs left by older runs are not removed. Mobile jest and Metro caches in `/tmp` are not covered.

## Open items

None for the owner.
