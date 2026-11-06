// Round 009: the Market Entrance tutorial (Portia the Archway) in both real packs.
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
    answers: ['Ciao!', 'Mi chiamo Sam.', 'E tu?'],
    patterns: { greet: [/\bciao\b|buongiorno/i, 'ciao'], introduce: [/mi chiamo|\bsono\b/i, 'mi_chiamo'], ask_back: [/\btu\b|come ti chiami/i, 'tu'] },
    line: 'Ciao! Io sono Portia. Vuoi un caffè?',
  },
  es: {
    answers: ['¡Hola!', 'Me llamo Sam.', '¿Y tú?'],
    patterns: { greet: [/\bhola\b|buenos d[ií]as/i, 'hola'], introduce: [/me llamo|\bsoy\b/i, 'me_llamo'], ask_back: [/y t[uú](?!\p{L})|c[oó]mo te llamas/iu, 'y_tu'] },
    line: '¡Hola! Soy Portia. ¿Quieres un café?',
  },
};

// Grades the tutorial's objectives by pattern, delegates Gerald's to the shared fixture, and narrates one line that
// mixes tutorial and coffee words for every encounter.
class TutorialProvider extends FixtureProvider {
  constructor(code) { super(); this.pack = packs[code]; }

  grade(messages) {
    const rubricIds = Object.keys(this.pack.patterns).filter((id) => messages[0].content.includes(`"${id}"`));
    if (!rubricIds.length) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: rubricIds.map((id) => {
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
    return { ...value, dialogue: { ...value.dialogue, native: this.pack.line, translation: 'Hello! I am Portia. Do you want a coffee?', words: [] } };
  }
}

async function runtime(t, code) {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-tutorial-'));
  t.after(() => rm(saveDir, { recursive: true, force: true }));
  const content = loadGameContent({ language: code });
  const provider = new TutorialProvider(code);
  const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow });
  return { content, provider, service };
}

for (const code of Object.keys(packs)) {
  test(`${code}: a new player plays the Market Entrance tutorial to resolution where they start`, async (t) => {
    const { service, provider, content } = await runtime(t, code);
    assert.equal(content.world.locationsById.get('market_entrance').encounter, 'market_entrance_tutorial');
    const { learnerId } = await service.createOrRecoverLearner();
    assert.equal((await service.getWorld(learnerId)).world.currentLocationId, 'market_entrance');

    const started = (await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' })).encounter;
    const greetingPrompt = provider.calls.at(-1).messages;
    assert.match(greetingPrompt[0].content, /Speak as Portia, a Sentient Archway/);
    assert.match(greetingPrompt.at(-1).content, /The player approaches Portia at Market Entrance in The Crumbling Market/);
    assert.equal(started.character.name, 'Portia');
    assert.equal(started.difficulty, 0.2);
    assert.equal(started.companionBriefing.length, 3);
    for (const line of started.companionBriefing) assert.doesNotMatch(line, /\b(?:ciao|buongiorno|sono|mi chiamo|hola|soy|me llamo|tú)\b/i);
    assert.deepEqual(started.currentObjective.id, 'greet');
    // Narration matches the tutorial's own words only: the coffee word in Portia's line is not a chip.
    assert.deepEqual(started.transcript[0].dialogue.words.map((word) => word.vocabularyId), code === 'it' ? ['ciao', 'io', 'sono'] : ['hola', 'soy']);

    let encounter = started;
    const passed = [];
    const filed = []; // Round 109: the fragments each turn's Spellbook holds, and whether they are hidden.
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      passed.push(...turn.assessment.objectiveResults.filter((r) => r.passed).map((r) => r.objectiveId));
      filed.push(turn.spellbook.journeyFragments.map((f) => [f.id, f.encounterId, f.hidden]));
      encounter = turn.encounter;
    }
    assert.deepEqual(filed, [[], [], [['journey_proem', 'market_entrance_tutorial', false]]], 'round 109: the resolving turn files the proem');
    assert.deepEqual(passed, ['greet', 'introduce', 'ask_back']);
    assert.equal(encounter.state, 'resolved');
    assert.equal(encounter.resolvedMessage, 'Portia sighs with relief, unlocks herself and lets you into the market.');
    const { world } = await service.getWorld(learnerId);
    assert.deepEqual(world.locations.find((l) => l.id === 'market_entrance').encounter, { id: 'market_entrance_tutorial', completed: true, characterName: 'Portia', characterId: 'archway_portia_001', saveable: false });
  });

  test(`${code}: Gerald has no companion briefing and his lines never match tutorial words`, async (t) => {
    const { service } = await runtime(t, code);
    const { learnerId } = await service.createOrRecoverLearner();
    await service.moveTo(learnerId, { locationId: 'coffee_cart' });
    const gerald = (await service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' })).encounter;
    assert.equal(gerald.companionBriefing, null);
    assert.deepEqual(gerald.transcript[0].dialogue.words.map((word) => word.vocabularyId), [code === 'it' ? 'caffe' : 'cafe']);
  });
}
