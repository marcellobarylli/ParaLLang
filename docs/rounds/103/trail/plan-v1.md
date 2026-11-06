# Round 103 plan v1: the frozen web client against today's server

**Source:** iteration 29's candidate list ("the web client (`client/`, frozen, never reviewed: only keep it
working)"). The web client is frozen since round 004, but the server's contract has moved a long way (world, attempt
ids, receipts, version checks, token, help rules, reviews closed during encounters). Its tests (12, vitest) mock the
API, so nothing shows that it still plays against the real server. A probe today (in-process server, the client's
real store and API module) played start → send → resolve → Spellbook → review → restart without an error.

## Decisions

1. **A contract test in the server suite**, `server/test/web-client.test.js`: `createRuntime()` (127.0.0.1, port 0,
   random token, FixtureProvider, Spanish), the client's own `createGameStore` and `learningApi`
   (`client/src/...`, unmodified), and `globalThis.fetch` replaced for the test by a wrapper that prefixes the base
   URL and adds the token header (the Vite dev proxy's job in the browser), restored after.
2. **What it plays:** initialize (a new learner, Gerald's encounter ongoing); a word help on a chip of the NPC line
   (hints used 1); send "Quiero un café negro." → resolved with an assessment; the Spellbook has cards; a review:
   start, a wrong answer, then a reveal on the next card; restartEncounter → a new ongoing encounter; a second store
   with the same storage recovers the same learner id.
3. **Server suite, not client suite:** the client's vitest runs in jsdom and would need the server's deps; the
   server's node --test can import the client modules (zustand resolves from `client/node_modules`).
4. **No client change** unless the test finds a break; the client stays frozen.
5. Also check `npm run build` in `client/` once.

## Tests

The test itself; a mutation each: drop the token header (401 → the store's error), send a stale version (the store
must show an error), break the API path (one route renamed in the wrapper).
