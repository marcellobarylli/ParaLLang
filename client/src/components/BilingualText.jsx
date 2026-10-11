export default function BilingualText({ message, onHelp, disabled = false }) {
  const { dialogue, protected: isProtected } = message;
  return (
    <div className="bilingual-text">
      <p className="native-line">{dialogue.native}</p>
      <div className="word-actions" aria-label="Word translations">
        {dialogue.words.map((word) => (
          <div className="word-help" key={word.vocabularyId}>
            <button
              type="button"
              className="text-button"
              disabled={disabled || Boolean(word.meaning)}
              onClick={() => onHelp({ kind: 'word', messageId: message.id, vocabularyId: word.vocabularyId })}
              aria-label={`Translate word: ${word.canonicalSpanish}`}
            >
              {word.canonicalSpanish}
            </button>
            {word.meaning && <span role="status"> — {word.meaning} <small>({word.partOfSpeech.replaceAll('_', ' ')})</small></span>}
          </div>
        ))}
      </div>
      {dialogue.translation ? (
        <p className="translation" role="status">{dialogue.translation}</p>
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
      {isProtected && <small className="protected-note">Active-message translations use your companion hint allowance.</small>}
    </div>
  );
}
