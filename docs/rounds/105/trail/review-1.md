# Review 1: round 105's build (the Vite proxy's token)

- **Dispatched:** 08:51:04 UTC
- **Returned:** before 08:53:30 UTC (the return was not timed separately; the row below was written at the moment of saving)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, Agent tool; Codex at its usage limit until 2026-11-09 17:32 UTC
- **Input:** the uncommitted diff on HEAD a25b4fa plus `client/proxy.config.js` and `client/src/__tests__/proxy.test.js`, with the goal and design stated

Verbatim:

I found two Errors, three Gaps and three Minor findings. There is no token leak. `npx vitest run src/__tests__/proxy.test.js` passes (4/4). With `PARALLANG_TOKEN='a b'` in the environment, vitest fails at config load.

**Errors (wrong behaviour)**

1. **Error: a `$` in the token is expanded, so the proxy sends a different token from the server's.** `client/proxy.config.js:29`. `loadEnv` runs dotenv-expand over the `.env` values. The server's `loadRootEnv` (`server/src/config.js:9-10`) uses plain `dotenv.config`, which does not expand. I tested a temp `.env` holding `PARALLANG_TOKEN=ab$cd`: `devProxy` sent `X-ParaLLang-Token: ab`, while the server expects `ab$cd`. Every /api call except health then gets 401, with nothing pointing at the cause. Fix: read the root `.env` exactly as the server does, with `dotenv.parse` on `ROOT_DIR/.env` and `process.env` taking precedence when the key is set (even to `''`). Or reuse the server's `loadRootEnv({ env: {...process.env} })`. Add a test with a `$` in the token.

2. **Error: the proxy reads env files the server never reads.** `client/proxy.config.js:29`. `loadEnv` also reads `.env.local`, `.env.<mode>` and `.env.<mode>.local`, and later files win. I confirmed that a root `.env.development` holding `PARALLANG_TOKEN=other` overrides `.env`. The server reads only `.env`, so the proxy sends the wrong token. The same applies to PORT, so the proxy can also target the wrong port. The fix in 1 resolves this too.

**Gaps**

3. **Gap: a bad token breaks every client test run and `vite build`, not just the dev server.** `client/vite.config.js:12`. `devProxy` runs every time the config loads, and vitest and build both load it. A developer with a bad shell or `.env` token gets "failed to load config" for all client tests (reproduced above). Fix: use `defineConfig(({ command, mode }) => ...)` and build the proxy only when `command === 'serve' && !process.env.VITEST`. Or keep the throw but let the test config skip it.

4. **Gap: the no-token test fails when the developer's real root `.env` sets a token.** `client/src/__tests__/proxy.test.js:52` and line 82. `viteInFront(null)` deletes `process.env.PARALLANG_TOKEN`, but `devProxy` still reads the real `ROOT_DIR/.env`, so the file's token is sent and `token: undefined` fails. Test 3 also depends on the real `.env` having no `.env.test` override. Fix: set `process.env.PARALLANG_TOKEN = ''` instead of deleting it, since a set-but-empty value wins in both Vite and dotenv. Do the same for PORT, or make the env dir injectable through an env var used only by tests.

5. **Gap: the end-to-end test only proxies `/api/health`.** `proxy.test.js:67-70`. That is the one path the real server exempts from the token check. It does not show the header reaching a POST with a body, or a non-health path. Fix: also `fetch('/api/world')` and a JSON POST, and assert the token is seen on both.

**Minor**

6. **Minor: the token rule is stricter than both the server and Node.** `proxy.config.js:13`. Interior spaces are legal in a header value, and the server accepts `two words` after trimming. The proxy refuses a token the server and curl accept. Either document this as intended in `docs/rounds/105/architecture.md` or allow `[\x20-\x7e]` (interior SP/HTAB).

7. **Minor: an out-of-range PORT passes the check.** `proxy.config.js:16`. `PORT=99999` passes `\d{1,5}`. The server's `Number()` also accepts `0x10`, which the proxy rejects. Add a check for 1–65535.

8. **Minor: a browser-supplied token header would duplicate the proxy's.** `proxy.config.js:22`. If the browser ever sends its own `x-parallang-token`, http-proxy's `Object.assign` adds a second, differently cased key. Node would then send two header lines, and Express would join them into a value that fails. The current browser code sends none, so it can't happen today. If you want a guard, set the header in a `configure: (proxy) => proxy.on('proxyReq', r => r.setHeader(...))` hook, which overwrites any browser value.

**Checked and fine:** the token cannot reach the browser. It is never in `define`, the prefix stays `VITE_`, `envDir` for `import.meta.env` stays `client/`, and `/@vite/env` is tested. Vite's `fs.deny` blocks `/@fs/.../.env` even though the workspace root is the repo root, and proxy error logs don't print headers. The proxy `headers` option applies to every proxied request, including ws, and /api has no websockets. The server compares sha256 digests of the exact value with the header name case-insensitive, so the trimmed value matches. The afterEach restores `PARALLANG_TOKEN`/`PORT` correctly, and servers are closed. The `server/test` import of `proxy.config.js` resolves `vite` from the root `node_modules`.
