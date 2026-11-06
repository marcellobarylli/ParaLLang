# Round 105 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, review) is in
`trail/`; it is not needed to implement this round.

- **Source:** round 103's open item and the Needs owner question "should the web client (its Vite proxy) and the app
  send `PARALLANG_TOKEN`?". The app already sends it (round 040, `EXPO_PUBLIC_PARALLANG_TOKEN`); only the web client
  cannot reach a protected server.
- **Offline round:** no LLM call; config, tests, README.
- **Second opinion:** Codex is at its usage limit until 2026-11-09 17:32 UTC; a fresh read-only subagent reviews the
  build instead (`trail/review-1.md`), as in rounds 099 and 104.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/vite.config.js`, `client/proxy.config.js`, `client/src/__tests__/proxy.test.js`, `README.md`.

## Goal (pre-run)

`npm run dev:client` plays against a server started with `PARALLANG_TOKEN`, without the token ever reaching the
browser, and stays as today when no token is set.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The Vite dev proxy adds the header, the browser code does not.** The proxy runs in Node: it reads
   `PARALLANG_TOKEN` (the process environment first, then the root `.env`, the file the server reads) and sets
   `X-ParaLLang-Token` on every proxied `/api` request. The client's `fetch` code is unchanged, so the frozen
   client's code and bundle never hold the token. Alternative rejected: a `VITE_` variable read by `api/learning.js`
   (it would be bundled into the page, like the app's `EXPO_PUBLIC_` one, with no need: the web client always goes
   through the proxy in development).
2. **Same value rules as the server.** The value is trimmed; blank means no token and no header. A value a header
   cannot carry (outside `\x21-\x7e`) stops Vite at startup with a message that does not show the value.
3. **The proxy target follows `PORT`** (default 3001), as `server/server.js` does, so a server on another port is
   reachable without editing the config. Host stays 127.0.0.1.
4. **Only the dev server.** `vite build` / `vite preview` are unchanged: the built client has no proxy of its own and
   is not served by ParaLLang's server; a protected production setup stays out of scope (the client is frozen).
5. **Needs owner answered for the app too:** it already sends the token (round 040); the entry is closed in
   STATE.md as an autonomous decision.

## Tests (pre-run)

- `client/src/__tests__/proxy.test.js` (Node environment):
  - `proxyFor({})` targets `http://127.0.0.1:3001` and sets no header; `PORT=4100` targets 4100; a padded token is
    trimmed; a blank one sets no header; `"two words"` throws without the value in its message.
  - A real Vite dev server built from `client/vite.config.js` (127.0.0.1, port 0) in front of a stub HTTP server
    (127.0.0.1, port 0) that records request headers: with a random `PARALLANG_TOKEN`, `GET /api/health` through
    Vite arrives with the header; without one it arrives without it.
  - The same Vite server's page and its `/src/api/learning.js` module do not contain the token.
- A mutation check: dropping the header from `proxyFor` fails a test.
- Full suites: server, client, mobile.

## Second opinion (review 1, after the build)

A fresh read-only subagent reviewed the build (Codex limited); raw text in [`trail/review-1.md`](trail/review-1.md).
Each disposition is an **autonomous decision, pending owner review**.

| # | Severity | Finding | Recommendation | Change | Disposition | Decision |
|---|---|---|---|---|---|---|
| R1.1 | Error | Vite's `loadEnv` expands `$`: `PARALLANG_TOKEN=ab$cd` in `.env` sent `ab`, the server wants `ab$cd` | Accept | `serverEnv` reads the root `.env` with plain dotenv, as `server/src/config.js` does; test with `ab$cd` | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.2 | Error | `loadEnv` also reads `.env.local` and `.env.<mode>`, which the server never reads | Accept | fixed by R1.1; test with a `.env.development` that must be ignored | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.3 | Gap | A bad token stopped `vite build` and every client test at config load | Accept | the proxy is built only for `serve` outside mode `test`; test loads the config for build and test | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.4 | Gap | The no-token test depended on the developer's real `.env` | Accept | tests set the variable to `''` (set but empty wins over the file) | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.5 | Gap | The end-to-end test proxied only `/api/health`, the one exempt path | Accept | a GET of `/api/world` and a JSON POST also arrive with the token and body | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.6 | Minor | The value rule (`\x21-\x7e`) is stricter than the server's (interior spaces) | Decline | kept equal to the app's rule (round 040), so one token works for both clients | **Declined** (autonomous, pending owner review) | Round 105 decisions row |
| R1.7 | Minor | `PORT=99999` passed | Accept | 1–65535 | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |
| R1.8 | Minor | A header sent by the browser would double the proxy's | Accept | the proxy sets the header in `proxyReq` (overwrites); the end-to-end test sends a browser value | **Accepted** (autonomous, pending owner review) | Round 105 decisions row |

## Amendment 1 (2026-11-06, after review 1)

The design's decision 1 said the proxy reads the root `.env` through Vite's `loadEnv`; it now reads it through plain
dotenv (`serverEnv` in `client/proxy.config.js`), with the process environment first. `devProxy` takes
`{ env, path }` instead of a mode. The header is set with a `configure` hook on `proxyReq`, not the `headers` option.
The proxy exists only for `vite` (serve) outside mode `test`.

## Outcome (2026-11-06)

Built as designed with Amendment 1. `npm run dev:client` reaches a server started with `PARALLANG_TOKEN` (shown
against a stub upstream in `client/src/__tests__/proxy.test.js`, a real Vite dev server on 127.0.0.1); the page,
`/@vite/env` and the client's modules do not contain the token, nor does `client/dist`. Three mutations (no header,
no mode gate, append instead of set) each fail a test. Server 389/389, client 19/19, mobile 302/302; one server run
in four had one failure that did not recur in three reruns (not identified; open item).
