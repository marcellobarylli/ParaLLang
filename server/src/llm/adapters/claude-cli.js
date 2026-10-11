import {
  BaseCLIAdapter, parseVersion, prepareRoleSeparatedInput, requireCapabilities, schemaForCLI, writeInvocationFiles,
} from '../cli-adapter.js';
import { assertExecutablePath } from '../cli-environment.js';
import { ProviderError, providerErrorFromMachineCode } from '../provider-error.js';

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
    let auth;
    try { auth = await this.probe(['--safe-mode', 'auth', 'status', '--json']); }
    catch (error) {
      if (error instanceof ProviderError && error.category !== 'missing-cli') {
        throw new ProviderError('authentication', { provider: this.providerName });
      }
      throw error;
    }
    let status;
    try { status = JSON.parse(auth.stdout); }
    catch { throw new ProviderError('unsupported-configuration', { provider: this.providerName }); }
    if (status.loggedIn !== true || status.authMethod !== 'claude.ai' || status.apiProvider !== 'firstParty') {
      throw new ProviderError('authentication', { provider: this.providerName });
    }
    return {
      provider: this.providerName,
      version,
      authentication: 'claude.ai-subscription',
      requestedModel: this.model ?? 'CLI default',
      isolation: [
        'safe mode', 'restricted mode', 'empty built-in tool set', 'strict empty MCP configuration',
        'slash commands disabled', 'Chrome disabled', 'no session persistence', 'permission prompts denied',
      ],
    };
  }

  async structuredChat(messages, schema) {
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
      const stdout = error?.internal?.stdout;
      if (typeof stdout === 'string' && stdout) {
        try { parseClaudeEnvelope(stdout, this.providerName); } catch (mapped) { throw mapped; }
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
