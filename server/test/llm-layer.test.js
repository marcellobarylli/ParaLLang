// Round 095: fixes from a review of the LLM layer (review R1.1-R1.4, critique 1.1-1.10). No real CLI is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { FixtureProvider, createRuntime } from './helpers.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { CLIProcessRunner } from '../src/llm/cli-runner.js';
import { CodexCLIAdapter } from '../src/llm/adapters/codex-cli.js';
import { ClaudeCLIAdapter } from '../src/llm/adapters/claude-cli.js';
import { ProviderError } from '../src/llm/provider-error.js';
import { locationAtmosphereSchema } from '../src/llm/schemas.js';

// R1.1 -------------------------------------------------------------------------------------------------------------

test('the adapter wrapper is serial for the CLI providers and not for the HTTP ones (review R1.1)', () => {
  assert.equal(createLLMAdapter({ provider: 'codex-cli' }, {}).serial, true);
  assert.equal(createLLMAdapter({ provider: 'claude-cli' }, {}).serial, true);
  assert.equal(createLLMAdapter({ provider: 'openai' }, { OPENAI_API_KEY: 'x' }).serial, false);
  assert.equal(createLLMAdapter({ provider: 'ollama' }, {}).serial, false);
});

// A stub serial provider whose atmosphere calls wait until aborted.
class HeldAtmosphere extends FixtureProvider {
  constructor() { super(); this.serial = true; this.signals = []; this.arrived = null; this.onArrive = null; }
  async structuredChat(messages, schema, options) {
    if (options.schemaName !== 'location_atmosphere') return super.structuredChat(messages, schema, options);
    this.signals.push(options.signal);
    this.onArrive?.();
    return new Promise((_, reject) => {
      options.signal?.addEventListener('abort', () => reject(new ProviderError('interrupted', { provider: 'codex-cli' })), { once: true });
    });
  }
}

test('through the wrapper, a player start aborts a held atmosphere call on a serial provider (review R1.1)', async (t) => {
  const wrapper = createLLMAdapter({ provider: 'codex-cli' }, {});
  const stub = new HeldAtmosphere();
  wrapper.provider = stub;
  const runtime = await createRuntime({ provider: wrapper, serviceOptions: { atmosphere: true, prefetch: false } });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await runtime.service.moveTo(learnerId, { locationId: 'coffee_cart' }).catch(() => {});
  const arrived = new Promise((resolve) => { stub.onArrive = resolve; });
  const pending = runtime.service.getAtmosphere(learnerId);
  await arrived;
  await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(stub.signals.at(-1).aborted, true);
  assert.equal((await pending).atmosphere, null);
});

// R1.2, R1.4 -------------------------------------------------------------------------------------------------------

const messages = [{ role: 'system', content: 'You write one line.' }, { role: 'user', content: '{}' }];
const failing = (category, stdout, extra = {}) => ({
  run: async () => { throw new ProviderError(category, { provider: 'codex-cli', internal: { stdout }, ...extra }); },
});
async function codexWith(runner) {
  const adapter = new CodexCLIAdapter({ runner });
  adapter.preflightPromise = Promise.resolve({});
  return adapter;
}
async function claudeWith(runner) {
  const adapter = new ClaudeCLIAdapter({ runner, childEnv: {} });
  adapter.preflightPromise = Promise.resolve({});
  return adapter;
}
const category = (expected) => (error) => { assert.equal(error.category, expected); return true; };
const PARTIAL = '{"type":"thread.started"}\n{"type":"item.sta';
const QUOTA = 'not json\n{"type":"thread.started"}\n{"type":"turn.failed","error":{"code":"usage_limit_reached"}}\n';

test('Codex: a timeout, abort or output limit keeps its category; a non-zero exit maps only a stated failure (review R1.2)', async () => {
  for (const kind of ['timeout', 'interrupted', 'output-limit']) {
    const adapter = await codexWith(failing(kind, PARTIAL));
    await assert.rejects(adapter.structuredChat(messages, locationAtmosphereSchema, {}), category(kind));
  }
  await assert.rejects((await codexWith(failing('process', QUOTA))).structuredChat(messages, locationAtmosphereSchema, {}), category('quota'));
  await assert.rejects((await codexWith(failing('process', PARTIAL))).structuredChat(messages, locationAtmosphereSchema, {}), category('process'));
});

test('Codex: exit 0 with a failed turn and no result file reports the failure, not invalid-response (review R1.4)', async () => {
  const runner = {
    run: async (spec) => {
      const result = { stdout: QUOTA, stderr: '', exitCode: 0 };
      result.collected = await spec.collect('/nonexistent-parallang-dir', result);
      return result;
    },
  };
  await assert.rejects((await codexWith(runner)).structuredChat(messages, locationAtmosphereSchema, {}), category('quota'));
  const empty = {
    run: async (spec) => ({ stdout: '{"type":"turn.completed"}\n', stderr: '', exitCode: 0, collected: await spec.collect('/nonexistent-parallang-dir') }),
  };
  await assert.rejects((await codexWith(empty)).structuredChat(messages, locationAtmosphereSchema, {}), category('invalid-response'));
});

