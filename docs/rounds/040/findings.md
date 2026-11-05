# Round 040 findings

## Question

Can the app play against a server protected by `PARALLANG_TOKEN` (round 039 open item 3)?

## Finding

Yes, in tests. Started with `EXPO_PUBLIC_PARALLANG_TOKEN=<value> npm run dev:ios`, the app sends `X-ParaLLang-Token`
on every request. Without a token it sends none, as before. Each failure has its own message, none of which shows the
value:
- a missing token;
- a wrong token;
- a token a header cannot carry, which is reported before any request instead of as "can't reach the server".

Both sides trim the value's ends, as `fetch` does.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 6 findings, all accepted.
- A draft was in the working tree before the critique returned (journal row 5).
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 91/91 | 95/95 (token header, 401 messages, bad setting, config) |
| server `node --test` | 162/162 | 162/162 (`server.js` trims the token; not covered by a test) |
| web client vitest | 12/12 | 12/12 |
| `npx expo-doctor` | 20/20 | 20/20 |

## Decision

Keep it.

## Evidence

The round's build commit; journal rows 4–9; `mobile/src/config.js`, `mobile/src/api/learning.js`,
`mobile/src/__tests__/api.test.js`, `README.md`.

## Claim boundary

Tests only. Expo's build-time inlining of the variable was not exercised (jest reads `process.env` directly). The
token is bundled into the app.

## Open items

1. Owner, Simulator: start the server with `PARALLANG_TOKEN` and Expo with the same `EXPO_PUBLIC_PARALLANG_TOKEN`,
   then play a turn; start Expo without it and check the "needs its token" message.
