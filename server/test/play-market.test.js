import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { languageShare } from '../scripts/play-market.js';

test('languageShare estimates the target-language share of an NPC line two ways', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  const share = languageShare('Vuoi un caffè? Senza latte, obviously.', 'Do you want a coffee? Without milk, obviously.', vocabulary.entries);
  assert.equal(share.tokens, 6);
  assert.equal(share.notInTranslation, 0.83);
  assert.equal(share.canonical, 0.5);
  assert.deepEqual(languageShare('', '', vocabulary.entries), { tokens: 0, notInTranslation: 0, canonical: 0 });
});
