# Round 040 plan v1: the app sends the optional server token

Round 039 open item 3: with `PARALLANG_TOKEN` set on the server, every app call gets 401, because the app never sends
`X-ParaLLang-Token`. The sandbox rules ask for token-protected servers when one is started, so the app should be
able to use one. Codex is at its usage limit (until 20:35 UTC). No prompt change, no LLM call.

## Design

1. **Config** (`mobile/src/config.js`): `API_TOKEN = process.env.EXPO_PUBLIC_PARALLANG_TOKEN || null`, inlined at
   bundle time like `EXPO_PUBLIC_API_URL`.
2. **API** (`createLearningApi({ token = API_TOKEN })`): when a token is set, every request carries
   `X-ParaLLang-Token`; when not, no header (as today). `/api/health` is not called by the app.
3. **401** with code `UNAUTHORIZED` becomes the message "The ParaLLang server needs its token. Start Expo with
   EXPO_PUBLIC_PARALLANG_TOKEN set to the server's PARALLANG_TOKEN." (the server's own message names the header, not
   the app setting).
4. **README**: the app paragraph says how to start Expo with the token, and that an `EXPO_PUBLIC_` value is bundled
   into the app (fine for a local Simulator session, not a secret worth protecting in a shipped build).
5. The frozen web client is not changed (its README line stays: it does not send the token).

## Tests

- `api.test.js`: with a token, the header is on GET, POST and DELETE requests (with and without a body); without a
  token, no header (existing expectations unchanged); a 401 `UNAUTHORIZED` gives the new message and keeps `status`
  and `code`.
- All suites.
