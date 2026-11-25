# Round 182 findings

## Question

Does a friend's turn reach Gemini on the owner's key, and why did it fail; and does a failure now tell the player
what actually happened?

## Finding

The routing works and the key is accepted: one friend turn of three played, with a valid reply. The failures are
Google's: `gemini-3.8-flash` answered 503 "This model is currently experiencing high demand" or took longer than the
adapter's 60 seconds. After the change, the page receives Google's own reason behind the character's excuse.

## Method

The hosted server could not be reached from the session (its network proxy refuses `parallang.onrender.com`). The
owner's key was given to the session as a network secret for `generativelanguage.googleapis.com` (the session never
saw it). Calls: Google's model list; plain completions with curl; the friend path in Node (`FriendRouter` →
`GeminiAdapter`, the encounter schema); then the whole server locally (`PARALLANG_FRIEND_CODE`, `GEMINI_API_KEY`
from the secret), a road encounter started as a friend.

## Results

| Check | Result |
|---|---|
| Model list on the key | `gemini-3.8-flash` listed; `gemini-2.5-flash` answers 404 "no longer available to new users" |
| Plain completions (curl, 6 calls) | 503 "high demand", 3 past 90 s, 2 answered in 38–43 s |
| Friend path in Node, before the change (3 turns) | OK in 38.7 s; timed out at 60 s; 503 "(no body)" |
| `gemini-3.5-flash-lite` | 1.5 s, but its reply did not fit the encounter schema (`narrative_words` null) |
| Server tests | 604 of 604 |
| Local server as a friend, model `gemini-no-such-model` | "Lazlo Tallow isn't feeling it right now. His convenient excuse: Gemini answered 404 NOT_FOUND: \"models/gemini-no-such-model is not found…\"" |
| Local server as a friend, `gemini-3.8-flash` | "Clementina Inkpen isn't feeling it right now. His convenient excuse: Gemini answered 503 UNAVAILABLE: \"This model is currently experiencing high demand…\""; the next call: `MODEL_QUOTA_EXHAUSTED` |
| Google's 429, a few minutes later | gone: `gemini-3.8-flash` answered; `gemini-3.5-flash` answered 503 |
| Local server as a friend, with retries and fallback (3 encounters) | each ended in "… 503 UNAVAILABLE … (tried 2 times: gemini-3.8-flash, gemini-3.5-flash)": the first model's allowance was spent, the fallback overloaded. The tries mark was added after these runs |

## Claim boundary

- Not seen on the hosted page or in the browser; the message is the server's, which the page shows as it is.
- About a dozen test calls on the owner's key; the last answered 429, so the key's free allowance was spent for the
  time being, partly by these tests.
- The model's slowness and 503s are Google's on the day; nothing here makes them less frequent.

## Open items

- A friend sees the message, or a turn that recovers on a retry, on the hosted page.
- No turn was seen to recover through a retry against the real service; the retry plan is tested with fakes only.
- The free allowance runs out after a few calls a minute; an encounter's turn makes two or three. A paid key, or one
  per friend, is the lasting answer.
- The quota message (`MODEL_QUOTA_EXHAUSTED`) still has no Google detail (per minute or per day).
