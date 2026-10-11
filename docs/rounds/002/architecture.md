# Round 002 architecture

## Outcome

**Playtest ParaLLang through Codex and Claude Code subscriptions.**

The owner can play the existing Gerald the Imp encounter locally in the browser using either their Codex/ChatGPT subscription login or their Claude Code subscription login. The selected CLI supplies both narration and grading. Setup explains how to choose a provider and model, checks the local installation and authentication, and reports actionable failures without losing the player's input or committing partial learning progress.

Deliver both integrations, documentation, focused automated checks, and the available live verification as one round with one final owner review. Implementation dependencies are not intermediate owner gates. Open models remain the later accessibility direction through the existing Ollama adapter; this round does not evaluate or download them.

## Design

### Decisions and baseline

The agreed feature title is **Playtest ParaLLang through Codex and Claude Code subscriptions**. Preserve that title in the packet and implementation handoff.

The owner reports an OpenAI plan and Claude Code Max access and specifically wants to use those subscriptions for development. Product branding alone does not establish CLI authentication or model entitlement. Use native subscription sign-in, not a new API account or an extracted subscription token.

The [round 001 Critic report](../001/audit-1.md) is authoritative: the learning loop passed its selected fixture tests and persisted simulation; neither provider's live model judgment was verified. The Spellbook can expose meanings protected by an active assessment. That leak remains an explicitly separate, unresolved policy issue and is not silently fixed or accepted by this round.

[Prototype section 3.3.3](../../../prototype.md) defines the provider-independent interface. Current code implements OpenAI API and Ollama, not Anthropic API or either CLI. The implemented stack is React/Vite/Zustand, Express, YAML content, Zod, and atomic JSON learning storage. Keep that stack and its provider boundary.

Read-only inspection during this conversation found Codex package version 0.162.0 and a Claude Code executable at version 2.1.287. These are observed installations, not certified minimum versions. No authentication check, live inference, install, build, or implementation test was run during design.

Preserve the existing learning decisions: canonical vocabulary, contextual mixed-language answers, English-only guidance without Spanish-target credit, server-owned grading and assistance caps, local isolated-word review, SM-2, learner isolation, durable attempt receipts, and committed-turn difficulty escalation. Browser pronunciation remains independent of the model provider. Full conversation persistence and game save/load remain excluded.

### Second opinion

No separate round 002 second-opinion consultation was supplied. Do not invent a rival recommendation or treat this document as owner acceptance of additional scope.

- Adopt the previous Critic's need for live grading verification. The owner's newer decision supplies the route: their two CLI subscriptions, rather than requiring an OpenAI API key or an Ollama installation.
- Set aside implementing the Critic's proposed Spellbook meaning-hiding policy in this round. The feature discussion left it as a separate decision, and this round concerns provider access.
- Retain the Critic's distinction between fixture evidence, live-model evidence, and manual browser/device evidence. Unavailable checks must be reported accurately.

### Configuration and setup experience

Extend the provider registry with **codex-cli** and **claude-cli**, alongside **openai** and **ollama**. These names are ParaLLang configuration values, not orchestration seat provider names.

For example, the root .env selects one provider:

    LLM_PROVIDER=codex-cli

or:

    LLM_PROVIDER=claude-cli

LLM_MODEL is an optional explicit model selection. An absent or blank override delegates to that CLI's configured/default model. Do not pass the OpenAI API default gpt-4o-mini to a CLI provider. Existing API and Ollama model selection remains provider-specific.

Support optional CODEX_CLI_PATH and CLAUDE_CLI_PATH overrides, each an executable path, never a shell fragment. Resolve the default executable from PATH without a shell. Add LLM_CLI_TIMEOUT_MS with a default of 120000 milliseconds per generation call; validate it as a finite integer in the documented 1000–300000 range. Use independent short deadlines for version/capability/authentication checks.

Provide **npm run check:provider**, accepting an optional --provider override. It loads the same root .env and uses the same provider configuration and sanitized child environment as the server. For the new providers it checks executable availability, version/capability support, supported isolation controls, and subscription authentication. It makes no generation request. A successful check means setup is usable, not that a selected model or remaining quota has been verified. Print only safe fields such as provider, CLI version, authentication category, and requested model or "CLI default". Do not output an email address, token, account ID, configuration dump, or raw authentication result.

