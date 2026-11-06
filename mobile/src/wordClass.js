// Round 056 (backlog C6): the owner's note colours words by class, "R/G/B for noun/verb/adjective". Other classes
// (adverbs, numerals, interjections, pronouns, questions, phrases) stay uncoloured (decision 3).
const CLASS_OF = Object.freeze({ noun: 'noun', noun_phrase: 'noun', verb: 'verb', verb_phrase: 'verb', adjective: 'adjective' });

export function wordClass(partOfSpeech) {
  return CLASS_OF[partOfSpeech] ?? null;
}

// Shown on the chip / read by VoiceOver.
export const WORD_CLASS_LABEL = Object.freeze({ noun: 'noun', verb: 'verb', adjective: 'adj.' });
export const WORD_CLASS_NAME = Object.freeze({ noun: 'noun', verb: 'verb', adjective: 'adjective' });

// Round 059 (backlog C8): the class as text for the Spellbook and reviews: the class name for a coloured class,
// otherwise the part of speech with spaces ("prepositional phrase"); null when there is none.
export function wordClassText(partOfSpeech) {
  if (typeof partOfSpeech !== 'string' || !partOfSpeech) return null;
  const cls = wordClass(partOfSpeech);
  return { cls, text: cls ? WORD_CLASS_NAME[cls] : partOfSpeech.replaceAll('_', ' ') };
}

// Round 057 (backlog C7): the line split at the spans the server matched (UTF-16 offsets into the line), so each
// chip's word can be marked where it stands. Only well-formed spans count: integers inside the line, in order, not
// overlapping (decision 1). Lines saved before round 057 have no spans and come back as one plain segment.
export function segmentLine(native, words) {
  const text = String(native ?? '');
  const marks = (words ?? []).flatMap((word) => (Array.isArray(word.spans) ? word.spans : [])
    .filter((span) => Array.isArray(span) && Number.isInteger(span[0]) && Number.isInteger(span[1]) && span[0] >= 0 && span[0] < span[1] && span[1] <= text.length)
    .map(([start, end]) => ({ start, end, word })))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const segments = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) continue; // overlaps a mark already taken
    if (mark.start > cursor) segments.push({ text: text.slice(cursor, mark.start), word: null });
    segments.push({ text: text.slice(mark.start, mark.end), word: mark.word });
    cursor = mark.end;
  }
  if (cursor < text.length || !segments.length) segments.push({ text: text.slice(cursor), word: null });
  return segments;
}
