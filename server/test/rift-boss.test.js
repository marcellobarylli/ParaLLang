// Round 015: The Rift's boss (Errata, an infohazard) in both real packs.
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

const others = ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'];
const files = ['entrance_greetings', 'gerald_coffee', 'butcher_meats', 'fountain_riddles', 'bookshop_journey'];

// Every required group of an objective needs its own match; English, "tomorrow" and the real name do not pass.
const packs = {
  it: {
    answers: ['A coffee, please.', 'Vorrei un caffè.', 'Vorrei un caffè e del salame.', 'Fermati domani.', 'Basta, adesso!', 'Mi chiamo Sam.', 'Mi chiamo Nessuno.'],
    patterns: {
      order: [[/caffè/i, 'caffe'], [/salame/i, 'salame']],
      stop_now: [[/basta|fermati|fermo/i, 'basta'], [/adesso|\bora\b/i, 'adesso']],
      nobody: [[/mi chiamo/i, 'mi_chiamo'], [/nessuno/i, 'nessuno']],
    },
    line: 'Ciao, caffè? Prosciutto. Fermati... Nessuno ŧhe çùršęd.',
    chips: ['caffe', 'ciao', 'fermati', 'nessuno', 'prosciutto'],
  },
  es: {
    answers: ['A coffee, please.', 'Quiero un café.', 'Quiero un café y chorizo.', 'Quieto mañana.', '¡Basta, ahora!', 'Me llamo Sam.', 'Me llamo Nadie.'],
    patterns: {
      order: [[/café/i, 'cafe'], [/chorizo/i, 'chorizo']],
      stop_now: [[/basta|quiet[oa]/i, 'basta'], [/ahora/i, 'ahora']],
      nobody: [[/me llamo/i, 'me_llamo'], [/nadie/i, 'nadie']],
    },
    line: 'Hola, ¿café? Jamón. Quieto... Nadie ŧhe çùršęd.',
    chips: ['cafe', 'hola', 'jamon', 'nadie', 'quieto'],
  },
};

class RiftProvider extends FixtureProvider {
  constructor(code) { super(); this.pack = packs[code]; }

  grade(messages) {
    const ids = Object.keys(this.pack.patterns).filter((id) => messages[0].content.includes(`"${id}"`));
    if (!ids.length) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: ids.map((id) => {
        const matches = this.pack.patterns[id].map(([pattern, vocabularyId]) => [answer.match(pattern), vocabularyId]);
        const passed = matches.every(([match]) => match);
        return {
          objective_id: id, passed, feedback: passed ? `Passed ${id}.` : `Keep working on ${id}.`,
          vocabulary_evidence: passed ? matches.map(([match, vocabularyId]) => ({ vocabulary_id: vocabularyId, evidence: match[0], quality: 5 })) : [],
        };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }

  narrate(messages) {
    const value = super.narrate(messages);
    return { ...value, dialogue: { ...value.dialogue, native: this.pack.line, translation: 'Hello, coffee? Ham. Stop... Nobody the cursed.', words: [] } };
  }
}

async function runtime(t, code) {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-rift-'));
  t.after(() => rm(saveDir, { recursive: true, force: true }));
  const content = loadGameContent({ language: code });
  const provider = new RiftProvider(code);
  const storage = new JsonLearningStorage({ saveDir });
  const service = new LearningService({ provider, storage, content, clock: () => fixedNow });
  const { learnerId } = await service.createOrRecoverLearner();
  const seed = async (world) => { const envelope = await storage.load(learnerId); envelope.world = world; await storage.save(envelope); };
  return { content, provider, service, learnerId, seed };
}

test('both packs put Errata in The Rift, reviewing every earlier vocabulary file, with a briefing and no party slot', () => {
  for (const code of ['it', 'es']) {
    const { world, encounters, vocabulary } = loadGameContent({ language: code });
    assert.equal(world.locationsById.get('the_rift').encounter, 'the_rift_errata');
    const definition = encounters.get('the_rift_errata');
    assert.equal(definition.character.name, 'Errata');
    assert.equal(definition.character.saveable, false);
    assert.equal(definition.encounter.companion_briefing.length, 3);
    assert.deepEqual(definition.encounter.objectives.map((o) => o.id), ['order', 'stop_now', 'nobody']);
    // Round 022: party conversations are optional, so their vocabulary is not part of the Rift's review.
    const partyIds = new Set([...encounters.values()].filter(({ encounter }) => encounter.party_of)
      .flatMap(({ encounter }) => encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids)));
    assert.ok(partyIds.size > 0);
    // Round 052: Flick's minutes objective also targets Mortimer's numbers, which stay location encounter entries.
    const locationIds = new Set([...encounters.values()].filter(({ encounter }) => !encounter.party_of)
      .flatMap(({ encounter }) => encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids)));
    // Its non-target word for minutes sits in Flick's party file and is not reviewed either.
    const reviewed = (entry) => (!partyIds.has(entry.id) || locationIds.has(entry.id)) && !['minuti', 'minutos'].includes(entry.id);
    assert.equal(definition.narrationEntries.length, vocabulary.entries.filter(reviewed).length, 'its chips cover every location encounter entry');
    for (const file of files) assert.match(vocabulary.version, new RegExp(file.replace('_', '-')), `${file} is still one of the files`);
  }
});

