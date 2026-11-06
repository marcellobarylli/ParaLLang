# Round 095 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review, at HEAD ea25f58, of the LLM layer (`server/src/llm/`, never reviewed
  in depth), [`trail/review-1.md`](trail/review-1.md): 3 Error, 3 Gap, 3 Minor; R1.1–R1.3 checked by hand.
- **Offline round:** no LLM call, no real CLI. Critic: a fresh read-only subagent (Codex limited until 2026-11-09
  17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/adapter.js`, `cli-runner.js`, `adapters/codex-cli.js`, `adapters/claude-cli.js`,
  tests.

## Goal (pre-run)

On a CLI provider in the real server a player's call aborts atmosphere calls; a CLI run that is timed out, aborted or
over its output limit keeps that category; a child that exits but leaves its pipes open (or never ends) cannot hold
the one CLI slot or the shutdown past its deadline and grace.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **R1.1: `LLMAdapter` forwards `serial`** (`get serial() { return this.provider.serial === true; }`). `server.js`
   passes the wrapper to the service, so round 089's abort of atmosphere calls for a player's call had never run
   outside tests.
2. **R1.2 (and critique 1.6, 1.9): a runner failure keeps its category.** Both CLI adapters re-map from stdout only
   when `error.category === 'process'` (a non-zero exit), and only to a failure the output states: Codex, an `error`
   or `turn.failed` event (lines parsed one by one, bad lines skipped anywhere); Claude, a parseable envelope that is
   an error. Otherwise the original error is thrown. So timeout, interrupted and output-limit stay; a crash with a
   partial last line is `process` (was `invalid-response`); a non-zero exit whose error event has no code is
   `provider` (as today). The existing fixture cases keep their codes.
3. **R1.3 (critique 1.1–1.5): settled through `close`.** On `exit`, a grace timer (`killGraceMs`) is armed; when it
   fires, the group gets SIGKILL and the child's three stdio streams are destroyed, after which Node emits `close`
   and the existing `finish` settles (the reported code, or a pending failure, with `internal`). `close` alone still
   settles (a spawn ENOENT gives `close` without `exit`). Last fallback, mainly for fakes: if nothing arrives
   `killGraceMs` after a SIGKILL, `finish(null, 'SIGKILL')`. `finish` clears every timer. After `exit` with code 0,
   an abort or timeout no longer fails the run (critique 1.4: it finished; treated like `closed`). A `setsid`
   escapee is not reached by the group kill; only destroying the stdio frees the slot (stated).
4. **R1.4 (critique 1.8): Codex's `collect` returns `null`** when `result.json` is missing; `structuredChat` already
   maps failure events before reading it, and `JSON.parse(null)` → `safeParse` gives `invalid-response`.
5. **Deferred or rejected** (no live CLI data until 2026-11-09; claude-cli has no token in the shell):
   - R1.5 (a Codex `error` event beside `turn.completed`): deferred. Every live Codex run passed with today's rule;
     check the raw events in the queued live runs.
   - R1.6 (claude-cli `is_error` envelopes unclassified): deferred; needs real failure envelopes.
   - R1.7 (earlier player turns unframed in the narration history): deferred to a live round. It changes the prompt;
     the impact is cosmetic, since state is server-authoritative.
   - R1.8 (`--permission-mode` not in the capability check): rejected for now. A required capability could break a
     working preflight that cannot be tested here. `FORBIDDEN_ENV_KEYS` is a backstop, kept (critique 1.11).
   - R1.9: R1.3 kills the group while a member holds the pipe. A group kill after every clean close is not added;
     with the leader reaped and no member left, the kill would target an empty, reusable id (critique 1.3). The temp
     dirs a hard kill leaves are deferred.

## Design (pre-run)

1. `adapter.js`: the getter.
2. `cli-runner.js` `#execute`: `exited` / `exitCode` state, `exitGraceTimer`, `fallbackTimer`; `child.once('exit',
   …)` arms the grace; the force timer's SIGKILL also arms the fallback; `failAndTerminate` returns when `closed` or
   `exited && exitCode === 0`; `finish` clears all timers.
3. `codex-cli.js`: `codexFailure(stdout, provider)` (mapped error or null); the catch uses it only for `process`;
   `collect` returns null on a missing file.
4. `claude-cli.js`: `claudeFailure(stdout, provider)` (the envelope's mapped error, or null for `invalid-response`
   or a success envelope); the catch uses it only for `process`.

## Claim boundary (pre-run)

Tests with fake runners and children and one real `/bin/sh` child; no real CLI is called. Whether real Codex or
Claude runs ever exit and leave their pipes open is unknown.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (9 findings). Critiqued draft: `trail/plan-v1.md`, sha256
b74cd676…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | `LLMAdapter` hides `serial`: the atmosphere abort never runs in the server | + | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Error | Codex re-maps a timeout, abort or output-limit to `invalid-response` | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.3 | Error | A child that never closes its pipes holds the slot and the shutdown | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R1.4 | Gap | Exit 0 with `turn.failed` is masked by `collect` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R1.5 | Gap | Any Codex `error` event fails a completed turn | 0 | Defer: live raw events | **Deferred** (autonomous, pending owner review) | Decision 5 |
| R1.6 | Gap | claude-cli `is_error` envelopes are not classified | 0 | Defer: needs real envelopes | **Deferred** (autonomous, pending owner review) | Decision 5 |
| R1.7 | Minor | Earlier player turns unframed in the history | 0 | Defer: live round | **Deferred** (autonomous, pending owner review) | Decision 5 |
| R1.8 | Minor | `--permission-mode` not in the capability check; env check is a backstop | − | Reject for now | **Rejected** (autonomous, pending owner review) | Decision 5 |
| R1.9 | Minor | Grandchildren after a clean exit; temp dirs after a hard kill | 0 | Partly by R1.3; rest deferred | **Deferred** (autonomous, pending owner review) | Decision 5 |
| 1.1 | Error | Settle through `close` (destroy stdio after the grace), not a second path | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.2 | Error | `close` alone must still settle (ENOENT) | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.3 | Error | The group-kill reasoning contradicts R1.9; a `setsid` escapee | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 3, 5 |
| 1.4 | Gap | An abort between `exit` 0 and `close` | + | Accept: treated as finished | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.5 | Gap | Exit-path rejections keep `internal.stdout` | 0 | Accept (through `finish`) | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.6 | Error | claude-cli has the same masking | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.7 | Error | The R1.1 test throws (openai needs a key); how to stub the wrapper | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.8 | Cut | No `codexFailure` in `collect`; return null | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.9 | Gap | State what changes and what does not in the mapping | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.10 | Gap | Test timing on a loaded box; data after `exit` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.11 | Gap | Deferrals reasonable; the env check is a backstop | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |

**Optionals:** a cancel after settle with `exit` present: accepted (Tests); an immediate settle for a non-zero exit:
rejected (one grace for both keeps one path).

## Tests (pre-run)

- `createLLMAdapter({ provider: 'codex-cli' }, {})` and `claude-cli` are serial; `openai` (env with a dummy
  `OPENAI_API_KEY`) and `ollama` are not. A service on a codex-cli wrapper whose `provider` is a stub serial adapter
  aborts a held atmosphere call when a start comes (fails without the getter).
- Codex, fake runner: timed out with partial events → `timeout`; aborted → `interrupted`; output-limit →
  `output-limit`; non-zero exit with a `turn.failed` quota event (and a bad line before it) → `quota`; non-zero exit
  with no failure event → `process`; exit 0, events with `turn.failed`, no `result.json` → the mapped category.
- Claude, fake runner: output-limit with partial stdout → `output-limit`; non-zero exit with an error envelope →
  its mapped category; non-zero exit with unparsable stdout → `process`.
- Runner, fake children (`killGraceMs: 25`): `exit` 0 and no `close` → resolves with its output within 3 s (timeout
  10 s); `exit`, then a stdout chunk, then `close` → the chunk is in the result; only `close` → settles; a child that
  emits nothing after signals → rejects `timeout`, the next run starts and `shutdown()` resolves; an abort between
  `exit` 0 and `close` → resolves (not `interrupted`); a non-zero `exit` without `close` → `process` with
  `internal.stdout`.
- Runner, real child: `/bin/sh -c 'sleep 30 & echo $!; exit 0'` resolves within 3 s and the printed pid is gone
  within 2 s (polling `process.kill(pid, 0)`).
- Mutations: each fix removed in turn fails a test. Full suites.

## Amendment 1 (2026-11-06, during the build): a stated failure beats a bad line on exit 0 too

The R1.4 test (exit 0, a bad line, then `turn.failed`, no result file) still gave `invalid-response`: on the success
path `parseCodexEvents` rejected the bad line before looking for the failure. It now throws the failure the events
state (`codexFailure`) when a line does not parse, else `invalid-response` as before. Same rule as Decision 2's
non-zero path; a test fails without it.

## Outcome (2026-11-06)

Built as designed with Amendment 1. The wrapper forwards `serial`, so round 089's abort reaches the real adapter; both
CLI adapters keep a runner failure's category and map only a failure the output states; the runner settles a child
that exits but holds its pipes (a real `/bin/sh` with a background `sleep` resolves in well under 3 s and the
`sleep` is killed), and a child that never ends after SIGKILL. Each fix removed in turn fails a test; full suites pass
([findings](findings.md)).