Normal setup is: sign in with the official CLI, select the provider in .env, run check:provider, run npm run dev, and open the existing browser UI. Provider changes take effect after a server restart; the encounter restarts under existing server behavior while the Spellbook persists. Do not overwrite an existing .env. Update .env.example and README with both provider choices, optional settings, checks, and failure recovery. An embedded login flow, provider picker, and account-management UI are not required.

Run the equivalent preflight before the selected CLI handles its first game request. A setup failure should leave the server able to return useful API errors and serve existing learning data; the pending-state UI must terminate with that error. Expired login or quota failures after preflight still require runtime handling.

CLI mode is for the owner's local development machine. Bind its backend listener to loopback and keep the Vite proxy compatible with that address. Do not expose a subscription-backed endpoint on the LAN or add a hosted authentication service.

### Native subscription authentication

Run the official executables under the owner's existing native subscription sign-in. ParaLLang must not read or copy credential files, scrape credentials from output, export or exchange subscription tokens, rewrite global CLI settings, or turn a subscription into a shared API endpoint. Native CLI credential refresh is the CLI's responsibility.

Construct an explicit child environment rather than passing the entire server environment. Preserve the operating-system and native credential-discovery environment needed by the official CLI. Exclude API-key credentials and conflicting custom provider, gateway, bearer-token, workload-identity, and alternate-authentication overrides. Apply that same environment to checks and inference; a check under one identity followed by inference under another is unacceptable. This affects only the child process, not the parent's environment or the owner’s shell.

For Codex, require ChatGPT authentication and the official subscription provider using supported invocation-level controls, including forced_login_method=chatgpt where supported. For Claude Code, require its native claude.ai subscription authentication; a console/API-key/helper/third-party mode does not satisfy this feature. Inspect native auth-status results in memory and retain only an allowlisted category. Also reject persisted conflicting provider settings that cannot be safely overridden for the invocation.

Do not silently switch to API billing, another model, another provider, or a different account when authentication or quota fails. Account usage and any extra-usage settings remain governed by the owner's subscription; the application must not claim unlimited or guaranteed zero-cost inference. Model access is established only by a successful live request.

