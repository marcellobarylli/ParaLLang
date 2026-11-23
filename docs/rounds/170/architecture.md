# Round 170 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 by the owner's message after round 169; the
owner's words are in [`trail/interview.md`](trail/interview.md), the events in [`trail/journal.md`](trail/journal.md).
No pre-run commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); the README's "Run locally" and "CLI troubleshooting".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** [`PLAY.md`](../../../PLAY.md), [`tools/setup.mjs`](../../../tools/setup.mjs) (`npm run setup`), a
  pointer at the top of the README.

## Goal

A friend of the owner plays the game. The friend's coding agent sets it up, so the steps must be ones an agent can
follow and check without the README's history.

## Design

**Where the friend plays.** The browser game (`client/`: Ta Prohm, The Kiln, The Journey 2), on the friend's own
computer, against the local server, voiced through the friend's own `claude` or `codex` subscription CLI. It needs
no Mac. The hosted page (round 114) would need the owner's `PARALLANG_TOKEN` and spend the owner's subscription, so
`PLAY.md` does not offer it; the owner may share it separately.

**`npm run setup`** (`tools/setup.mjs`, no new dependency) does what the README's "Run locally" does by hand:

1. checks Node.js 20.11 or newer;
2. `npm ci`;
3. copies `.env.example` to `.env` if there is none;
4. sets `LLM_PROVIDER`: the argument if given (`npm run setup -- codex-cli`); otherwise a value already in `.env`
   other than the example's `codex-cli`; otherwise `claude-cli` if `claude` answers `--version`, else `codex-cli` if
   `codex` does; otherwise it stops and says what to install;
5. runs `npm run check:provider`, which makes no inference request, and on failure names the sign-in command.

It never installs a CLI, signs in, sets a key or calls a model. It does not install the iPhone app's dependencies.

**`PLAY.md`** has two halves. For the agent: requirements, the three commands, how to tell the server is up, the
settings worth changing (`TARGET_LANGUAGE`, `LLM_MODEL`, `LLM_PROVIDER`), what not to do (an API key in CLI mode,
committing `.env`) and the error codes with their fixes. For the player: where to start and how a conversation,
help and the Spellbook work, and that a slow turn is the model.

## Tests

None added: the script is setup glue around commands that are tested already (`check:provider`). It was run by hand
(findings).

## Claim boundary

- Run in the cloud container only (Linux, Node 22). Not run on macOS or Windows. `shell: true` is used so that
  `npm`, `claude` and `codex` resolve on Windows too; that is untried.
- No signed-in CLI was available, so the path past the sign-in (`✓ Ready.`, a conversation) was not walked. That a
  first conversation works rests on the earlier rounds' tests and on the owner's own play.
- `PLAY.md` assumes the repository is public (round 114's Pages step made it so) and that the work is on `main`.

## Outcome

Built and recorded. Committed and pushed on `claude/playable-agent-setup-204zb5`; not on `main`.
