# Round 171 findings

## Question

Can a friend open the hosted link, play the latest build on Gemini, and be guided through clear steps when no model
is available?

## Finding

Yes, up to a turn played on Gemini, which needs a real key. With a code and no key the friend reaches the road and
is shown the three steps; a key Google refuses is named as such.

## Method

Unit and integration tests. A production build of the page (`VITE_API_BASE` at a local server) against the server in
production mode (`PARALLANG_TOKEN`, `PARALLANG_FRIEND_CODE`, no `GEMINI_API_KEY`), played in headless Chromium with
Playwright, then again with a made-up key. The cloud session container; Google's endpoint reachable, Google's
documentation pages not.

## Results

| Check | Result |
|---|---|
| Server tests | 578 of 578 (568 at round 169; 5 Gemini tests from round 170, 2 new, 3 friend-access) |
| Web client tests | 292 of 292 (288 before; 4 access-gate tests) |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 |
| The page with no code | "Welcome to ParaLLang", the friend code ([picture](shots/1-friend-code.png)) |
| The code entered | Reload; the world map; The Journey 2; the first site |
| Talk to the first character, no key | `MODEL_SETUP_REQUIRED`; "Connect an AI model" with the three steps ([picture](shots/2-connect-model.png)) |
| A made-up key | First run: Google answered `400` with its error as a list, read by the library as "400 status code (no body)"; the adapter retried in JSON mode, got the same and reported `PROVIDER_FAILURE`. After the fix: `MODEL_KEY_INVALID`, "Google did not accept that key" |

| What the owner said | Where it is now |
|---|---|
| A friend opens the link and plays the latest version | The Pages link, unchanged; the friend code |
| If no model is attached, clear, straightforward steps | "Connect an AI model": three steps, one field |
| Gemini, and the owner's key for a handful of friends | `GEMINI_API_KEY` as a Render secret; never sent to the page |

## Decision

- **The key stays on the server.** Friends get a code, not the key; the key is replaced in one place.
- **A friend code.** The repository and the link are public; without it strangers could spend the free allowance.
- **The friend's own key as the way out.** When the shared allowance is spent or there is no key, the friend's own
  free key keeps them playing; it is sent per request and never stored.
- **The owner's play unchanged.** The router sends the owner's calls to `LLM_PROVIDER`; without a friend code there is
  no router.
- **A bare 400 on the plain retry is a refused key.** It could also be another malformed request; the message then
  sends the friend to make a new key, which is harmless.
- **On `main`**, page and server, on the owner's word ("let's go").

## Claim boundary

As in the architecture: no Gemini turn has been played; the model name is from search results of Google's pages; the
allowance's size is unknown; headless Chromium at one desktop size only.

## Open items

- The owner: a key at aistudio.google.com/apikey; `GEMINI_API_KEY` and `PARALLANG_FRIEND_CODE` in Render's
  Environment; then one friend's turn played, to see the model answer.
- If `gemini-3.8-flash` is not served to the owner's key, `GEMINI_MODEL` in Render.
- After Connect, return the friend to the site they were at instead of the title.
- Render's free plan: the server sleeps and loses saves on redeploy unless GitHub saves (round 145) are set.