The documentation supports these integration surfaces: [Codex noninteractive execution](https://learn.chatgpt.com/docs/non-interactive-mode) reuses saved CLI authentication and supports schema-constrained output; [Claude authentication](https://code.claude.com/docs/en/authentication) describes native subscription login. Verify compatibility with the installed versions during implementation.

### Components and data flow

Add CodexCLIAdapter and ClaudeCLIAdapter under server/src/llm/adapters/, with shared process, capability/authentication, safe-error, and environment helpers under server/src/llm/. The existing LLMAdapter registry remains the selection point. Branch configuration by provider in createLLMAdapter so CLI providers receive neither an API client nor unrelated provider defaults.

The production game continues to call structuredChat(messages, schema, options). Keep the normalized adapter interface coherent, but do not route game responses through free-text chat. No game-specific scoring logic belongs in a CLI adapter.

The flow is:

1. The current service builds narration or grading messages using authored content and explicit game history.
2. The selected adapter converts the messages and Zod-derived JSON schema to the CLI's documented request form.
3. The shared runner launches a bounded, isolated noninteractive process.
4. The provider parser extracts a successful final structured result and validates it with the existing Zod schema.
5. The service applies existing semantic evidence/objective checks, assistance rules, and staged persistence before returning the server snapshot.

Use native structured output: Codex exec with an output schema and machine-readable completion information; Claude print mode with JSON output and a JSON schema. Claude's structured_output payload is distinct from its result text. Codex event JSON is distinct from the schema-conforming final game object. Require a successful process exit, a successful provider completion, exactly one usable final result, and valid schema data. Reject failure envelopes even when the process exits zero. Never scrape prose, markdown fences, or arbitrary stdout for something that resembles JSON.

Preserve message roles, order, and the distinction between trusted instructions and player data. Use the existing system instructions as the model instructions and encode remaining role-tagged messages unambiguously. Player text must occur once in its intended location and must never become a shell command, flag, executable name, or configuration value. Do not reframe narration or grading as a repository coding task.

Each model call is a fresh invocation. The service supplies history explicitly; do not resume a CLI session, share a narrator session with the grader, or inherit a prior learner's conversation. Keep session persistence and memory off where the supported CLI controls permit. A turn normally involves separate grading and narration calls, while the greeting uses narration alone. Help reveals and isolated-word reviews must not launch a model.

Map only supported options. Do not claim a CLI obeyed an API-only temperature or token option that it does not expose. Model selection and timeouts must be real controls. Keep both game schemas and the authored grading rubric authoritative.

### Process isolation and lifecycle

Use Node's child-process primitives with an executable and argument array, shell execution disabled, piped stdin, and a closed input stream after sending the request. Send game messages through stdin or private prompt files where native system-prompt handling requires them; do not put player text in process command lines. CLI_PATH settings accept a path only. Test executable paths containing spaces.

Use private temporary directories outside the checkout as working directories and for required schema/prompt files. Limit their permissions and remove them in all completion/error paths. Do not place runtime files in content, documentation, or the source tree.

The model receives the supplied game context and needs no coding tools, filesystem exploration, web browsing, MCP servers, app connectors, hooks, skills, or unrelated project instructions. Disable these through actual supported invocation/configuration controls, not a prompt saying "do not use tools". A restrictive sandbox and empty working directory alone do not remove inherited integrations.

For Claude, evaluate its supported safe mode together with removal of built-in and MCP tools, isolated customization loading, and no session persistence. Do not substitute bare mode without checking authentication: it has different credential behavior. For Codex, use the supported restrictive sandbox, disabled shell/coding and external tool features, disabled hooks/memory/session persistence, explicit instruction handling, and effective overrides for inherited integrations. Do not assume an empty configuration table erases merged global configuration.

Confirm the effective configuration and tool surface before any live generation. Capability/authentication probes must themselves avoid launching inherited hooks or integrations. Do not mutate global settings, copy auth to a separate home directory, or bypass managed restrictions. If the installed CLI/configuration cannot satisfy both native authentication and isolation, return an unsupported-configuration error and record that provider as unverified/incomplete. This is an implementation compatibility problem to resolve within the round, not a new owner acceptance stage.

Relevant official references are [Claude CLI controls](https://code.claude.com/docs/en/cli-reference) and [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference). Current documentation is guidance, not evidence that every control exists in an installed version. Record the actually tested invocation and versions.

The shared runner provides:

- One active generation process per server for these local CLI providers, with at most eight queued calls. A full queue returns a retryable busy error. Waiting time counts toward each call's deadline.
- Separate bounded setup probes; no automatic generation during setup, health checks, or ordinary server startup.
- Default generation deadline of 120 seconds, configurable as above; one player turn can take two such calls.
- Captured-output limits of 1 MiB for stdout and 64 KiB for stderr, including incremental parser buffers. Overflow terminates the request.
- Graceful termination followed by forced termination after at most two seconds, covering the child process group and reaping descendants on the supported macOS environment. Release queue capacity and temporary files after cleanup.
- Shutdown handling that rejects queued work and terminates active children. Do not introduce an orphaned CLI process on server restart.
- No application-level automatic generation retries. An explicit player retry can use another subscription request; a previously committed attempt must instead replay its existing receipt without another model call.

Keep this a small subprocess integration, not a general agent runtime or SDK migration. Use existing dependencies and Node facilities; add a narrowly required dependency only if needed for reliable native configuration handling. No CLI installation or upgrade is an automatic setup action.

### Safe failure behavior and UI

Introduce a bounded set of safe provider error categories: missing CLI, unsupported version/configuration, subscription login required, model unavailable, quota exhausted, queue busy, timeout, output limit, invalid response, interrupted process, and generic provider failure. Map only reliable CLI status/error information to these categories. Unknown errors use the generic message; do not guess account status from arbitrary prose.

Extend the existing service error boundary to preserve allowlisted safe provider errors while retaining generic treatment for unexpected exceptions. The browser should say what the owner can do, such as sign in with the selected CLI, choose an available model, wait for quota to recover, or retry. No failed request scores the player as incorrect.

Never propagate raw stderr, provider response dumps, account identifiers, credential fragments, or full prompts into browser responses or ordinary logs. The existing Express logger includes error.cause.message, so ensure CLI failures cannot leak through that path. Log a request ID, provider/category, exit status, and elapsed time as appropriate, using sanitized fields.

Keep the current pending indicator, disabled duplicate submission, and retained draft behavior across the complete grading-plus-narration request. Add only the UI changes necessary to surface these errors and avoid an indefinite pending state. No settings redesign or token/cost dashboard.

State remains staged until all required output has been validated and persistence succeeds. If grading succeeds but narration fails, do not change encounter version, objectives, turn counter, transcript, Spellbook evidence, schedules, or committed receipts. Help already explicitly requested remains recorded under the existing policy. Preserve same-learner serialization, stale-tab rejection, durable receipt replay, and separation between learners. Existing server-owned review and pronunciation behavior continue independently.

### Delivery and setup boundaries

Implementation may change the provider registry/configuration, new CLI adapters/helpers, directly necessary server startup/error/shutdown handling, minimal client error presentation, focused test files and scripts, package scripts, .env.example, and README. Modify manifests/lockfile only for necessary scripts/dependencies. Do not rewrite vision documents, vocabulary, encounter objectives, or unrelated systems.

The composer writes only this architecture and packet in this turn. The authoritative context permits no configuration additions. The existing .philharmonica/orchestrator.toml already contains setup = "npm ci", which recreates workspace dependencies. Preserve that file byte-for-byte. No check command is configured, and no broad check is selected.

## Test plan

This is a focused integration round, not a release. The following checks are selected because they cover changed provider selection, process behavior, transaction errors, and client pending/error behavior. No other suite runs by default.

### New deterministic tests

Use Node's built-in test runner, dependency injection, and deterministic fake CLI programs. Automated tests must never discover or call the owner's real CLIs, use real credentials, or consume subscription quota.

1. **server/test/cli-runner.test.js:** exercise real child-process lifecycle with fake programs. Cover stdin/argument boundaries, literal shell-looking player text, executable paths with spaces, fragmented/multibyte output, bounded buffers, nonzero exits, timeout, child/grandchild termination, shutdown, queue capacity/deadline, and temporary-file cleanup. Test that the runner waits for exit rather than accepting a final-looking object from a process that subsequently fails.
2. **server/test/cli-providers.test.js:** cover registry selection, provider-specific model defaults and overrides, both schemas, correct successful-result extraction, success-exit/failure-envelope combinations, missing/duplicate final payloads, malformed/schema-invalid output, and typed failures. Cover root .env loading in server/check scripts, capability checks, native subscription-auth classification, environment isolation from API keys and alternative auth, and zero inference during check:provider. Use fake configuration/status outputs to demonstrate inherited integrations cannot silently remain active; assert unsupported configurations are rejected before generation.
3. **server/test/cli-learning-flow.test.js:** run the real HTTP/service flow through each actual CLI adapter and its fake process transport. Cover greeting, successful staged coffee/no-milk order, authoritative grading, grading failure, and grading-success/narration-failure rollback. Assert unchanged persisted and in-memory progress on failure, retry success with exactly one commit, duplicate committed delivery with no additional child generation, safe error/log contents, learner isolation, and stale versions. Include local listener/proxy configuration checks and application shutdown cleanup.

Add fake CLI fixtures under server/test/fixtures/ as needed. Fixture contracts must resemble captured/documented provider envelopes; fixtures establish integration behavior, not real-model judgment. No pre-recorded real credentials or personal transcripts.

### Existing tests selected

- **server/test/llm-contracts.test.js:** run the file. Configuration and schema adaptation must preserve both existing providers and single-copy prompt assembly.
- **server/test/learning-flow.test.js:** run the file. It covers objective decisions, invalid/failed grading, help policy, and review behavior adjacent to the service error boundary.
- **server/test/learning-storage.test.js:** select only the three named receipt/concurrency/persisted-simulation tests below. These protect commit and restart guarantees without rerunning unrelated storage and scheduler tests.
- **client/src/stores/__tests__/learning-state.test.js:** run the file and extend it for the new safe provider errors and long-pending request completion. Preserve the user's input, startup deduplication, snapshots, and learner switching.
- **client/src/components/__tests__/learning-flow.test.jsx:** run the existing "actual learning UI" and "loading plus" tests and add tests whose names begin "CLI provider" for actionable errors and retained input. The pronunciation boundary is not selected.
- **Client production build:** run npm run build -w client after the selected tests.
- **Formatting:** run git diff --check.

Selected deterministic commands, from the repository root:

    node --test server/test/llm-contracts.test.js server/test/learning-flow.test.js server/test/cli-runner.test.js server/test/cli-providers.test.js server/test/cli-learning-flow.test.js
    node --test --test-name-pattern="same-learner mutations serialize|dialogue and review receipts replay after service restart|persisted full-flow simulation recovers the exact review schedule" server/test/learning-storage.test.js
    npm exec --workspace client -- vitest run src/stores/__tests__/learning-state.test.js
    npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx -t "actual learning UI|loading plus|CLI provider"
    npm run build -w client
    git diff --check

Retire no existing tests. Do not delete or weaken assertions to make a provider appear compatible.

### Live verification and browser simulation

Provide a separate explicitly invoked **npm run verify:cli -- --provider codex-cli** or **--provider claude-cli** command, backed by a focused script under server/scripts/. It shares configuration/preflight with production and refuses API providers. It must never run implicitly during installation, startup, check:provider, health checks, or deterministic tests.

During implementation, use the available native subscription logins for both providers. Do not request an intermediate owner approval to proceed with already authorized local verification. If an account needs interactive login, a private network is unavailable, or quota is exhausted, finish independent work and report the blocked verification at the final review; do not change accounts or billing.

Use a temporary learning save directory and test learner identities. Do not modify the owner's normal Spellbook. For each provider, select and record one available model; record both requested and resolved model when the CLI reports it. Do not infer model identity from generated prose.

Run these nine bounded grading cases through the real grading adapter and the existing semantic validation, using authored objectives and appropriate explicit context:

1. "Quiero un café." passes order_coffee without completing no_milk.
2. "Quiero un café sin leche." completes both objectives.
3. "I would like un café sin leche, please." completes both objectives.
4. "I want black coffee without milk." does not earn the required Spanish targets.
5. After an established coffee order, "Sin leche, por favor." passes no_milk.
6. In that context, "No sin leche, con leche." fails no_milk.
7. "The sign says 'sin leche'." fails no_milk.
8. "Sin leche is two words." fails no_milk.
9. "My friend takes café negro." does not complete the player's order.

Also complete a real server-route encounter per provider with greeting, a coffee order, and the contextual no-milk answer. Verify server-owned resolution, canonical vocabulary discovery, and a due local review. Record feedback, schema validity, expected versus observed decisions, and response times; do not demand identical wording or identical 0–5 scores across providers.

The scripted budget is at most 14 generation calls per provider: nine grading cases plus greeting and two turns. Stop that provider's live checks on an authentication/quota failure; do not loop until a stochastic verdict passes. After fixing a demonstrated integration defect, any rerun must stay within the total live budget below or be reported as incomplete.

If browser-driving capability is available, exercise the actual Vite/browser path for each provider: load greeting, submit an order, inspect feedback and pending state, open Spellbook, and reload. Use at most six additional calls per provider, for a total of **20 generation calls per provider** across the round's verification. Reuse an existing test encounter when possible. If that capability is unavailable, report manual browser verification as not run and provide concise owner steps. Component tests are not a substitute for an actual browser session.

Capture a small safe implementation report: CLI versions, invocation/isolation controls, authentication category, model, case results, model-call counts, call/turn durations, and any unavailable checks. Do not retain raw event streams containing private metadata. An installation or successful auth check alone is not a live pass. Distinguish "implemented and fixture-tested" from "verified live" independently for each provider. Unresolved live failures remain visible acceptance gaps.

### Deliberately not run

Do not run an entire repository suite, automatic broad check, dependency audit/remediation, load test, repeated model benchmark, all-model matrix, or release validation. Do not rerun language-engine unit tests, the unselected storage cases, broad content review, or pronunciation tests: this round does not change their algorithms/content/device behavior.

Do not perform live OpenAI API or Ollama evaluation, model downloads, CLI installs/upgrades, account provisioning, hosted deployment, or public-network testing. Real speaker output, device voice quality, private account recovery, purchases, quota increases, and unavailable private-network/browser access are owner-dependent. They are recorded limitations, not reasons to introduce intermediate owner gates.

No implementation tests, live CLI calls, build, installation, or setup command run during this composer drafting turn.

## Questions for the owner

No answer is required to implement the agreed scope. The following defaults allow the single round to proceed:

- **First provider/model:** include both providers. Use Codex CLI as the first README example, leave model selection to each CLI unless LLM_MODEL is explicit, and verify one accessible model per provider. Do not reinterpret the owner's OpenAI plan name as proof of a particular model entitlement.
- **Response time:** start with the 120-second per-call deadline and visible pending state; measure actual times during the bounded live checks. A normal turn makes two calls. Streaming and latency optimization are deferred.
- **Account access:** use available existing native subscription logins. If login/entitlement/quota prevents one provider's checks, report it as unverified; do not silently accept it, switch billing, or claim complete live readiness.
- **Spellbook answer visibility:** remains unresolved outside this round. The selected default is no policy change here, with the prior leak explicitly recorded.
- **Later accessibility:** retain Ollama and the shared provider interface. Choosing or benchmarking an open model and public hosting are later work, not prerequisites or extra stages of this packet.

