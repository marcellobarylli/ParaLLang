// Round 027 (backlog C2): the philosophy statement, loaded from content/narration/onboarding.yaml and served at
// GET /api/onboarding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { api, createRuntime, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');

test('the onboarding statement loads in every pack and opens with the owner\'s text verbatim', async () => {
  const hub = await readFile(join(root, 'parallang.md'), 'utf8');
  const owner = hub.match(/greeted by the game's philosophy\. This means: "([^"]+)"/)[1];
  for (const language of ['it', 'es']) {
    const { onboarding } = loadGameContent({ language });
    assert.equal(onboarding.title, 'Before you enter');
    assert.equal(onboarding.statement, owner);
    assert.equal(onboarding.notes.length, 2);
    assert.match(onboarding.notes[0], /repetition/);
    assert.equal(onboarding.beginLabel, 'Enter the market');
  }
});

test('the loader rejects a missing or malformed onboarding file', async () => {
  const cases = [
    ['no notes', (value) => { value.notes = []; }],
    ['no statement', (value) => { delete value.statement; }],
    ['empty title', (value) => { value.title = ''; }],
    ['unknown field', (value) => { value.subtitle = 'x'; }],
    ['no button label', (value) => { delete value.begin_label; }],
  ];
  for (const [name, change] of cases) {
    const dir = await makeTempDir('parallang-onboarding-');
    await cp(join(root, 'content'), dir, { recursive: true });
    const path = join(dir, 'narration/onboarding.yaml');
    const value = yaml.load(await readFile(path, 'utf8'));
    change(value);
    await writeFile(path, yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), name);
  }
  const dir = await makeTempDir('parallang-onboarding-');
  await cp(join(root, 'content'), dir, { recursive: true });
  await rm(join(dir, 'narration/onboarding.yaml'));
  assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), /onboarding\.yaml/);
});

test('GET /api/onboarding serves the statement without a learner and needs the token when one is set', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(() => runtime.close());
  const served = await api(runtime, '/api/onboarding');
  assert.equal(served.status, 200);
  assert.deepEqual(served.data, {
    onboarding: {
      title: runtime.content.onboarding.title,
      statement: runtime.content.onboarding.statement,
      notes: [...runtime.content.onboarding.notes],
      beginLabel: runtime.content.onboarding.beginLabel,
    },
  });
  const refused = await api(runtime, '/api/onboarding', { token: null });
  assert.equal(refused.status, 401);
  assert.equal(refused.data.error.code, 'UNAUTHORIZED');
});
