// Round 082: the answer check for authored target-language text the Spellbook or the map shows during encounters
// (inscriptions); round 083: fragments of The Journey too. A module, not a test file (`node --test test/*.test.js`).
import { foldWords } from '../src/content-loader.js';

// Checked false positives, one list per surface (round 083, critique 1.3), each word with its reason:
// es "las" is the article in "son las"; it/es "una" the article in "È l'una" / "es la una" (the phrases stay caught
// as pack forms); es "quien" shares its first four letters with "quieto" and "quiero" only.
export const ALLOWED = Object.freeze({
  inscriptions: Object.freeze({ it: [], es: ['las', 'quien'] }),
  fragments: Object.freeze({ it: ['una'], es: ['una', 'las', 'quien'] }),
});

const words = (inscription) => foldWords([inscription.text, ...inscription.glossary.map((g) => g.word)].join(' ')).trim().split(' ');
const meaningKey = (meaning) => meaning.replace(/\([^)]*\)/g, ' ').trim().toLowerCase().replace(/^to /, '').replace(/\s+/g, ' ').trim();

// Every way an inscription could hand over an answer: a pack form, a word or 4-letter stem of any objective target's
// forms (every target, location and party), or a glossary meaning that is a target's accepted translation.
export function answerLeaks(content, inscription, allowed = []) {
  const body = foldWords([inscription.text, ...inscription.glossary.map((g) => g.word)].join(' '));
  const forms = content.vocabulary.entries.flatMap((entry) => entry.surface_variants.map((form) => [entry.id, foldWords(form)]));
  const targetIds = [...new Set([...content.encounters.values()].flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids)))];
  const targetWords = [...new Set(targetIds.flatMap((id) => content.vocabularyById.get(id).surface_variants)
    .flatMap((form) => foldWords(form).trim().split(' ')).filter((word) => word.length >= 3))];
  const meanings = new Set(targetIds.flatMap((id) => content.vocabularyById.get(id).accepted_translations.map(meaningKey)));
  const own = words(inscription).filter((word) => !allowed.includes(word));
  return {
    forms: [...new Set(forms.filter(([, form]) => body.includes(form)).map(([id]) => id))],
    targetWords: targetWords.filter((target) => own.some((word) => word === target
      || (target.length >= 4 && word.length >= 4 && word.slice(0, 4) === target.slice(0, 4)))),
    meanings: inscription.glossary.filter((entry) => entry.meaning.split(/[,;]/).some((m) => meanings.has(meaningKey(m)))).map((entry) => entry.word),
  };
}

