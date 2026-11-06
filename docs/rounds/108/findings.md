# Round 108 findings: a second review of rounds 105–107

## Question

Does a second, independent review of rounds 105–107's code find bugs their own reviews missed?

## Finding

No Error. One real deviation: `vite preview` resolves with command "serve" and falls back to `server.proxy`, so it
got round 105's token proxy, against that round's decision 4; it is now excluded. The client's config imported
`dotenv` only through the server's hoisted copy; it is now declared. Every route that returns a Spellbook was
correct but several were untested; they now are. Round 107's success-only line tagging is an assumption, now
written at the code.

## Method

Offline. A fresh read-only subagent reviewed `git diff a25b4fa~1 9002707 -- server client mobile`
([`trail/review-1.md`](trail/review-1.md): 2 Minor, 2 Gap). Fixes in `client/vite.config.js`, `client/package.json`,
tests in `client/src/__tests__/proxy.test.js` and `server/test/spellbook-withheld.test.js`, a comment in
`server/scripts/play-market.js`. My pre-run reason to skip the replay test was wrong (a replay does carry a fresh
Spellbook); Amendment 1 added it.

## Results

- The config function gives the proxy for `serve` in development only; preview, build and test have none.
- During an encounter the charged and repeated sentence reveal, a move to a new place and to the same place, and a
  replay of the last encounter's resolving turn all send every card withheld, with no accepted translation in the
  payload. Outside one, the review challenge withholds its due card; after a correct answer it is shown.
- Mutations: four, each fails a test. Suites: server 396/396, client 21/21, mobile 303/303; `vite build` passes.

## Decision

Keep the fixes (autonomous decision, pending owner review; decisions row for round 108).

## Evidence

[`trail/review-1.md`](trail/review-1.md), the two test files above.

## Claim boundary

Offline; the proxy's preview exclusion is checked by calling the config function as Vite would (the `isPreview`
flag), not by running `vite preview`. Party conversations' Spellbooks are not tested separately (same start path).

## Open items

- None new.
