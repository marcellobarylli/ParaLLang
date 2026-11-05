// Round 056 (backlog C6): the owner's note colours words by class, "R/G/B for noun/verb/adjective". Other classes
// (adverbs, numerals, interjections, pronouns, questions, phrases) stay uncoloured (decision 3).
const CLASS_OF = Object.freeze({ noun: 'noun', noun_phrase: 'noun', verb: 'verb', verb_phrase: 'verb', adjective: 'adjective' });

export function wordClass(partOfSpeech) {
  return CLASS_OF[partOfSpeech] ?? null;
}

// Shown on the chip / read by VoiceOver.
export const WORD_CLASS_LABEL = Object.freeze({ noun: 'noun', verb: 'verb', adjective: 'adj.' });
export const WORD_CLASS_NAME = Object.freeze({ noun: 'noun', verb: 'verb', adjective: 'adjective' });
