import { SENTENCE_COLOURS } from '../sentences.js';

/**
 * A line as coloured sentences. `sentences` is the matched list from `pairSentences` (or null: the text shows plain).
 * The same index in the line and in its translation gets the same colour.
 */
export default function SentenceText({ text, sentences = null, className = undefined, lang = undefined, role = undefined }) {
  return (
    <p className={className} lang={lang} role={role}>
      {sentences
        ? sentences.map((sentence, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className="sentence" data-sentence={index % SENTENCE_COLOURS.length}>{index > 0 ? ' ' : ''}{sentence}</span>
        ))
        : text}
    </p>
  );
}
