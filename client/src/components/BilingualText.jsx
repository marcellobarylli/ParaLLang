import { pairSentences } from '../sentences.js';
import SentenceText from './SentenceText.jsx';

export default function BilingualText({ message, language, onHelp, disabled = false }) {
  const { dialogue, protected: isProtected } = message;
  const pairs = pairSentences(dialogue.native, dialogue.translation); // round 142: matched sentences share a colour
  return (
    <div className="bilingual-text">
      <SentenceText className="native-line" lang={language?.tag} text={dialogue.native} sentences={pairs?.native} />
      {/* Round 149: the translation stands directly under the line, with nothing between them; the words come after. */}
      {dialogue.translation ? (
        <SentenceText className="translation" role="status" text={dialogue.translation} sentences={pairs?.translation} />
      ) : (
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onHelp({ kind: 'sentence', messageId: message.id })}
        >
          Translate sentence
        </button>
      )}
      <div className="word-actions" aria-label="Word translations">
        {dialogue.words.map((word) => (
          <div className="word-help" key={word.vocabularyId}>
            <button
              type="button"
              className="text-button"
              disabled={disabled || Boolean(word.meaning)}
              onClick={() => onHelp({ kind: 'word', messageId: message.id, vocabularyId: word.vocabularyId })}
              aria-label={`Translate word: ${word.canonicalTarget}`}
            >
              <span lang={language?.tag}>{word.canonicalTarget}</span>
            </button>
            {word.meaning && <span role="status"> — {word.meaning} <small>({word.partOfSpeech.replaceAll('_', ' ')})</small></span>}
          </div>
        ))}
      </div>
      {isProtected && <small className="protected-note">{dialogue.translation ? 'Word translations use your companion hint allowance.' : 'Active-message translations use your companion hint allowance.'}</small>}
    </div>
  );
}
