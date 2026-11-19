// Round 126: every character sheet says how the character sounds, and the encounter carries it to the client.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';

const KINDS = new Set(['female', 'male', 'creature', 'funny']);

for (const language of ['it', 'es']) {
  test(`${language}: every character has a voice of a known kind, with a pitch and a rate on the browser's scales`, () => {
    const content = loadGameContent({ language });
    const characters = new Map([...content.encounters.values()].map(({ character }) => [character.id, character]));
    assert.equal(characters.size, 7);
    for (const character of characters.values()) {
      assert.ok(character.voice, `${character.name} has a voice`);
      assert.ok(KINDS.has(character.voice.kind), `${character.name}: ${character.voice.kind}`);
      assert.ok(character.voice.pitch >= 0 && character.voice.pitch <= 2, `${character.name} pitch`);
      assert.ok(character.voice.rate >= 0.5 && character.voice.rate <= 2, `${character.name} rate`);
    }
    // The four kinds are all in use, and no two characters sound alike.
    assert.deepEqual(new Set([...characters.values()].map((character) => character.voice.kind)), KINDS);
    const sounds = [...characters.values()].map(({ voice }) => `${voice.kind}:${voice.pitch}:${voice.rate}`);
    assert.equal(new Set(sounds).size, sounds.length);
  });
}
