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

test('a footnote holding a pack form is dropped, in Spanish and Italian, English homographs included', async (t) => {
  assert.equal('footnote' in (await play(t, ['Nobody: / The Imp: con leche, but make it existential.'])).npc[0], false, 'es con leche');
  assert.equal('footnote' in (await play(t, ['The Imp has never once said grazie.'], { language: 'it' })).npc[0], false, 'it grazie');
  assert.equal('footnote' in (await play(t, ['POV: you just learned the word for caffè.'], { language: 'it' })).npc[0], false, 'it caffè');
  // Amendment 2 (review): no homograph exemptions; these are encounter answers or pack forms.
  for (const [footnote, language] of [['The narrator was ratioed once, and has not recovered.', 'es'], ['Every café is a crime scene to the Imp.', 'es'],
    ['Nobody: / The Letharger: basta.', 'it'], ['POV: sei minutes late.', 'it'], ['The archway insists: soy load-bearing.', 'es']]) {
    assert.equal('footnote' in (await play(t, [footnote], { language })).npc[0], false, footnote);
  }
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

test('a resent answer (same attempt id) replays the same footnote, with no new call (review)', async (t) => {
  const { runtime, learnerId, encounter } = await play(t, [null, 'A second aside.']);
  const body = { encounterId: encounter.id, version: encounter.version, attemptId: 'same', message: 'Hmm.' };
  const first = await runtime.service.submitDialogue(learnerId, body);
  const calls = runtime.provider.calls.length;
  const again = await runtime.service.submitDialogue(learnerId, body);
  assert.equal(first.encounter.transcript.at(-1).footnote, 'A second aside.');
  assert.equal(again.encounter.transcript.at(-1).id, first.encounter.transcript.at(-1).id);
  assert.equal(again.encounter.transcript.at(-1).footnote, 'A second aside.');
  assert.equal(runtime.provider.calls.length, calls);
});

// Round 086: an unlisted inflection of an open objective's single-word answer drops the footnote too; English words
// that merely begin like an answer, multi-word forms and passed objectives do not.
test('a greeting footnote with an unlisted inflection of an open answer is dropped (it vorresti, es quieres)', async (t) => {
  assert.equal('footnote' in (await play(t, ['Nobody: / The Imp: vorresti, but louder.'], { language: 'it' })).npc[0], false, 'it vorresti');
  assert.equal('footnote' in (await play(t, ['POV: the Imp asks if you quieres anything.'])).npc[0], false, 'es quieres');
  assert.equal('footnote' in (await play(t, ['Nobody: / The Imp: two espressi, emotionally.'], { language: 'it' })).npc[0], false, 'it espressi');
  const english = 'The Imp is quietly obsessed with translation, grammar and the cafeteria.';
  assert.equal((await play(t, [english])).npc[0].footnote, english, 'es English kept');
  assert.equal((await play(t, [english], { language: 'it' })).npc[0].footnote, english, 'it English kept');
});

test('after its objective passes, an inflection of that answer is kept on the next line (es)', async (t) => {
  const runtime = await createRuntime({ provider: new FootnoteProvider([null, 'POV: the Imp asks if you quieres more.']), language: 'es' });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  const { encounter: after } = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'a1', message: 'Un café, por favor.' });
  assert.equal(after.state, 'ongoing');
  assert.equal(after.transcript.at(-1).footnote, 'POV: the Imp asks if you quieres more.');
});

test('party conversations and the Rift: inflections of their open answers dropped, English kept (direct calls)', async (t) => {
  const keep = ['A translation of a translation is still a child of chaos.', 'Nobody: / Errata: century of silence.'];
  for (const [language, encounterId, inflected] of [['it', 'gerald_coffee_break', 'POV: everything is buoni.'], ['es', 'gerald_coffee_break', 'POV: todo is buenos today.'],
    ['it', 'the_rift_errata', null], ['es', 'the_rift_errata', null]]) {
    const runtime = await createRuntime({ language });
    t.after(runtime.close);
    const { service } = runtime;
    const { objectives } = service.content.encounters.get(encounterId).encounter;
    if (inflected) assert.equal(service.keptFootnote({ footnote: inflected }, undefined, objectives), undefined, `${language} ${inflected}`);
    // The Rift: an inflection of one of its own single-word targets.
    if (!inflected) {
      const form = objectives.flatMap((o) => o.target_vocabulary_ids).flatMap((id) => service.content.vocabularyById.get(id).surface_variants)
        .find((f) => !f.includes(' ') && f.length >= 5 && /[aeio]$/.test(f));
      const variant = `${form.slice(0, -1)}${form.endsWith('i') ? 'e' : 'i'}`;
      assert.equal(service.keptFootnote({ footnote: `Nobody: / Errata: ${variant}.` }, undefined, objectives), undefined, `${language} rift ${variant}`);
    }
    for (const text of keep) assert.equal(service.keptFootnote({ footnote: text }, undefined, objectives), text, `${language} ${encounterId} ${text}`);
    assert.equal(service.keptFootnote({ footnote: 'POV: everything is buoni.' }, undefined, []), 'POV: everything is buoni.', 'no open objectives');
  }
});
