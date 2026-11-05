# Round 018 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** the supervisor note of 2026-11-05 (the owner delegated all decisions to the supervising agent
  until the deadline): the sandbox's `claude` CLI is signed in to the owner's Claude subscription through
  `CLAUDE_CODE_OAUTH_TOKEN`; round [002](../002/architecture.md) (subscription CLI providers).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `server/src/llm/cli-environment.js`, `server/src/llm/cli-adapter.js`, `server/src/llm/index.js`,
  `server/src/llm/adapters/claude-cli.js`, `server/test/fixtures/fake-cli.mjs`, `server/test/cli-providers.test.js`,
  `README.md`.

## Goal (pre-run)

`--provider claude-cli` works when the Claude CLI is authenticated by a subscription OAuth token in the
environment, so live runs can fall back to Claude while Codex is at its usage limit. API keys, auth tokens, custom
base URLs and third-party providers (Bedrock, Vertex) stay rejected, and the token never appears in output, logs or
errors.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Accept the token route** as the supervisor note allows, beside the existing native `claude.ai` sign-in.
2. **The token goes to claude-cli children only**; Codex children never receive it.
3. **Do not read the token out of another process.** This iteration's shell lacks `CLAUDE_CODE_OAUTH_TOKEN` (only
   the agent's parent process holds it) and `claude -p` answers "Not logged in", so no live claude-cli check here.
   The harness keeps the token out of the shell; working around that is not this round's call.

## Claim boundary (pre-run)

Tested against the fake CLI only. What the real `claude auth status --json` prints with the token set is not known
here (logged out it prints `loggedIn: false, authMethod: 'none', apiProvider: 'firstParty'` and exits 1); the
allow-list below covers that shape and the plausible token names, and an unknown method is rejected.

## Design (pre-run)

1. `createCLIEnvironment(source, { provider } = {})`: unchanged allow-list, plus `CLAUDE_CODE_OAUTH_TOKEN` when
   `provider === 'claude-cli'` and the value is a non-empty string. Both callers pass the provider:
   `createLLMAdapter` and `BaseCLIAdapter`'s default (critique 1.1).
2. Claude preflight, after version and capability checks:
   - **Environment guard for both routes** (1.2): if the child environment holds a non-empty value for any of
     `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_USE_BEDROCK`,
     `CLAUDE_CODE_USE_VERTEX`, reject with `authentication`. Empty strings count as absent.
   - **Status probe:** as before; when it exits nonzero and a token is present, parse its captured stdout instead
     (1.3). Without a token a failed probe is rejected as before. Unparseable stdout: `unsupported-configuration`
     (exit 0) or `authentication` (nonzero), as today.
   - **Native route:** `loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty'` →
     `authentication: 'claude.ai-subscription'` (unchanged).
   - **Token route:** token present, `apiProvider === 'firstParty'`, `authMethod` one of `none`, `claude.ai`,
     `oauth_token`, `oauthToken` (allow-list, 1.4; anything else, including missing, is rejected) →
     `authentication: 'claude.ai-subscription-oauth-token'`.
3. The token value is never copied into a result, log field or error message (errors carry fixed messages; the
   runner's captured output stays in the non-enumerable `internal`).
4. README: the token route in the claude-cli line.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 a1ccceb0…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `BaseCLIAdapter`'s default env drops the token | 0 | Accept | **Accepted** (autonomous) | Design 1 |
| 1.2 | Error | Native branch skips the environment checks | 0 | Accept | **Accepted** (autonomous) | Design 2, guard |
| 1.3 | Risk | Status may exit nonzero with a token (it exits 1 when logged out) | 0 | Accept: parse stdout of a failed probe, token route only | **Accepted** (autonomous) | Design 2, probe |
| 1.4 | Risk | Denylist accepts unknown methods | + | Accept: allow-list | **Accepted** (autonomous) | Design 2, token route |
| 1.5 | Gap | Only one forbidden key tested | 0 | Accept: every key, both routes; empty = absent | **Accepted** (autonomous) | Tests |
| 1.6 | Gap | Nothing proves the token reaches generation | 0 | Accept: factory adapter, preflight and one generation; fake reports presence only | **Accepted** (autonomous) | Tests |
| 1.7 | Gap | Secret safety untested; fake captures the whole env | 0 | Accept: fake redacts the token in its capture; assert it is absent from results and errors when the CLI echoes it | **Accepted** (autonomous) | Tests |

Net change: the guard covers both routes, the token route is an allow-list, a failed status probe is parsed, and the
tests cover generation and secret safety.

## Tests (pre-run)

In `server/test/cli-providers.test.js`, with the fake CLI (`FAKE_AUTH=oauth-env` prints the logged-out shape and
exits 1; `FAKE_AUTH=third-party` prints `apiProvider: 'bedrock'`; the fake fails a generation that lacks the token
when told to require it, and redacts the token in its capture file):

- `createCLIEnvironment`: token for claude-cli only (not codex-cli, not no provider); `ClaudeCLIAdapter` built
  without `childEnv` picks it up from `process.env`.
- Accepted: factory adapter with a synthetic token, oauth-env status → `claude.ai-subscription-oauth-token`, then
  one structured generation that the fake confirms carried the token; token absent from the preflight JSON and the
  capture file.
- Rejected: oauth-env status without a token; token with `apiKey`, an unknown method or a missing method; token with
  a third-party provider; each forbidden key on both routes.
- A generation whose CLI echoes the token on stderr and fails: the error's message and JSON lack the token.
- All suites: server, mobile 25/25, web client 12/12 and build.
- Not here: a live `npm run check:provider -- --provider claude-cli` with the token set (next iteration whose shell
  has it).
