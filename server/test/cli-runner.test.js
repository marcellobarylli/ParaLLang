import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CLIProcessRunner } from '../src/llm/cli-runner.js';

const fixture = resolve(import.meta.dirname, 'fixtures', 'process-fixture.mjs');
const baseSpec = (args, overrides = {}) => ({
  provider: 'codex-cli',
  executable: process.execPath,
  args: [fixture, ...args],
  stdin: '',
  env: process.env,
  timeoutMs: 2_000,
  ...overrides,
});

test('runner preserves stdin and argument boundaries, executable paths with spaces, and fragmented multibyte output', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'parallang runner spaces '));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'node executable with spaces');
  await symlink(process.execPath, executable);
  const runner = new CLIProcessRunner();
  t.after(() => runner.shutdown());
  const shellLooking = '$(touch should-never-exist); `whoami`; café';
  const result = await runner.run(baseSpec(['echo', '--literal', shellLooking], { executable, stdin: shellLooking }));
  assert.deepEqual(JSON.parse(result.stdout), {
    args: ['--literal', shellLooking], input: shellLooking, multibyte: 'café ☕',
  });
  await assert.rejects(access(result.directory), /ENOENT/);
});

test('runner enforces stdout/stderr limits, nonzero exit, and waits for the final exit status', async (t) => {
  const runner = new CLIProcessRunner({ stdoutLimit: 128, stderrLimit: 64, killGraceMs: 20 });
  t.after(() => runner.shutdown());
  await assert.rejects(runner.run(baseSpec(['overflow', '1024'])), (error) => error.code === 'CLI_OUTPUT_LIMIT');
  await assert.rejects(runner.run(baseSpec(['stderr-overflow', '1024'])), (error) => error.code === 'CLI_OUTPUT_LIMIT');
  await assert.rejects(runner.run(baseSpec(['fail-after-output'])), (error) => {
    assert.equal(error.code, 'CLI_PROCESS_FAILURE');
    assert.match(error.internal.stdout, /looks/);
    return true;
  });
});

test('runner timeout terminates the child process group and cleans its temporary directory', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'parallang-tree-test-'));
  const pidFile = join(root, 'grandchild.pid');
  let temporaryDirectory;
  const runner = new CLIProcessRunner({ killGraceMs: 25 });
  t.after(async () => {
    await runner.shutdown();
    await rm(root, { recursive: true, force: true });
  });
  await assert.rejects(runner.run(baseSpec(['tree', pidFile], {
    timeoutMs: 100,
    prepare: (directory) => {
      temporaryDirectory = directory;
      return { args: [fixture, 'tree', pidFile], stdin: '' };
    },
  })), (error) => error.code === 'CLI_TIMEOUT');
  const grandchildPid = Number(await readFile(pidFile, 'utf8'));
  await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  assert.throws(() => process.kill(grandchildPid, 0), /ESRCH/);
  await assert.rejects(access(temporaryDirectory), /ENOENT/);
});

test('runner counts queue waiting against deadlines and rejects the ninth queued call as busy', async (t) => {
  const runner = new CLIProcessRunner({ maxQueue: 8 });
  t.after(() => runner.shutdown());
  const active = runner.run(baseSpec(['delay', '150']));
  const queued = Array.from({ length: 8 }, (_, index) => runner.run(baseSpec(['delay', '1'], { timeoutMs: index === 0 ? 30 : 1_000 })));
  await assert.rejects(runner.run(baseSpec(['delay', '1'])), (error) => error.code === 'CLI_BUSY');
  await assert.rejects(queued[0], (error) => error.code === 'CLI_TIMEOUT');
  await active;
  await Promise.all(queued.slice(1));
});

test('runner shutdown rejects queued work, terminates active work, and reaps before resolving', async () => {
  const runner = new CLIProcessRunner({ killGraceMs: 25 });
  const active = runner.run(baseSpec(['delay', '5000'], { timeoutMs: 10_000 }));
  const queued = runner.run(baseSpec(['delay', '1'], { timeoutMs: 10_000 }));
  const activeRejected = assert.rejects(active, (error) => error.code === 'CLI_INTERRUPTED');
  const queuedRejected = assert.rejects(queued, (error) => error.code === 'CLI_INTERRUPTED');
  await runner.shutdown();
  await Promise.all([activeRejected, queuedRejected]);
  assert.equal(runner.active, null);
  assert.equal(runner.queue.length, 0);
});
