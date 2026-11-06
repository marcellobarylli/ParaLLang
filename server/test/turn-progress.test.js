// Round 070 (backlog I1): the grader's verdict is readable through progress() while the NPC's reply is written.
// Nothing is committed early; the entry is the response's own assessment block and goes when the turn ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { FixtureProvider, api, createRuntime, makeTempDir } from './helpers.js';

// Holds the next call of a schema until the test opens it; can fail the next narration.
class GatedProvider extends FixtureProvider {
  constructor() { super(); this.gates = new Map(); this.failNextNarration = false; }
  hold(schemaName) {
    let open; let reached;
    const gate = { released: new Promise((r) => { open = r; }), arrived: new Promise((r) => { reached = r; }) };
    this.gates.set(schemaName, { ...gate, reached });
    return { open, arrived: gate.arrived };
  }
  async structuredChat(messages, schema, options) {
    const gate = this.gates.get(options.schemaName);
    if (gate) { this.gates.delete(options.schemaName); gate.reached(); await gate.released; }
    if (options.schemaName === 'encounter_narration' && this.failNextNarration) {
      this.failNextNarration = false;
      throw new Error('fixture narration outage');
    }
    return super.structuredChat(messages, schema, options);
  }
}

async function setup(t, options = {}) {
  const runtime = await createRuntime({ provider: new GatedProvider(), ...options });
  t.after(runtime.close);
  return runtime;
}
async function begin(runtime) {
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  return { learnerId, encounter };
}
const submit = (runtime, session, message, attemptId = randomUUID()) => ({
  attemptId,
  done: runtime.service.submitDialogue(session.learnerId, { encounterId: session.encounter.id, version: session.encounter.version, attemptId, message }),
});
const progressOf = (runtime, learnerId, attemptId) => runtime.service.progress(learnerId, attemptId).progress.assessment;

// Holds the reply, checks progress against the final response, and returns both.
async function verdictDuringReply(runtime, session, message) {
  const reply = runtime.provider.hold('encounter_narration');
  const turn = submit(runtime, session, message);
  await reply.arrived;
  const early = progressOf(runtime, session.learnerId, turn.attemptId);
  reply.open();
  const response = await turn.done;
  assert.deepEqual(early, response.assessment);
  assert.equal(progressOf(runtime, session.learnerId, turn.attemptId), null);
  return { early, response };
}

test('null while grading, the response\'s own assessment while the reply is written, null after', async (t) => {
  const runtime = await setup(t);
  const session = await begin(runtime);
  const grading = runtime.provider.hold('dialogue_assessment');
  const reply = runtime.provider.hold('encounter_narration');
  const turn = submit(runtime, session, 'Quiero un café.');
  await grading.arrived;
  assert.equal(progressOf(runtime, session.learnerId, turn.attemptId), null);
  grading.open();
  await reply.arrived;
  const early = progressOf(runtime, session.learnerId, turn.attemptId);
  assert.equal(early.objectiveResults[0].passed, true);
  // A copy: changing it does not change the entry.
  early.overallFeedback = 'changed';
  assert.notEqual(progressOf(runtime, session.learnerId, turn.attemptId).overallFeedback, 'changed');
  reply.open();
  const response = await turn.done;
  assert.deepEqual(progressOf(runtime, session.learnerId, turn.attemptId), null);
  assert.equal(response.assessment.overallFeedback, 'Fixture assessment applied.');
});

test('equal to the response for a held pass, a reveal-capped quality and a resolving turn (critique 1.8)', async (t) => {
  const runtime = await setup(t);
  const held = await begin(runtime);
  const { early } = await verdictDuringReply(runtime, held, 'Sin leche, por favor.');
  assert.deepEqual(early.objectiveResults.map((r) => [r.objectiveId, r.passed, r.held === true]), [['order_coffee', false, false], ['no_milk', true, true]]);

  const cappedRuntime = await setup(t);
  const capped = await begin(cappedRuntime);
  const helped = await cappedRuntime.service.revealEncounterHelp(capped.learnerId, { encounterId: capped.encounter.id, version: capped.encounter.version, kind: 'sentence', messageId: capped.encounter.transcript.at(-1).id });
  const after = await verdictDuringReply(cappedRuntime, { ...capped, encounter: helped.encounter }, 'Quiero un café.');
  assert.equal(after.early.objectiveResults[0].vocabularyEvidence[0].quality, 5);
  assert.equal(after.early.objectiveResults[0].vocabularyEvidence[0].effectiveQuality, 2);

  const resolvingRuntime = await setup(t);
  const last = await verdictDuringReply(resolvingRuntime, await begin(resolvingRuntime), 'Quiero un café negro.');
  assert.equal(last.response.encounter.state, 'resolved');
});

