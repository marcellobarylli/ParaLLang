# Round 018 plan v1: claude-cli accepts a subscription OAuth token from the environment

## Context

The supervisor note of 2026-11-05 (the owner delegated decisions to the supervising agent until the deadline) says
the sandbox's `claude` CLI is signed in to the owner's Claude subscription through the `CLAUDE_CODE_OAUTH_TOKEN`
environment variable, while `claude auth status --json` may report `loggedIn: false` or an auth method other than
`claude.ai`. The game's preflight (`server/src/llm/adapters/claude-cli.js`) accepts only
`loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty'`, so it rejects that setup. Separately, the
child environment (`server/src/llm/cli-environment.js`) passes only a fixed allow-list of keys, which does not
include the token, so even an accepted preflight would start a CLI that is not signed in.

## Change

1. `createCLIEnvironment(source, { provider })`: when `provider === 'claude-cli'` and
   `source.CLAUDE_CODE_OAUTH_TOKEN` is a non-empty string, copy it into the child environment. Codex never gets it.
   `createLLMAdapter` passes the provider. All other keys unchanged (API keys, base URLs, Bedrock/Vertex switches stay
   stripped).
2. Preflight accepts either
   - the existing native sign-in (`loggedIn: true`, `authMethod: 'claude.ai'`, `apiProvider: 'firstParty'`), reported
     as `authentication: 'claude.ai-subscription'`; or
   - a subscription OAuth token: the child environment carries a non-empty `CLAUDE_CODE_OAUTH_TOKEN`,
     `apiProvider === 'firstParty'`, the auth method is not an API-key method (`/api.?key/i`, e.g. `apiKey`), and the
     child environment holds none of `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`,
     `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX` (a custom `childEnv` could hold them). Reported as
     `authentication: 'claude.ai-subscription-oauth-token'`. `loggedIn` may be false in this branch.
   Everything else is rejected as before (`authentication` category, `CLI_AUTH_REQUIRED`).
3. The token value never appears in preflight output, logs or errors (it is only copied into the child env).
4. README: one line on the token route.

## Tests (server, fake CLI)

- Fake claude CLI gains `FAKE_AUTH=oauth-env` (reports `loggedIn: false, authMethod: 'none', apiProvider:
  'firstParty'`) and `FAKE_AUTH=third-party` (`apiProvider: 'bedrock'`).
- Accepted: oauth-env status + token in child env → `claude.ai-subscription-oauth-token`, no generation.
- Rejected: oauth-env status without the token; token + `apiKey` method; token + third-party provider; token +
  `ANTHROPIC_API_KEY` in child env.
- `createCLIEnvironment`: token passed for claude-cli, not for codex-cli or no provider; token value absent from the
  preflight result's JSON.
- All server, mobile and client suites stay green.

## Live check

In this iteration's shell `CLAUDE_CODE_OAUTH_TOKEN` is not set (only the agent's parent process holds it), so a live
`check:provider --provider claude-cli` will still fail here, correctly. The agent does not read the token out of
another process. Live claude-cli runs wait for an iteration whose shell has the token.
