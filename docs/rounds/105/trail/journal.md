# Journal: round 105

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 08:48:25 | 08:48:25 | round-opened | Claude (claude-opus-5-5), autonomous | Round 105 opened (iteration 31): the frozen web client reaches a token-protected server through its Vite proxy (round 103 open item, Needs owner question decided autonomously) | — |
| 2 | 08:48:31 | 08:48:31 | freeze | Claude (claude-opus-5-5), autonomous | Freeze commit: architecture.md pre-run sections, decisions row, index row | `../architecture.md` |
| 3 | 08:50:59 | 08:50:59 | built | Claude (claude-opus-5-5), autonomous | Built: `client/proxy.config.js` (proxyFor, devProxy), `vite.config.js` uses it, `proxy.test.js` (4 tests, a real Vite server in front of a stub), server test reads the target from proxyFor, README; dropping the header fails 3 of 4 tests; server 389/389, client 18/18, mobile 37 suites passed; client build ok | `../architecture.md` |
| 4 | 08:51:04 | 08:51:04 | review-dispatched | Claude (claude-opus-5-5), autonomous | A fresh general-purpose subagent, read-only, reviews the uncommitted diff on HEAD a25b4fa (client/proxy.config.js, vite.config.js, proxy.test.js, the server test, README) | `review-1.md` |
| 5 | before 08:52:52 | 08:52:52 | review-returned | Claude (general-purpose subagent, claude-opus-5-5), read-only | 8 findings (2 Error: loadEnv expands `$` and reads `.env.<mode>` files the server does not; 3 Gap: a bad token breaks vitest and build, the no-token test depends on the real .env, only /api/health proxied; 3 Minor) | `review-1.md` |
| 6 | 08:55:34 | 08:55:34 | disposition | Claude (claude-opus-5-5), autonomous | R1.1–R1.5, R1.7, R1.8 accepted; R1.6 declined (keep the app's value rule) | `../architecture.md` |
| 7 | 08:55:34 | 08:55:34 | amended | Claude (claude-opus-5-5), autonomous | Amendment 1: plain dotenv instead of loadEnv, header set in proxyReq, proxy only for serve outside mode test | `../architecture.md` |
| 8 | 08:55:34 | 08:55:34 | built | Claude (claude-opus-5-5), autonomous | Rebuilt with the review fixes; 5 proxy tests; 3 mutations each fail a test; server 389/389 (one flaky run of four), client 19/19, mobile 302/302 | `../architecture.md` |
| 9 | 08:55:34 | 08:55:34 | outcome | Claude (claude-opus-5-5), autonomous | The web client reaches a protected server; the token stays out of the browser | `../findings.md` |
| 10 | 08:55:34 | 08:55:34 | closed | Claude (claude-opus-5-5), autonomous | Round 105 closed; status addendum and index row | `../architecture.md` |
