# Round 107 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, review) is in
`trail/`; it is not needed to implement this round.

- **Source:** round 099's review 1 R1.4, deferred there to a live round: `narrationLines` in
  `server/scripts/play-market.js` matches narration calls to the committed transcript by text only, so an
  uncommitted call (a step that failed after the provider answered) whose native equals the next committed line takes
  that line, and the report's `durationMs` / `retried` for it can be wrong. The fix needs no live call; only its use
  in a live report does.
- **Offline round:** no LLM call; harness code and tests.
- **Second opinion:** Codex limited until 2026-11-09 17:32 UTC; a fresh read-only subagent reviews the build.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/play-market.js`, `server/test/play-market.test.js`.

## Goal (pre-run)

Each report line comes from a narration call made in the step that committed that line; a call from a failed step is
never a line, whatever its text.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Calls carry their step.** `recordCalls(provider, raw, { stepOf })` stores `step: stepOf()` on each entry.
   play-market's `step()` sets the current step index (the index the step will have in `steps`) while it runs and
   clears it after, so a call outside a step has `step: null`.
2. **Committed lines carry their step.** `playAt` reads the encounter after its start and after each say; NPC lines
   new since the last read are recorded as `{ native, step }` with the step just pushed.
3. **Matching within the step.** `narrationLines` accepts committed lines as strings (as before: order and text only)
   or `{ native, step }`. With a numeric `step`, only groups of narration calls from that step are candidates, in
   order after the last match; a retry joins the open group of its own step. Every group not matched is
   `uncommitted` (with its `step`), in call order. The service rule for a group whose first call and retry have the
   same text is unchanged.
4. **A test hook.** `playMarket({ args, env, provider })` uses an injected provider instead of building the CLI
   adapter (preflight optional), so a test can run a whole scripted encounter in-process. The CLI entry point is
   unchanged and still requires `--provider codex-cli` or `claude-cli`.

## Tests (pre-run)

- `narrationLines` unit test: a failed step's call whose native equals the next committed line is `uncommitted`, and
  the line takes the committed step's call (its `durationMs`); with strings, the old behaviour stands (the existing
  test).
- A retry of one step never joins a group of another step.
- `recordCalls` with `stepOf` tags entries.
- `playMarket` with an injected fixture provider (es, Coffee Cart): the first reply's narration answers a reply that
  fails the schema (so the step fails after the provider answered, with the same native the next say commits); the
  report has one line per committed NPC line, the failed call in `uncommittedLines`, and each line's `durationMs`
  that of its own step's call.
- Mutation: dropping the step filter fails a test.
- Full suites: server, client, mobile.
