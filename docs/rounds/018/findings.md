# Round 018 findings

## Question

Can the claude-cli provider run on a Claude subscription OAuth token from the environment (`CLAUDE_CODE_OAUTH_TOKEN`)
while API keys, auth tokens, custom base URLs and third-party providers stay refused and the token stays secret?

## Finding

Yes, against the fake CLI. The token now reaches claude-cli children (never Codex), the preflight accepts it with a
logged-out or OAuth-method status (`authentication: 'claude.ai-subscription-oauth-token'`), and one generation runs
with it. Every forbidden key refuses both the token route and the native route. The token does not appear in
preflight results, errors or the fake's capture, even when the CLI echoes it. In this iteration's shell the token is
not set, so the live preflight still refuses (correctly), and no live claude-cli run was possible.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (7 findings, all accepted).
- Fake CLI (`server/test/fixtures/fake-cli.mjs`) gains `FAKE_AUTH` modes `oauth-env` (prints
  `loggedIn: false, authMethod: 'none', apiProvider: 'firstParty'` and exits 1, as the real CLI does logged out),
  `oauth-method`, `third-party`, `unknown-method`, `missing-method`; control flags `requireToken` and `echoToken`.
- Live: `npm run check:provider -- --provider claude-cli` in the agent's shell.

## Results

| Check | Result |
|---|---|
| New tests in `server/test/cli-providers.test.js` | 5/5 (token passthrough; token accepted + generation; 6 refused statuses; 5 keys × 2 routes refused, empty values ignored; echoed token hidden) |
| server `node --test` | 108/108 (103 before) |
| mobile jest | 25/25 |
| web client vitest, build | 12/12, ok |
| Live claude-cli preflight, no token in shell | refused, `authentication` |

## Decision

Keep. Live runs may use `--provider claude-cli` whenever the shell carries the token; Codex stays the default and the
critic.

## Evidence

Journal rows 8–10; the round's build commit (`server/src/llm/`, fake CLI, tests, README).

## Claim boundary

What the real `claude auth status --json` prints with the token set is unknown here; the allow-list (`none`,
`claude.ai`, `oauth_token`, `oauthToken`) covers the logged-out shape the CLI printed and the plausible token names.
A different method name would be refused (safe failure): extend the allow-list with a test.

## Open items

1. The agent's shell lacks `CLAUDE_CODE_OAUTH_TOKEN` (only the parent process holds it), so claude-cli live runs
   still fail here. The supervisor or owner would have to expose the token to the agent's shell (the agent does not
   read it out of another process). Recorded under "Needs owner".
2. First iteration with the token: run `npm run check:provider -- --provider claude-cli`; if the status method is
   not allow-listed, add it with a test.
