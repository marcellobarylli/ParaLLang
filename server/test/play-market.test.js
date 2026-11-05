import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { glitchFold, languageShare, tourOrder } from '../scripts/play-market.js';

test('languageShare estimates the target-language share of an NPC line two ways', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  const share = languageShare('Vuoi un caffè? Senza latte, obviously.', 'Do you want a coffee? Without milk, obviously.', vocabulary.entries);
  assert.equal(share.tokens, 6);
  assert.equal(share.notInTranslation, 0.83);
  assert.equal(share.canonical, 0.5);
  assert.deepEqual(languageShare('', '', vocabulary.entries), { tokens: 0, notInTranslation: 0, folded: 0, translationShort: false, canonical: 0 });
  assert.equal(share.folded, 0.83, 'round 046: an Italian line reads the same folded');
});

// Round 046: glitched English is English once folded; a gloss instead of a translation is flagged.
test('the folded estimate reads Errata\'s glitched English as English and flags gloss translations', () => {
  assert.deepEqual(['procedùre', 'yoùù', 'ŧhe', 'hëre', 'errror', 'Cøntainment'].map((w) => glitchFold(w.toLowerCase())), ['procedure', 'you', 'the', 'here', 'eror', 'containment']);
  const errata = languageShare('Sono Errata. Cøntainment procedùre: yoùù sign hëre.', 'I am Errata. Containment procedure: you sign here.', []);
  assert.equal(errata.notInTranslation, 0.71, 'the old estimate counts the four glitched words as Italian (5 of 7)');
  assert.equal(errata.folded, 0.14, '"sono" is the one Italian word of seven');
  // Critique 1.1, 1.9: short words keep their letters (Spanish "al" is not English "all"); real double letters in a
  // target word against an English translation still count; a decomposed accent does not split a word.
  assert.equal(glitchFold('all'), 'all');
  assert.equal(languageShare('Vamos al mercado.', 'We all go to the market.', []).folded, 1);
  assert.equal(languageShare("Dopo vent'anni, il nonno.", 'After twenty years, grandpa.', []).folded, 1);
  assert.equal(languageShare('Procedu\u0300re: sign.', 'Procedure: sign.', []).folded, 0);
  // The length warning's boundary: 3 translation tokens for 5 line tokens is 60%, not short; 2 is.
  assert.equal(languageShare('uno dos tres cuatro cinco', 'one two three', []).translationShort, false);
  assert.equal(languageShare('uno dos tres cuatro cinco', 'one two', []).translationShort, true);
  const gloss = languageShare('Esta es la historia de Journathan, el hombre de muchas lenguas. ¿Adónde va?', '“¿Adónde va?” means “Where is he going?”', []);
  assert.equal(gloss.translationShort, true);
  assert.equal(gloss.folded, null);
  assert.equal(typeof gloss.notInTranslation, 'number', 'the old estimate is still reported');
});

test('the tour visits every encounter once, the Old Bookshop just before The Rift, whose gate lists the others', () => {
  for (const language of ['it', 'es']) {
    const { world } = loadGameContent({ language });
    const held = world.locations.filter((l) => l.encounter).map((l) => l.id);
    assert.deepEqual([...tourOrder].sort(), held.sort());
    assert.equal(tourOrder.at(-1), 'the_rift');
    assert.ok(world.neighbours.get(tourOrder.at(-2)).includes('the_rift'));
    assert.deepEqual([...world.locationsById.get('the_rift').requires_completed].sort(), tourOrder.slice(0, -1).map((id) => world.locationsById.get(id).encounter).sort());
  }
});
