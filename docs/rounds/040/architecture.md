# Round 040 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round [039](../039/findings.md) open item 3. With `PARALLANG_TOKEN` set, every app call got 401.
  The sandbox rules ask for token-protected servers.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/src/config.js`, `mobile/src/api/learning.js`, `mobile/jest.setup.js`, `server/server.js`
  (trim), `README.md`, tests. No prompt change.

## Goal (pre-run)

The app can talk to a token-protected server. It says clearly when the token is missing, wrong or malformed, and
never shows the value.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A build-time setting, `EXPO_PUBLIC_PARALLANG_TOKEN`.** It is bundled into the app, which the README states.
   This suits local Simulator sessions, not shipped builds.
2. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **Config.** `API_TOKEN` is read in the exact form `process.env.EXPO_PUBLIC_PARALLANG_TOKEN`, the only form Expo
   inlines (critique 1.6). It is trimmed, and blank means none. The server trims `PARALLANG_TOKEN` too (critique
   1.2).
2. **API.** With a token, every request carries `X-ParaLLang-Token`; without one, there is no header. A token a
   header cannot carry (outside `\x21`–`\x7e`) fails before any request with `BAD_TOKEN_SETTING` and a message
   without the value (critique 1.1).
3. **401 `UNAUTHORIZED`** (critique 1.4). Without a token: "The ParaLLang server needs its token. Start Expo with
   EXPO_PUBLIC_PARALLANG_TOKEN set to the server's PARALLANG_TOKEN." With one: "The app's EXPO_PUBLIC_PARALLANG_TOKEN
   does not match the server's PARALLANG_TOKEN." Other errors keep the server's message.
4. **Jest** removes the variable at setup, so a developer's shell cannot change the tests (critique 1.3).
5. **README.** The README now covers:
   - the command (`EXPO_PUBLIC_PARALLANG_TOKEN=<value> npm run dev:ios`);
   - that the root `.env` does not reach the app;
   - `expo start --clear`;
   - that the value is bundled;
   - that the server never logs it.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 9d26b2f3…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A malformed token reads as "can't reach the server" | + | Accept: checked before the request, own code, no value shown | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.2 | Error | Spaces at the ends never match | + | Accept: trim in the app and the server | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.3 | Risk | A developer's variable breaks the tests | + | Accept: removed in `jest.setup.js`; config tested with `isolateModules` | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Risk | One message for missing and wrong | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.5 | Suggestion | README: root `.env` does not reach Expo | + | Accept | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.6 | Suggestion | Keep the exact inlined form | + | Accept (comment) | **Accepted** (autonomous, pending owner review) | Design 1 |

**Deferred / optional:** both optional items taken in the README ("never logs", `--clear`).

Net change from plan-v1: a malformed-token check, trimming on both sides, two 401 messages, jest isolation, and a
fuller README.

## Tests (pre-run)

- `api.test.js`:
  - with a token, GET, POST and DELETE carry the header; without one, there is none;
  - 401: the missing-token and wrong-token messages; other 401s keep the server's message;
  - a malformed token is reported without its value and sends no request;
  - config trims, and blank means none (`isolateModules`).
- Server unchanged in behaviour apart from the trim; all suites.

## Outcome (2026-11-05)

Built as designed, with no Amendments. Mobile 95/95, server 162/162, web client 12/12, expo-doctor 20/20. See
[findings](findings.md).
