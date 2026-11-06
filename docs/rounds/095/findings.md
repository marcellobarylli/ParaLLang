# Round 095 findings

## Question

The LLM layer (`server/src/llm/`: the CLI runner, the Codex and Claude adapters, the wrapper, errors and prompts)
was never reviewed in depth after the autonomous run began. Does an independent review at HEAD find bugs, and can
they be closed offline, without a real CLI?

## Finding

**Three bugs a player or operator could hit, closed; five findings deferred to live data or rejected.**

- **Round 089's fix never ran in the server.** The service asks its provider whether it is serial (one CLI process
  at a time) before aborting atmosphere calls for a player's call. The server's provider is a wrapper that did not
  pass the question on, so the answer was always no. With atmosphere lines on, a cosmetic line could hold the one CLI
  slot for up to two minutes while the player's turn waited. The tests had set the flag on stubs or on the adapters,
  never through the wrapper. The wrapper now forwards it, and a test goes through it.
- **Codex failures were mislabelled.** After any failed run, the Codex adapter re-read the partial output and reported
  "invalid response", hiding a timeout, an abort or an output limit. This made round 076's rule (a pending greeting
  that timed out is rethrown) unreachable on Codex. The Claude adapter did the same for cut-off output. Both now
  re-map only a non-zero exit, and only to a failure the output states.
- **A child that exits but leaves its pipes open held the CLI slot until its deadline**, and one that never ended at
  all held it, and the server's shutdown, forever. The runner now gives a process that has exited a short grace,
  then kills its group and releases its pipes; if nothing at all arrives after the kill, it settles anyway. A run
  that has exited 0 is no longer failed by a late abort.
- **Smaller:** Codex's exit 0 with a failed turn and no result file now reports the failure (quota, auth) instead of
  "invalid response" (Amendment 1).
- **Deferred to live data** (no Codex until 2026-11-09, no claude-cli token here):
  - whether Codex emits non-fatal `error` events beside a completed turn;
  - how claude-cli's error envelopes classify;
  - framing earlier player turns in the narration history (a prompt change).
- **Rejected for now:** a stricter claude-cli capability check, which could break a working preflight that cannot be
  tested here.
- **Seen this round:** five temp dirs in `/tmp` (`parallang-cli-*`, `parallang-play-*`) were left by hard-killed
  runs. One came from a live run at 04:13; the others came from the reviewer's repro and from this round's mutation
  timeouts. That is R1.9's deferred item; they were removed.

The review's "checked and fine" list: abort while queued or running, the narration retry's abort, output limits,
spawn and exit codes, temp dir modes, the child environment allow-list (`CLAUDE_CODE_OAUTH_TOKEN` to claude-cli only,
no API keys), prompts never in argv, fixed client error messages, the claude-cli preflight still refusing API-key and
third-party routes, strict schema parsing, single-pass template filling, shutdown.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 9 findings (4 accepted, 4 deferred, 1 rejected), critique 11 (5
Error), all accepted, then Amendment 1. Offline: fake runners and children, one real `/bin/sh` child; no real CLI.
Each fix was removed in turn to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| `server/test/llm-layer.test.js` (new) | 9/9. Wrapper: `serial` for codex-cli and claude-cli, not openai or ollama. A start aborts a held atmosphere call through the wrapper. Codex keeps timeout, interrupted and output-limit; a non-zero exit with `turn.failed` is `quota`, with partial events `process`; exit 0 with `turn.failed` and no result is `quota`, with neither `invalid-response`. Claude keeps output-limit and interrupted; an error envelope maps, cut output stays `process`. Runner: exit 0 without close resolves and releases stdio; data after exit is kept; close alone settles; a silent child times out, frees the slot, and shutdown ends; a late abort after exit 0 does not fail the run; a non-zero exit keeps `internal.stdout`. A real `sh` with a background `sleep` resolves fast and the `sleep` is gone |
| A fix removed → test fails | 9/9: the getter, the Codex and Claude category checks, `collect` returning null, the `exit` listener, the fallback, the exit-0 guard, the stdio release, the bad-line rule |
| Full suites | server 356/356 (347 before), client 12/12 and build, mobile 263/263 (mobile unchanged) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/llm/adapter.js` (`serial`), `server/src/llm/cli-runner.js` (`exit`, `forceKill`, `releaseStdio`),
`server/src/llm/adapters/codex-cli.js` (`codexFailure`, `collect`), `server/src/llm/adapters/claude-cli.js`
(`claudeFailure`), `server/test/llm-layer.test.js`, [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests with fake runners and children and one real shell child. Whether a real Codex or Claude run ever exits with its
pipes held open is unknown; the abort through the wrapper is now live code that no live run has exercised yet.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): round 089's tour with atmosphere on now actually exercises the abort
  (count `atmosphereStats.aborted` and the Talk wait). Keep the raw Codex events of one `verify:cli` run and look for
  `error` events beside `turn.completed` (R1.5).
- Deferred: claude-cli error envelopes (R1.6, needs a token); framing earlier player turns (R1.7, a live round); a
  startup sweep of old `parallang-cli-*` temp dirs (R1.9).
