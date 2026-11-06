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