for (const code of Object.keys(packs)) {
  test(`${code}: Errata cannot be started while the Rift is sealed, even by a save already standing in it`, async (t) => {
    const { service, learnerId, seed } = await runtime(t, code);
    await assert.rejects(service.startEncounter(learnerId, { encounterId: 'the_rift_errata' }), { status: 409, code: 'NOT_HERE' });
    await seed({ currentLocationId: 'the_rift', visitedLocationIds: ['market_entrance', 'the_rift'], completedEncounterIds: others.slice(1) });
    await assert.rejects(service.startEncounter(learnerId, { encounterId: 'the_rift_errata' }), {
      status: 409, code: 'SEALED', message: 'The Rift is sealed. Finish the other encounters first (4 of 5 done).',
    });
  });

  test(`${code}: Errata rejects English, a lone coffee, later and the real name, accepts a coffee with a meat, stop now and Nobody, and the map marks the Rift complete`, async (t) => {
    const { content, provider, service, learnerId, seed } = await runtime(t, code);
    await seed({ currentLocationId: 'market_entrance', visitedLocationIds: ['market_entrance'], completedEncounterIds: [...others] });
    for (const locationId of route(content.world, content.world.start, 'the_rift')) await service.moveTo(learnerId, { locationId });

    let encounter = (await service.startEncounter(learnerId, { encounterId: 'the_rift_errata' })).encounter;
    assert.match(provider.calls.at(-1).messages[0].content, /Speak as Errata, a Rift-born infohazard/);
    assert.equal(encounter.difficulty, 0.5);
    assert.equal(service.ratioFor(12, content.encounters.get('the_rift_errata')), 0.5, 'a fixed mix (critique 1.4)');
    assert.deepEqual(encounter.companionBriefing, content.encounters.get('the_rift_errata').encounter.companion_briefing);
    assert.deepEqual(encounter.transcript[0].dialogue.words.map((word) => word.vocabularyId).sort(), packs[code].chips, 'words from every file are chips');

    const verdicts = [];
    const fragmentLog = []; // Round 030: the fragments each turn's spellbook returns, and whether they are hidden.
    for (const message of packs[code].answers) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      fragmentLog.push(turn.spellbook.journeyFragments.map((f) => [f.id, f.hidden, f.translation === null]));
      encounter = turn.encounter;
    }
    assert.deepEqual(verdicts, [
      [['order', false], ['stop_now', false], ['nobody', false]],
      [['order', false], ['stop_now', false], ['nobody', false]],
      [['order', true], ['stop_now', false], ['nobody', false]],
      [['stop_now', false], ['nobody', false]],
      [['stop_now', true], ['nobody', false]],
      [['nobody', false]],
      [['nobody', true]],
    ]);
    assert.equal(encounter.state, 'resolved');
    // Round 030: earlier fragments are hidden during the fight; the resolving turn files the shroud and shows all.
    // Round 109: the proem (Entrance) and Journathan today (Gerald) are filed by the five earlier completions too.
    assert.deepEqual(fragmentLog[0], [['journey_proem', true, true], ['journey_first_stitch', true, true], ['journey_sirens', true, true], ['journey_spores', true, true], ['journey_still_on_his_way', true, true]]);
    assert.deepEqual(fragmentLog.at(-1), [['journey_proem', false, false], ['journey_first_stitch', false, false], ['journey_sirens', false, false], ['journey_shroud', false, false], ['journey_spores', false, false], ['journey_still_on_his_way', false, false]]);
    assert.match(encounter.resolvedMessage, /^Errata cannot read Nobody/);
    const { world } = await service.getWorld(learnerId);
    assert.deepEqual(world.locations.find((l) => l.id === 'the_rift').encounter, { id: 'the_rift_errata', completed: true, characterName: 'Errata', characterId: 'rift_errata_001', saveable: false });
  });
}
