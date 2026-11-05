// Round 052 (backlog H2): numbers two to twelve in Flick's first party conversation (the minutes objective), and
// matcher offsets that index the source when it holds decomposed accents (critique 1.4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { FixtureProvider, api, createRuntime } from './helpers.js';

const NUMBERS = {
  it: ['due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici'],
  es: ['dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'],
};
const MINUTES = { it: 'minuti', es: 'minutos' };
// Mortimer's numbers, targeted across files.
const MORTIMER = { it: ['tre'], es: ['dos', 'tres'] };

for (const code of ['it', 'es']) {
  test(`${code}: the minutes objective comes first, targets two to twelve, and every number matches through the real index`, () => {
    const content = loadGameContent({ language: code });
    const definition = content.encounters.get('flick_slow_walk');
    const { objectives } = definition.encounter;
    assert.deepEqual(objectives.map((objective) => [objective.id, objective.next_objective]), [['minutes', 'lets_go'], ['lets_go', 'together'], ['together', null]]);
    const [minutes] = objectives;
    assert.deepEqual(minutes.target_vocabulary_ids, NUMBERS[code]);
    assert.deepEqual(minutes.required_target_groups, [NUMBERS[code]]);
    for (const id of NUMBERS[code]) {
      const entry = content.vocabularyById.get(id);
      assert.equal(entry.part_of_speech, 'numeral', id);
      assert.deepEqual(matchCanonicalVocabulary(`${entry.target} ${MINUTES[code]}!`, content.vocabulary.entries).map((match) => match.id), [id, MINUTES[code]], id);
    }
    for (const id of MORTIMER[code]) assert.match(content.vocabulary.version, new RegExp(`butcher-meats-${code}`), id);
    assert.ok(definition.narrationEntries.some((entry) => entry.id === MORTIMER[code][0]), 'cross-file target is chipped');
    assert.ok(definition.narrationEntries.some((entry) => entry.id === (code === 'it' ? 'prosciutto' : 'jamon')), 'so is the rest of Mortimer\'s file');
    for (const form of ['minuto', MINUTES[code]]) {
      assert.deepEqual(matchCanonicalVocabulary(`Un ${form}.`, content.vocabulary.entries).map((match) => match.id), [MINUTES[code]], form);
    }
    // Every accepted example holds a number; the protection rule for the later answers is in the first intent too
    // (critique 1.9).
    for (const example of minutes.accepted_examples) {
      const ids = matchCanonicalVocabulary(example, content.vocabulary.entries).map((match) => match.id);
      assert.ok(ids.some((id) => NUMBERS[code].includes(id)), example);
    }
    const [go, together] = code === 'it' ? ['andiamo', 'insieme'] : ['vamos', 'juntos'];
    assert.match(minutes.intent, new RegExp(`does not say "${go}" or "${together}" itself before the player has`));
    assert.match(minutes.intent, /Before the player names a number, Flick says no/);
  });
}

// Decision 3 / critique 1.5: the English words among the forms chipped in Flick's slow walk are known and kept on
// purpose. A new one fails here and must be decided.
// English words and names (pollo, etto and the like are not; 'cento' and 'mezzo' are rare English words).
const ENGLISH_CANDIDATES = ['due', 'once', 'sei', 'otto', 'nove', 'salami', 'mezzo', 'cento', 'chorizo', 'chorizos', 'kilo', 'kilos', 'chili'];
test('the English-word forms among the slow walk\'s chips are the pinned ones', () => {
  const pinned = { it: ['cento', 'due', 'mezzo', 'nove', 'otto', 'salami', 'sei'], es: ['chorizo', 'chorizos', 'kilo', 'kilos', 'once'] };
  for (const code of ['it', 'es']) {
    const forms = loadGameContent({ language: code }).encounters.get('flick_slow_walk').narrationEntries.flatMap((entry) => entry.surface_variants);
    assert.deepEqual(forms.filter((form) => ENGLISH_CANDIDATES.includes(form)).sort(), pinned[code], code);
  }
});

test('matches index the source when it holds decomposed accents; precomposed text is unchanged', () => {
  const vocabulary = [{ id: 'due', surface_variants: ['due'] }, { id: 'caffe', surface_variants: ['caffè'] }];
  const decomposed = 'é due caffè!';
  assert.deepEqual(matchCanonicalVocabulary(decomposed, vocabulary).map(({ id, excerpt, start, end }) => [id, excerpt, start, end]),
    [['due', 'due', 3, 6], ['caffe', 'caffè', 7, 13]]);
  for (const match of matchCanonicalVocabulary(decomposed, vocabulary)) assert.equal(decomposed.slice(match.start, match.end), match.excerpt);
  assert.deepEqual(matchCanonicalVocabulary('è due caffè!', vocabulary).map(({ id, excerpt, start, end }) => [id, excerpt, start, end]),
    [['due', 'due', 2, 5], ['caffe', 'caffè', 6, 11]]);
  // A lowercase that grows (İ → i̇) does not shift later offsets either.
  assert.deepEqual(matchCanonicalVocabulary('İ due', vocabulary).map(({ start, end }) => [start, end]), [[2, 5]]);
});

// Plumbing only (critique 1.10): a keyword grader for the slow walk; the real grader is checked live.
const NUMBER_PATTERN = new RegExp(`\\b(${NUMBERS.es.join('|')})\\b`, 'i');
const RULES = {
  minutes: (answer) => answer.match(NUMBER_PATTERN)?.[1]?.toLowerCase(),
  lets_go: (answer) => (/vamos/i.test(answer) ? 'vamos' : undefined),
  together: (answer) => (/juntos/i.test(answer) ? 'juntos' : undefined),
};
class FlickProvider extends FixtureProvider {
  grade(messages) {
    const objectives = Object.keys(RULES).filter((id) => messages[0].content.includes(`"${id}"`));
    if (objectives.length === 0) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: objectives.map((id) => {
        const evidence = RULES[id](answer);
        return { objective_id: id, passed: Boolean(evidence), feedback: evidence ? 'ok' : 'not yet', vocabulary_evidence: evidence ? [{ vocabulary_id: evidence, evidence, quality: 5 }] : [] };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

test('es: the slow walk takes a number of minutes first, records the number (Mortimer\'s tres too), then lets go and together', async (t) => {
  const runtime = await createRuntime({ provider: new FlickProvider() });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['cracked_fountain_letharger'] };
  envelope.party = [{ characterId: 'letharger_flick_001', encounterId: 'cracked_fountain_letharger', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0 }];
  await runtime.storage.save(envelope);
  const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'flick_slow_walk' } });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  let encounter = started.data.encounter;
  const say = async (message) => {
    const turn = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message } });
    assert.equal(turn.status, 200, JSON.stringify(turn.data));
    encounter = turn.data.encounter;
    return turn.data;
  };
  assert.equal(encounter.currentObjective.id, 'minutes');
  await say('Two minutes.');
  assert.equal(encounter.currentObjective.id, 'minutes', 'English does not pass');
  await say('¡Vamos!');
  assert.equal(encounter.currentObjective.id, 'minutes', 'let\'s go before the minutes does not close (ordered)');
  await say('Tres minutos.');
  assert.equal(encounter.currentObjective.id, 'lets_go');
  await say('¡Vamos!');
  await say('Juntos.');
  assert.equal(encounter.state, 'resolved');
  const saved = await runtime.storage.load(learnerId);
  assert.ok(saved.spellbook.words.tres, 'Mortimer\'s tres is recorded from Flick\'s conversation');
  assert.equal(saved.party[0].conversations, 1);
});
