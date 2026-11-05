// Round 054 (backlog F2): an iPhone types a typographic apostrophe (’) with Smart Punctuation on. The vocabulary
// matcher and the grader-evidence presence check treat it as the straight one; excerpts and offsets still index the
// source text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { foldApostrophes, gradeVocabularyAnswer, matchCanonicalVocabulary } from '../src/language-engine.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { route } from '../scripts/play-market.js';
import { FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

const ancora = { id: 'ancora', surface_variants: ['ancora', "ancora un po'"] };

test('foldApostrophes maps every apostrophe look-alike to the straight one, one unit for one', () => {
  const text = "po’ po‘ poʼ po` po´ po′ po'";
  const folded = foldApostrophes(text);
  assert.equal(folded, "po' po' po' po' po' po' po'");
  assert.equal(folded.length, text.length);
  assert.equal(foldApostrophes(''), '');
});

test('the matcher treats typographic apostrophes in the text as straight ones and keeps the source excerpt', () => {
  for (const mark of ['’', '‘', 'ʼ']) {
    const text = `Ancora un po${mark}, per favore.`;
    const [match, ...rest] = matchCanonicalVocabulary(text, [ancora]);
    assert.equal(rest.length, 0, mark);
    assert.equal(match.excerpt, `Ancora un po${mark}`, mark);
    assert.equal(text.slice(match.start, match.end), match.excerpt);
  }
});

test('a typographic apostrophe in a variant matches a straight one in the text', () => {
  const entry = { id: 'luna', surface_variants: ['l’una'] };
  const [match] = matchCanonicalVocabulary("Sì, è l'una.", [entry]);
  assert.equal(match.excerpt, "l'una");
});

test('offsets stay right with a decomposed accent before a typographic apostrophe', () => {
  const text = 'Allora: È l’una, Flick.';
  const entries = [{ id: 'luna', surface_variants: ["è l'una", "l'una"] }];
  const [match] = matchCanonicalVocabulary(text, entries);
  assert.equal(match.excerpt, 'È l’una');
  assert.equal(text.slice(match.start, match.end), match.excerpt);
  assert.equal(match.start, 8);
});

test('word boundaries hold around a folded apostrophe', () => {
  const entries = [{ id: 'po', surface_variants: ["po'"] }];
  assert.deepEqual(matchCanonicalVocabulary('poi', entries), []);
  assert.equal(matchCanonicalVocabulary('un po’ di pane', entries).length, 1);
});

test('the real it pack: Mortimer\'s ancora un po\' and Flick\'s l\'una match with either apostrophe', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  for (const text of ["Ancora un po'", 'Ancora un po’']) {
    const matches = matchCanonicalVocabulary(text, vocabulary.entries);
    assert.deepEqual(matches.map((m) => [m.id, m.excerpt]), [['ancora', text]], text);
  }
  for (const text of ["È l'una", 'È l’una', 'è lʼuna']) {
    assert.deepEqual(matchCanonicalVocabulary(text, vocabulary.entries).map((m) => m.id), ['luna'], text);
  }
});

test('reviews accept ʼ and ´ as apostrophes too (critique 1.2)', () => {
  const entry = { accepted_translations: ["it's one o'clock"] };
  assert.equal(gradeVocabularyAnswer(entry, 'Itʼs one oʼclock').correct, true);
  assert.equal(gradeVocabularyAnswer(entry, 'It´s one o´clock').correct, true);
});

test('without its final apostrophe, ancora un po still matches the bare ancora of the same entry (critique 1.5)', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  assert.deepEqual(matchCanonicalVocabulary('ancora un po', vocabulary.entries).map((m) => [m.id, m.excerpt]), [['ancora', 'ancora']]);
});

test('reviews already accept either apostrophe in an accepted translation', () => {
  const entry = { accepted_translations: ["it's one o'clock"] };
  assert.equal(gradeVocabularyAnswer(entry, 'It’s one o’clock').correct, true);
  assert.equal(gradeVocabularyAnswer({ accepted_translations: ['it’s one o’clock'] }, "it's one o'clock").correct, true);
});

// A Fountain grader that quotes its evidence with the other apostrophe, the way models normalise punctuation.
class QuotingProvider extends FixtureProvider {
  constructor(swap) { super(); this.swap = swap; }

  grade(messages) {
    const patterns = { stop: [/fermati/i, 'fermati'], direction: [/sinistra/i, 'sinistra'], time: [/è\s+l['’]una/i, 'luna'], now: [/adesso/i, 'adesso'] };
    const ids = Object.keys(patterns).filter((id) => messages[0].content.includes(`"${id}"`));
    if (!ids.length) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer.normalize('NFC');
    return {
      objective_results: ids.map((id) => {
        const [pattern, vocabularyId] = patterns[id];
        const match = answer.match(pattern);
        return {
          objective_id: id, passed: Boolean(match), feedback: match ? `Passed ${id}.` : `Keep working on ${id}.`,
          vocabulary_evidence: match ? [{ vocabulary_id: vocabularyId, evidence: this.swap(match[0]), quality: 5 }] : [],
        };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

async function fountainTurns(swap, lines) {
  const content = loadGameContent({ language: 'it' });
  const service = new LearningService({ provider: new QuotingProvider(swap), storage: new JsonLearningStorage({ saveDir: await makeTempDir('parallang-apostrophe-') }), content, clock: () => fixedNow });
  const { learnerId } = await service.createOrRecoverLearner();
  for (const locationId of route(content.world, content.world.start, 'cracked_fountain')) await service.moveTo(learnerId, { locationId });
  let { encounter } = await service.startEncounter(learnerId, { encounterId: 'cracked_fountain_letharger' });
  const turns = [];
  for (const message of lines) {
    const turn = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
    turns.push(turn);
    encounter = turn.encounter;
  }
  return { turns, encounter };
}

const straighten = (text) => text.replace(/’/g, "'");
const curl = (text) => text.replace(/'/g, '’');

test('the player types ’ and the grader quotes \': the evidence is accepted and the Fountain resolves', async () => {
  const { turns, encounter } = await fountainTurns(straighten, ['Fermati!', 'A sinistra!', 'È l’una, adesso!']);
  assert.deepEqual(turns.at(-1).assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]), [['time', true], ['now', true]]);
  assert.equal(encounter.state, 'resolved');
});

test('the player types \' and the grader quotes ’: the evidence is accepted too', async () => {
  const { encounter } = await fountainTurns(curl, ['Fermati!', 'A sinistra!', "È l'una, adesso!"]);
  assert.equal(encounter.state, 'resolved');
});

test('the player types NFD accents and double spaces, the grader quotes NFC with one space: accepted (critique 1.3)', async () => {
  const { encounter } = await fountainTurns((text) => text.normalize('NFC').replace(/\s+/g, ' ').replace(/’/g, "'"), ['Fermati!', 'A sinistra!', 'E\u0300  l’una, adesso!']);
  assert.equal(encounter.state, 'resolved');
});

test('evidence that is not in the answer is still refused', async () => {
  await assert.rejects(
    fountainTurns(() => 'è l’una', ['Fermati!']),
    (error) => error.code === 'INVALID_GRADING',
  );
});
