// Round 223: checks a language pack while it is being written. Files of the pack that do not exist yet are taken
// from the Italian pack into a copy of content/, the copy is loaded with the server's own checks, and every
// form conflict and the curriculum are reported. Problems in a file taken from Italian are labelled as such.
//   node tools/check_pack.mjs ja
//   node tools/check_pack.mjs ja --only encounters/imp_coffee_greeting.yaml,vocabulary/gerald_coffee.yaml
// With --only, every other file of the pack is taken from Italian too, so files others are still writing do not
// get in the way. The Rift's Errata reviews the words of every other encounter: taken from Italian, it fails on a
// pack whose vocabulary is no longer Italian, and that failure is reported apart.
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { loadGameContent } from '../server/src/content-loader.js';
import { vocabularyFormConflicts } from '../server/src/language-engine.js';

const code = process.argv[2];
const onlyAt = process.argv.indexOf('--only');
const only = onlyAt > 0 ? new Set(String(process.argv[onlyAt + 1] ?? '').split(',').map((rel) => rel.trim()).filter(Boolean)) : null;
if (!code) { console.error('usage: node tools/check_pack.mjs <code>'); process.exit(2); }
const root = resolve(import.meta.dirname, '..', 'content');
const work = mkdtempSync(join(tmpdir(), `pack-${code}-`));
const content = join(work, 'content');
cpSync(root, content, { recursive: true });
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const italian = join(content, 'languages', 'it');
const pack = join(content, 'languages', code);
const borrowed = [];
if (only) {
  for (const file of walk(pack)) {
    const rel = relative(pack, file);
    if (rel !== 'language.yaml' && !only.has(rel)) rmSync(file);
  }
}
// Every pack is completed so (the loader reads the other packs' encounters too); only this pack's are reported.
for (const other of readdirSync(join(content, 'languages'))) {
  for (const file of walk(italian)) {
    const rel = relative(italian, file);
    const into = join(content, 'languages', other, rel);
    if (!existsSync(into)) { cpSync(file, into); if (other === code) borrowed.push(rel); }
  }
}
// Errata taken from Italian would name Italian words of other files: its stand-in keeps the Italian file but asks for
// the objectives of this pack's market entrance (its own words, whoever wrote them).
const erratumBorrowed = borrowed.includes('encounters/the_rift_errata.yaml');
if (erratumBorrowed) {
  const erratum = yaml.load(readFileSync(join(pack, 'encounters', 'the_rift_errata.yaml'), 'utf8'));
  const entrance = yaml.load(readFileSync(join(pack, 'encounters', 'market_entrance_tutorial.yaml'), 'utf8'));
  erratum.objectives = entrance.objectives;
  delete erratum.ambient_vocabulary_ids;
  writeFileSync(join(pack, 'encounters', 'the_rift_errata.yaml'), yaml.dump(erratum));
}
// Italian entries may cite a reference defined in another Italian file that this pack has replaced: those references
// are added to a file taken from Italian.
{
  const refsOf = (dir) => readdirSync(dir).flatMap((name) => yaml.load(readFileSync(join(dir, name), 'utf8')).references ?? []);
  const defined = new Set(refsOf(join(pack, 'vocabulary')).map((reference) => reference.id));
  const missing = refsOf(join(italian, 'vocabulary')).filter((reference) => !defined.has(reference.id));
  const host = borrowed.find((rel) => rel.startsWith('vocabulary/'));
  if (missing.length && host) {
    const file = yaml.load(readFileSync(join(pack, host), 'utf8'));
    file.references.push(...missing);
    writeFileSync(join(pack, host), yaml.dump(file));
  }
}
// Curriculum stages are played in order. When this pack has some stages and not others, the others are left out of the
// copy, skeleton and all, so the curriculum is this pack's stages alone (a stage written alongside the earlier ones
// defines every word it uses itself; the earlier stages' words are reused once all are written).
{
  const stages = (dir) => readdirSync(dir).filter((name) => name.endsWith('.yaml')).sort();
  const own = stages(join(pack, 'curriculum')).filter((name) => !borrowed.includes(`curriculum/${name}`));
  if (own.length) {
    for (const name of stages(join(pack, 'curriculum'))) {
      if (own.includes(name)) continue;
      rmSync(join(pack, 'curriculum', name));
      rmSync(join(content, 'curriculum', name), { force: true });
      for (const other of readdirSync(join(content, 'languages'))) rmSync(join(content, 'languages', other, 'curriculum', name), { force: true });
    }
  }
}
if (borrowed.length) console.log(`Not written yet, taken from Italian (${borrowed.length}): ${borrowed.join(', ')}`);
let failed = false;
try {
  const loaded = loadGameContent({ contentDir: content, language: code });
  console.log(`Pack loads: ${loaded.encounters.size} encounters, ${loaded.vocabulary.entries.length} market entries.`);
  const conflicts = vocabularyFormConflicts(loaded.vocabulary.entries);
  if (conflicts.length) { failed = true; console.log('Form conflicts (entry, form, read as):'); for (const c of conflicts) console.log(`  ${c.id} "${c.variant}" -> ${c.got.join(', ') || 'nothing'}`); }
  const curriculum = loaded.curriculum;
  if (curriculum) console.log(`Curriculum: ${curriculum.units.length} units, ${curriculum.lessonsById.size} lessons, ${curriculum.vocabulary.entries.length} entries.`);
} catch (error) {
  failed = true;
  const named = borrowed.filter((rel) => error.message.includes(rel.replace(/^.*\//, '').replace(/\.yaml$/, '')));
  console.log(`ERROR: ${error.message}${named.length ? `\n  (it names a file taken from Italian: ${named.join(', ')})` : ''}`);
}
rmSync(work, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
