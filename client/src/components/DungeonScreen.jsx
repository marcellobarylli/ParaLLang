import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DungeonView from './DungeonView.jsx';
import DialoguePanel from './DialoguePanel.jsx';
import InputBar from './InputBar.jsx';
import Spellbook from './Spellbook.jsx';
import ReviewPanel from './ReviewPanel.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import { dockInsets } from '../scene/insets.js';

// Round 115: the web client's one screen, the dungeon. The level fills the screen; over it lie the top bar and the
// dock, which holds the panel of the current phase: the title (attract), the route (overview), a caption while the
// camera travels, the dialogue sheet (encounter) and the victory card. The dock is a bottom sheet on a phone and,
// for the dialogue, a side panel from 1100 px. The camera frames what the dock leaves free (useInsets).
const NO_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
const sameInsets = (a, b) => ['top', 'right', 'bottom', 'left'].every((side) => Math.abs(a[side] - b[side]) < 1);

function useInsets(hudRef, dockRef) {
  const [insets, setInsets] = useState(NO_INSETS);
  useLayoutEffect(() => {
    const measure = () => {
      const top = hudRef.current?.getBoundingClientRect?.().bottom ?? 0;
      const next = dockInsets(dockRef.current?.getBoundingClientRect?.(), window.innerWidth, window.innerHeight, top);
      setInsets((previous) => (sameInsets(previous, next) ? previous : next));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (dockRef.current) observer?.observe(dockRef.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [hudRef, dockRef]);
  return insets;
}

function SiteNumber({ index }) {
  return <span className="site-number" aria-hidden="true">{index + 1}</span>;
}

function TitleCard({ state }) {
  const { dungeon, language, connection, serverProblem } = state;
  return (
    <section className="card title-card">
      <p className="eyebrow">The dead branch · {dungeon.name}</p>
      <h1>ParaLLang</h1>
      <p>Three stand between you and the sanctuary. Each lets you pass when you answer in {language?.name ?? 'their language'}.</p>
      <button type="button" className="primary-button big-button" onClick={state.enter}>Enter</button>
      {connection === 'connecting' && <p className="connection-note" role="status">Waking the server…</p>}
      {connection === 'offline' && serverProblem && <p className="connection-note">The server is not connected yet. You can still look around.</p>}
    </section>
  );
}

function OverviewCard({ state, cleared }) {
  const { dungeon, connection, serverProblem, starting } = state;
  const label = starting ? (connection === 'ready' ? 'Starting…' : 'Waking the server…') : cleared.length > 0 ? 'Continue' : 'Start';
  return (
    <section className="card overview-card" aria-label="The route">
      <p className="eyebrow">The route</p>
      <h2>{dungeon.name}</h2>
      <ol className="site-list">
        {dungeon.sites.map((site, index) => {
          const done = cleared.includes(site.encounterId);
          return (
            <li key={site.encounterId} className={done ? 'cleared' : undefined}>
              <SiteNumber index={index} />
              <span className="site-text"><strong>{site.name}</strong>{site.characterName && <small>{site.characterName}</small>}</span>
              {done && <span className="site-done">cleared</span>}
            </li>
          );
        })}
      </ol>
      {serverProblem && (
        <div className="problem" role="alert">
          <p>{serverProblem}</p>
          <button type="button" className="secondary-button" onClick={state.openSettings}>Open Settings</button>
        </div>
      )}
      <button type="button" className="primary-button big-button" onClick={state.start} disabled={starting}>{label}</button>
    </section>
  );
}

function TravelCaption({ state, site }) {
  const { phase, cameraArrived, siteError } = state;
  if (siteError) {
    return (
      <section className="caption caption-problem" role="alert">
        <span>{siteError}</span>
        <button type="button" className="secondary-button" onClick={state.retrySite}>Try again</button>
      </section>
    );
  }
  const text = cameraArrived
    ? `${site?.characterName ?? 'Someone'} is getting ready to talk…`
    : `${phase === 'walk' ? 'Walking to' : 'Approaching'} ${site?.name ?? 'the next site'}…`;
  return <section className="caption" role="status">{text}</section>;
}

function EncounterSheet({ state, site, nextSite }) {
  const { encounter, assessment, language, isLoading, encounterLoading } = state;
  const scrollRef = useRef(null);
  const resolved = encounter?.state === 'resolved';
  const name = encounter?.character?.name ?? site?.characterName ?? 'them';
  // A conversation opens at its top (the objective, the briefing, the first line); each turn scrolls to its end.
  const fresh = encounter?.committedPlayerTurns === 0 && !assessment && !isLoading;
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = fresh ? 0 : element.scrollHeight;
  }, [encounter?.id, encounter?.transcript, assessment, isLoading, resolved, fresh]);
  return (
    <section className="sheet" aria-label={site?.name ?? 'Conversation'}>
      <header className="sheet-header">
        <SiteNumber index={state.siteIndex} />
        <span className="site-text"><strong>{site?.name}</strong><small>{name}</small></span>
        {!resolved && <button type="button" className="text-button" onClick={state.restartSite} disabled={isLoading || encounterLoading}>Start over</button>}
      </header>
      <div className="sheet-scroll" ref={scrollRef}>
        <DialoguePanel encounter={encounter} language={language} isLoading={isLoading} onHelp={state.revealHelp} />
        {assessment && (
          <section className="assessment-banner" aria-live="polite">
            <strong>Assessment</strong><p>{assessment.overallFeedback}</p>
            {assessment.objectiveResults.map((result) => <p key={result.objectiveId}>{result.passed ? '✓' : '→'} {result.feedback}</p>)}
          </section>
        )}
        {resolved && (
          <section className="victory-banner" role="status">
            <p>{encounter.resolvedMessage ?? `${name} lets you pass.`}</p>
            <button type="button" className="primary-button big-button" onClick={state.walkOn}>{nextSite ? `Walk on to ${nextSite.name}` : 'Leave the temple'}</button>
          </section>
        )}
      </div>
      {!resolved && (
        <InputBar value={state.draft} onChange={state.setDraft} onSend={state.sendMessage} name={name} loading={isLoading} disabled={isLoading || encounterLoading || !encounter} />
      )}
    </section>
  );
}

function VictoryCard({ state }) {
  const { dungeon, spellbook, isLoading } = state;
  const words = spellbook.cards.length;
  return (
    <section className="card victory-card" role="status">
      <p className="eyebrow">{dungeon.name}</p>
      <h2>Dungeon cleared</h2>
      <p>All {dungeon.sites.length} let you pass.{words > 0 && ` Your Spellbook holds ${words} ${words === 1 ? 'entry' : 'words and phrases'}.`}</p>
      <div className="button-row">
        <button type="button" className="primary-button big-button" onClick={state.playAgain} disabled={isLoading}>Play again</button>
        <button type="button" className="secondary-button big-button" onClick={state.openSpellbook}>Spellbook</button>
      </div>
    </section>
  );
}

export default function DungeonScreen({ useStore }) {
  const state = useStore();
  const { initialize, dungeon, phase, siteIndex, progress } = state;
  useEffect(() => { initialize(); }, [initialize]);
  const hudRef = useRef(null);
  const dockRef = useRef(null);
  const insets = useInsets(hudRef, dockRef);
  const cleared = progress?.clearedEncounterIds ?? [];
  const site = dungeon.sites[siteIndex];
  const nextSite = dungeon.sites[siteIndex + 1] ?? null;
  const inEncounter = phase === 'encounter';
  const returnLabel = inEncounter ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the temple';
  // Meanings stay hidden while a conversation is open or opening, whatever the snapshot says (round 017; review 1, R1.4).
  const conversing = state.encounter?.state === 'ongoing' || state.encounterLoading;
  const spellbook = conversing && !state.spellbook.inEncounter ? { ...state.spellbook, inEncounter: true } : state.spellbook;

  return (
    <div className={`app-shell phase-${phase}`}>
      <DungeonView dungeon={dungeon} phase={phase} siteIndex={siteIndex} walkFrom={state.walkFrom} cleared={cleared} insets={insets} onArrive={state.onCameraArrived} />

      <header className="hud" ref={hudRef}>
        <div className="hud-title"><strong>ParaLLang</strong><span>{dungeon.name}</span></div>
        <ol className="pips" aria-label={`${cleared.length} of ${dungeon.sites.length} sites cleared`}>
          {dungeon.sites.map((entry, index) => (
            <li key={entry.encounterId} className={cleared.includes(entry.encounterId) ? 'done' : (phase !== 'attract' && phase !== 'overview' && phase !== 'victory' && index === siteIndex ? 'current' : undefined)} />
          ))}
        </ol>
        <nav aria-label="Menu">
          <button type="button" className="secondary-button" onClick={state.openSpellbook}>
            Spellbook <span className="due-badge" aria-label={`${state.spellbook.dueCount} reviews due`}>{state.spellbook.dueCount}</span>
          </button>
          <button type="button" className="secondary-button" onClick={state.openSettings} aria-label="Settings">⚙</button>
        </nav>
      </header>

      {state.error && <div className="error-banner" role="alert"><span>{state.error}</span><button type="button" onClick={state.clearError} aria-label="Dismiss error">×</button></div>}

      <div className="dock" ref={dockRef}>
        {phase === 'attract' && <TitleCard state={state} />}
        {phase === 'overview' && <OverviewCard state={state} cleared={cleared} />}
        {(phase === 'approach' || phase === 'walk') && <TravelCaption state={state} site={site} />}
        {inEncounter && <EncounterSheet state={state} site={site} nextSite={nextSite} />}
        {phase === 'victory' && <VictoryCard state={state} />}
      </div>

      {state.view !== 'dialogue' && (
        <div className="overlay">
          {state.view === 'spellbook' && <Spellbook spellbook={spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'review' && <ReviewPanel
            key={state.reviewChallenge?.id ?? 'result'}
            challenge={state.reviewChallenge} result={state.reviewResult} language={state.language} isLoading={state.isLoading}
            onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
            onContinue={() => state.startReview()} onReturn={state.returnToDialogue} returnLabel={returnLabel}
          />}
        </div>
      )}

      {state.settingsOpen && <SettingsSheet settings={state.settings} onSave={state.saveSettings} onClose={state.closeSettings} />}
    </div>
  );
}
