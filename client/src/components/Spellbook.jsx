import PronounceButton from './PronounceButton.jsx';

// Round 103 (round 017's rule, as the app keeps it): no meanings while an encounter is under way or on a due card
// (its review asks for them), and no Review in an encounter (the server refuses it).
// Round 104 (review R1.6): a card that fell due while the Spellbook is open is hidden too; Review waits for the server.
const dueNow = (card) => card.due || Date.parse(card.nextReviewAt) <= Date.now();

export default function Spellbook({ spellbook, language, isLoading, onReview, onReturn }) {
  const inEncounter = Boolean(spellbook.inEncounter);
  return (
    <main className="spellbook" aria-label="Spellbook">
      <div className="panel-heading">
        <div><h2>Spellbook</h2><p>{spellbook.dueCount} due for review</p></div>
        <button type="button" className="secondary-button" onClick={onReturn}>Return to Gerald</button>
      </div>
      {inEncounter && spellbook.cards.length > 0 && <p className="empty-state">Meanings are hidden and reviews wait while an encounter is under way.</p>}
      {spellbook.cards.length === 0 ? (
        <section className="empty-state"><h3>No vocabulary yet</h3><p>Words and phrases appear here after you encounter them.</p></section>
      ) : (
        <div className="card-grid">
          {spellbook.cards.map((card) => (
            <article className="vocabulary-card" key={card.vocabularyId}>
              <div className="card-title"><h3 lang={language?.tag}>{card.target}</h3><PronounceButton text={card.target} language={language} /></div>
              <p>{inEncounter || dueNow(card) || !card.meanings ? <em>Meaning hidden</em> : card.meanings.join(' · ')}</p>
              <p><small>{card.partOfSpeech.replaceAll('_', ' ')} · Mastery: <strong>{card.mastery}</strong></small></p>
              <p><small>{card.due ? 'Due now' : `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`}</small></p>
              {card.due && !inEncounter && <button type="button" className="primary-button" disabled={isLoading} onClick={() => onReview(card.vocabularyId)}>Review</button>}
            </article>
          ))}
        </div>
      )}
      {!inEncounter && spellbook.cards.length > 0 && spellbook.dueCount === 0 && <p className="empty-state">Nothing is due. Your next review times are shown on each card.</p>}
    </main>
  );
}
