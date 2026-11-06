// Round 099: fixes from a second review of rounds 093-098, server part (review R1.1, R1.2; critique 1.8, 1.9).
// No real CLI is called; the runner tests use /bin/sh.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIProcessRunner } from '../src/llm/cli-runner.js';
import { CodexCLIAdapter } from '../src/llm/adapters/codex-cli.js';
import { ProviderError } from '../src/llm/provider-error.js';
import { locationAtmosphereSchema } from '../src/llm/schemas.js';

const spec = (overrides = {}) => ({ provider: 'codex-cli', executable: '/bin/sh', stdin: '', env: { PATH: process.env.PATH }, timeoutMs: 10_000, ...overrides });
// The child prints its grandchild's pid, leaves the grandchild on its stdout and exits 3.
const HOLD_AND_FAIL = ['-c', 'sleep 30 & echo $!; exit 3'];
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function gone(pid) {
  for (let i = 0; i < 60 && alive(pid); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  return !alive(pid);
}
const processFailure = (error) => {
  assert.equal(error.category, 'process');
  assert.equal(error.internal.exitCode, 3);
  return true;
};

test('runner: a timeout in the exit grace keeps the non-zero exit, and the held group is still killed (review R1.1)', async (t) => {
  const runner = new CLIProcessRunner({ killGraceMs: 600 });
  t.after(() => runner.shutdown());
  let failure;
  await assert.rejects(runner.run(spec({ args: HOLD_AND_FAIL, timeoutMs: 200 })), (error) => { failure = error; return processFailure(error); });
  const pid = Number(failure.internal.stdout.trim());
  assert.ok(pid > 0);
  assert.equal(await gone(pid), true);
});

test('runner: a cancel in the exit grace keeps the non-zero exit, and the held group is still killed (critique 1.8)', async (t) => {
  const runner = new CLIProcessRunner({ killGraceMs: 600 });
  t.after(() => runner.shutdown());
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 200);
  let failure;
  await assert.rejects(runner.run(spec({ args: HOLD_AND_FAIL, signal: controller.signal })), (error) => { failure = error; return processFailure(error); });
  assert.equal(await gone(Number(failure.internal.stdout.trim())), true);
});

test('runner: a timeout before any exit is still a timeout', async (t) => {
  const runner = new CLIProcessRunner({ killGraceMs: 100 });
  t.after(() => runner.shutdown());
  await assert.rejects(runner.run(spec({ args: ['-c', 'sleep 30'], timeoutMs: 150 })), (error) => error.category === 'timeout');
});

const messages = [{ role: 'system', content: 'You write one line.' }, { role: 'user', content: '{}' }];
function codexWith(runner) {
  const adapter = new CodexCLIAdapter({ runner });
  adapter.preflightPromise = Promise.resolve({});
  return adapter;
}
const UNCODED_THEN_QUOTA = '{"type":"thread.started"}\n{"type":"error","message":"stream hiccup"}\n'
  + '{"type":"turn.failed","error":{"code":"usage_limit_reached"}}\n';
const category = (expected) => (error) => { assert.equal(error.category, expected); return true; };

test('Codex: a coded failure event after a code-less error names the category, after a non-zero exit (review R1.2)', async () => {
  const runner = { run: async () => { throw new ProviderError('process', { provider: 'codex-cli', internal: { stdout: UNCODED_THEN_QUOTA } }); } };
  await assert.rejects(codexWith(runner).structuredChat(messages, locationAtmosphereSchema, {}), category('quota'));
});

test('Codex: a coded failure event after a code-less error names the category, after exit 0 (review R1.2)', async () => {
  const runner = {
    run: async (task) => {
      const result = { stdout: UNCODED_THEN_QUOTA, stderr: '', exitCode: 0 };
      result.collected = await task.collect('/nonexistent-parallang-dir', result);
      return result;
    },
  };
  await assert.rejects(codexWith(runner).structuredChat(messages, locationAtmosphereSchema, {}), category('quota'));
});

test('Codex: only code-less failures stay provider; the first coded one wins over a later one', async () => {
  const plain = '{"type":"error","message":"a"}\n{"type":"turn.failed","error":{"message":"b"}}\n';
  const two = '{"type":"error","code":"not_logged_in"}\n{"type":"turn.failed","error":{"code":"usage_limit_reached"}}\n';
  for (const [stdout, expected] of [[plain, 'provider'], [two, 'authentication']]) {
    const runner = { run: async () => { throw new ProviderError('process', { provider: 'codex-cli', internal: { stdout } }); } };
    await assert.rejects(codexWith(runner).structuredChat(messages, locationAtmosphereSchema, {}), category(expected));
  }
});
