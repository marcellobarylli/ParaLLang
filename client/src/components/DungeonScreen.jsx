import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DungeonView from './DungeonView.jsx';
import DialoguePanel from './DialoguePanel.jsx';
import InputBar from './InputBar.jsx';
import { browserSpeech } from '../speech.js';
import { browserAmbience } from '../ambience.js';
import Spellbook from './Spellbook.jsx';
import ReviewPanel from './ReviewPanel.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import PartyPanel, { inParty } from './PartyPanel.jsx';
import { dockInsets } from '../scene/insets.js';
import { siteStatesOf } from '../stores/gameStore.js';
import { neighbourIds } from '../dungeonModel.js';

// Round 115: the web client's one screen, the dungeon. The level fills the screen; over it lie the top bar and the
// dock, which holds the panel of the current phase: the title (attract), the world map (world), the temple map
// (overview), a caption while the camera travels, the dialogue sheet (encounter), the site card (site) and the
// victory card. The dock is a bottom sheet on a phone and, for the dialogue, a side panel from 1100 px. The camera
// frames what the dock leaves free (useInsets).
// Round 121: levels. The top bar shows the level and the way to the next; a turn that earned experience says so;
// a site sealed by a level says which.
// Round 120: the party. A saveable character whose site is cleared can be saved, from the offer after the
// conversation or from the site's card, and a member can be talked to from the Party panel.
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

// What a seal still asks for: sites to clear, a level (round 121), or both.
export function sealNote(gate) {
  const parts = [];
  if (gate.completed < gate.required) parts.push(`sealed: ${gate.completed} of ${gate.required} cleared`);
  if (gate.level && gate.level.current < gate.level.required) parts.push(`opens at level ${gate.level.required} (you are level ${gate.level.current})`);
  return parts.join(' · ') || 'sealed';
}

// Round 121: the level and the experience towards the next one.
function LevelChip({ progression }) {
  if (!progression) return null;
  const { xp, level, levelStartsAt, nextLevelAt } = progression;
  const share = Math.max(0, Math.min(1, (xp - levelStartsAt) / Math.max(1, nextLevelAt - levelStartsAt)));
  return (
    <div className="level-chip" role="img" aria-label={`Level ${level}: ${xp} XP, level ${level + 1} at ${nextLevelAt}`}>
      <span>Lv {level}</span>
      <span className="xp-bar"><i style={{ width: `${Math.round(share * 100)}%` }} /></span>
    </div>
  );
}

// What a site's row says of its state.
function siteNote(site, status) {
  if (status.state === 'current') return status.cleared ? 'you are here · cleared' : 'you are here';
  if (status.gate?.sealed) return sealNote(status.gate);
  if (status.cleared) return 'cleared';
  return status.state === 'known' ? 'unexplored' : 'not cleared';
}

export const FOG_LEGEND = 'Dark patches cover places you have not found. One lifts when you reach a site next to it.';

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
      {/* Round 124: what the dark patches on the map are, while there is one. */}
      {dungeon.sites.some((site) => sites[site.id]?.state === 'hidden') && (
        <p className="fog-legend"><span className="fog-swatch" aria-hidden="true" /><small>{FOG_LEGEND}</small></p>
      )}
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
            <button type="button" className="secondary-button" onClick={() => state.travel(way.id)} disabled={!status.reachable || travelling || state.encounterLoading}>
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
      {status.cleared && site.saveable && (inParty(state.party, site.encounterId)
        ? <p className="party-note" role="status">{name} is in your party.</p>
        : <button type="button" className="secondary-button" onClick={() => state.recruit(site.encounterId)} disabled={state.recruiting}>Invite {name} to your party</button>)}
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

// Round 120: after a saveable character lets the player pass, they may be saved to the party (the app's SAVE / LEAVE
// card, round 021). Leave only closes the offer here: the invitation stays on the site's card.
function PartyOffer({ state, encounter }) {
  const [declined, setDeclined] = useState(false);
  const name = encounter.character?.name ?? 'They';
  if (inParty(state.party, encounter.encounterId)) return <p className="party-note" role="status">{name} is in your party.</p>;
  if (declined) return null;
  return (
    <section className="party-offer" aria-label={`${name} could join your party`}>
      <strong>{name} could join your party.</strong>
      <div className="button-row">
        <button type="button" className="primary-button" onClick={() => state.recruit(encounter.encounterId)} disabled={state.recruiting}>Save {name}</button>
        <button type="button" className="secondary-button" onClick={() => setDeclined(true)} disabled={state.recruiting}>Leave</button>
      </div>
    </section>
  );
}

