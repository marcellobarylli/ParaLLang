# Round 077 findings

## Question

Does `PARALLANG_PREFETCH=on` work through `server.js` and the HTTP routes the app uses?

## Finding

**Yes.** All four pre-run criteria were met in one run (codex-cli, Italian, 3 greeting calls, 41 s).

1. The server listened on 127.0.0.1 at a random port. A request without the token got 401. Every request with the
   token got 200 (201 for the new learner).
2. After a 10 s stay, Gerald's start took 4.06 s and Portia's 0.03 s. After 0.3 s, Mortimer's took 16.7 s. The
   mean after a stay was 14.6 s shorter (criterion: at least 5 s).
3. The start after 0.3 s, shorter than the 1.5 s dwell, took 16.7 s, so no greeting had been written for it.
4. The server exited with code 0 on SIGTERM, and no server process was left.

Gerald's greeting took longer to write than the 8.5 s available (about 12.6 s, from the 4.06 s left), as most did in
round 076. Portia's was ready before Talk. The three greetings are like the tours' greetings (see the report).

## Method

As fixed in [architecture.md](architecture.md): [`results/prefetch-http.mjs`](results/prefetch-http.mjs) starts
`server/server.js` with the flag, a random token and port, and a temporary save directory. It then plays the
learner, move and start routes over HTTP and stops the server. There was no critique, as decided.

## Results

| Start | Stay | Status | Wait |
|---|---|---|---|
| Gerald (coffee cart) | 10 s | 200 | 4.06 s |
| Portia (entrance) | 10 s | 200 | 0.03 s |
| Mortimer (butcher's stall) | 0.3 s | 200 | 16.7 s |

## Decision

The flag and the routes work as round 076 measured in-process. The switch stays off by default (owner question,
round 076).

## Evidence

[`results/prefetch-http.json`](results/prefetch-http.json) (every request's status and time, the greetings, the
server's log without the token, its exit) and [`results/prefetch-http.log`](results/prefetch-http.log).

## Claim boundary

One run, one pack, one provider, three starts. The app itself was not run (no Simulator here).

## Open items

None beyond round 076's (the default, and a Simulator check).
