# Round 170 findings

## Question

Can a friend's coding agent set the game up from a fresh clone with one command and one guide?

## Finding

Yes, up to the sign-in, which only the friend can do. From a clone, `npm run setup` installs, writes `.env` with the
CLI it finds, and either reports ready or stops at the sign-in and names the command. `npm run dev` then serves the
browser game.

## Method

Run by hand in the cloud session container (Linux, Node 22.23.5, npm 10.9.9, `claude` on PATH and not signed in).
No model was called.

## Results

| Check | Result |
|---|---|
| `npm ci` | 277 packages, about 5 s |
| `npm run dev` with `claude-cli` | Server on 127.0.0.1:3001, `/api/health` 200; client on 5173, 200; `/api/health` through its proxy, 200 |
| `npm run setup` with no `.env` | Created `.env`, wrote `LLM_PROVIDER=claude-cli`, `check:provider` gave `CLI_AUTH_REQUIRED`, ended with "Sign in with `claude auth login`, then run `npm run setup` again" and exit 1 |
| Server tests | 573 of 573 (568 before; five Gemini tests) |
| `check:provider` with `gemini` | No key: "LLM_PROVIDER=gemini needs GEMINI_API_KEY in .env"; a key: provider `gemini`, model `gemini-3.8-flash`, no request made |
| Web client tests | 288 of 288 (unchanged) |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 (needs `npm ci --prefix mobile` first; the root `npm test` stops at `jest: not found` without it) |

| What the owner said | Where it is now |
|---|---|
| Make it playable for a friend | `PLAY.md`, "For the player"; the browser game on the friend's computer |
| Simple, so their agent can set it up | `PLAY.md`, "For the agent"; `npm run setup` |

## Decision

- **The friend's subscription, not the owner's.** The hosted page is not in `PLAY.md`.
- **Browser, not iPhone.** The browser game runs on any computer; the iPhone app needs a Mac, Xcode and the
  Simulator.
- **The example's `codex-cli` is not taken as a choice.** `.env.example` names `codex-cli`, so a fresh `.env` would
  otherwise always pick Codex even where only Claude Code is installed.
- **Gemini by its OpenAI-compatible endpoint**, not a new SDK: no dependency, and the OpenAI adapter's requests are
  reused. A Gemini CLI route (a subscription, like Claude's and Codex's) was not built.
- **On `main` on the owner's word** ("push everything"); that deploys the page and the server.

## Claim boundary

As in the architecture: Linux only; the path past the sign-in was not walked; untried on Windows.

## Open items

- Play a conversation with a real Gemini key and see whether the strict schema or the fallback is what answers.
- Walk `npm run setup` on a Mac and on Windows with a signed-in CLI, through a first conversation.
- The root `npm test` fails without the iPhone app's dependencies installed; a note or a guard would help.
