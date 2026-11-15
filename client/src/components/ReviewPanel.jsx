import { useState } from 'react';
import PronounceButton from './PronounceButton.jsx';

export default function ReviewPanel({ challenge, result, language, isLoading, onSubmit, onReveal, onContinue, onReturn, returnLabel = 'Back to the temple' }) {
  const [answer, setAnswer] = useState('');
  if (result) return (
    <main className="review-panel" aria-label="Review feedback">
      <h2>Review feedback</h2>
      <p role="status">{result.feedback}</p>
      <p>Answer: <strong>{result.canonicalAnswer}</strong></p>
      <p>Quality {result.effectiveQuality}/5 · Next review: {new Date(result.nextReviewAt).toLocaleString()}</p>
      {result.xpGained > 0 && <p className="xp-line">+{result.xpGained} XP{result.levelUp ? ` · Level ${result.levelUp}` : ''}</p>}
      <div className="button-row">
        <button type="button" className="primary-button" onClick={onContinue}>Continue reviews</button>
        <button type="button" className="secondary-button" onClick={onReturn}>{returnLabel}</button>
      </div>
    </main>
  );
  if (!challenge) return <main className="review-panel"><p>No due review is available.</p><button type="button" className="secondary-button" onClick={onReturn}>{returnLabel}</button></main>;
  return (
    <main className="review-panel" aria-label={`${language?.name ?? 'Target-language'} vocabulary review`}>
      <p>{challenge.practice ? 'Optional practice (schedule will not change)' : `Due ${language?.name ?? 'target-language'}-to-English recall`}</p>
      <div className="review-prompt"><h2 lang={language?.tag}>{challenge.target}</h2><PronounceButton text={challenge.target} language={language} /></div>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(answer); }}>
        <label htmlFor="review-answer">English meaning</label>
        <input id="review-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={isLoading} autoComplete="off" />
        <div className="button-row">
          <button type="submit" className="primary-button" disabled={isLoading || !answer.trim()}>Check answer</button>
          <button type="button" className="secondary-button" disabled={isLoading} onClick={onReveal}>Show answer</button>
          <button type="button" className="text-button" onClick={onReturn}>{returnLabel}</button>
        </div>
      </form>
    </main>
  );
}