// The dialogue sheet: a site's conversation, or (round 120, `party`) a conversation with a party member.
// Round 126: the character's lines are read aloud in the voice of its sheet (`speech.speaker`): each new line when
// it arrives, unless voices are off in Settings, and any line again from its 🔊. The voice stops when the player
// sends, starts the microphone or leaves.
function EncounterSheet({ state, site, sites, party = false, speech }) {
  const { encounter, assessment, language, isLoading, encounterLoading } = state;
  const scrollRef = useRef(null);
  const { speaker, listener } = speech;
  const voicesOn = state.display?.voices !== false;
  const lastLine = encounter?.transcript?.findLast((message) => message.role === 'npc') ?? null;
  const lineKey = lastLine ? `${encounter.id}:${encounter.transcript.length}:${lastLine.id}` : null; // a new line, not a revealed translation
  const speakLine = (message) => speaker.speak({ text: message.dialogue.native, tag: language?.tag, voice: encounter?.character?.voice });
  useEffect(() => {
    if (voicesOn && lastLine && speaker.supported) speakLine(lastLine);
    else if (!voicesOn) speaker.stop();
  }, [voicesOn, lineKey, language?.tag]);
  useEffect(() => () => speaker.stop(), [speaker]);
  const resolved = encounter?.state === 'resolved';
  const name = encounter?.character?.name ?? (party ? null : site?.characterName) ?? 'them';
  const atGoal = !party && site?.id === state.dungeon.goal;
  // The ways on wait for the server's word that the site is cleared (the run is read again after the last answer).
  const cleared = Boolean(sites[site?.id]?.cleared);
  // A conversation opens at its top (the objective, the briefing, the first line); each turn scrolls to its end.
  const fresh = encounter?.committedPlayerTurns === 0 && !assessment && !isLoading;
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = fresh ? 0 : element.scrollHeight;
  }, [encounter?.id, encounter?.transcript, assessment, isLoading, resolved, fresh]);
  return (
    <section className="sheet" aria-label={party ? `${name}, your party` : site?.name ?? 'Conversation'}>
      <header className="sheet-header">
        {!party && <SiteNumber index={state.siteIndex} />}
        <span className="site-text"><strong>{party ? name : site?.name}</strong><small>{party ? 'your party' : name}</small></span>
        {!resolved && (
          <span className="sheet-actions">
            <button type="button" className="text-button" onClick={party ? state.restartParty : state.restartSite} disabled={isLoading || encounterLoading}>Start over</button>
            <button type="button" className="text-button" onClick={party ? state.leaveParty : state.leaveConversation} disabled={isLoading || encounterLoading}>{party ? 'Leave for now' : 'Leave'}</button>
          </span>
        )}
      </header>
      <div className="sheet-scroll" ref={scrollRef}>
        <DialoguePanel encounter={encounter} language={language} isLoading={isLoading} onHelp={state.revealHelp} onSpeak={speaker.supported ? speakLine : null} />
        {assessment && (
          <section className="assessment-banner" aria-live="polite">
            <strong>Assessment</strong><p>{assessment.overallFeedback}</p>
            {assessment.objectiveResults.map((result) => <p key={result.objectiveId}>{result.passed ? '✓' : '→'} {result.feedback}</p>)}
            {state.xpGained > 0 && <p className="xp-line">+{state.xpGained} XP{state.levelUp ? ` · Level ${state.levelUp}` : ''}</p>}
          </section>
        )}
        {resolved && party && (
          <section className="victory-banner" role="status">
            <p>{encounter.resolvedMessage ?? `${name} has said what there was to say.`}</p>
            <button type="button" className="primary-button big-button" onClick={state.leaveParty}>Back to the temple</button>
          </section>
        )}
        {resolved && !party && (
          <section className="victory-banner" role="status">
            <p>{encounter.resolvedMessage ?? `${name} lets you pass.`}</p>
            {encounter.character?.saveable && <PartyOffer key={encounter.id} state={state} encounter={encounter} />}
            {atGoal && <button type="button" className="primary-button big-button" onClick={state.leaveTemple}>Leave the temple</button>}
            {!atGoal && cleared && <WaysOn state={state} sites={sites} site={site} />}
            <button type="button" className="text-button" onClick={state.openMap} disabled={state.travelling}>Map</button>
          </section>
        )}
      </div>
      {!resolved && (
        <InputBar value={state.draft} onChange={state.setDraft} onSend={(text) => { speaker.stop(); state.sendMessage(text); }} name={name} loading={isLoading} disabled={isLoading || encounterLoading || !encounter}
          listener={listener} language={language} onListen={() => speaker.stop()} />
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
        <button type="button" className="secondary-button big-button" onClick={state.stay} disabled={isLoading}>Stay in the temple</button>
        <button type="button" className="secondary-button big-button" onClick={state.openSpellbook}>Spellbook</button>
      </div>
    </section>
  );
}

export default function DungeonScreen({ useStore, speech = browserSpeech(), ambience = browserAmbience() }) {
  const state = useStore();
  // Round 127: ambient music. Browsers let a page make sound only after a tap, so it starts at the first one. It
  // drops while a line is read aloud and is silent while the microphone listens.
  const musicWanted = state.display?.music !== false;
  useEffect(() => {
    if (!musicWanted || !ambience.supported || typeof window === 'undefined') return undefined;
    const begin = () => ambience.start();
    window.addEventListener('click', begin, { once: true, capture: true });
    const watch = window.setInterval(() => ambience.setLevel(speech.listener.listening ? 'mute' : speech.speaker.speaking ? 'duck' : 'full'), 400);
    return () => {
      window.removeEventListener('click', begin, { capture: true });
      window.clearInterval(watch);
      ambience.stop();
    };
  }, [musicWanted, ambience, speech]);
  // Round 126: iOS Safari lets a page speak on its own only after it has spoken from inside a tap. The first tap does.
  const voicesWanted = state.display?.voices !== false;
  useEffect(() => {
    if (!voicesWanted || !speech.speaker.supported || typeof window === 'undefined') return undefined;
    const prime = () => speech.speaker.prime();
    window.addEventListener('click', prime, { once: true, capture: true });
    return () => window.removeEventListener('click', prime, { capture: true });
  }, [voicesWanted, speech]);
  const { initialize, dungeon, phase, siteIndex, progress } = state;
  useEffect(() => { initialize(); }, [initialize]);
  const hudRef = useRef(null);
  const dockRef = useRef(null);
  const insets = useInsets(hudRef, dockRef);
  const sites = siteStatesOf(state);
  const cleared = dungeon.sites.filter((entry) => sites[entry.id]?.cleared).map((entry) => entry.id);
  const site = dungeon.sites[siteIndex];
  const inEncounter = phase === 'encounter';
  const atSite = !['attract', 'world', 'overview', 'victory', 'party'].includes(phase);
  const inParty_ = phase === 'party';
  const returnLabel = inEncounter || inParty_ ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the temple';
  // A site conversation under way that the store holds (the player left it for the site's card): Talk waits for it.
  const held = !inParty_ && state.encounter?.state === 'ongoing' ? state.encounter : null;
  const canTalk = ['attract', 'world', 'overview', 'site', 'victory'].includes(phase) || (inEncounter && state.encounter?.state === 'resolved');
  // Meanings stay hidden while a conversation is open or opening, whatever the snapshot says (round 017; review 1, R1.4).
  const conversing = state.encounter?.state === 'ongoing' || state.encounterLoading;
  const spellbook = conversing && !state.spellbook.inEncounter ? { ...state.spellbook, inEncounter: true } : state.spellbook;

  return (
    <div className={`app-shell phase-${phase}${state.settingsOpen ? ' settings-open' : ''}`} style={{ '--panel-alpha': state.display?.panelOpacity ?? 0.7 }}>
      <DungeonView dungeon={dungeon} phase={phase} siteIndex={siteIndex} walkFrom={state.walkFrom} sites={sites} insets={insets} onArrive={state.onCameraArrived}
        closed={state.closedObjectives} resolved={state.encounter?.state === 'resolved'} beat={state.beat} tilt={state.display?.tiltLook === true} />

      <header className="hud" ref={hudRef}>
        <div className="hud-title"><strong>ParaLLang</strong><span>{dungeon.name}</span></div>
        <LevelChip progression={state.progression} />
        <ol className="pips" aria-label={`${cleared.length} of ${dungeon.sites.length} sites cleared`}>
          {dungeon.sites.map((entry, index) => (
            <li key={entry.id} className={cleared.includes(entry.id) ? 'done' : (atSite && index === siteIndex ? 'current' : undefined)} />
          ))}
        </ol>
        <nav aria-label="Menu">
          <button type="button" className="secondary-button" onClick={state.openParty}>
            Party <span className="due-badge" aria-label={`${state.party.length} in your party`}>{state.party.length}</span>
          </button>
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
        {inEncounter && <EncounterSheet state={state} site={site} sites={sites} speech={speech} />}
        {phase === 'site' && site && <SiteCard state={state} sites={sites} site={site} />}
        {inParty_ && <EncounterSheet state={state} site={site} sites={sites} party speech={speech} />}
        {phase === 'victory' && <VictoryCard state={state} />}
      </div>

      {state.view !== 'dialogue' && (
        <div className="overlay">
          {state.view === 'party' && <PartyPanel party={state.party} sites={dungeon.sites} held={held} starting={state.partyStarting} canTalk={canTalk} isLoading={state.isLoading || state.travelling} onTalk={state.talkTo} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'spellbook' && <Spellbook spellbook={spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'review' && <ReviewPanel
            key={state.reviewChallenge?.id ?? 'result'}
            challenge={state.reviewChallenge} result={state.reviewResult} language={state.language} isLoading={state.isLoading}
            onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
            onContinue={() => state.startReview()} onReturn={state.returnToDialogue} returnLabel={returnLabel}
          />}
        </div>
      )}

      {state.settingsOpen && <SettingsSheet settings={state.settings} onSave={state.saveSettings} onClose={state.closeSettings} panelOpacity={state.display?.panelOpacity} onPanelOpacity={state.setPanelOpacity} tiltLook={state.display?.tiltLook === true} onTiltLook={state.setTiltLook}
        music={musicWanted} onMusic={(on) => { state.setMusic(on); if (on) ambience.start(); }} musicSupported={ambience.supported}
        voices={state.display?.voices !== false} onVoices={state.setVoices} speechSupport={{ speak: speech.speaker.supported, listen: speech.listener.supported }} />}
    </div>
  );
}
