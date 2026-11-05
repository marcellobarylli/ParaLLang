// Round 010: The Butcher's Stall (Mortimer the Charcutier) in both real packs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { FixtureProvider, fixedNow } from './helpers.js';

const packs = {
  it: {
    answers: ['Vorrei del prosciutto.', 'Vorrei del salame, per favore.', 'Un chilo, per favore.'],
    meat: [/salame|salsicc[ie]a?|pollo/i, 'salame'], unit: [/etti|etto|chilo|grammi/i, 'chilo'],
    line: 'Prosciutto! Tutto è prosciutto. Un chilo? Ciao, caffè.',
    chips: ['prosciutto', 'chilo'],
  },
  es: {
    answers: ['Quiero jamón.', 'Quiero chorizo, por favor.', 'Medio kilo, por favor.'],
    meat: [/chorizo|salchichas?|pollo/i, 'chorizo'], unit: [/kilos?|gramos?/i, 'kilo'],
    line: '¡Jamón! Todo es jamón. ¿Un kilo? Hola, café.',
    chips: ['jamon', 'kilo'],
  },
};

// Grades Mortimer's objectives by pattern (ham is not a meat that passes) and narrates one line mixing his words
// with the tutorial's and Gerald's.
class ButcherProvider extends FixtureProvider {
  constructor(code) { super(); this.pack = packs[code]; }

  grade(messages) {
    const ids = ['name_meat', 'quantity'].filter((id) => messages[0].content.includes(`"${id}"`));
    if (!ids.length) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: ids.map((id) => {
        const [pattern, vocabularyId] = id === 'name_meat' ? this.pack.meat : this.pack.unit;
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
    return { ...value, dialogue: { ...value.dialogue, native: this.pack.line, translation: 'Ham! Everything is ham. A kilo? Hello, coffee.', words: [] } };
  }
}

for (const code of Object.keys(packs)) {
  test(`${code}: Mortimer rejects ham, accepts a real cut and a quantity, and the map marks the stall complete`, async (t) => {
    const saveDir = await mkdtemp(join(tmpdir(), 'parallang-butcher-'));
    t.after(() => rm(saveDir, { recursive: true, force: true }));
    const content = loadGameContent({ language: code });
    assert.equal(content.world.locationsById.get('butchers_stall').encounter, 'butchers_stall_charcutier');
    const provider = new ButcherProvider(code);
    const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow });
    const { learnerId } = await service.createOrRecoverLearner();
    await service.moveTo(learnerId, { locationId: 'butchers_stall' });

    let encounter = (await service.startEncounter(learnerId, { encounterId: 'butchers_stall_charcutier' })).encounter;
    assert.match(provider.calls.at(-1).messages[0].content, /Speak as Mortimer, a Charcutier/);
    assert.equal(encounter.character.name, 'Mortimer');
    assert.equal(encounter.difficulty, 0.3);
    assert.equal(encounter.companionBriefing, null);
    assert.deepEqual(encounter.transcript[0].dialogue.words.map((word) => word.vocabularyId), packs[code].chips, 'only his own words are chips');

    const verdicts = [];
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      encounter = turn.encounter;
    }
    assert.deepEqual(verdicts, [
      [['name_meat', false], ['quantity', false]],
      [['name_meat', true], ['quantity', false]],
      [['quantity', true]],
    ]);
    assert.equal(encounter.state, 'resolved');
    assert.equal(encounter.resolvedMessage, 'Mortimer weighs your order twice, wraps it in paper labelled with the wrong word, and lets you go.');
    const { world } = await service.getWorld(learnerId);
    assert.deepEqual(world.locations.find((l) => l.id === 'butchers_stall').encounter, { id: 'butchers_stall_charcutier', completed: true, characterName: 'Mortimer' });
  });
}

// Round 010 amendment: live, the grader passed "Due etti" without evidence because the rubric showed only "etto".
test('the grading rubric lists every authored surface form; the narration data does not', async () => {
  const { buildGradingMessages, buildNarrationMessages } = await import('../src/llm/prompt-builder.js');
  const content = loadGameContent({ language: 'it' });
  const { encounter, character } = content.encounters.get('butchers_stall_charcutier');
  const grading = buildGradingMessages({ language: content.language, objectives: encounter.objectives.slice(1), vocabularyById: content.vocabularyById, conversationContext: [], playerInput: 'Due etti.' });
  const marker = 'AUTHORED RUBRIC: ';
  const system = grading[0].content;
  const rubric = JSON.parse(system.slice(system.indexOf(marker) + marker.length, system.indexOf('\nReturn only structured JSON.')));
  assert.deepEqual(rubric[0].targets.find((target) => target.id === 'etto').forms, ['etto', 'etti']);
  assert.match(system, /any of `forms`/);
  const narration = buildNarrationMessages({ language: content.language, character, styleGuide: content.styleGuide, locationName: "The Butcher's Stall", objectives: encounter.objectives, vocabularyById: content.vocabularyById, targetRatio: 0.3 });
  assert.doesNotMatch(narration[0].content, /"forms"/);
});
