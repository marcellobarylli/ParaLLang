// Round 024 (backlog F1): directories made by the test helpers are removed when the test process exits; a caller's
// save dir is left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');

const child = `
import { createRuntime, makeTempDir } from './server/test/helpers.js';
const callerDir = process.env.CALLER_DIR;
const first = await makeTempDir('parallang-tempdir-a-');
const second = await makeTempDir('parallang-tempdir-b-');
const runtime = await createRuntime();
const callerRuntime = await createRuntime({ saveDir: callerDir });
await runtime.close();
await callerRuntime.close();
process.stdout.write(JSON.stringify({ tracked: [first, second, runtime.saveDir], caller: callerRuntime.saveDir }));
`;

test('test temp dirs are removed when the process exits, and a caller save dir is kept', (t) => {
  const callerDir = mkdtempSync(join(tmpdir(), 'parallang-caller-'));
  t.after(() => rmSync(callerDir, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', child], {
    cwd: repoRoot, env: { ...process.env, CALLER_DIR: callerDir }, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(result.status, 0, result.stderr);
  const { tracked, caller } = JSON.parse(result.stdout);
  assert.equal(tracked.length, 3);
  assert.equal(new Set(tracked).size, 3);
  for (const dir of tracked) assert.equal(existsSync(dir), false, `${dir} should be removed`);
  assert.equal(caller, callerDir);
  assert.equal(existsSync(callerDir), true);
});
