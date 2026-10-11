import PronounceButton from './PronounceButton.jsx';

export default function Spellbook({ spellbook, isLoading, onReview, onReturn }) {
  return (
    <main className="spellbook" aria-label="Spellbook">
      <div className="panel-heading">
        <div><h2>Spellbook</h2><p>{spellbook.dueCount} due for review</p></div>
        <button type="button" className="secondary-button" onClick={onReturn}>Return to Gerald</button>
      </div>
      {spellbook.cards.length === 0 ? (
        <section className="empty-state"><h3>No vocabulary yet</h3><p>Words and phrases appear here after you encounter them.</p></section>
      ) : (
        <div className="card-grid">
          {spellbook.cards.map((card) => (
            <article className="vocabulary-card" key={card.vocabularyId}>
              <div className="card-title"><h3 lang="es">{card.spanish}</h3><PronounceButton text={card.spanish} /></div>
              <p>{card.meanings.join(' · ')}</p>
              <p><small>{card.partOfSpeech.replaceAll('_', ' ')} · Mastery: <strong>{card.mastery}</strong></small></p>
              <p><small>{card.due ? 'Due now' : `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`}</small></p>
              {card.due && <button type="button" className="primary-button" disabled={isLoading} onClick={() => onReview(card.vocabularyId)}>Review</button>}
            </article>
          ))}
        </div>
      )}
      {spellbook.cards.length > 0 && spellbook.dueCount === 0 && <p className="empty-state">Nothing is due. Your next review times are shown on each card.</p>}
    </main>
  );
}