test('equal to the response in an unordered encounter with a reveal (any reveal caps every objective)', async (t) => {
  const dir = await makeTempDir('parallang-progress-');
  await cp(resolve(import.meta.dirname, '..', '..', 'content'), dir, { recursive: true });
  const file = join(dir, 'languages/es/encounters/imp_coffee_greeting.yaml');
  const data = yaml.load(await readFile(file, 'utf8'));
  data.objectives_unordered = true;
  await writeFile(file, yaml.dump(data));
  const runtime = await setup(t, { content: loadGameContent({ contentDir: dir, language: 'es' }) });
  const session = await begin(runtime);
  const helped = await runtime.service.revealEncounterHelp(session.learnerId, { encounterId: session.encounter.id, version: session.encounter.version, kind: 'sentence', messageId: session.encounter.transcript.at(-1).id });
  const { early, response } = await verdictDuringReply(runtime, { ...session, encounter: helped.encounter }, 'Sin leche, quiero un café.');
  assert.equal(response.encounter.state, 'resolved');
  assert.ok(early.objectiveResults.every((r) => r.passed && r.vocabularyEvidence.every((e) => e.effectiveQuality === 2)));
});

async function assertUnchanged(runtime, session, before, attemptId) {
  assert.equal(progressOf(runtime, session.learnerId, attemptId), null);
  assert.equal(await readFile(runtime.storage.filePath(session.learnerId), 'utf8'), before);
  assert.equal((await runtime.service.currentEncounter(session.learnerId)).encounter.version, session.encounter.version);
  // A later attempt still works.
  const again = submit(runtime, session, 'Quiero un café.');
  assert.equal((await again.done).encounter.version, session.encounter.version + 1);
}

test('a failed reply clears the verdict and commits nothing (critique 1.7)', async (t) => {
  const runtime = await setup(t);
  const session = await begin(runtime);
  const before = await readFile(runtime.storage.filePath(session.learnerId), 'utf8');
  const reply = runtime.provider.hold('encounter_narration');
  runtime.provider.failNextNarration = true;
  const turn = submit(runtime, session, 'Quiero un café.');
  await reply.arrived;
  assert.notEqual(progressOf(runtime, session.learnerId, turn.attemptId), null);
  reply.open();
  await assert.rejects(turn.done);
  await assertUnchanged(runtime, session, before, turn.attemptId);
});

test('an invalid grading never shows a verdict', async (t) => {
  const runtime = await setup(t);
  const session = await begin(runtime);
  const before = await readFile(runtime.storage.filePath(session.learnerId), 'utf8');
  let sets = 0;
  const set = runtime.service.turnProgress.set.bind(runtime.service.turnProgress);
  runtime.service.turnProgress.set = (...args) => { sets += 1; return set(...args); };
  runtime.provider.invalidNextGrade = { objective_results: [{ objective_id: 'not_an_objective', passed: true, feedback: 'x', vocabulary_evidence: [] }], overall_feedback: 'broken' };
  const turn = submit(runtime, session, 'Quiero un café.');
  await assert.rejects(turn.done, (error) => error.code === 'INVALID_GRADING');
  assert.equal(sets, 0);
  await assertUnchanged(runtime, session, before, turn.attemptId);
});

test('a failed save clears the verdict and keeps the session', async (t) => {
  const base = await createRuntime({ provider: new GatedProvider() });
  t.after(base.close);
  const wrapper = {
    failNext: false,
    filePath: (...args) => base.storage.filePath(...args),
    load: (...args) => base.storage.load(...args),
    save: async (...args) => {
      if (wrapper.failNext) { wrapper.failNext = false; throw Object.assign(new Error('simulated full disk'), { retryable: true, status: 503, code: 'STORAGE_FAILURE' }); }
      return base.storage.save(...args);
    },
    remove: (...args) => base.storage.remove(...args),
  };
  const runtime = await setup(t, { storage: wrapper, saveDir: base.saveDir });
  const session = await begin(runtime);
  const before = await readFile(runtime.storage.filePath(session.learnerId), 'utf8');
  wrapper.failNext = true;
  const turn = submit(runtime, session, 'Quiero un café.');
  await assert.rejects(turn.done, (error) => error.code === 'STORAGE_FAILURE');
  await assertUnchanged(runtime, session, before, turn.attemptId);
});

