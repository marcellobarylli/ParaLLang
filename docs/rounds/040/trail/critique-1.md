# Claude subagent critique 1: the app sends the optional server token

- **Dispatched:** 2026-11-05, after 19:55:53 (journal row 3)
- **Returned:** unknown (the notification came after the README edit; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/040/trail/plan-v1.md` against `config.js`, the app's API and its test, the server's token middleware, the README and the scripts: header casing, 401 mapping, jest and EXPO_PUBLIC inlining, the token in logs, whitespace, README accuracy; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 300 words
- **Reviewed input:** `plan-v1.md`, sha256 9d26b2f3f6f4643502f0866544d3bd67fe994bba8abc4956ef56b59f2499b5e2, HEAD b0a87e9, working tree: the draft config, API, test and README changes were uncommitted while it ran
- **Findings:** 6

## Raw output (verbatim)

```text
I found two errors, two risks and two suggestions.

1. **Error: a bad token value shows up as "can't reach the server".** If the token has a newline or another character not allowed in a header, `fetch` throws a TypeError. The `try` in `request` turns that into `SERVER_UNREACHABLE`, so the player is told the wrong thing. Fix: check the token in `config.js` with `/^[\x21-\x7e]+$/`. If it fails, throw a config error that does not include the value.

2. **Error: spaces at the ends of the token never match.** `fetch` trims spaces from the ends of header values. The server compares `PARALLANG_TOKEN` as is, without trimming. Fix: `.trim()` the value on both sides, or refuse values with spaces at the ends. Add a test.

3. **Risk: tests break when a developer has the variable set.** The default `token = API_TOKEN` means the existing "no header" tests fail if `EXPO_PUBLIC_PARALLANG_TOKEN` is set in the shell that runs jest. Fix: tests pass `token: null` or `token: 'x'` explicitly, and one test covers `config.js` using `jest.isolateModules` with the variable set and unset. In jest the value is not inlined, so the import-time read in `config.js` works, but the variable must be set before the import.

4. **Risk: one message for a missing token and a wrong token.** "Needs its token" misleads when a token was sent but does not match. Fix: map only `status === 401 && code === 'UNAUTHORIZED'`. Say "missing" when no token is set and "doesn't match the server's PARALLANG_TOKEN" when one is. Neither message should contain the value.

5. **Suggestion: fix the README.** Line 106 says "the app and the web client do not send it" and needs rewording. Also say the server reads the token from the root `.env`, but Expo reads `.env` files from `mobile/` only, so the root one does not reach the app. Give the command: `EXPO_PUBLIC_PARALLANG_TOKEN=... npm run dev:ios` (npm passes the variable through). Keep the plan's warning that the value is bundled into the app.

6. **Suggestion: keep the exact `process.env.EXPO_PUBLIC_PARALLANG_TOKEN` form.** Expo's build step only replaces that exact `process.env.NAME` form, so no destructuring or `process.env[name]`. Add a comment saying so.

There is no defect with header casing or duplication. `X-ParaLLang-Token` and `X-Learner-Id` are separate keys, and React Native sends no CORS preflight.

Optional:
- Say in the README that the server never logs the token. The error handler logs only the code.
- Mention `expo start --clear` in case Metro's cache keeps an old inlined value after a restart.
```
