import {
  BaseCLIAdapter, parseVersion, prepareRoleSeparatedInput, requireCapabilities, schemaForCLI, writeInvocationFiles,
} from '../cli-adapter.js';
import { assertExecutablePath, CLAUDE_OAUTH_TOKEN_KEY } from '../cli-environment.js';
import { ProviderError, providerErrorFromMachineCode } from '../provider-error.js';

export const FORBIDDEN_ENV_KEYS = Object.freeze([
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX',
]);
// Status shapes accepted with a token in the environment: logged out (`none`, what the CLI prints without a stored
// sign-in) or a subscription method. API-key, unknown and missing methods are refused.
const TOKEN_AUTH_METHODS = new Set(['none', 'claude.ai', 'oauth_token', 'oauthToken']);
const present = (value) => typeof value === 'string' && value !== '';

function parseClaudeEnvelope(stdout, provider) {
  let envelope;
  try { envelope = JSON.parse(stdout); }
  catch { throw new ProviderError('invalid-response', { provider }); }
  if (!envelope || envelope.type !== 'result' || envelope.subtype !== 'success' || envelope.is_error === true) {
    throw providerErrorFromMachineCode(envelope?.error?.code ?? envelope?.subtype, { provider });
  }
  if (!envelope.structured_output || typeof envelope.structured_output !== 'object' || Array.isArray(envelope.structured_output)) {
    throw new ProviderError('invalid-response', { provider });
  }
  const models = envelope.modelUsage && typeof envelope.modelUsage === 'object' ? Object.keys(envelope.modelUsage) : [];
  return { value: envelope.structured_output, model: models.length === 1 ? models[0] : null };
}

// Round 095 (critique 1.6): the failure a non-zero exit's envelope states, or null (unparsable, or a success).
function claudeFailure(stdout, provider) {
  try { parseClaudeEnvelope(stdout, provider); }
  catch (mapped) { return mapped.category === 'invalid-response' ? null : mapped; }
  return null;
}

export class ClaudeCLIAdapter extends BaseCLIAdapter {
  constructor(config = {}) {
    super({
      provider: 'claude-cli',
      executable: assertExecutablePath(config.executable ?? 'claude', 'CLAUDE_CLI_PATH'),
      model: config.model,
      timeoutMs: config.timeoutMs ?? 120_000,
      runner: config.runner,
      childEnv: config.childEnv,
    });
  }

  async preflight() {
    const versionResult = await this.probe(['--version']);
    const version = parseVersion(versionResult.stdout || versionResult.stderr);
    if (!version) throw new ProviderError('unsupported-configuration', { provider: this.providerName });
    const help = await this.probe(['--help']);
    requireCapabilities(help.stdout, [
      '--print', '--output-format', '--json-schema', '--safe-mode', '--restricted', '--strict-mcp-config',
      '--mcp-config', '--tools', '--disable-slash-commands', '--no-session-persistence', '--system-prompt[-file]',
      '--permission-prompts', '--no-chrome',
    ], this.providerName);
    // Round 018: credentials or routing that bypass the subscription are refused on every route.
    if (FORBIDDEN_ENV_KEYS.some((key) => present(this.childEnv?.[key]))) {
      throw new ProviderError('authentication', { provider: this.providerName });
    }
    const hasToken = present(this.childEnv?.[CLAUDE_OAUTH_TOKEN_KEY]);
    let authStdout;
    let probeFailed = false;
    try { authStdout = (await this.probe(['--safe-mode', 'auth', 'status', '--json'])).stdout; }
    catch (error) {
      // The CLI exits 1 when it has no stored sign-in; with a token its printed status still decides.
      const stdout = error?.internal?.stdout;
      if (hasToken && error instanceof ProviderError && error.category === 'process' && typeof stdout === 'string' && stdout) {
        authStdout = stdout;
        probeFailed = true;
      } else if (error instanceof ProviderError && error.category !== 'missing-cli') {
        throw new ProviderError('authentication', { provider: this.providerName });
      } else throw error;
    }
    let status;
    try { status = JSON.parse(authStdout); }
    catch { throw new ProviderError(probeFailed ? 'authentication' : 'unsupported-configuration', { provider: this.providerName }); }
    if (!status || typeof status !== 'object' || status.apiProvider !== 'firstParty') {
      throw new ProviderError('authentication', { provider: this.providerName });
    }
    let authentication;
    if (!probeFailed && status.loggedIn === true && status.authMethod === 'claude.ai') authentication = 'claude.ai-subscription';
    else if (hasToken && TOKEN_AUTH_METHODS.has(status.authMethod)) authentication = 'claude.ai-subscription-oauth-token';
    else throw new ProviderError('authentication', { provider: this.providerName });
    return {
      provider: this.providerName,
      version,
      authentication,
      requestedModel: this.model ?? 'CLI default',
      isolation: [
        'safe mode', 'restricted mode', 'empty built-in tool set', 'strict empty MCP configuration',
        'slash commands disabled', 'Chrome disabled', 'no session persistence', 'permission prompts denied',
      ],
    };
  }

  async structuredChat(messages, schema, options = {}) {
    await this.ensurePreflight();
    const input = prepareRoleSeparatedInput(messages);
    const jsonSchema = schemaForCLI(schema);
    this.generationCount += 1;
    let result;
    try {
      result = await this.runner.run({
        provider: this.providerName,
        executable: this.executable,
        env: this.childEnv,
        timeoutMs: this.timeoutMs,
        signal: options.signal, // round 078: the guard's retry is cancelled at its deadline
        prepare: async (directory) => {
          const files = await writeInvocationFiles(directory, { ...input, jsonSchema, includeMcpConfig: true });
          return {
            stdin: input.stdin,
            args: [
              '--print', '--output-format', 'json', '--json-schema', JSON.stringify(jsonSchema),
              '--safe-mode', '--restricted', '--strict-mcp-config', '--mcp-config', files.mcpPath,
              '--tools', '', '--disable-slash-commands', '--no-chrome', '--no-session-persistence',
              '--permission-mode', 'plan', '--permission-prompts', 'none',
              '--system-prompt-file', files.instructionPath,
              ...(this.model ? ['--model', this.model] : []),
            ],
          };
        },
      });
    } catch (error) {
      // Round 095 (critique 1.6): as for Codex, only a non-zero exit is re-mapped, to the failure its envelope states.
      const stdout = error?.internal?.stdout;
      if (error?.category === 'process' && typeof stdout === 'string') {
        const mapped = claudeFailure(stdout, this.providerName);
        if (mapped) throw mapped;
      }
      throw error;
    }
    const parsed = parseClaudeEnvelope(result.stdout, this.providerName);
    this.lastResolvedModel = parsed.model;
    const validated = schema.safeParse(parsed.value);
    if (!validated.success) throw new ProviderError('invalid-response', { provider: this.providerName });
    return validated.data;
  }
}
