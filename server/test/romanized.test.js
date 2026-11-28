// Round 223: Japanese in rōmaji and Chinese in pinyin, the fourth and fifth languages. The owner: no Japanese or
// Chinese script for now, so every pack file is in Latin letters, and the prompts tell the model so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { resolveTargetLanguages, saveDirForLanguage } from '../src/config.js';
import { matchCanonicalVocabulary, vocabularyFormConflicts } from '../src/language-engine.js';
import { buildGradingMessages, buildNarrationMessages } from '../src/llm/prompt-builder.js';

const PACKS = { ja: { name: 'Japanese', tag: 'ja-JP', writing: /Hepburn rōmaji/ }, zh: { name: 'Chinese', tag: 'zh-CN', writing: /Hanyu Pinyin with tone marks/ } };
const italian = loadGameContent({ language: 'it' });
// Kana, kanji, hanzi, CJK punctuation and full-width forms.
const SCRIPT = /[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]/u;
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));

for (const [code, expected] of Object.entries(PACKS)) {
  test(`the ${expected.name} pack loads whole, mirrors the others, and shares no form between two entries`, () => {
    const content = loadGameContent({ language: code });
    assert.equal(content.language.code, code);
    assert.equal(content.language.name, expected.name);
    assert.equal(content.language.tag, expected.tag);
    assert.match(content.language.writing, expected.writing);
    assert.deepEqual(vocabularyFormConflicts(content.vocabulary.entries), []);
    assert.deepEqual([...content.encounters.keys()].sort(), [...italian.encounters.keys()].sort(), 'the same encounters as the other packs');
    assert.deepEqual(content.curriculum.units.map((unit) => unit.id), italian.curriculum.units.map((unit) => unit.id), 'the same curriculum');
  });

  test(`the ${expected.name} pack has no Japanese or Chinese script and no Italian`, () => {
    const dir = resolve(import.meta.dirname, '..', '..', 'content', 'languages', code);
    for (const file of walk(dir)) {
      const text = readFileSync(file, 'utf8');
      const at = text.search(SCRIPT);
      assert.equal(at, -1, `${file}: script at ${text.slice(Math.max(0, at - 20), at + 20)}`);
      for (const word of ['caffè', 'grazie', 'Treccani', '-it-v1']) assert.ok(!text.includes(word), `${file}: ${word}`);
    }
  });

  test(`${expected.name} prompts carry the writing rule; the other packs' prompts are as before`, () => {
    for (const each of [code, 'it']) {
      const content = loadGameContent({ language: each });
      const shared = { language: content.language, objectives: content.encounter.objectives, vocabularyById: content.vocabularyById };
      const narration = buildNarrationMessages({ ...shared, character: content.character, styleGuide: content.styleGuide, locationName: 'The Coffee Cart', targetRatio: 0.3 })[0].content;
      const grading = buildGradingMessages({ ...shared, conversationContext: [], playerInput: 'Hello' })[0].content;
      const beginner = buildGradingMessages({ ...shared, conversationContext: [], playerInput: 'Hello', beginner: true })[0].content;
      for (const prompt of [narration, grading, beginner]) {
        if (each === code) assert.ok(prompt.includes(`- WRITING: ${content.language.writing}`), `${each} prompt carries the rule`);
        else assert.doesNotMatch(prompt, /WRITING:/);
        assert.doesNotMatch(prompt, /\{\{/);
      }
      if (each === code) assert.match(narration, /LANGUAGE RULES:\n- WRITING: /);
    }
  });
}

test('rōmaji and pinyin are matched without their marks, and in the other common spellings', () => {
  const entries = [
    { id: 'kohi', surface_variants: ['kōhī', 'koohii', 'kouhii'] },
    { id: 'arigato', surface_variants: ['arigatō', 'arigatou'] },
    { id: 'kafei', surface_variants: ['kāfēi', 'kā fēi'] },
    { id: 'lu_cha', surface_variants: ['lǜ chá', 'lv cha'] },
  ];
  const ids = (text) => matchCanonicalVocabulary(text, entries).map((match) => match.id);
  assert.deepEqual(ids('Kohi o kudasai.'), ['kohi'], 'no macrons typed');
  assert.deepEqual(ids('Koohii, arigatou!'), ['kohi', 'arigato']);
  assert.deepEqual(ids('Wo yao kafei.'), ['kafei'], 'no tone marks typed');
  assert.deepEqual(ids('Yì bēi kā fēi'), ['kafei']);
  assert.deepEqual(ids('lu cha'), ['lu_cha'], 'ü typed as u');
  assert.deepEqual(ids('lv cha'), ['lu_cha'], 'ü typed as v');
  const [coffee] = matchCanonicalVocabulary('Kōhī o!', entries);
  assert.equal(coffee.excerpt, 'Kōhī', 'the excerpt is the source text');
});

test('the hosted server plays five languages, Italian first', () => {
  assert.deepEqual(resolveTargetLanguages({ TARGET_LANGUAGE: 'it', TARGET_LANGUAGES: 'it,fr,es,ja,zh' }), ['it', 'fr', 'es', 'ja', 'zh']);
  assert.equal(saveDirForLanguage('/saves', 'ja'), '/saves/ja');
  assert.equal(saveDirForLanguage('/saves', 'zh'), '/saves/zh');
  for (const file of ['Dockerfile', 'render.yaml']) {
    assert.match(readFileSync(resolve(import.meta.dirname, '..', '..', file), 'utf8'), /it,fr,es,ja,zh/, file);
  }
});
