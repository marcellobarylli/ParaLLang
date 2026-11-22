// Round 144: loads the curriculum of each language pack and prints what it holds, or the first content error.
//   node server/scripts/check-curriculum.js [it|es]
// The loader (server/src/road/curriculum.js) checks that every lesson of the skeleton has words, that no two
// vocabulary entries share a form, and that every example holds a form the answer check will find.
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { availableLanguages } from '../src/content-loader.js';
import { loadCurriculum } from '../src/road/curriculum.js';

const contentDir = resolve(import.meta.dirname, '..', '..', 'content');
const only = process.argv[2];
let failed = false;
for (const code of availableLanguages(contentDir).filter((candidate) => !only || candidate === only)) {
  const { name } = yaml.load(readFileSync(resolve(contentDir, 'languages', code, 'language.yaml'), 'utf8'));
  try {
    const curriculum = loadCurriculum({ contentDir, language: { code, name } });
    if (!curriculum) { console.log(`${code}: no curriculum`); continue; }
    const objectives = [...curriculum.lessonsById.values()].reduce((sum, { lesson }) => sum + lesson.objectives.length, 0);
    console.log(`${code}: ${curriculum.stages.length} stages (${curriculum.stages.map((stage) => stage.id).join(', ')}), ${curriculum.units.length} units, ${curriculum.lessonsById.size} lessons, ${objectives} objectives, ${curriculum.vocabulary.entries.length} vocabulary entries`);
  } catch (error) {
    failed = true;
    console.log(`${code}: ERROR ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
