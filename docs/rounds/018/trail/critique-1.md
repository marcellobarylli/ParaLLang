# Codex critique 1: claude-cli accepts a subscription OAuth token

- **Dispatched:** 2026-11-05 16:01:05 (approximate)
- **Returned:** 2026-11-05 16:02:05 (approximate; the background job's notification)
- **Model:** codex exec (codex-cli default model), `--sandbox read-only -c model_reasoning_effort=high`, no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin (a plan, plan-v1.md, followed by cat -n copies of the relevant source files). Critique the plan for a Node game server: it makes the claude-cli provider's preflight also accept a Claude subscription OAuth token passed via CLAUDE_CODE_OAUTH_TOKEN, while still rejecting API keys and third-party providers. Find errors (things that are wrong or would break), risks, and gaps in tests. Number each finding, label it Error / Risk / Gap / Optional, and give a concrete fix. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 a1ccceb0560f8af1d7d7372122ff9f435c3199abd21710972cec7f652bf0c713, HEAD 77c4ad0, working tree `docs/rounds/018/` untracked; stdin bundle `/tmp/r018-bundle.txt` sha256 22571f561e1701bea80b7dca94addf69bbf4d53b96794f0050ff1394b01afeeb (plan-v1.md, server/src/llm/adapters/claude-cli.js, server/src/llm/cli-environment.js, server/src/llm/index.js, server/src/llm/cli-adapter.js, server/test/fixtures/fake-cli.mjs)
- **Findings:** 7

## Raw output (verbatim)

```text
1. **Error — Direct adapter construction still drops the token.** Updating only `createLLMAdapter` misses `BaseCLIAdapter`’s fallback (`cli-adapter.js:53`), which calls `createCLIEnvironment()` without a provider. **Fix:** pass `{ provider }` there too; test constructing `ClaudeCLIAdapter` without `childEnv`.

2. **Error — The native-sign-in branch bypasses the environment restrictions.** A custom `childEnv` containing an API key or provider override can still pass when status reports the existing native-sign-in tuple. **Fix:** apply the forbidden-environment checks before accepting either authentication route; test native status with conflicting credentials and routing settings.

3. **Risk — Unauthenticated status may throw before the new branch runs.** The existing catch (`claude-cli.js:44–49`) rejects a failed status probe immediately. If the CLI exits nonzero while reporting `loggedIn: false`, the proposed acceptance logic remains unreachable. The fake always exits zero. **Fix:** establish the supported CLI’s exit behavior and test it; if necessary, parse structured status from the runner’s nonzero-exit error while preserving other failures.

4. **Risk — The auth-method denylist accepts unknown methods.** “Does not match `/api.?key/i`” also accepts missing, malformed, or unexpected methods; it does not establish subscription authentication. **Fix:** validate the status object and explicitly allow the supported token-status shapes, including the documented `none` case. Reject unknown methods and test those rejections.

5. **Gap — Most forbidden environment keys are untested.** Only `ANTHROPIC_API_KEY` gets a rejection test. **Fix:** parameterize tests over every listed credential and routing key, for both authentication routes, and define whether empty values count as present.

6. **Gap — Helper tests do not prove the token reaches generation.** The proposed tests could pass while factory wiring or generation environment propagation is broken. **Fix:** add a factory-created adapter test that completes preflight and one structured generation with a synthetic token; have the fake verify token presence without recording its value. Cover Codex isolation through the factory too.

7. **Gap — Checking successful-result JSON does not establish secret safety.** Errors and logs remain untested, and the fake explicitly records the entire environment (`fake-cli.mjs:55`). **Fix:** use synthetic credentials, redact capture output, and exercise failures that echo the token into stdout/stderr; assert it is absent from exposed errors and logs.
```
