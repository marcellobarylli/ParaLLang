import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DungeonView from './DungeonView.jsx';
import DialoguePanel from './DialoguePanel.jsx';
import InputBar from './InputBar.jsx';
import Spellbook from './Spellbook.jsx';
import ReviewPanel from './ReviewPanel.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import { dockInsets } from '../scene/insets.js';
import { siteStatesOf } from '../stores/gameStore.js';
import { neighbourIds } from '../dungeonModel.js';

// Round 115: the web client's one screen, the dungeon. The level fills the screen; over it lie the top bar and the
// dock, which holds the panel of the current phase: the title (attract), the world map (world), the temple map
// (overview), a caption while the camera travels, the dialogue sheet (encounter), the site card (site) and the
// victory card. The dock is a bottom sheet on a phone and, for the dialogue, a side panel from 1100 px. The camera
// frames what the dock leaves free (useInsets).
// Round 119: the dungeon is a map. The player picks where to walk: on the temple map, on the site card, or after a
// conversation. The server says which sites are out of the fog and which can be walked to (progress.sites).
const NO_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
const sameInsets = (a, b) => ['top', 'right', 'bottom', 'left'].every((side) => Math.abs(a[side] - b[side]) < 1);

function useInsets(hudRef, dockRef) {
  const [insets, setInsets] = useState(NO_INSETS);
  useLayoutEffect(() => {
    const measure = () => {
      const top = hudRef.current?.getBoundingClientRect?.().bottom ?? 0;
      // Round 117: the screen is the shell's rectangle. In the installed page on iOS the window reports less height.
      const shell = dockRef.current?.closest?.('.app-shell')?.getBoundingClientRect?.();
      const [width, height] = shell?.height > 0 ? [shell.width, shell.height] : [window.innerWidth, window.innerHeight];
      const next = dockInsets(dockRef.current?.getBoundingClientRect?.(), width, height, top);
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
      <p>{dungeon.sites.length} stand between you and the sanctuary. Each lets you pass when you answer in {language?.name ?? 'their language'}.</p>
      <button type="button" className="primary-button big-button" onClick={state.enter}>Enter</button>
      {connection === 'connecting' && <p className="connection-note" role="status">Waking the server…</p>}
      {connection === 'offline' && serverProblem && <p className="connection-note">The server is not connected yet. You can still look around.</p>}
    </section>
  );
}

// Round 119: the world map. Places and the paths between them, as far as the fog allows; the place the player is at
// can be entered, the others say why not.
function WorldCard({ state, cleared }) {
  const { atlas, dungeon } = state;
  const places = atlas?.places ?? [{ id: dungeon.id, name: dungeon.name, state: 'current', map: { x: 0.5, y: 0.5 }, description: '', dungeonId: dungeon.id, closed: null }];
  const byId = new Map(places.map((place) => [place.id, place]));
  const open = places.find((place) => place.dungeonId === dungeon.id);
  return (
    <section className="card world-card" aria-label="The world map">
      <p className="eyebrow">The world</p>
      <h2>Where to</h2>
      <svg className="world-map" viewBox="0 0 100 60" role="img" aria-label={`A map of ${places.length} places`}>
        {(atlas?.paths ?? []).map(([a, b]) => (
          <line key={`${a}-${b}`} x1={byId.get(a).map.x * 100} y1={byId.get(a).map.y * 60} x2={byId.get(b).map.x * 100} y2={byId.get(b).map.y * 60} />
        ))}
        {places.map((place) => (
          <g key={place.id} className={`world-place ${place.state}${place.closed ? ' closed' : ''}`} transform={`translate(${place.map.x * 100} ${place.map.y * 60})`}>
            <rect x="-2.2" y="-2.2" width="4.4" height="4.4" />
            <text y="-4">{place.name}</text>
          </g>
        ))}
      </svg>
      <ul className="site-list place-list">
        {places.map((place) => (
          <li key={place.id} className={place.closed ? 'closed' : undefined}>
            <span className="site-text">
              <strong>{place.name}</strong>
              <small>{place.description}</small>
              {place.closed && <small className="closed-note">{place.closed}</small>}
            </span>
            {!place.closed && <span className="site-done">{cleared.length} of {dungeon.sites.length} cleared</span>}
          </li>
        ))}
      </ul>
      {open && <button type="button" className="primary-button big-button" onClick={() => state.enterPlace(open.id)}>Enter {open.name}</button>}
    </section>
  );
}

const sealNote = (gate) => `sealed: ${gate.completed} of ${gate.required} cleared`;

// What a site's row says of its state.
function siteNote(site, status) {
  if (status.state === 'current') return status.cleared ? 'you are here · cleared' : 'you are here';
  if (status.gate?.sealed) return sealNote(status.gate);
  if (status.cleared) return 'cleared';
  return status.state === 'known' ? 'unexplored' : 'not cleared';
}

// Round 119: the temple map's card. The sites out of the fog, each with its state, and a walk to each one the
// server calls reachable. The main button goes down to the site the player stands at.
function OverviewCard({ state, sites }) {
  const { dungeon, connection, serverProblem, starting, travelling, progress } = state;
  const here = dungeon.sites.find((site) => sites[site.id]?.state === 'current') ?? dungeon.sites[0];
  const begun = Boolean(progress) && (progress.clearedSiteIds.length > 0 || progress.visitedSiteIds.length > 1);
  const label = starting ? (connection === 'ready' ? 'Starting…' : 'Waking the server…') : begun ? `Go down to ${here.name}` : 'Start';
  return (
    <section className="card overview-card" aria-label="The temple map">
      <p className="eyebrow">The map</p>
      <h2>{dungeon.name}</h2>
      <ol className="site-list">
        {dungeon.sites.map((site, index) => {
          const status = sites[site.id];
          if (!status || status.state === 'hidden') return null;
          return (
            <li key={site.id} className={`${status.cleared ? 'cleared ' : ''}site-${status.state}`}>
              <SiteNumber index={index} />
              <span className="site-text">
                <strong>{site.name}</strong>
                <small>{status.state !== 'known' && site.characterName ? `${site.characterName} · ` : ''}{siteNote(site, status)}</small>
              </span>
              {status.reachable && <button type="button" className="secondary-button walk-button" onClick={() => state.travel(site.id)} disabled={travelling || starting} aria-label={`Walk to ${site.name}`}>Walk here</button>}
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
      <div className="button-row">
        <button type="button" className="primary-button big-button" onClick={state.start} disabled={starting || travelling}>{label}</button>
        <button type="button" className="text-button" onClick={state.toWorld}>World map</button>
      </div>
    </section>
  );
}

// Round 119: the ways on from the site the player stands at: one button per neighbouring site. A site the player
// cannot walk to yet is shown with the reason.
function WaysOn({ state, sites, site }) {
  const { dungeon, travelling } = state;
  const here = sites[site.id];
  const ways = neighbourIds(dungeon, site.id).map((id) => dungeon.sites.find((candidate) => candidate.id === id)).filter((way) => way && sites[way.id] && sites[way.id].state !== 'hidden');
  if (!ways.length) return null;
  return (
    <ul className="ways" aria-label="Ways on">
      {ways.map((way) => {
        const status = sites[way.id];
        const why = status.reachable ? null : status.gate?.sealed ? sealNote(status.gate) : !here?.cleared ? `${site.characterName ?? 'Someone'} has not let you pass` : null;
        return (
          <li key={way.id}>
            <button type="button" className="secondary-button" onClick={() => state.travel(way.id)} disabled={!status.reachable || travelling}>
              Walk to {way.name}{status.state === 'known' && <small> · unexplored</small>}{status.cleared && <small> · cleared</small>}
            </button>
            {why && <small className="way-why">{why}</small>}
          </li>
        );
      })}
    </ul>
  );
}

// Round 119: the player stands at a site with no conversation open: a cleared site, or one whose conversation they
// left.
function SiteCard({ state, sites, site }) {
  const status = sites[site.id] ?? { cleared: false };
  const name = site.characterName ?? 'them';
  const held = state.encounter?.state === 'ongoing' && state.encounter.encounterId === site.encounterId;
  const talkLabel = state.encounterLoading ? `${name} is getting ready to talk…` : held ? 'Back to the conversation' : status.cleared ? `Talk to ${name} again` : `Talk to ${name}`;
  return (
    <section className="card site-card" aria-label={site.name}>
      <header className="sheet-header">
        <SiteNumber index={state.siteIndex} />
        <span className="site-text"><strong>{site.name}</strong><small>{name}{status.cleared ? ' · cleared' : ' has not let you pass yet'}</small></span>
      </header>
      <WaysOn state={state} sites={sites} site={site} />
      <div className="button-row">
        <button type="button" className={status.cleared ? 'secondary-button' : 'primary-button big-button'} onClick={state.talk} disabled={state.encounterLoading || state.travelling}>{talkLabel}</button>
        <button type="button" className="text-button" onClick={state.openMap} disabled={state.travelling}>Map</button>
      </div>
    </section>
  );
}

function TravelCaption({ state, site }) {
  const { phase, cameraArrived, siteError, arrival } = state;
  if (siteError) {
    return (
      <section className="caption caption-problem" role="alert">
        <span>{siteError}</span>
        <button type="button" className="secondary-button" onClick={state.retrySite}>Try again</button>
        <button type="button" className="text-button" onClick={state.openMap}>Map</button>
      </section>
    );
  }
  const text = cameraArrived && arrival !== 'site'
    ? `${site?.characterName ?? 'Someone'} is getting ready to talk…`
    : `${phase === 'walk' ? 'Walking to' : 'Approaching'} ${site?.name ?? 'the next site'}…`;
  return <section className="caption" role="status">{text}</section>;
}

function EncounterSheet({ state, site, sites }) {
  const { encounter, assessment, language, isLoading, encounterLoading } = state;
  const scrollRef = useRef(null);
  const resolved = encounter?.state === 'resolved';
  const name = encounter?.character?.name ?? site?.characterName ?? 'them';
  const atGoal = site?.id === state.dungeon.goal;
  // The ways on wait for the server's word that the site is cleared (the run is read again after the last answer).
  const cleared = Boolean(sites[site?.id]?.cleared);
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
        {!resolved && (
          <span className="sheet-actions">
            <button type="button" className="text-button" onClick={state.restartSite} disabled={isLoading || encounterLoading}>Start over</button>
            <button type="button" className="text-button" onClick={state.leaveConversation} disabled={isLoading || encounterLoading}>Leave</button>
          </span>
        )}
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
            {atGoal && <button type="button" className="primary-button big-button" onClick={state.leaveTemple}>Leave the temple</button>}
            {!atGoal && cleared && <WaysOn state={state} sites={sites} site={site} />}
            <button type="button" className="text-button" onClick={state.openMap} disabled={state.travelling}>Map</button>
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
        <button type="button" className="secondary-button big-button" onClick={state.stay}>Stay in the temple</button>
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
  const sites = siteStatesOf(state);
  const cleared = dungeon.sites.filter((entry) => sites[entry.id]?.cleared).map((entry) => entry.id);
  const site = dungeon.sites[siteIndex];
  const inEncounter = phase === 'encounter';
  const atSite = !['attract', 'world', 'overview', 'victory'].includes(phase);
  const returnLabel = inEncounter ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the temple';
  // Meanings stay hidden while a conversation is open or opening, whatever the snapshot says (round 017; review 1, R1.4).
  const conversing = state.encounter?.state === 'ongoing' || state.encounterLoading;
  const spellbook = conversing && !state.spellbook.inEncounter ? { ...state.spellbook, inEncounter: true } : state.spellbook;

  return (
    <div className={`app-shell phase-${phase}${state.settingsOpen ? ' settings-open' : ''}`} style={{ '--panel-alpha': state.display?.panelOpacity ?? 0.7 }}>
      <DungeonView dungeon={dungeon} phase={phase} siteIndex={siteIndex} walkFrom={state.walkFrom} sites={sites} insets={insets} onArrive={state.onCameraArrived}
        closed={state.closedObjectives} resolved={state.encounter?.state === 'resolved'} beat={state.beat} />

      <header className="hud" ref={hudRef}>
        <div className="hud-title"><strong>ParaLLang</strong><span>{dungeon.name}</span></div>
        <ol className="pips" aria-label={`${cleared.length} of ${dungeon.sites.length} sites cleared`}>
          {dungeon.sites.map((entry, index) => (
            <li key={entry.id} className={cleared.includes(entry.id) ? 'done' : (atSite && index === siteIndex ? 'current' : undefined)} />
          ))}
        </ol>
        <nav aria-label="Menu">
          <button type="button" className="secondary-button" onClick={state.openSpellbook}>
            Spellbook <span className="due-badge" aria-label={`${state.spellbook.dueCount} reviews due`}>{state.spellbook.dueCount}</span>
          </button>
          <button type="button" className="secondary-button" onClick={state.openSettings} aria-label="Settings">⚙︎</button>
        </nav>
      </header>

      {state.error && <div className="error-banner" role="alert"><span>{state.error}</span><button type="button" onClick={state.clearError} aria-label="Dismiss error">×</button></div>}

      <div className="dock" ref={dockRef}>
        {phase === 'attract' && <TitleCard state={state} />}
        {phase === 'world' && <WorldCard state={state} cleared={cleared} />}
        {phase === 'overview' && <OverviewCard state={state} sites={sites} />}
        {(phase === 'approach' || phase === 'walk') && <TravelCaption state={state} site={site} />}
        {inEncounter && <EncounterSheet state={state} site={site} sites={sites} />}
        {phase === 'site' && site && <SiteCard state={state} sites={sites} site={site} />}
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

      {state.settingsOpen && <SettingsSheet settings={state.settings} onSave={state.saveSettings} onClose={state.closeSettings} panelOpacity={state.display?.panelOpacity} onPanelOpacity={state.setPanelOpacity} />}
    </div>
  );
}
