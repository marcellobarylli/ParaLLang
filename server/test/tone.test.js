// Round 128: the owner dropped the meme-culture texture ("get rid of the gen z speak"). Nothing the model is told
// about tone or about a character, and no authored English line a player reads, may hold internet slang or a meme
// format. Memes as lore (life forms in a language, infohazards, the Fountain's "Brainrot" file) are not slang.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';

// Internet register and meme formats. Whole words, case-insensitive ("mid" alone, not "middle" or "mid-sentence").
const SLANG = /\b(mid|lowkey|low-key|highkey|vibes?|no notes|influencer|tl;dr|spoilers?|slay|cringe|sus|bestie|iconic|ratio(?:'d|ed)|goated|deadass|no cap|rizz|based|unhinged|chronically online|touch grass|so random|endless feed|main character|rent[- ]free|hits different|[a-z]+-tier|meme[- ]culture|internet register)(?![\w-])|\b(?:POV|Nobody):/i;

const strings = (value, path = '') => (typeof value === 'string' ? [[path, value]]
  : Array.isArray(value) ? value.flatMap((item, i) => strings(item, `${path}[${i}]`))
    : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key)) : []);

for (const language of ['it', 'es']) {
  test(`${language}: the style guide, the character sheets and the encounters' English hold no internet slang`, () => {
    const content = loadGameContent({ language });
    const found = [];
    const scan = (label, value) => { for (const [path, text] of strings(value)) { const hit = text.match(SLANG); if (hit) found.push(`${label} ${path}: "${hit[0]}"`); } };
    scan('style guide', content.styleGuide);
    for (const { encounter, character } of content.encounters.values()) {
      scan(character.name, character);
      // The authored English of an encounter: its resolved line, briefing, objective prompts and intents.
      scan(encounter.id, { resolved: encounter.resolved_message, briefing: encounter.companion_briefing, objectives: encounter.objectives.map(({ prompt, intent }) => ({ prompt, intent })) });
    }
    assert.deepEqual(found, []);
  });
}

test('the style guide names the manner and keeps the footnote', () => {
  const { styleGuide } = loadGameContent({ language: 'it' });
  assert.match(styleGuide.tone, /Terry Pratchett/);
  assert.match(styleGuide.tone, /never his words or his characters/);
  assert.ok(styleGuide.rules.some((rule) => /No internet slang, meme formats or references to the present day/.test(rule)));
  assert.ok(styleGuide.rules.some((rule) => /The narrator may add a footnote/.test(rule) && /dry aside/.test(rule) && !/meme/.test(rule)));
});

test('the word list catches the old wording and leaves the lore alone', () => {
  for (const old of ['calling something mid or a whole vibe', 'lowkey judging', 'a ham-tier vibe', 'like an influencer', 'no spoilers, tl;dr', 'POV: you are a coffee cart', 'the narrator getting ratioed']) assert.match(old, SLANG, old);
  for (const fine of ['Brainrot (mild)', 'a meme is a life form', 'in the middle of the market', 'stops mid-sentence', 'Certified Ham, First Class', 'the ratio of Italian', 'amid the roots', 'No internet slang, meme formats or references to the present day']) {
    assert.doesNotMatch(fine, SLANG, fine);
  }
});
