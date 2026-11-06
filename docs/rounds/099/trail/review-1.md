# Review 1: the server code changed in rounds 093–098, at HEAD

- **Dispatched:** about 07:52:30 UTC 2026-11-06
- **Returned:** about 07:57:00 UTC (266 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC). Scratch in `/tmp/rv`.
- **Prompt:** independent read-only review of `git diff 131df77~1 HEAD -- server/src server/scripts` (receipt and
  evidence pruning, `replay`, `receiptOf`, adapter `serial`, CLI failure categories, the runner's exit grace and
  group kill, the temp sweep, play-market, leak-scan, verify-cli): pruning vs replays and resends, ties, shared
  mutation, runner races and leaks, categories, scripts miscounting live data; R1.n Error / Gap / Minor with
  file:line, a scenario and a fix; "checked and fine".
- **Reviewed input:** HEAD 6cc3a5f, working tree: docs/rounds/099/ new
- **Findings:** 4 (0 Error, 3 Minor, 1 Gap/Minor)

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
No Error-class bugs found in the changed server code; three Minor and one small Gap. `npm run test:server` passes at HEAD 6cc3a5f (366/366). Nothing was edited, no servers started, no network used (scratch only in `/tmp/rv`).

R1.1 — Minor — server/src/llm/cli-runner.js:199 (`failAndTerminate`) and :273 (exit handler)
Defect: the guard only skips when the child already exited with code 0. After a non-zero exit there is a 2 s grace before `close`; a deadline or abort landing in that window overwrites `failure` with `timeout`/`interrupted`. Adapters only re-map `category === 'process'`, so the stated failure (e.g. `usage_limit_reached`) is lost.
Scenario: Codex exits 3 with a `turn.failed` quota event at 119.5 s of a 120 s timeout, a grandchild holds stdout → result is `timeout`, not quota; the player sees "slow" instead of "quota".
Fix: treat any exit as final: `if (failure || closed || exited) return;` (or keep the guard and let `finish` prefer the exit code when exit preceded the failure).

R1.2 — Minor — server/src/llm/adapters/codex-cli.js:61 (`codexFailure`); same first-match pattern in `parseCodexEvents` (~43, predates these rounds)
Defect: returns on the first `error`/`turn.failed` line. A code-less `{"type":"error","message":...}` earlier in the stream maps to generic `provider` and hides a later `turn.failed` carrying `error.code`.
Scenario: stream `error` (no code) then `turn.failed {"error":{"code":"usage_limit_reached"}}` → `provider`, not quota.
Fix: collect all failure events and prefer the first whose code maps to a known category, else fall back to `provider`.
Confidence: whether real Codex emits code-less `error` before a coded `turn.failed` could not be checked offline; fixtures only have the coded form.

R1.3 — Minor — server/src/llm/cli-runner.js:189-192 (`forceKill` from the exit-grace timer)
Defect: after `exit` the child is reaped; if no process in its group survives (pipes held by a `setsid` escapee), `process.kill(-pid)` targets a free number.
Scenario: within the 2 s grace, an unrelated process reuses the PID and becomes a group leader → it gets SIGKILLed. Very unlikely (serial runner, PID reuse in 2 s is rare).
Fix: after exit, only send the group kill if `process.kill(-pid, 0)` probes succeed — or accept and document beside the existing escapee note.

R1.4 — Gap/Minor — server/scripts/play-market.js:208-220 (`narrationLines`)
Defect: groups are matched to committed NPC lines by text only. A narration whose turn failed to commit (e.g. save failure after narration) is taken as committed if its text equals the next committed line; the real group is then set aside as `uncommitted`.
Effect: only per-line `durationMs`/`retried` would be wrong; line count and leak-scan alignment stay correct.
Fix: tie each group to the `say` step that produced it (record the step index in `recordCalls`) so matching starts within its own step. No test covers this case.

Checked and fine:
- Receipt pruning and replays: the receipt just written is always kept, including numeric attempt ids (`String(keepId)` matches the assignment key). Ties fall back to entry order; two `-Infinity` times give `NaN`, which correctly falls through to position. A pruned dialogue resend fails STALE_VERSION/STALE_ENCOUNTER (version bumped, encounters in memory only); a pruned review resend fails STALE_CHALLENGE; neither applies the input twice (only writers are lines 1042 and 1336). Replay checks run before version checks, so any surviving receipt still replays. A backward-stepped clock may prune an earlier receipt early, degrading to a conflict error, never a double apply. Pruning happens after validation and mutates only the cloned staged envelope, so a failed save loses nothing.
- `receiptOf` rejects inherited keys; with attemptId `"__proto__"` the receipt silently fails to persist but a resend still gets STALE_VERSION (predates these rounds).
- Replay contents: `spellbookSnapshot(envelope)` defaults to the current in-memory encounter, i.e. "the Spellbook as it is now"; removing the Spellbook from receipts is safe for old receipts too.
- Evidence trimming: nothing reads `item.evidence` beyond push and validation; mutates only staged clones.
- Runner: no double settle (`closed` guards `finish`, `forced` guards `forceKill`, all four timers cleared in `finish`). Spawn ENOENT settles through `close`. Destroying stdio after exit makes Node emit `close`; the fallback covers no `close` ever. Abort after exit 0 and during collect are no-ops. Output overflow after exit 0 drops chunks (memory bounded); two attempts (`/tmp/rv/ol.mjs`, `/tmp/rv/ol2.mjs`) to make exit 0 win over an output limit failed — `output-limit` raised every time. Codex `collect` returning null → `JSON.parse(null)` (no throw) → `safeParse` fails → `invalid-response`, correct.
- Temp sweep: exact mkdtemp name, real directory via `lstat`, own uid; future mtimes skipped; 10-minute minimum well above the 300 s timeout cap in `config.js`; the rejected promise is caught; once per root per process.
- Adapters: Claude's empty or unparsable stdout on non-zero exit stays `process` as intended; `serial` forwarded.
- Scripts: `leak-scan.openObjectives` matches `submitDialogue`'s closing rule (ordered and unordered, held passes). `verify-cli.observedVerdicts` is safe because `validateAssessment` guarantees one verdict per objective. `generationCalls` counts unchanged in meaning (completed calls only). Retry tagging works because the correction is always the last message.

Gaps: apart from R1.4, the important new behaviour is tested (pruning and replay after pruning, the backward clock, a grandchild holding pipes, abort after exit 0, category preservation, the sweep, `narrationLines` tie rules). R1.1 and R1.2 are untested.
```
