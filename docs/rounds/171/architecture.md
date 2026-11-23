# Round 171 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 after the owner withdrew round 170; the
owner's words are in [`trail/interview.md`](trail/interview.md), the events in [`trail/journal.md`](trail/journal.md).
No pre-run commit; nothing here is frozen.

- **Design source:** the owner's messages (no GitHub issue); round 114 (the hosted page and server); round 170
  (withdrawn and reverted with `456a521`; its Gemini adapter is taken up again here).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/friend-router.js`, `server/src/llm/adapters/gemini.js`, `server/src/request-context.js`,
  `client/src/components/AccessGate.jsx`; pictures in [`shots/`](shots/).

## Goal

The owner sends a friend the hosted link. The friend opens it and plays the owner's latest build. If no AI model is
available for them, they are asked to follow clear, short steps. The friends' play runs on Gemini, on the owner's key
while it lasts.

## Design

**Two codes.** The hosted server already refuses every request without `PARALLANG_TOKEN`. `PARALLANG_FRIEND_CODE` is a
second code it accepts. Which one a request carried is kept for the rest of that request in an `AsyncLocalStorage`
(`request-context.js`), together with the friend's own Gemini key if the page sent one (`X-Gemini-Key`). Calls started
during the request (a greeting written ahead) keep it.

**The router.** With a friend code set, `server.js` wraps the owner's provider in a `FriendRouter`. Each model call
asks the request context: the owner's goes to `LLM_PROVIDER` (claude-cli) as before; a friend's goes to Gemini, on the
friend's own key when they sent one, else on the server's `GEMINI_API_KEY`. Gemini adapters are kept per key (at most
32). A friend's key is used for their requests only and never written anywhere. Friends do not queue behind the
owner's serial CLI.

**Gemini** (`adapters/gemini.js`, round 170's, extended): Google's OpenAI-compatible endpoint through the existing
`openai` package; `gemini-3.8-flash` by default (`GEMINI_MODEL`); the strict JSON schema first and plain JSON mode
with the schema in the prompt when it is refused; at least 8192 output tokens, as the Flash models think. Google's
errors become three new provider errors the page answers:

| Code | When |
|---|---|
| `MODEL_SETUP_REQUIRED` (503) | A friend's turn with no key anywhere |
| `MODEL_KEY_INVALID` (503) | 401/403, a message naming the API key, or a 400 on the JSON-mode retry (Google's error body, a list, is not read by the library, so a refused key is a bare 400) |
| `MODEL_QUOTA_EXHAUSTED` (429) | 429: the free allowance in use is spent for now |

**The page** (`AccessGate.jsx`, over everything). A hosted page with no code stored opens on "Welcome to ParaLLang":
one field, the friend code. A 401 opens it again ("That code did not work"). One of the three codes above opens
"Connect an AI model": a line saying why, three steps (open aistudio.google.com/apikey, Create API key, paste it
here), the field, Connect, Remove my key when one is kept, Close. Both save to this browser (the code in the
existing settings, the key under `parallang.geminiKey`) and reload the page. Every request goes through one function
(`api/encounter.js`), which sends the key header and announces the 401 and the three codes as a window event.

**The owner** keeps entering `PARALLANG_TOKEN` and never sees either screen.

**Without `PARALLANG_FRIEND_CODE`** nothing changes: no router, the server as before.

## Tests

- `server/test/friend-access.test.js`: the owner on the owner's provider and a friend on the server's Gemini key; a
  friend's own key; no key anywhere gives `MODEL_SETUP_REQUIRED`; a wrong code 401.
- `server/test/gemini.test.js`: round 170's five, one changed (a 401 is now a refused key; a 500 is the error not
  retried), and two new: quota and key mapping; a bare 400 twice is a refused key.
- `client/src/components/__tests__/access-gate.test.jsx`: when the welcome shows; the code kept with the server URL;
  the three steps, the key kept and removed; the key header and the announced codes.

## Claim boundary

- No Gemini call has succeeded: there is no real key here. A made-up key reached Google and was refused, so the
  endpoint, the key header and the refusal path are seen; a played turn on Gemini is not. Whether
  `gemini-3.8-flash` (the name read from Google's model pages through search) exists for the owner's key, and how
  well it follows the game's prompts, is unknown.
- The free allowance's size is Google's and is not known here.
- Seen in headless Chromium at 1280 × 800 only; not on a phone.
- After Connect the page reloads to the title screen, so the friend walks back to the site they were at.

## Outcome

Built, tested and recorded. Pushed on `claude/playable-agent-setup-204zb5` and `main` (page and server). The owner's
step: `GEMINI_API_KEY` and `PARALLANG_FRIEND_CODE` in Render's Environment.
