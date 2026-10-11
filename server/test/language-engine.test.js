import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import {
  calculateSpanishRatio, capAssistedQuality, gradeVocabularyAnswer, initialSchedule,
  isDue, matchCanonicalVocabulary, scheduleReview, DAY_MS,
} from '../src/language-engine.js';

const content = loadGameContent({ fresh: true });
const entry = (id) => content.vocabularyById.get(id);

test('real Gerald content is complete, referenced, and uses canonical objective IDs', () => {
  assert.equal(content.vocabulary.version, 'gerald-coffee-v1');
  assert.deepEqual(content.encounter.objectives.map((objective) => objective.id), ['order_coffee', 'no_milk']);
  assert.equal(new Set(content.vocabulary.entries.map((item) => item.id)).size, content.vocabulary.entries.length);
  for (const objective of content.encounter.objectives) {
    for (const id of objective.target_vocabulary_ids) assert.ok(entry(id));
    assert.ok(objective.accepted_examples.length && objective.negative_examples.length && objective.assessment_reference_ids.length);
  }
});

test('complete-answer review normalization permits synonyms, accents and one long-word edit only', () => {
  assert.deepEqual(gradeVocabularyAnswer(entry('cafe'), ' Coffee! '), { correct: true, quality: 5, match: 'coffee', kind: 'exact' });
  assert.equal(gradeVocabularyAnswer(entry('cafe'), 'cofee').quality, 3);
  assert.equal(gradeVocabularyAnswer(entry('cafe'), 'coff').correct, false);
  assert.equal(gradeVocabularyAnswer(entry('sin_leche'), 'no milk').quality, 5);
  assert.equal(gradeVocabularyAnswer(entry('sin_leche'), 'milk').correct, false);
  assert.equal(gradeVocabularyAnswer(entry('sin_leche'), 'not without milk').correct, false);
  assert.equal(gradeVocabularyAnswer(entry('sin_leche'), 'without mil').correct, false);
});

test('canonical matching uses boundaries, longest phrases, known forms and canonical meanings', () => {
  assert.deepEqual(matchCanonicalVocabulary('Quiero un cafe sin leche.', content.vocabulary.entries).map((match) => match.id), ['quiero', 'cafe', 'sin_leche']);
  assert.deepEqual(matchCanonicalVocabulary('descafeinado', content.vocabulary.entries).map((match) => match.id), []);
  assert.deepEqual(matchCanonicalVocabulary('café solo', content.vocabulary.entries).map((match) => match.id), ['cafe_solo']);
  assert.equal(entry('cafe').accepted_translations[0], 'coffee');
  assert.equal(content.vocabularyById.has('hallucinated_word'), false);
  assert.notEqual(entry('quiero').accepted_translations[0], 'to want');
});

test('SM-2 intervals, resets, ease floor and UTC due boundaries are deterministic', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  let schedule = initialSchedule(start);
  assert.equal(isDue(schedule, start), true);
  schedule = scheduleReview(schedule, 5, start);
  assert.equal(schedule.intervalDays, 1);
  assert.equal(new Date(schedule.dueAt).getTime(), start.getTime() + DAY_MS);
  assert.equal(isDue(schedule, new Date(start.getTime() + DAY_MS - 1)), false);
  assert.equal(isDue(schedule, new Date(start.getTime() + DAY_MS)), true);
  schedule = scheduleReview(schedule, 4, new Date(start.getTime() + DAY_MS));
  assert.equal(schedule.intervalDays, 6);
  schedule = scheduleReview(schedule, 5, new Date(start.getTime() + 7 * DAY_MS));
  assert.equal(schedule.intervalDays, 16);
  schedule = scheduleReview(schedule, 2, new Date(start.getTime() + 23 * DAY_MS));
  assert.equal(schedule.repetitions, 0);
  assert.equal(schedule.intervalDays, 1);
  for (let index = 0; index < 20; index += 1) schedule = scheduleReview(schedule, 0, new Date(start.getTime() + (24 + index) * DAY_MS));
  assert.equal(schedule.ease, 1.3);
  assert.equal(capAssistedQuality(5, true), 2);
  assert.equal(capAssistedQuality(4, false), 4);
});

test('phrases schedule independently and difficulty has one committed-turn calculation', () => {
  const word = scheduleReview(initialSchedule('2026-01-01T00:00:00Z'), 5, '2026-01-01T00:00:00Z');
  const phrase = initialSchedule('2026-01-01T00:00:00Z');
  assert.notEqual(word.dueAt, phrase.dueAt);
  assert.equal(calculateSpanishRatio(.25, .05, 0), .25);
  assert.equal(calculateSpanishRatio(.25, .05, 1), .30);
  assert.equal(calculateSpanishRatio(.25, .05, 0), .25, 'failed turns do not change the supplied committed count');
  assert.equal(calculateSpanishRatio(.25, .05, 100), 1);
});
