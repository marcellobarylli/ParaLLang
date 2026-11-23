# Journal: round 171

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-23 19:30 approx. | 20:15:00 | decision | Owner | Round 170 withdrawn: "get rid of this whole update and reconceive from scratch". Reverted with `456a521`, on the session branch and `main` | `interview.md` |
| 2 | 19:40 approx. | 20:15:00 | round-opened | Owner | Friends open the hosted link; with no model, clear steps; Gemini, the owner's key: "Hell yeah, let's go" | `interview.md` |
| 3 | 19:45 approx. | 20:15:00 | decision | Claude | The key as a Render secret, a friend code, a router per request (owner on `LLM_PROVIDER`, friend on Gemini), the friend's own key from the page as fallback | `../architecture.md` |
| 4 | 20:00 approx. | 20:15:00 | built | Claude | Server: `request-context.js`, `llm/friend-router.js`, `llm/adapters/gemini.js`, three provider errors, the friend code in `app.js` and `server.js`. Page: `AccessGate.jsx`, the key header and the access event. Tests on both sides | `../../../../server/src/llm/friend-router.js` |
| 5 | 20:08 approx. | 20:15:00 | run | Claude | Production build against a production-mode server (token, friend code, no Gemini key) in headless Chromium: the code asked for; the world map; The Journey 2; "Connect an AI model". A made-up key reached Google and came back as a bare 400, reported as a general failure | `../findings.md` |
| 6 | 20:10 approx. | 20:15:00 | built | Claude | A 400 on the JSON-mode retry (no schema) is a refused key; test added. The browser run again: "Google did not accept that key" | `../../../../server/src/llm/adapters/gemini.js` |
| 7 | 20:12 approx. | 20:15:00 | run | Claude | Server 578 tests, web client 292, the aesthetic package's 95, the iPhone app's 320 pass | `../findings.md` |
| 8 | 20:15:00 | 20:15:00 | closed | Claude | Records, screenshots, status addendum and index row; committed and pushed on the session branch and `main` on the owner's word ("let's go") | `../architecture.md` |
