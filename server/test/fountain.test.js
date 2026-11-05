// Round 011: The Cracked Fountain (Flick the Letharger) in both real packs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { normalizeAnswer } from '../src/language-engine.js';
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
    jingle: 'Dopo, dopo, domani!',
    jingleIds: ['dopo', 'domani'],
  },
  es: {
    answers: ['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!', 'Mañana.', '¡No, ahora!'],
    patterns: { stop: [/quiet[oa]s?|basta/i, 'quieto'], direction: [/derecha|izquierda/i, 'izquierda'], now: [/ahora/i, 'ahora'] },
    line: '¡Mira! Después, mañana... ¿Jamón? Hola, café.',
    chips: ['mira', 'despues', 'manana'],
    jingle: '¡Después, después, mañana!',
    jingleIds: ['despues', 'manana'],
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

    const started = await service.startEncounter(learnerId, { encounterId: 'cracked_fountain_letharger' });
    let encounter = started.encounter;
    // Round 028: the containment file is filed on completion, not on the visit or at the start.
    assert.deepEqual(started.spellbook.containmentFiles, []);
    assert.match(provider.calls.at(-1).messages[0].content, /Speak as Flick, a Letharger/);
    assert.equal(encounter.character.name, 'Flick');
    assert.equal(encounter.difficulty, 0.3);
    assert.equal(encounter.companionBriefing.length, 3);
    assert.match(encounter.companionBriefing[0], /^Containment notice, the Cracked Fountain/);
    assert.deepEqual(encounter.transcript[0].dialogue.words.map((word) => word.vocabularyId), packs[code].chips, 'only its own words are chips');

    const verdicts = [];
    const filed = [];
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      filed.push(turn.spellbook.containmentFiles.map((file) => file.designation).join());
      encounter = turn.encounter;
    }
    assert.deepEqual(filed, ['', '', '', '', '', 'CM-001'], 'filed by the resolving turn');
    assert.deepEqual((await service.getSpellbook(learnerId)).containmentFiles.map((file) => file.name), [packs[code].jingle]);
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

// Round 025 (backlog B3): Flick's jingle is a brainrot infohazard, authored per pack in the last objective's intent so
// it reaches every narration prompt, and humming it back fails.
for (const [code, pack] of Object.entries(packs)) {
  test(`${code}: Flick's jingle is authored, reaches every narration prompt, gives no answer away and fails when hummed`, () => {
    const content = loadGameContent({ language: code });
    const definition = content.encounters.get('cracked_fountain_letharger');
    const { objectives } = definition.encounter;
    const now = objectives.at(-1);
    assert.equal(now.id, 'now');
    assert.ok(now.intent.includes(`"${pack.jingle}"`), 'the last objective carries the jingle, so every turn prompt has it');
    assert.ok(now.negative_examples.some((example) => example.text === pack.jingle), 'humming the jingle back is a negative example');
    assert.match(definition.character.personality.quirks.join(' '), /Fountain jingle, a brainrot strain/);
    assert.match(content.world.locationsById.get('cracked_fountain').description, /PLEASE DO NOT HUM/);
    const stop = objectives.find((objective) => objective.id === 'stop');
    assert.ok(!stop.negative_examples.some((example) => example.text === 'Stop!'), '"Stop!" is Italian and Spanish too (critique 1.4)');
    assert.ok(stop.negative_examples.some((example) => example.text === 'Stop moving!'));
    assert.match(definition.encounter.resolved_message, /the jingle has almost left your head\.$/);

    const fold = (text) => normalizeAnswer(text, { stripAccents: true }).replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const jingleWords = new Set(fold(pack.jingle).split(' '));
    const jingleForms = pack.jingleIds.flatMap((id) => definition.narrationEntries.find((entry) => entry.id === id).surface_variants.map(fold));
    assert.deepEqual([...jingleWords].sort(), [...new Set(jingleForms)].sort(), 'the jingle uses only its two authored words');
    const targetForms = objectives.flatMap((objective) => objective.target_vocabulary_ids)
      .flatMap((id) => definition.narrationEntries.find((entry) => entry.id === id).surface_variants.map(fold));
    for (const form of targetForms) assert.ok(!` ${fold(pack.jingle)} `.includes(` ${form} `), `the jingle contains the target form ${form}`);
  });
}
