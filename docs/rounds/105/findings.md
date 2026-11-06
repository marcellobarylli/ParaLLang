# Round 105 findings: the web client's Vite proxy sends PARALLANG_TOKEN

## Question

Can the frozen web client play against a server protected by `PARALLANG_TOKEN`, without the token reaching the
browser (round 103's open item)?

## Finding

Yes. The Vite dev proxy, which runs in Node, reads `PARALLANG_TOKEN` and `PORT` as the server does (the process
environment, then the root `.env` through plain dotenv) and sets `X-ParaLLang-Token` on every proxied `/api`
request. The browser code is unchanged and never holds the token. The app already sent it (round 040), so the
Needs owner question is closed as an autonomous decision.

## Method

Offline. `client/proxy.config.js` (`proxyFor`, `serverEnv`, `devProxy`), `client/vite.config.js` uses it for the
dev server only. Tests start a real Vite dev server from the client's config in front of a stub HTTP server that
records headers, both on 127.0.0.1 ephemeral ports, closed after each test. A fresh read-only subagent reviewed the
build (8 findings, two Errors in the first build's env reading; see the architecture's Second opinion table).

## Results

- With a random token: `GET /api/health`, `GET /api/world` (sent with a wrong browser header) and a JSON POST all
  arrive upstream with the proxy's token and their body; without a token, no header.
- The token is absent from `/`, `/@vite/env`, `/src/api/learning.js`, `/src/stores/gameStore.js` and `client/dist`.
- `.env` with `PARALLANG_TOKEN=ab$cd` sends `ab$cd` (the first build sent `ab`); a `.env.development` is ignored;
  a set-but-empty environment value wins over the file.
- A token a header cannot carry stops `vite` (serve) without showing it; `vite build` and the tests still load.
- Mutations: no header (3 tests fail), no mode gate (1), append instead of set (1).
- Suites: server 389/389, client 19/19, mobile 302/302; client build ok.

## Decision

Keep the proxy-side token (autonomous decision, pending owner review; decisions row for round 105). The value rule
stays the app's (`\x21-\x7e`, R1.6 declined).

## Evidence

`client/src/__tests__/proxy.test.js`, `server/test/cli-learning-flow.test.js` (the target from `proxyFor`),
[`trail/review-1.md`](trail/review-1.md).

## Claim boundary

Tested against a stub upstream, not the ParaLLang server in the same test (the server's token check is covered by
its own tests, and round 103's contract test runs without a token). Not tried in a browser by hand. `vite preview`
and a built client served elsewhere get no token (out of scope; the client is frozen).

## Open items

- One full `npm test` run had one server failure that did not recur in three reruns; the failing test was not
  captured. If it recurs, capture `npm test -w server` output and look for a timing-dependent test.
- Owner: is a proxy-side token the wanted way for the web client.
