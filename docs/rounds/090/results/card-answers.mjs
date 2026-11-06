// Round 090: per pack, the (card, other entry) pairs the snapshot would list if the learner had every card, split by
// how the other entry was found: as a form ("alone") or only by round 086's inflection rule (candidate false hides).
// Offline: loads the packs, no LLM. Run from the repo root: node docs/rounds/090/results/card-answers.mjs
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { matchCanonicalVocabulary } from '../../../../server/src/language-engine.js';
import { LearningService } from '../../../../server/src/learning-service.js';

for (const language of ['it', 'es']) {
  const content = loadGameContent({ language });
  const service = new LearningService({ storage: null, provider: null, content });
  const counts = { form: { alone: 0, inflected: 0 }, example: { alone: 0, inflected: 0 } };
  const inflected = [];
  let withAny = 0;
  for (const entry of content.vocabulary.entries) {
    const lists = service.entryAnswerLists(entry);
    if (lists.form.size + lists.example.size) withAny += 1;
    for (const [kind, text] of [['form', entry.target], ['example', entry.example?.target ?? '']]) {
      for (const id of lists[kind]) {
        const other = content.vocabularyById.get(id);
        const alone = matchCanonicalVocabulary(text, [other]).length > 0;
        counts[kind][alone ? 'alone' : 'inflected'] += 1;
        if (!alone) inflected.push(`${entry.id} ${kind} "${text}" ← ${id} (${other.target})`);
      }
    }
  }
  console.log(`${language}: ${content.vocabulary.entries.length} entries, ${withAny} with a list; form ${JSON.stringify(counts.form)}, example ${JSON.stringify(counts.example)}`);
  for (const line of inflected) console.log(`  inflected only: ${line}`);
}
