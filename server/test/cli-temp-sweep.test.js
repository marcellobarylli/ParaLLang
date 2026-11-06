// Round 098 (round 095 review R1.9): the runner sweeps run dirs a killed process left, once per temp root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { access, mkdir, readdir, symlink, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { makeTempDir } from './helpers.js';
import { CLIProcessRunner, sweepStaleTempDirs } from '../src/llm/cli-runner.js';

const HOUR = 3_600_000;
const exists = (path) => access(path).then(() => true, () => false);
async function aged(path, ms) { const at = new Date(Date.now() - ms); await utimes(path, at, at); }

// A fake spawn whose child closes at once with exit 0.
const spawnImpl = () => {
  const child = new EventEmitter();
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
  child.kill = () => {};
  setImmediate(() => child.emit('close', 0, null));
  return child;
};
const spec = { provider: 'codex-cli', executable: 'fake', args: [], stdin: '', env: {}, timeoutMs: 5_000 };

async function litteredRoot() {
  const root = await makeTempDir('parallang-sweep-test-');
  const outside = await makeTempDir('parallang-sweep-outside-');
  const dirs = {
    old: join(root, 'parallang-cli-AbC123'),
    fresh: join(root, 'parallang-cli-New123'),
    flow: join(root, 'parallang-cli-flow-abcdef'),
    play: join(root, 'parallang-play-AbC123'),
    future: join(root, 'parallang-cli-Fut123'),
  };
  for (const dir of Object.values(dirs)) await mkdir(dir);
  await writeFile(join(dirs.old, 'instructions.txt'), 'a prompt');
  const file = join(root, 'parallang-cli-File12');
  await writeFile(file, 'x');
  const link = join(root, 'parallang-cli-Link12');
  await symlink(outside, link);
  for (const path of [dirs.old, dirs.flow, dirs.play, file]) await aged(path, 2 * HOUR);
  const later = new Date(Date.now() + 2 * HOUR);
  await utimes(dirs.future, later, later);
  return { root, outside, dirs, file, link };
}

test('only this user\'s old run dirs (the exact mkdtemp name, real directories) are swept', async () => {
  const { root, outside, dirs, file, link } = await litteredRoot();
  await aged(outside, 2 * HOUR);
  const removed = await sweepStaleTempDirs(root);
  assert.deepEqual(removed, ['parallang-cli-AbC123']);
  assert.equal(await exists(dirs.old), false);
  for (const kept of [dirs.fresh, dirs.flow, dirs.play, dirs.future, file, link, outside]) assert.equal(await exists(kept), true, kept);
});

test('a run starts the sweep once per root; a second runner shares it; sweepTemp false never sweeps', async () => {
  const { root, dirs } = await litteredRoot();
  const off = new CLIProcessRunner({ spawnImpl, tempRoot: root, sweepTemp: false });
  await off.run(spec);
  assert.equal(off.sweep, null);
  assert.equal(await exists(dirs.old), true);
  const runner = new CLIProcessRunner({ spawnImpl, tempRoot: root });
  await runner.run(spec);
  assert.deepEqual(await runner.sweep, ['parallang-cli-AbC123']);
  const second = new CLIProcessRunner({ spawnImpl, tempRoot: root });
  await second.run(spec);
  assert.equal(second.sweep, runner.sweep, 'one sweep per root per process');
  // The runs' own dirs were made and removed as before; the kept entries (file, link, fresh, future) remain.
  const names = (await readdir(root)).filter((name) => /^parallang-cli-[A-Za-z0-9]{6}$/.test(name)).sort();
  assert.deepEqual(names, ['parallang-cli-File12', 'parallang-cli-Fut123', 'parallang-cli-Link12', 'parallang-cli-New123']);
});

test('a temp root that cannot be read fails no sweep; a too-short staleTempMs is refused', async () => {
  const base = await makeTempDir('parallang-sweep-file-');
  const notADir = join(base, 'plain-file');
  await writeFile(notADir, 'x');
  assert.deepEqual(await sweepStaleTempDirs(notADir), []);
  const runner = new CLIProcessRunner({ spawnImpl, tempRoot: notADir });
  await assert.rejects(runner.run(spec)); // mkdtemp fails as before
  assert.deepEqual(await runner.sweep, []);
  assert.throws(() => new CLIProcessRunner({ staleTempMs: 60_000 }), /at least 10 minutes/);
});
