# Round 077 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Results go into the dated Outcome section. The trail (journal) is in `trail/`.

- **Design source:** [round 076](../076/findings.md) (the prefetch, measured in-process; its claim boundary leaves
  out the app's HTTP path and `server.js`).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/` (the script, its report and the server's log). No code or content change.

## Goal (pre-run)

Check that `PARALLANG_PREFETCH=on` reaches the service through `server.js`, and that the HTTP routes the app uses
(`POST /api/learner`, `POST /api/world/move`, `POST /api/encounter/start`) get the prefetched greeting.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No critique.** A measurement round with criteria fixed before the run, like rounds 072 and 074.

## Method (pre-run)

`results/prefetch-http.mjs` starts `node server/server.js` with `LLM_PROVIDER=codex-cli`, `TARGET_LANGUAGE=it`,
`PARALLANG_PREFETCH=on`, a random `PARALLANG_TOKEN`, a random free port on 127.0.0.1 (the CLI providers bind
127.0.0.1) and a temporary save directory. It then plays over HTTP with the token. It creates a learner, moves to the
coffee cart, waits 10 s and starts Gerald's encounter. Then it moves back to the entrance, waits 10 s and starts
Portia's. Then it moves to the butcher's stall, waits 0.3 s (less than the 1.5 s dwell) and starts Mortimer's. Each
start is timed. A request without the token is also sent. The server is stopped at the end (SIGTERM), and its
output is kept. That makes 3 greeting calls.

## Success (pre-run)

1. The server starts, every request with the token answers 200 or 201, and the request without it 401.
2. The two starts after a 10 s stay take on average at least 5 s less than the start after 0.3 s. In round 076 the
   difference was 7.7 s.
3. The start after 0.3 s takes at least 5 s (no prefetch before the dwell).
4. The server process has exited after the script.

A provider failure is re-run once, and both reports are kept.

## Claim boundary (pre-run)

One run, one pack, one provider, three starts. The app itself is not run (no Simulator).

## Outcome (2026-11-06)

All four criteria met: 401 without the token and 200/201 with it; starts after a 10 s stay 4.06 s and 0.03 s,
against 16.7 s after 0.3 s; the server exited cleanly. See [findings.md](findings.md).
