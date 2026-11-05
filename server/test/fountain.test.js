// Round 011: The Cracked Fountain (Flick the Letharger) in both real packs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { route } from '../scripts/play-market.js';
import { FixtureProvider, fixedNow } from './helpers.js';

const packs = {
  it: {
    answers: ['Guarda!', 'Fermati!', 'Left.', 'A sinistra!', 'Domani.', 'No, adesso!'],
    patterns: { stop: [/fermati|fermo|basta/i, 'fermati'], direction: [/destra|sinistra|dritto/i, 'sinistra'], now: [/adesso|\bora\b/i, 'adesso'] },
    line: 'Guarda! Dopo, domani... Prosciutto? Ciao, caffè.',
    chips: ['guarda', 'dopo', 'domani'],
  },
  es: {
    answers: ['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!', 'Mañana.', '¡No, ahora!'],
    patterns: { stop: [/quiet[oa]s?|basta/i, 'quieto'], direction: [/derecha|izquierda/i, 'izquierda'], now: [/ahora/i, 'ahora'] },
    line: '¡Mira! Después, mañana... ¿Jamón? Hola, café.',
    chips: ['mira', 'despues', 'manana'],
  },
};

// Grades Flick's objectives by pattern (look, English and tomorrow do not pass) and narrates one line mixing its
// words with Mortimer's, the tutorial's and Gerald's.
class FountainProvider extends FixtureProvider {
  constructor(code) { super(); this.pack = packs[code]; }

  grade(messages) {
    const ids = Object.keys(this.pack.patterns).filter((id) => messages[0].content.includes(`"${id}"`));
    if (!ids.length) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: ids.map((id) => {
        const [pattern, vocabularyId] = this.pack.patterns[id];
        const match = answer.match(pattern);
        return {
          objective_id: id, passed: Boolean(match), feedback: match ? `Passed ${id}.` : `Keep working on ${id}.`,
          vocabulary_evidence: match ? [{ vocabulary_id: vocabularyId, evidence: match[0], quality: 5 }] : [],
        };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }

  narrate(messages) {
    const value = super.narrate(messages);
    return { ...value, dialogue: { ...value.dialogue, native: this.pack.line, translation: 'Look! Later, tomorrow... Ham? Hello, coffee.', words: [] } };
  }
}

test('the shortest route from the entrance to the fountain takes two moves', () => {
  const { world } = loadGameContent({ language: 'it' });
  assert.deepEqual(route(world, 'market_entrance', 'market_entrance'), []);
  assert.equal(route(world, 'market_entrance', 'cracked_fountain').length, 2);
  assert.deepEqual(route(world, 'market_entrance', 'the_rift').slice(-2), ['old_bookshop', 'the_rift']);
});

for (const code of Object.keys(packs)) {
  test(`${code}: Flick rejects look, English and tomorrow, accepts stop, a direction and now, and the map marks the fountain complete`, async (t) => {
    const saveDir = await mkdtemp(join(tmpdir(), 'parallang-fountain-'));
    t.after(() => rm(saveDir, { recursive: true, force: true }));
    const content = loadGameContent({ language: code });
    assert.equal(content.world.locationsById.get('cracked_fountain').encounter, 'cracked_fountain_letharger');
    const provider = new FountainProvider(code);
    const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow });
    const { learnerId } = await service.createOrRecoverLearner();
    for (const locationId of route(content.world, content.world.start, 'cracked_fountain')) await service.moveTo(learnerId, { locationId });

    let encounter = (await service.startEncounter(learnerId, { encounterId: 'cracked_fountain_letharger' })).encounter;
    assert.match(provider.calls.at(-1).messages[0].content, /Speak as Flick, a Letharger/);
    assert.equal(encounter.character.name, 'Flick');
    assert.equal(encounter.difficulty, 0.3);
    assert.equal(encounter.companionBriefing, null);
    assert.deepEqual(encounter.transcript[0].dialogue.words.map((word) => word.vocabularyId), packs[code].chips, 'only its own words are chips');

    const verdicts = [];
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      encounter = turn.encounter;
    }
    assert.deepEqual(verdicts, [
      [['stop', false], ['direction', false], ['now', false]],
      [['stop', true], ['direction', false], ['now', false]],
      [['direction', false], ['now', false]],
      [['direction', true], ['now', false]],
      [['now', false]],
      [['now', true]],
    ]);
    assert.equal(encounter.state, 'resolved');
    assert.match(encounter.resolvedMessage, /^Flick holds still for almost a whole second/);
    const { world } = await service.getWorld(learnerId);
    assert.deepEqual(world.locations.find((l) => l.id === 'cracked_fountain').encounter, { id: 'cracked_fountain_letharger', completed: true, characterName: 'Flick', characterId: 'letharger_flick_001', saveable: true });
  });
}
