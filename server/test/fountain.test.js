// Round 011: The Cracked Fountain (Flick the Letharger) in both real packs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary, normalizeAnswer } from '../src/language-engine.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { route } from '../scripts/play-market.js';
import { FixtureProvider, fixedNow } from './helpers.js';

const packs = {
  it: {
    // Round 050: "now" without a time fails the time objective, then a singular hour passes it.
    answers: ['Guarda!', 'Fermati!', 'Left.', 'A sinistra!', 'Adesso!', "È l'una, Flick.", 'Domani.', 'No, adesso!'],
    timeIds: { "è l'una": 'luna', 'sono le': 'sono_le', mezzogiorno: 'mezzogiorno', mezzanotte: 'mezzanotte' },
    patterns: { stop: [/fermati|fermo|basta/i, 'fermati'], direction: [/destra|sinistra|dritto/i, 'sinistra'], time: [/è l'una|sono le|mezzogiorno|mezzanotte/i, 'luna'], now: [/^(no, )?adesso|\bora\b/i, 'adesso'] },
    line: 'Guarda! Dopo, domani... Prosciutto? Ciao, caffè.',
    chips: ['guarda', 'dopo', 'domani'],
    jingle: 'Dopo, dopo, domani!',
    jingleIds: ['dopo', 'domani'],
  },
  es: {
    answers: ['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!', '¡Ahora!', 'Es la una, Flick.', 'Mañana.', '¡No, ahora!'],
    timeIds: { 'es la una': 'es_la_una', 'son las': 'son_las', mediodía: 'mediodia', mediodia: 'mediodia', medianoche: 'medianoche' },
    patterns: { stop: [/quiet[oa]s?|basta/i, 'quieto'], direction: [/derecha|izquierda/i, 'izquierda'], time: [/es la una|son las|mediod[ií]a|medianoche/i, 'es_la_una'], now: [/ahora/i, 'ahora'] },
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
        const [pattern, fixedId] = this.pack.patterns[id];
        const match = answer.match(pattern);
        // Round 050: the time objective has four forms; name the one that matched.
        // Round 051: "ora" is its own entry.
        const vocabularyId = id === 'time' && match ? this.pack.timeIds[match[0].toLowerCase()]
          : id === 'now' && match && /^ora$/i.test(match[0]) ? 'ora' : fixedId;
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
  test(`${code}: Flick rejects look, English and tomorrow, accepts stop, a direction, the time and now, and the map marks the fountain complete`, async (t) => {
    const saveDir = await mkdtemp(join(tmpdir(), 'parallang-fountain-'));
    t.after(() => rm(saveDir, { recursive: true, force: true }));
    const content = loadGameContent({ language: code });
    assert.equal(content.world.locationsById.get('cracked_fountain').encounter, 'cracked_fountain_letharger');
    const provider = new FountainProvider(code);
    const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow, exchangeLimit: Infinity }); // round 174: a long scenario
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
    assert.deepEqual(filed, ['', '', '', '', '', '', '', 'CM-001'], 'filed by the resolving turn');
    assert.deepEqual((await service.getSpellbook(learnerId)).containmentFiles.map((file) => file.name), [packs[code].jingle]);
    // Round 050: "now" passes its own objective on turn 5 but does not close it while the time is open (in order).
    assert.deepEqual(verdicts, [
      [['stop', false], ['direction', false], ['time', false], ['now', false]],
      [['stop', true], ['direction', false], ['time', false], ['now', false]],
      [['direction', false], ['time', false], ['now', false]],
      [['direction', true], ['time', false], ['now', false]],
      [['time', false], ['now', true]],
      [['time', true], ['now', false]],
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

// Round 050 (backlog G5): telling the time. One answer can close the time and now together (critique 1.6), and the
// authored time forms match through the real vocabulary index, typographic apostrophes and missing accents included
// (critiques 1.2, 1.7, 1.11). Mortimer's quantities already teach tre / tres, which match too; round 052's numbers (dieci) too.
const timePacks = {
  it: {
    combined: ['Fermati!', 'A sinistra!', 'Adesso, sono le tre!'],
    matches: [
      ['È l’una, Flick.', ['luna']], ["e l'una", ['luna']], ['Sono le tre.', ['sono_le', 'tre']], ['Sono le dieci e mezza.', ['sono_le', 'dieci']],
      ['È mezzogiorno!', ['mezzogiorno']], ['mezzanotte', ['mezzanotte']], ['Che ora è?', ['che_ore_sono']], ['Che ore sono?', ['che_ore_sono']],
    ],
  },
  es: {
    combined: ['¡Quieto!', '¡A la izquierda!', '¡Ahora, son las tres!'],
    matches: [
      ['Es la una, Flick.', ['es_la_una']], ['es la una y media', ['es_la_una']], ['Son las tres y media.', ['son_las', 'tres']],
      ['¡Es mediodía!', ['mediodia']], ['es mediodia', ['mediodia']], ['¡Es medianoche!', ['medianoche']], ['¿Qué hora es?', ['que_hora_es']],
    ],
  },
};

for (const [code, pack] of Object.entries(timePacks)) {
  test(`${code}: the time objective sits between direction and now, and its forms match through the real index`, () => {
    const content = loadGameContent({ language: code });
    const { objectives } = content.encounters.get('cracked_fountain_letharger').encounter;
    assert.deepEqual(objectives.map((objective) => [objective.id, objective.next_objective]), [['stop', 'direction'], ['direction', 'time'], ['time', 'now'], ['now', null]]);
    const time = objectives.find((objective) => objective.id === 'time');
    assert.equal(time.required_target_groups.length, 1);
    assert.deepEqual(time.required_target_groups[0], time.target_vocabulary_ids);
    for (const [text, ids] of pack.matches) {
      assert.deepEqual(matchCanonicalVocabulary(text, content.vocabulary.entries).map((match) => match.id), ids, text);
    }
    // Every accepted example holds a required form; every negative example of the time objective is rejected by
    // meaning or lacks one (questions and scheduling hold one on purpose, critique 1.5).
    for (const example of time.accepted_examples) {
      const ids = matchCanonicalVocabulary(example, content.vocabulary.entries).map((match) => match.id);
      assert.ok(ids.some((id) => time.target_vocabulary_ids.includes(id)), `accepted example without a time form: ${example}`);
    }
  });

  test(`${code}: one answer that says now and the time closes both objectives together`, async (t) => {
    const saveDir = await mkdtemp(join(tmpdir(), 'parallang-fountain-'));
    t.after(() => rm(saveDir, { recursive: true, force: true }));
    const content = loadGameContent({ language: code });
    const service = new LearningService({ provider: new FountainProvider(code), storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow, exchangeLimit: Infinity }); // round 174: a long scenario
    const { learnerId } = await service.createOrRecoverLearner();
    for (const locationId of route(content.world, content.world.start, 'cracked_fountain')) await service.moveTo(learnerId, { locationId });
    let { encounter } = await service.startEncounter(learnerId, { encounterId: 'cracked_fountain_letharger' });
    const verdicts = [];
    for (const message of pack.combined) {
      const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      verdicts.push(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]));
      encounter = turn.encounter;
    }
    assert.deepEqual(verdicts.at(-1), [['time', true], ['now', true]]);
    assert.equal(encounter.state, 'resolved');
  });
}

// Round 051 (backlog H1): in order, a pass after a failed objective is `held`: not banked, marked in the response and
// in the narration decision (with a note), and the grader is told the order. Critiques 1.4, 1.6, 1.7, 1.9.
const heldPacks = {
  it: { now: 'Adesso!', time: "È l'una, Flick.", passFailPass: 'Fermati! Ora.' },
  es: { now: '¡Ahora!', time: 'Es la una, Flick.', passFailPass: '¡Quieto! ¡Ahora!' },
};

async function fountainAt(t, code) {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-fountain-'));
  t.after(() => rm(saveDir, { recursive: true, force: true }));
  const content = loadGameContent({ language: code });
  const provider = new FountainProvider(code);
  const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => fixedNow, exchangeLimit: Infinity }); // round 174: a long scenario
  const { learnerId } = await service.createOrRecoverLearner();
  for (const locationId of route(content.world, content.world.start, 'cracked_fountain')) await service.moveTo(learnerId, { locationId });
  const { encounter } = await service.startEncounter(learnerId, { encounterId: 'cracked_fountain_letharger' });
  const say = async (current, message, attemptId = randomUUID()) => service.submitDialogue(learnerId, { encounterId: current.id, version: current.version, attemptId, message });
  const lastTurnData = () => JSON.parse(provider.calls.at(-1).messages.at(-1).content.split('TURN DATA: ')[1]);
  return { service, provider, learnerId, encounter, say, lastTurnData };
}

const marks = (turn) => turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed, r.held === true]);