test('Claude: an output limit keeps its category; a non-zero exit maps an error envelope, else stays process (critique 1.6)', async () => {
  const cut = '{"type":"result","subtype":"succ';
  await assert.rejects((await claudeWith(failing('output-limit', cut))).structuredChat(messages, locationAtmosphereSchema, {}), category('output-limit'));
  await assert.rejects((await claudeWith(failing('interrupted', cut))).structuredChat(messages, locationAtmosphereSchema, {}), category('interrupted'));
  const quota = JSON.stringify({ type: 'result', subtype: 'error', is_error: true, error: { code: 'usage_limit_reached' } });
  await assert.rejects((await claudeWith(failing('process', quota))).structuredChat(messages, locationAtmosphereSchema, {}), category('quota'));
  await assert.rejects((await claudeWith(failing('process', cut))).structuredChat(messages, locationAtmosphereSchema, {}), category('process'));
});

// R1.3 -------------------------------------------------------------------------------------------------------------

// A fake child: no pid (so no real signal is sent), stdio streams, and the events a test emits by hand.
function fakeSpawner() {
  const children = [];
  const spawnImpl = () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {};
    children.push(child);
    return child;
  };
  return { spawnImpl, children };
}
const spec = (overrides = {}) => ({ provider: 'codex-cli', executable: 'fake', args: [], stdin: '', env: {}, timeoutMs: 10_000, ...overrides });
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function started(fake, count = 1) {
  for (let i = 0; i < 200 && fake.children.length < count; i += 1) await tick();
  return fake.children.at(-1);
}

test('runner: exit 0 without close resolves with its output after the grace; exit, data, close keeps the data (review R1.3)', async (t) => {
  const fake = fakeSpawner();
  const runner = new CLIProcessRunner({ spawnImpl: fake.spawnImpl, killGraceMs: 25 });
  t.after(() => runner.shutdown());
  const begun = Date.now();
  const first = runner.run(spec());
  const child = await started(fake);
  child.stdout.write('out');
  await tick();
  child.emit('exit', 0, null);
  const result = await first;
  assert.equal(result.stdout, 'out');
  assert.equal(result.exitCode, 0);
  assert.ok(Date.now() - begun < 3_000);
  assert.equal(child.stdout.destroyed, true, 'the stdio is released (a setsid escapee would hold it)');

  const second = runner.run(spec());
  const next = await started(fake, 2);
  next.emit('exit', 0, null);
  next.stdout.write('late');
  await tick();
  next.emit('close', 0, null);
  assert.equal((await second).stdout, 'late');

  const third = runner.run(spec()); // close alone (a spawn ENOENT gives no exit) still settles
  const only = await started(fake, 3);
  only.emit('close', 0, null);
  assert.equal((await third).exitCode, 0);
});

test('runner: a child that emits nothing after signals times out, frees the slot, and shutdown resolves (review R1.3)', async () => {
  const fake = fakeSpawner();
  const runner = new CLIProcessRunner({ spawnImpl: fake.spawnImpl, killGraceMs: 25 });
  const begun = Date.now();
  const stuck = runner.run(spec({ timeoutMs: 100 }));
  await started(fake);
  const queued = runner.run(spec());
  await assert.rejects(stuck, category('timeout'));
  assert.ok(Date.now() - begun < 3_000);
  const next = await started(fake, 2);
  next.emit('close', 0, null);
  assert.equal((await queued).exitCode, 0);
  runner.run(spec()).catch(() => {}); // a third, silent child: shutdown must still end
  await started(fake, 3);
  await runner.shutdown();
});

test('runner: an abort after exit 0 does not fail the run; a non-zero exit without close is process with its stdout (critique 1.4, 1.5)', async (t) => {
  const fake = fakeSpawner();
  const runner = new CLIProcessRunner({ spawnImpl: fake.spawnImpl, killGraceMs: 25 });
  t.after(() => runner.shutdown());
  const controller = new AbortController();
  const run = runner.run(spec({ signal: controller.signal }));
  const child = await started(fake);
  child.stdout.write('done');
  await tick();
  child.emit('exit', 0, null);
  controller.abort();
  child.emit('close', 0, null);
  assert.equal((await run).stdout, 'done');

  const failed = runner.run(spec());
  const second = await started(fake, 2);
  second.stdout.write('{"partial"');
  await tick();
  second.emit('exit', 3, null);
  await assert.rejects(failed, (error) => {
    assert.equal(error.category, 'process');
    assert.equal(error.internal.stdout, '{"partial"');
    return true;
  });
});

test('runner: a real child that exits but leaves a grandchild on its stdout resolves fast and the grandchild is killed (review R1.3)', async (t) => {
  const runner = new CLIProcessRunner({ killGraceMs: 25 });
  t.after(() => runner.shutdown());
  const begun = Date.now();
  const result = await runner.run(spec({ executable: '/bin/sh', args: ['-c', 'sleep 30 & echo $!; exit 0'], env: { PATH: process.env.PATH } }));
  assert.ok(Date.now() - begun < 3_000, `took ${Date.now() - begun} ms`);
  const pid = Number(result.stdout.trim());
  assert.ok(pid > 0);
  const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (let i = 0; i < 40 && alive(); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(alive(), false);
});
