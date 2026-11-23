// Round 013: The Old Bookshop (Marginalia the Bookworm, The Journey) in both real packs.
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
    answers: ['Un libro.', 'Home.', 'A casa!', 'Journathan.', 'Nessuno!'],
    patterns: { home: [/\bcasa\b/i, 'casa'], name: [/nessuno/i, 'nessuno'] },
    passages: [/Il suo viaggio verso casa dura vent'anni/, /«Il mio nome è Nessuno\.»/],
    line: "Questa è la storia di Journathan. Il suo viaggio verso casa... Prosciutto? Fermati! Ciao, caffè.",
    chips: ['storia', 'viaggio', 'casa'],
  },
  es: {
    answers: ['Un libro.', 'Home.', '¡A casa!', 'Journathan.', '¡Nadie!'],
    patterns: { home: [/\bcasa\b/i, 'casa'], name: [/nadie/i, 'nadie'] },
    passages: [/Su viaje a casa dura veinte años/, /«Mi nombre es Nadie\.»/],
    line: 'Esta es la historia de Journathan. Su viaje a casa... ¿Jamón? ¡Quieto! Hola, café.',
    chips: ['historia', 'viaje', 'casa'],
  },
};

// Grades Marginalia's objectives by pattern (a book, English and his real name do not pass) and narrates one line
// mixing her words with Flick's, Mortimer's, the tutorial's and Gerald's.
class BookshopProvider extends FixtureProvider {
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
    return { ...value, dialogue: { ...value.dialogue, native: this.pack.line, translation: 'This is the story of Journathan. His journey home... Ham? Stop! Hello, coffee.', words: [] } };
  }
}

for (const code of Object.keys(packs)) {
  test(`${code}: Marginalia reads both passages, rejects a book, English and the real name, accepts home and Nobody, and the map marks the bookshop complete`, async (t) => {
    const saveDir = await mkdtemp(join(tmpdir(), 'parallang-bookshop-'));
    t.after(() => rm(saveDir, { recursive: true, force: true }));
    const content = loadGameContent({ language: code });
    assert.equal(content.world.locationsById.get('old_bookshop').encounter, 'old_bookshop_bookworm');
    const provider = new BookshopProvider(code);
    const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow, exchangeLimit: Infinity }); // round 174: a long scenario
    const { learnerId } = await service.createOrRecoverLearner();
    const walk = route(content.world, content.world.start, 'old_bookshop');
    assert.equal(walk.length, 3);
    for (const locationId of walk) await service.moveTo(learnerId, { locationId });

    let encounter = (await service.startEncounter(learnerId, { encounterId: 'old_bookshop_bookworm' })).encounter;
    const system = provider.calls.at(-1).messages[0].content;
    assert.match(system, /Speak as Marginalia, a Bookworm/);
    for (const passage of packs[code].passages) assert.match(system, passage, 'the passage reaches the narration prompt');
    assert.equal(encounter.character.name, 'Marginalia');
    assert.equal(encounter.difficulty, 0.35);
    assert.equal(encounter.companionBriefing, null);
    assert.deepEqual(encounter.transcript[0].dialogue.words.map((word) => word.vocabularyId), packs[code].chips, 'only her own words are chips');

    const verdicts = [];
    const fragmentLog = []; // Round 030: the fragments each turn's spellbook returns, and whether they are hidden.
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      fragmentLog.push(turn.spellbook.journeyFragments.map((f) => [f.id, f.hidden, f.translation === null]));
      encounter = turn.encounter;
    }
    assert.deepEqual(verdicts, [
      [['home', false], ['name', false]],
      [['home', false], ['name', false]],
      [['home', true], ['name', false]],
      [['name', false]],
      [['name', true]],
    ]);
    assert.equal(encounter.state, 'resolved');
    // Round 030: the first stitch is filed by the resolving turn itself, with its translation.
    assert.deepEqual(fragmentLog.slice(0, -1).flat(), [], 'nothing before the resolution');
    assert.deepEqual(fragmentLog.at(-1), [['journey_first_stitch', false, false]]);
    assert.match(encounter.resolvedMessage, /^Marginalia annotates you as 'promising'/);
    const { world } = await service.getWorld(learnerId);
    assert.deepEqual(world.locations.find((l) => l.id === 'old_bookshop').encounter, { id: 'old_bookshop_bookworm', completed: true, characterName: 'Marginalia', characterId: 'bookworm_marginalia_001', saveable: true });
  });
}
