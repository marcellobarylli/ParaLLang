import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { languageShare, tourOrder } from '../scripts/play-market.js';

test('languageShare estimates the target-language share of an NPC line two ways', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  const share = languageShare('Vuoi un caffè? Senza latte, obviously.', 'Do you want a coffee? Without milk, obviously.', vocabulary.entries);
  assert.equal(share.tokens, 6);
  assert.equal(share.notInTranslation, 0.83);
  assert.equal(share.canonical, 0.5);
  assert.deepEqual(languageShare('', '', vocabulary.entries), { tokens: 0, notInTranslation: 0, canonical: 0 });
});

test('the tour visits every encounter once and ends next to The Rift, whose gate it opens', () => {
  for (const language of ['it', 'es']) {
    const { world } = loadGameContent({ language });
    const held = world.locations.filter((l) => l.encounter).map((l) => l.id);
    assert.deepEqual([...tourOrder].sort(), held.sort());
    assert.ok(world.neighbours.get(tourOrder.at(-1)).includes('the_rift'));
    assert.deepEqual([...world.locationsById.get('the_rift').requires_completed].sort(), tourOrder.map((id) => world.locationsById.get(id).encounter).sort());
  }
});