test('only the matching attempt of the same learner sees it; two learners at once each see their own', async (t) => {
  const runtime = await setup(t);
  const one = await begin(runtime);
  const two = await begin(runtime);
  const replyOne = runtime.provider.hold('encounter_narration');
  const turnOne = submit(runtime, one, 'Quiero un café.');
  await replyOne.arrived;
  const replyTwo = runtime.provider.hold('encounter_narration');
  const turnTwo = submit(runtime, two, 'Sin leche, por favor.');
  await replyTwo.arrived;
  assert.equal(progressOf(runtime, one.learnerId, randomUUID()), null);
  assert.equal(progressOf(runtime, two.learnerId, turnOne.attemptId), null);
  assert.equal(progressOf(runtime, one.learnerId, turnOne.attemptId).objectiveResults[0].passed, true);
  assert.equal(progressOf(runtime, two.learnerId, turnTwo.attemptId).objectiveResults[1].held, true);
  replyOne.open();
  replyTwo.open();
  await Promise.all([turnOne.done, turnTwo.done]);
  assert.equal(progressOf(runtime, one.learnerId, turnOne.attemptId), null);
  assert.equal(progressOf(runtime, two.learnerId, turnTwo.attemptId), null);
  assert.throws(() => runtime.service.progress(one.learnerId, '  '), (error) => error.status === 400);
});

// Round 075 (critique 1.1): ids are compared as strings, untrimmed.
test('a numeric attempt id is readable as its string; a spaced id only by the same spaced string', async (t) => {
  const runtime = await setup(t);
  const session = await begin(runtime);
  let reply = runtime.provider.hold('encounter_narration');
  let turn = submit(runtime, session, 'Quiero un café.', 12345);
  await reply.arrived;
  assert.equal(progressOf(runtime, session.learnerId, '12345').objectiveResults[0].passed, true);
  reply.open();
  const first = await turn.done;
  assert.equal(progressOf(runtime, session.learnerId, '12345'), null);
  reply = runtime.provider.hold('encounter_narration');
  turn = submit(runtime, { ...session, encounter: first.encounter }, 'Sin leche, por favor.', ' abc ');
  await reply.arrived;
  assert.equal(progressOf(runtime, session.learnerId, 'abc'), null);
  assert.notEqual(progressOf(runtime, session.learnerId, ' abc '), null);
  reply.open();
  await turn.done;
  assert.throws(() => runtime.service.progress(session.learnerId, ' '), (error) => error.status === 400);
});

test('a duplicate of the attempt queued behind it replays and never sets progress', async (t) => {
  const runtime = await setup(t);
  const session = await begin(runtime);
  let sets = 0;
  const set = runtime.service.turnProgress.set.bind(runtime.service.turnProgress);
  runtime.service.turnProgress.set = (...args) => { sets += 1; return set(...args); };
  const reply = runtime.provider.hold('encounter_narration');
  const first = submit(runtime, session, 'Quiero un café.');
  await reply.arrived;
  const second = submit(runtime, session, 'Quiero un café.', first.attemptId);
  reply.open();
  const [a, b] = await Promise.all([first.done, second.done]);
  assert.equal(a.replayed, false);
  assert.equal(b.replayed, true);
  assert.equal(sets, 1);
  assert.equal(progressOf(runtime, session.learnerId, first.attemptId), null);
});

test('HTTP: the route needs an attempt id and answers while the turn is held at the reply', async (t) => {
  const runtime = await setup(t);
  const identity = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const learnerId = identity.data.learnerId;
  const encounter = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} })).data.encounter;
  assert.equal((await api(runtime, '/api/encounter/progress', { learnerId })).status, 400);
  assert.equal((await api(runtime, '/api/encounter/progress?attemptId=x')).status, 400);
  const attemptId = randomUUID();
  const reply = runtime.provider.hold('encounter_narration');
  const turn = api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId, message: 'Quiero un café.' } });
  await reply.arrived;
  const during = await api(runtime, `/api/encounter/progress?attemptId=${attemptId}`, { learnerId });
  assert.equal(during.status, 200);
  assert.equal(during.data.progress.attemptId, attemptId);
  assert.equal(during.data.progress.assessment.objectiveResults[0].passed, true);
  assert.equal(JSON.stringify(during.data).includes('Bien. Tu café'), false);
  reply.open();
  const done = await turn;
  assert.deepEqual(during.data.progress.assessment, done.data.assessment);
  assert.equal((await api(runtime, `/api/encounter/progress?attemptId=${attemptId}`, { learnerId })).data.progress.assessment, null);
  assert.equal((await api(runtime, `/api/encounter/progress?attemptId=${attemptId}`, { learnerId, token: null })).status, 401);
});
