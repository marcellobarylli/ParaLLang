import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore.js';
import DialoguePanel from './components/DialoguePanel.jsx';
import InputBar from './components/InputBar.jsx';
import Spellbook from './components/Spellbook.jsx';
import ReviewPanel from './components/ReviewPanel.jsx';

export default function App() {
  const state = useGameStore();
  useEffect(() => { state.initialize(); }, [state.initialize]);
  const resolved = state.encounter?.state === 'resolved';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div><h1>ParaLLang</h1><p>The Crumbling Market — The Coffee Cart</p></div>
        <nav aria-label="Learning navigation">
          <button type="button" className="secondary-button" onClick={state.openSpellbook}>
            Spellbook <span className="due-badge" aria-label={`${state.spellbook.dueCount} reviews due`}>{state.spellbook.dueCount}</span>
          </button>
          <button type="button" className="text-button" onClick={state.restartEncounter} disabled={state.isLoading}>Restart encounter</button>
        </nav>
      </header>

      {state.error && <div className="error-banner" role="alert"><span>{state.error}</span><button type="button" onClick={state.clearError} aria-label="Dismiss error">×</button></div>}

      {state.view === 'spellbook' && <Spellbook spellbook={state.spellbook} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} />}
      {state.view === 'review' && <ReviewPanel
        challenge={state.reviewChallenge} result={state.reviewResult} isLoading={state.isLoading}
        onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
        onContinue={() => state.startReview()} onReturn={state.returnToDialogue}
      />}
      {state.view === 'dialogue' && <>
        <DialoguePanel encounter={state.encounter} isLoading={state.isLoading} onHelp={state.revealHelp} />
        {state.assessment && <section className="assessment-banner" aria-live="polite">
          <strong>Assessment</strong><p>{state.assessment.overallFeedback}</p>
          {state.assessment.objectiveResults.map((result) => <p key={result.objectiveId}>{result.passed ? '✓' : '→'} {result.feedback}</p>)}
        </section>}
        {resolved && <section className="victory-banner" role="status">Gerald grudgingly approves. The coffee order is complete.</section>}
        <InputBar
          value={state.draft} onChange={state.setDraft} onSend={state.sendMessage}
          loading={state.isLoading} resolved={resolved} disabled={state.isLoading || !state.encounter || resolved}
        />
      </>}
    </div>
  );
}
