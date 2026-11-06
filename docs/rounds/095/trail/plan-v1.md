# Round 095 plan v1: fixes from a review of the LLM layer

Source: `review-1.md` (9 findings), checked by hand at HEAD ea25f58.

## Accepted

1. **R1.1 (Error): `LLMAdapter` forwards `serial`.** `get serial() { return this.provider.serial === true; }` in
   `server/src/llm/adapter.js`. Without it round 089's abort of atmosphere calls for a player's call never runs in
   the real server (`server.js` passes the wrapper). Test: `createLLMAdapter({ provider: 'codex-cli' })` and
   `claude-cli` are serial, `openai` / `ollama` are not (constructed without network); and a service built on a
   wrapper around a stub serial adapter aborts a held atmosphere call when a start comes.
2. **R1.2 (Error): Codex keeps the runner's category.** In `codex-cli.js`'s catch, re-map from the events only when
   `error.category === 'process'` (a non-zero exit) and only if an `error` / `turn.failed` event is present
   (`codexFailure(stdout)` returning the mapped error or null, tolerant of a partial last line); otherwise rethrow
   the original error. Timeout, interrupted, output-limit stay as they are. Test with a fake runner: a timed-out run
   with partial events stays `timeout`; an aborted one `interrupted`; a non-zero exit with a `turn.failed` quota
   event is `quota`; a non-zero exit with no failure event stays `process`.
3. **R1.3 (Error): the runner settles without `close`.** Listen for `exit`; if `close` has not come `killGraceMs`
   after `exit`, kill the process group (SIGKILL), destroy the child's stdio and settle with what was read (exit
   code as reported, or the pending failure). After the SIGKILL of a failure, if neither `exit` nor `close` comes
   within `killGraceMs`, settle with the failure. Test with fake children: one that emits `exit` 0 and never `close`
   resolves with its output after the grace; one that ignores signals and never emits anything rejects `timeout`
   after timeout + 2 × grace, the slot is free (a next run starts) and `shutdown()` resolves. And a real
   `/bin/sh -c 'sleep 30 & echo hi; exit 0'` resolves with "hi" well before its timeout, with no `sleep` left (the
   group kill).
4. **R1.4 (Gap): an exit-0 run with a failed turn.** Codex's `collect` gets `(directory, result)`; when
   `result.json` is missing it maps a failure event first (`codexFailure(result.stdout)`), else `invalid-response`.
   Test with a fake runner.

## Deferred or rejected (no live CLI data possible until 2026-11-09; claude-cli has no token in the shell)

- R1.5 (Codex `error` events beside `turn.completed`): deferred; every live Codex run so far (`verify:cli` 9/9 in it
  and es) passed with today's rule, so a non-fatal `error` event has not been seen; check raw events in the queued
  live runs.
- R1.6 (claude-cli `is_error` envelopes): deferred; needs real claude-cli failure envelopes.
- R1.7 (earlier player turns unframed in the narration history): deferred to a live round (changes the prompt;
  impact cosmetic, state is server-authoritative).
- R1.8 (`--permission-mode` not in the capability check; a dead env check): rejected for now; adding a required
  capability could break a working preflight that cannot be tested here.
- R1.9 (grandchildren after a clean exit; temp dirs after a hard kill): partly covered by R1.3's group kill after a
  lingering close; a group kill after every clean close is rejected (the group id may be reused once the leader is
  reaped); temp dirs after a hard kill: deferred (startup sweep of `parallang-cli-*` older than a day, if wanted).

## Claim boundary

Tests with fake runners and children plus one real `/bin/sh` child; no real CLI is called.
