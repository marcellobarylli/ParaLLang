import { readFile } from 'node:fs/promises';
import {
  BaseCLIAdapter, parseVersion, prepareRoleSeparatedInput, requireCapabilities, schemaForCLI, writeInvocationFiles,
} from '../cli-adapter.js';
import { assertExecutablePath } from '../cli-environment.js';
import { ProviderError, providerErrorFromMachineCode } from '../provider-error.js';

const DISABLED_FEATURES = [
  'apps', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access', 'computer_use',
  'hooks', 'image_generation', 'memories', 'multi_agent', 'multi_agent_v2', 'plugins', 'remote_plugin',
  'shell_tool', 'skill_search', 'sleep_tool', 'tool_suggest', 'unified_exec', 'unified_exec_tty',
  'view_image', 'workspace_dependencies',
];

function globalIsolationArgs() {
  return [
    '--ask-for-approval', 'never', '--no-daemon',
    '-c', 'forced_login_method="chatgpt"',
    '-c', 'model_provider="openai"',
    '-c', 'developer_instructions=""',
    '-c', 'memories.use_memories=false',
    '-c', 'memories.generate_memories=false',
    ...DISABLED_FEATURES.flatMap((feature) => ['--disable', feature]),
  ];
}

function execIsolationArgs() {
  return [
    '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--skip-git-repo-check',
    '--sandbox', 'read-only',
  ];
}

function parseCodexEvents(stdout, provider) {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim());
  const events = [];
  try {
    for (const line of lines) events.push(JSON.parse(line));
  } catch {
    // Round 095: a failure the events state beats the bad line.
    throw codexFailure(stdout, provider) ?? new ProviderError('invalid-response', { provider });
  }
  const failure = pickFailure(events, provider);
  if (failure) throw failure;
  if (events.filter((event) => event.type === 'turn.completed').length !== 1) {
    throw new ProviderError('invalid-response', { provider });
  }
  const model = events.find((event) => typeof event.model === 'string')?.model
    ?? events.find((event) => typeof event.item?.model === 'string')?.item.model
    ?? null;
  return { model };
}

// Round 095 (review R1.2, critique 1.9): the failure a non-zero exit's events state, or null. Lines parsed one by one,
// bad lines skipped anywhere (a crash may cut the last one).
function codexFailure(stdout, provider) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* skipped */ }
  }
  return pickFailure(events, provider);
}

// Round 099 (review R1.2, critique 1.9): of the failure events, the first whose code names a category (a code-less
// `error` before a coded `turn.failed` must not hide it), else the first; null when there is none.
function pickFailure(events, provider) {
  const failures = events
    .filter((event) => event?.type === 'error' || event?.type === 'turn.failed')
    .map((event) => providerErrorFromMachineCode(event.error?.code ?? event.code, { provider }));
  return failures.find((error) => error.category !== 'provider') ?? failures[0] ?? null;
}

export class CodexCLIAdapter extends BaseCLIAdapter {
  constructor(config = {}) {
    super({
      provider: 'codex-cli',
      executable: assertExecutablePath(config.executable ?? 'codex', 'CODEX_CLI_PATH'),
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

    const [mainHelp, help] = await Promise.all([this.probe(['--help']), this.probe(['exec', '--help'])]);
    requireCapabilities(mainHelp.stdout, ['--ask-for-approval', '--no-daemon'], this.providerName);
    requireCapabilities(help.stdout, [
      '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--output-schema',
      '--output-last-message', '--json', '--sandbox', '--skip-git-repo-check',
    ], this.providerName);
    const features = await this.probe(['features', 'list']);
    requireCapabilities(features.stdout, DISABLED_FEATURES, this.providerName);

    let auth;
    try {
      auth = await this.probe([
        '-c', 'forced_login_method="chatgpt"', '-c', 'model_provider="openai"', 'login', 'status',
      ]);
    } catch (error) {
      if (error instanceof ProviderError && error.category !== 'missing-cli') {
        throw new ProviderError('authentication', { provider: this.providerName });
      }
      throw error;
    }
    if (!/^Logged in using ChatGPT\s*$/m.test(`${auth.stdout}\n${auth.stderr}`)) {
      throw new ProviderError('authentication', { provider: this.providerName });
    }
    return {
      provider: this.providerName,
      version,
      authentication: 'chatgpt-subscription',
      requestedModel: this.model ?? 'CLI default',
      isolation: [
        'ignored user configuration', 'ignored project rules', 'ephemeral session', 'shared daemon disabled', 'read-only sandbox',
        'no approvals', 'OpenAI provider forced', 'ChatGPT login forced', 'coding/external features disabled',
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
          const files = await writeInvocationFiles(directory, { ...input, jsonSchema });
          return {
            stdin: input.stdin,
            args: [
              ...globalIsolationArgs(), 'exec', ...execIsolationArgs(),
              '-C', directory,
              '-c', `model_instructions_file=${JSON.stringify(files.instructionPath)}`,
              ...(this.model ? ['--model', this.model] : []),
              '--json', '--output-schema', files.schemaPath, '--output-last-message', files.outputPath, '-',
            ],
          };
        },
        // Round 095 (review R1.4, critique 1.8): a missing result is null, so the events' failure maps first below.
        collect: async (directory) => {
          try { return await readFile(`${directory}/result.json`, 'utf8'); }
          catch { return null; }
        },
      });
    } catch (error) {
      // Round 095 (review R1.2): only a non-zero exit is re-mapped, and only to a failure its events state; a timeout,
      // an abort or an output limit keeps its category.
      const stdout = error?.internal?.stdout;
      if (error?.category === 'process' && typeof stdout === 'string') {
        const mapped = codexFailure(stdout, this.providerName);
        if (mapped) throw mapped;
      }
      throw error;
    }
    const eventResult = parseCodexEvents(result.stdout, this.providerName);
    this.lastResolvedModel = eventResult.model;
    let parsed;
    try { parsed = JSON.parse(result.collected); }
    catch { throw new ProviderError('invalid-response', { provider: this.providerName }); }
    const validated = schema.safeParse(parsed);
    if (!validated.success) throw new ProviderError('invalid-response', { provider: this.providerName });
    return validated.data;
  }
}
