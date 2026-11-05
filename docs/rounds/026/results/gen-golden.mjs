// Round 026: regenerates Gerald's pinned narration prompts (server/test/fixtures/gerald-prompts-r026.json) with the
// same arguments as the golden test in server/test/encounters.test.js.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { buildNarrationMessages } from '../../../../server/src/llm/prompt-builder.js';
const out = {};
for (const code of ['it', 'es']) {
  const c = loadGameContent({ language: code });
  const base = { language: c.language, character: c.character, styleGuide: c.styleGuide, locationName: 'The Coffee Cart', vocabularyById: c.vocabularyById };
  out[code] = {
    greeting: buildNarrationMessages({ ...base, objectives: c.encounter.objectives, targetRatio: 0.25 }),
    turn: buildNarrationMessages({
      ...base, objectives: c.encounter.objectives.slice(1), targetRatio: 0.3,
      conversationHistory: [{ role: 'assistant', content: 'Ciao.' }], playerInput: 'Un caffè.',
      decision: { objectiveResults: [{ objectiveId: 'order_coffee', passed: true }], encounterState: 'ongoing', nextObjectiveId: 'no_milk' },
    }),
  };
}
writeFileSync(resolve(import.meta.dirname, '../../../../server/test/fixtures/gerald-prompts-r026.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('written');
