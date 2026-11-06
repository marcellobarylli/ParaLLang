# Round 103 findings

## Question

The web client in `client/` has been frozen since round 004 and its tests mock the API. Does it still play against
today's server, and does it keep the rules the app keeps?

## Finding

**It still plays, with two gaps: it sends no token, and its Spellbook showed meanings during encounters (now
fixed).**

- **The play works against the real server.** The web client's own store and API module, unmodified, start Gerald's
  encounter, take a word help, resolve the order, open the Spellbook, review one card, reveal another, restart, and
  recover the stored learner and its conversation. Every field its components read is still sent.
- **No token.** The web client sends no `PARALLANG_TOKEN` header and its Vite proxy adds none, so against a
  token-protected server every request is refused (401) and the page shows only an error. The app has the same open
  owner item. Not changed: the client is frozen.
- **The Spellbook leaked meanings (fixed).** During an encounter, the web Spellbook showed every card's meaning, which
  can answer the line being played (round 017's rule), and its Review button led to a refusal. Due cards also showed
  the meaning their review asks for. Now meanings are hidden during an encounter and on due cards, Review waits for
  the end of the encounter, and a line says so.
- A protected line's translation and word meanings arrive only with a help, as round 001 designed.

## Method

As in [architecture.md](architecture.md). `server/test/web-client.test.js` runs `createRuntime()` (127.0.0.1, port 0,
random token, FixtureProvider, Spanish) and replaces `fetch` with a wrapper that adds the base URL and the token.
Critique: a fresh read-only subagent in place of Codex; 7 findings, all accepted. Offline.

## Results

| Check | Result |
|---|---|
| `server/test/web-client.test.js` | 3/3: the play with field checks; a send after another tab's help shows "changed in another tab" and keeps the answer; without the token, `initialize` ends with an error and no learner |
| Server mutations (each field renamed or dropped in `learning-service.js`) | 5 of 5 fail the contract test: `hints`, `canonicalAnswer`, the challenge's `practice`, `overallFeedback`, `canonicalTarget` |
| Web Spellbook (`client/src/components/__tests__/learning-flow.test.jsx`) | 1 new test, 13/13 in the client; 3 of 3 mutations fail it (the due hide, the encounter hide, Review in an encounter) |
| Full suites | server 385/385, client 13/13, mobile 301/301; `npm run build` in `client/` builds |

## Decision

Keep the contract test and the Spellbook fix (autonomous decisions, pending owner review). Leave the token gap open.

## Evidence

`server/test/web-client.test.js`, `client/src/components/Spellbook.jsx`, the client test,
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

The store and API module against the in-process server, in Spanish with a fixture provider. No browser, no Vite
proxy, and the components were not rendered with the real responses. The Italian path is not covered.

## Open items

- **Owner:** should the web client (Vite proxy) and the app send `PARALLANG_TOKEN`? Today neither can reach a
  token-protected server.
- The web client's header and banners name Gerald and the Coffee Cart; they are right only because a new learner's
  first encounter is `imp_coffee_greeting`.
