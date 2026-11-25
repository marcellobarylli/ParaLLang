# Journal: round 182

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-25 20:00 approx. | 21:05:00 | round-opened | Owner | A friend's turn on Gemini fails with "temporarily unavailable"; test the routing | `interview.md` |
| 2 | 20:20 approx. | 21:05:00 | run | Claude | The owner's key through a session network secret: the key is accepted, `gemini-3.8-flash` is listed; Google answers 503 "high demand" or past 60 s; through FriendRouter, 1 turn of 3 played | `../findings.md` |
| 3 | 20:30 approx. | 21:05:00 | decision | Owner | A failed turn says what happened, after "<name> isn't feeling it right now. His convenient excuse:" | `interview.md` |
| 4 | 20:50 approx. | 21:05:00 | decision | Claude | Google's error list is unwrapped before the OpenAI library reads it; the reason is built in `server/src/llm/excuse.js` | `../architecture.md` |
| 5 | 21:00 approx. | 21:05:00 | run | Claude | Server 602 pass (5 new); the local server with a friend code against real Gemini: 404 and 503 reach the page in Google's words | `../findings.md` |
| 6 | 21:05:00 | 21:05:00 | closed | Claude | Records, status addendum; committed and pushed on the session branch, not merged | `../architecture.md` |
