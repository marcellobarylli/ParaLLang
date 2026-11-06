// Round 081 (backlog B5): the narrator's footnote. Kept when it is a short string, the previous NPC line of the
// session kept none, and no pack vocabulary form is in it (English homographs exempt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureProvider, createRuntime } from './helpers.js';
import { FOOTNOTE_MAX_LENGTH } from '../src/learning-service.js';
import { encounterResponseSchema } from '../src/llm/schemas.js';

// Each narration call takes the next footnote from the queue: a string, null, or `undefined` for no key at all.
class FootnoteProvider extends FixtureProvider {
  constructor(footnotes) { super(); this.footnotes = footnotes; }
  narrate(messages) {
    const base = super.narrate(messages);
    const next = this.footnotes.shift();
    return next === undefined ? base : { ...base, footnote: next };
  }
}

async function play(t, footnotes, { language = 'es', turns = 0 } = {}) {
  const runtime = await createRuntime({ provider: new FootnoteProvider([...footnotes]), language });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  let { encounter } = await runtime.service.startEncounter(learnerId);
  for (let i = 0; i < turns; i += 1) {
    ({ encounter } = await runtime.service.submitDialogue(learnerId, {
      encounterId: encounter.id, version: encounter.version, attemptId: `a${i}`, message: 'Hmm.',
    }));
  }
  const npc = encounter.transcript.filter((message) => message.role === 'npc');
  return { runtime, learnerId, encounter, npc };
}

const POV = 'POV: you are a coffee cart and someone just said the word "decaf" out loud.';

test('the schema accepts a footnote, null, or none', () => {
  const base = new FixtureProvider().narrate([{ role: 'user', content: 'TURN DATA: {"task":"greeting"}' }]);
  for (const footnote of [POV, null, undefined]) {
    assert.equal(encounterResponseSchema.safeParse(footnote === undefined ? base : { ...base, footnote }).success, true);
  }
});

test('a greeting footnote is kept, trimmed, held in the transcript and serialized', async (t) => {
  const { runtime, learnerId, npc } = await play(t, [`  ${POV.replace(' ', '   ')}\n`]);
  assert.equal(npc[0].footnote, POV);
  const current = await runtime.service.currentEncounter(learnerId);
  assert.equal(current.encounter.transcript[0].footnote, POV);
});

test('none, null and blank footnotes leave no footnote key', async (t) => {
  for (const footnote of [undefined, null, '   ']) {
    const { npc } = await play(t, [footnote]);
    assert.equal('footnote' in npc[0], false, String(footnote));
  }
});

test('a footnote over the length limit is dropped', async (t) => {
  const { npc } = await play(t, ['Nobody: '.padEnd(FOOTNOTE_MAX_LENGTH + 1, 'x')]);
  assert.equal('footnote' in npc[0], false);
  const { npc: atLimit } = await play(t, ['N'.padEnd(FOOTNOTE_MAX_LENGTH, 'o')]);
  assert.equal(atLimit[0].footnote.length, FOOTNOTE_MAX_LENGTH);
});

test('a footnote holding a pack form is dropped, in Spanish and Italian; English homographs are kept', async (t) => {
  assert.equal('footnote' in (await play(t, ['Nobody: / The Imp: con leche, but make it existential.'])).npc[0], false, 'es con leche');
  assert.equal('footnote' in (await play(t, ['The Imp has never once said grazie.'], { language: 'it' })).npc[0], false, 'it grazie');
  assert.equal('footnote' in (await play(t, ['POV: you just learned the word for caffè.'], { language: 'it' })).npc[0], false, 'it caffè');
  const once = 'The narrator was ratioed once, and has not recovered.';
  assert.equal((await play(t, [once])).npc[0].footnote, once, 'es "once" is also English');
  const cafe = 'Every café is a crime scene to the Imp.';
  assert.equal((await play(t, [cafe])).npc[0].footnote, cafe, 'es café folds to the English cafe');
});

test('never two footnotes in a row: the second is dropped, a later one after a line without is kept', async (t) => {
  const { npc, encounter } = await play(t, ['First aside.', 'Second aside.', null, 'Fourth aside.'], { turns: 3 });
  assert.equal(encounter.state, 'ongoing');
  assert.deepEqual(npc.map((message) => message.footnote), ['First aside.', undefined, undefined, 'Fourth aside.']);
});

test('a dropped footnote does not block the next one', async (t) => {
  const { npc } = await play(t, ['Nobody: / The Imp: con leche.', 'Second aside.'], { turns: 1 });
  assert.deepEqual(npc.map((message) => message.footnote), [undefined, 'Second aside.']);
});