for (const [code, pack] of Object.entries(heldPacks)) {
  test(`${code}: an early "now" is held, not banked; the grader is told the order and the narrator is told not to celebrate`, async (t) => {
    const { service, provider, learnerId, encounter: start, say, lastTurnData } = await fountainAt(t, code);
    let turn = await say(start, packs[code].answers[1]);
    turn = await say(turn.encounter, packs[code].answers[3]);
    assert.equal(turn.encounter.currentObjective.id, 'time');
    const attemptId = randomUUID();
    const held = await say(turn.encounter, pack.now, attemptId);
    assert.deepEqual(marks(held), [['time', false, false], ['now', true, true]]);
    assert.ok(!('held' in held.assessment.objectiveResults[0]), 'held is present only when true');
    const grading = provider.calls.at(-2).messages[0].content;
    assert.match(grading, /\n- ORDER: these objectives count only in the order given\./);
    const decision = lastTurnData().authoritative_decision;
    assert.deepEqual(decision.objectiveResults, [{ objectiveId: 'time', passed: false }, { objectiveId: 'now', passed: true, held: true }]);
    assert.match(decision.held_note, /does not count/);
    assert.equal(decision.nextObjectiveId, 'time');

    // A replay returns the stored held marks and records no evidence again.
    const items = async () => { const { words, phrases } = (await service.loadEnvelope(learnerId)).spellbook; return { words, phrases }; };
    const before = await items();
    const nowWord = before.words[code === 'it' ? 'adesso' : 'ahora'];
    assert.deepEqual(nowWord.evidence.map((e) => [e.objectiveId, e.passed]), [['now', true]], 'held evidence is kept as correct usage');
    const calls = provider.calls.length;
    const replay = await say(turn.encounter, pack.now, attemptId);
    assert.equal(replay.replayed, true);
    assert.deepEqual(marks(replay), marks(held));
    assert.equal(provider.calls.length, calls);
    assert.deepEqual(await items(), before, 'a replay records nothing');

    // Not banked: the time alone closes only the time; now stays open and must be said again.
    const timed = await say(held.encounter, pack.time);
    assert.deepEqual(marks(timed), [['time', true, false], ['now', false, false]]);
    assert.equal(timed.encounter.currentObjective.id, 'now');
    assert.equal(lastTurnData().authoritative_decision.held_note, undefined);
    const done = await say(timed.encounter, packs[code].answers.at(-1));
    assert.equal(done.encounter.state, 'resolved');
    assert.ok(done.assessment.objectiveResults.every((r) => !('held' in r)), 'a resolving turn holds nothing');
  });

  test(`${code}: pass, fail, pass: the first closes, the later pass is held`, async (t) => {
    const { encounter, say } = await fountainAt(t, code);
    const turn = await say(encounter, pack.passFailPass);
    assert.deepEqual(marks(turn), [['stop', true, false], ['direction', false, false], ['time', false, false], ['now', true, true]]);
    assert.equal(turn.encounter.currentObjective.id, 'direction');
  });
}
