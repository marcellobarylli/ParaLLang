import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import DungeonView from './DungeonView.jsx';
import RoadView from './RoadView.jsx';
import { CurriculumChip, CurriculumPanel, HubCard, WelcomeCard, RoadCaption, RoadMap, RoadResolved, positionLine, useWeather } from './Road.jsx';
import DialoguePanel from './DialoguePanel.jsx';
import InputBar from './InputBar.jsx';
import CorrectionCard from './CorrectionCard.jsx';
import SheetHandle from './SheetHandle.jsx';
import WaitGame from './WaitGame.jsx';
import { browserSpeech } from '../speech.js';
import { narrativeParts, narratorOn, useReadPassage } from '../narratorVoice.js';
import { browserAmbience } from '../ambience.js';
import { TITLE_MUSIC, browserTitleMusic } from '../titleMusic.js';
import { volumesOf } from '../display.js';
import Spellbook from './Spellbook.jsx';
import ReviewPanel from './ReviewPanel.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import SaveSlots from './SaveSlots.jsx';
import PartyPanel, { inParty } from './PartyPanel.jsx';
import { dockInsets } from '../scene/insets.js';
import { ROAD_NAME } from '../atlas.js';
import Narration, { hasNarration } from './Narration.jsx';
import Guidebook, { GuideNote } from './Guidebook.jsx';
import { chatKeyOf, siteStatesOf } from '../stores/gameStore.js';

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
// Round 144: The Journey 2 is a mode of this same screen (`state.mode === 'road'`): the endless level in place of
// the dungeon's, its own top bar chip and dock (Road.jsx), and the same dialogue sheet, Spellbook, reviews and Settings.
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

// Round 181: the language of the game. A new game's can be chosen on the title (the page reloads into it); a game
// under way names its own.
function TitleLanguage({ state, disabled }) {
  const { languages, language, freshGame, chooseLanguage } = state;
  if (!language) return null;
  if (!freshGame || !Array.isArray(languages) || languages.length < 2) return <p className="title-language">Learning {language.name}</p>;
  return (
    <div className="title-language" role="group" aria-label="Language to learn">
      <span>Learn</span>
      {languages.map((entry) => (
        <button key={entry.code} type="button" className={entry.code === language.code ? 'secondary-button chosen' : 'secondary-button'}
          aria-pressed={entry.code === language.code} lang={entry.tag} disabled={disabled} onClick={() => chooseLanguage(entry.code)}>{entry.name}</button>
      ))}
    </div>
  );
}

// The events that count as the player's tap for a browser's autoplay rule (a touch that ends as a scroll still
// ends with touchend). Each one tries the title music again until it is heard.
const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'];
const GATE_DELAY = 450; // ms
const AMBIENCE_HANDOVER = 1.5; // seconds: the title music's fade when the music is switched off on the title

// Round 175: the title screen. Behind it the road's landscape turns slowly, seen from above the clouds (RoadView's
// `title`); its one way in is The Journey 2. The road is being read meanwhile (preloadRoad), so the start zooms down
// into a world that is already there.
// With `gate` 'blocked' the browser wants a tap before any sound: the title shows only its name and "Tap to begin",
// and the tap (anywhere) starts the music and brings in the rest. 'checking' shows only the name, for a moment.
function TitleScreen({ state, gate = 'open' }) {
  const { connection, serverProblem, journeyStarting } = state;
  const label = journeyStarting ? (connection === 'ready' ? 'Setting out…' : 'Waking the server…') : ROAD_NAME;
  if (gate !== 'open') {
    return (
      <section className={`title-screen title-gate ${gate}`} aria-label="ParaLLang" data-connection={connection}>
        <h1>ParaLLang</h1>
        {gate === 'blocked' && <button type="button" className="title-tap">Tap to begin</button>}
      </section>
    );
  }
  return (
    <section className="title-screen title-open" aria-label="ParaLLang" data-connection={connection}>
      <h1>ParaLLang</h1>
      <button type="button" className="primary-button big-button title-start" onClick={state.startJourney} disabled={journeyStarting}>{label}</button>
      <TitleLanguage state={state} disabled={journeyStarting} />
      {!journeyStarting && connection === 'connecting' && <p className="connection-note" role="status">Waking the server…</p>}
      {connection === 'offline' && serverProblem && (
        <div className="problem" role="alert"><p>{serverProblem}</p><button type="button" className="secondary-button" onClick={state.openSettings}>Open Settings</button></div>
      )}
    </section>
  );
}

// Round 175: the game menu, the same everywhere: the map and every record the player keeps, Settings, and the ways
// out (of a conversation, to the other places, to the title). Each row closes the menu and opens what it names.
function GameMenu({ state, onClose, onMap, mapLabel: mapName, leave, onLeave }) {
  const onRoad = state.mode === 'road';
  const atTitle = !onRoad && state.phase === 'attract';
  const unread = state.guideNote?.unread?.length ?? 0;
  const go = (action) => () => { onClose(); action(); };
  const canTitle = !atTitle && !state.isLoading && (onRoad || ['world', 'overview', 'site', 'victory'].includes(state.phase) || (state.phase === 'encounter' && state.encounter?.state !== 'ongoing'));
  return (
    <div className="overlay menu-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <nav className="game-menu" aria-label="Game menu">
        <div className="panel-heading"><h2>Menu</h2><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
        <ul className="menu-list">
          {onMap && <li><button type="button" onClick={go(onMap)}>{mapName}</button></li>}
          {onRoad && state.curriculum && <li><button type="button" onClick={go(() => state.openRoadPanel('curriculum'))}>Curriculum <small>{positionLine(state.curriculum)}</small></button></li>}
          <li><button type="button" onClick={go(state.openSpellbook)}>Spellbook {state.spellbook.dueCount > 0 && <span className="due-badge">{state.spellbook.dueCount} due</span>}</button></li>
          {!onRoad && !atTitle && <li><button type="button" onClick={go(state.openParty)}>Party <span className="due-badge" aria-label={`${state.party.length} in your party`}>{state.party.length}</span></button></li>}
          <li><button type="button" onClick={go(state.openGuidebook)}>Guidebook {unread > 0 && <span className="due-badge">{unread} new</span>}</button></li>
          <li><button type="button" onClick={go(state.openSettings)}>Settings</button></li>
          {state.openSlots && <li><button type="button" onClick={go(state.openSlots)}>Save slots <small>Slot {state.slot}</small></button></li>}
          {leave && <li><button type="button" onClick={go(onLeave)} disabled={state.isLoading || state.encounterLoading}>{leave}</button></li>}
          {(onRoad || atTitle) && <li><button type="button" onClick={go(onRoad ? state.leaveRoad : state.enter)} disabled={onRoad && state.isLoading}>Other places <small>Ta Prohm, The Kiln</small></button></li>}
          {!atTitle && <li><button type="button" onClick={go(state.toTitle)} disabled={!canTitle}>Back to the title</button></li>}
        </ul>
      </nav>
    </div>
  );
}

// Round 152: a name with a colon in it is too long for one line of the world map, so it is set as two lines, the
// second where the one line would be.
function mapLabel(name) {
  const at = name.indexOf(': ');
  if (at < 0) return name;
  return [name.slice(0, at + 1), name.slice(at + 2)].map((line, index) => <tspan key={line} x="0" dy={index ? 3.9 : -3.9}>{line}</tspan>);
}

// Round 119: the world map. Places and the paths between them, as far as the fog allows; an open place can be
// entered, the others say why not.
// Round 133: more than one place may be open. The marker is on the place the player is in, each open place shows its
// own count of cleared sites once its run is read, and each has its own Enter button.
function WorldCard({ state, cleared }) {
  const { atlas, dungeon, runs = {} } = state;
  const places = atlas?.places ?? [{ id: dungeon.id, name: dungeon.name, state: 'current', map: { x: 0.5, y: 0.5 }, description: '', dungeonId: dungeon.id, closed: null }];
  const byId = new Map(places.map((place) => [place.id, place]));
  const here = (place) => place.dungeonId === dungeon.id;
  const holds = new Set(state.enterable ?? [dungeon.id]);
  const open = places.filter((place) => place.dungeonId && holds.has(place.dungeonId));
  // Round 144: the endless road has no dungeon: it is entered by its own button.
  const roads = state.enterRoad ? places.filter((place) => place.road) : [];
  const count = (place) => {
    if (here(place)) return `${cleared.length} of ${dungeon.sites.length} cleared`;
    const run = runs[place.dungeonId];
    return run ? `${run.cleared} of ${run.total} cleared` : null;
  };
  return (
    <section className="card world-card" aria-label="The world map">
      <p className="eyebrow">The world</p>
      <h2>Where to</h2>
      <svg className="world-map" viewBox="0 0 100 60" role="img" aria-label={`A map of ${places.length} places`}>
        {(atlas?.paths ?? []).map(([a, b]) => (
          <line key={`${a}-${b}`} x1={byId.get(a).map.x * 100} y1={byId.get(a).map.y * 60} x2={byId.get(b).map.x * 100} y2={byId.get(b).map.y * 60} />
        ))}
        {places.map((place) => (
          <g key={place.id} className={`world-place ${here(place) ? 'current' : 'known'}${place.closed ? ' closed' : ''}${place.road ? ' road' : ''}`} transform={`translate(${place.map.x * 100} ${place.map.y * 60})`}>
            <rect x="-2.2" y="-2.2" width="4.4" height="4.4" />
            <text y="-4">{mapLabel(place.name)}</text>
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
            {!place.closed && count(place) && <span className="site-done">{count(place)}</span>}
          </li>
        ))}
      </ul>
      {open.map((place) => (
        <button type="button" key={place.id} className={`${here(place) ? 'primary-button' : 'secondary-button'} big-button`} onClick={() => state.enterPlace(place.id)}>Enter {place.name}</button>
      ))}
      {roads.map((place) => (
        <button type="button" key={place.id} className="secondary-button big-button" onClick={state.enterRoad} disabled={state.roadLoading}>Set out on {place.name}</button>
      ))}
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
  // Round 143: every site out of the fog, from anywhere.
  const ways = dungeon.sites.filter((way) => way.id !== site.id && sites[way.id] && sites[way.id].state !== 'hidden');
  if (!ways.length) return null;
  return (
    <ul className="ways" aria-label="Ways on">
      {ways.map((way) => {
        const status = sites[way.id];
        const why = status.reachable ? null : status.gate?.sealed ? sealNote(status.gate) : null;
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
      {/* Round 156: what the narrator says of this site. */}
      <Narration narration={state.narration} />
      <GuideNote note={state.guideNote} onOpen={state.openGuidebook} />
      {status.cleared && site.saveable && (inParty(state.party, site.encounterId)
        ? <p className="party-note" role="status">{name} is in your party.</p>
        : <button type="button" className="secondary-button" onClick={() => state.recruit(site.encounterId)} disabled={state.recruiting}>Invite {name} to your party</button>)}
      <WaysOn state={state} sites={sites} site={site} />
      <div className="button-row">
        <button type="button" className={status.cleared ? 'secondary-button' : 'primary-button big-button'} onClick={state.talk} disabled={state.encounterLoading || state.travelling}>{talkLabel}</button>
      </div>
    </section>
  );
}

function TravelCaption({ state, site }) {
  const { phase, cameraArrived, siteError, arrival } = state;
  useReadPassage(state.narration, `${state.dungeon?.id}:${site?.id ?? site?.name}`, { on: narratorOn(state.display), tag: state.language?.tag }); // round 196
  if (siteError) {
    return (
      <section className="caption caption-problem" role="alert">
        <span>{siteError}</span>
        <button type="button" className="secondary-button" onClick={state.retrySite}>Try again</button>
      </section>
    );
  }
  const text = cameraArrived && arrival !== 'site'
    ? `${site?.characterName ?? 'Someone'} is getting ready to talk…`
    : `${phase === 'walk' ? 'Walking to' : 'Approaching'} ${site?.name ?? 'the next site'}…`;
  // Round 156: on the way to a site, the narrator tells what is there. Round 166: the passage stays until the
  // character is ready to talk, and what the game is doing is its last sentence (as on the road, Road.jsx).
  return <section className="caption" role="status">{hasNarration(state.narration) ? <Narration narration={state.narration} after={text} /> : <span>{text}</span>}</section>;
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
// Round 144: with `road` ({ title, subtitle }) it is a conversation of The Journey 2: the same sheet, with the
// road's way on under a finished conversation (RoadResolved).
function EncounterSheet({ state, site, sites, party = false, road = null, speech, height = null, onHeight = () => {} }) {
  const { encounter, assessment, language, isLoading, encounterLoading } = state;
  const scrollRef = useRef(null);
  const { speaker, listener } = speech;
  const voicesOn = state.display?.voices !== false;
  const lastLine = encounter?.transcript?.findLast((message) => message.role === 'npc') ?? null;
  const lineKey = lastLine ? `${encounter.id}:${encounter.transcript.length}:${lastLine.id}` : null; // a new line, not a revealed translation
  // Round 184: a target-language word of the narration is said in the language's plain voice when tapped.
  const sayWord = (word) => speaker.speak({ text: word, tag: language?.tag });
  const speakLine = (message) => speaker.speak({ text: message.dialogue.native, tag: language?.tag, voice: encounter?.character?.voice });
  // Round 196: a new line comes with its narrative read first, by the narrator (unless switched off), and waits for a
  // travel passage still being read.
  const narrating = narratorOn(state.display);
  // Round 203 (experimental, a setting): a game covers the panel from the moment an answer is sent. The reply that
  // arrives under it waits: it is read aloud and followed only once the game has run out and gone.
  const [gaming, setGaming] = useState(false);
  useEffect(() => { setGaming(false); }, [encounter?.id]);
  const shownKeyRef = useRef(lineKey);
  if (!gaming) shownKeyRef.current = lineKey;
  const shownKey = shownKeyRef.current;
  useEffect(() => {
    if (voicesOn && lastLine && speaker.supported) {
      const told = narrating ? narrativeParts(lastLine.narrative, lastLine.narrativeWords, language?.tag) : [];
      speaker.say([...told, { text: lastLine.dialogue.native, tag: language?.tag, voice: encounter?.character?.voice }], { after: true });
    } else if (!voicesOn) speaker.stop();
  }, [voicesOn, shownKey, language?.tag]);
  useEffect(() => () => speaker.stop(), [speaker]);
  const resolved = encounter?.state === 'resolved';
  const chatting = resolved && state.chatKey !== null && state.chatKey === chatKeyOf(encounter); // round 174
  const name = encounter?.character?.name ?? (party || road ? null : site?.characterName) ?? 'them';
  const atGoal = !party && !road && site?.id === state.dungeon.goal;
  // The ways on wait for the server's word that the site is cleared (the run is read again after the last answer).
  const cleared = Boolean(sites[site?.id]?.cleared);
  // A conversation opens at its top (the objective, the briefing, the first line), or at its end when it is resumed
  // part-way. After that the text is the player's own to scroll (round 138): an answer, a verdict or a reply coming
  // in never moves it, wherever it is.
  const fresh = encounter?.committedPlayerTurns === 0 && !assessment && !isLoading;
  const freshRef = useRef(fresh);
  freshRef.current = fresh;
  // Round 140: the text's position is the player's alone. It is remembered while the player scrolls (a touch, the wheel,
  // a key, the scrollbar, and the momentum after a flick); a scroll at any other time (a reply arriving, the browser
  // keeping a focused box in view, a change of height) is put back to it.
  const pin = useRef({ top: 0, until: 0 });
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const user = (extra = 1500) => () => { pin.current.until = Date.now() + extra; };
    const events = [['touchstart', user(60000)], ['touchmove', user(60000)], ['touchend', user(1800)], ['wheel', user()], ['keydown', user()], ['pointerdown', user(60000)], ['pointerup', user(1800)]];
    for (const [name, handler] of events) element.addEventListener(name, handler, { passive: true });
    const onScroll = () => {
      if (Date.now() < pin.current.until) pin.current.top = element.scrollTop;
      else if (element.scrollTop !== pin.current.top) element.scrollTop = pin.current.top;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      for (const [name, handler] of events) element.removeEventListener(name, handler);
      element.removeEventListener('scroll', onScroll);
    };
  }, []);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && element.scrollTop !== pin.current.top && Date.now() >= pin.current.until) element.scrollTop = pin.current.top;
  }); // after every render: whatever the change did to the position, the player's stands
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    pin.current.top = freshRef.current ? 0 : element.scrollHeight;
    element.scrollTop = pin.current.top;
    pin.current.top = element.scrollTop; // as far as the text allows
  }, [encounter?.id]);
  // Round 190: with "Follow the reply" on in Settings (the default), a new line of the character in an open conversation is brought to
  // the top of the panel when it arrives (not on opening, and not when its translation is revealed).
  const follow = state.display?.follow !== false;
  const seenRef = useRef({ id: encounter?.id, line: shownKey });
  useLayoutEffect(() => {
    const seen = seenRef.current;
    seenRef.current = { id: encounter?.id, line: shownKey };
    const element = scrollRef.current;
    if (!follow || !element || !shownKey || seen.id !== encounter?.id || seen.line === shownKey) return;
    const reply = [...element.querySelectorAll('.npc-message')].at(-1);
    if (!reply) return;
    // Round 198: the player's answer and its correction stay in view above the reply when all of it fits; a longer
    // turn shows the reply from its top.
    const place = (node) => node.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - 8;
    const answer = [...element.querySelectorAll('.player-message')].at(-1);
    const whole = answer && place(answer) < place(reply) && reply.getBoundingClientRect().bottom - answer.getBoundingClientRect().top + 16 <= element.clientHeight;
    const top = place(whole ? answer : reply);
    element.scrollTop = Math.max(0, top);
    pin.current = { top: element.scrollTop, until: 0 }; // as far as the text allows
  }, [shownKey, encounter?.id, follow]);
  return (
    <section className="sheet" aria-label={party ? `${name}, your party` : road ? road.title : site?.name ?? 'Conversation'} style={height === null ? undefined : { '--sheet-h': `${height}px` }}>
      {/* Round 132: the panel drags from the top bar's edge down to this strip alone. */}
      <SheetHandle height={height} onHeight={onHeight} />
      <header className="sheet-header">
        {!party && !road && <SiteNumber index={state.siteIndex} />}
        <span className="site-text"><strong>{party ? name : road ? road.title : site?.name}</strong><small>{party ? 'your party' : road ? road.subtitle : name}</small></span>
        {!resolved && (
          <span className="sheet-actions">
            <button type="button" className="text-button" onClick={party ? state.restartParty : road ? state.restartRoadConversation : state.restartSite} disabled={isLoading || encounterLoading}>Start over</button>
            <button type="button" className="text-button" onClick={party ? state.leaveParty : road ? state.leaveRoadConversation : state.leaveConversation} disabled={isLoading || encounterLoading}>{party ? 'Leave for now' : 'Leave'}</button>
          </span>
        )}
      </header>
      <div className="sheet-scroll" ref={scrollRef}>
        <DialoguePanel encounter={encounter} language={language} isLoading={isLoading} onHelp={state.revealHelp} onSpeak={speaker.supported ? speakLine : null} onSayWord={voicesOn && speaker.supported ? sayWord : null} beginner={state.display?.beginner !== false} light={state.display?.light === true}
          afterAnswer={assessment && (
            <section className="assessment-banner" aria-live="polite">
              {/* Round 153: a light turn is not an assessment: what was understood, and what of the objectives it covered. */}
              <strong>{assessment.light ? 'Understood' : 'Assessment'}</strong><p>{assessment.overallFeedback}</p>
              {assessment.correction && <CorrectionCard key={encounter?.version} correction={assessment.correction} language={language} speaker={speaker} listener={listener} onUse={resolved || assessment.light ? null : state.setDraft} />}
              {assessment.objectiveResults.filter((result) => !assessment.light || result.passed).map((result) => <p key={result.objectiveId}>{result.corrected ? '✎' : result.passed ? '✓' : '→'} {result.feedback}</p>)}
              {state.xpGained > 0 && <p className="xp-line">+{state.xpGained} XP{state.levelUp ? ` · Level ${state.levelUp}` : ''}</p>}
            </section>
          )} />
        {/* Round 159 (issue #7): what the character utters once the conversation is over, told by the narrator. */}
        {resolved && !chatting && encounter.revelation && (
          <section className="revelation" aria-label={`What ${name} utters`}>
            <Narration narration={encounter.revelation} />
          </section>
        )}
        {resolved && !chatting && party && (
          <section className="victory-banner" role="status">
            <p className="narrative">{encounter.resolvedMessage ?? `${name} has said what there was to say.`}</p>
            <button type="button" className="primary-button big-button" onClick={state.leaveParty}>Back to the temple</button>
          </section>
        )}
        {resolved && !chatting && road && <section className="victory-banner road-banner"><RoadResolved state={state} encounter={encounter} /></section>}
        {resolved && !chatting && !party && !road && (
          <section className="victory-banner" role="status">
            <p className="narrative">{encounter.resolvedMessage ?? `${name} lets you pass.`}</p>
            {encounter.character?.saveable && <PartyOffer key={encounter.id} state={state} encounter={encounter} />}
            {atGoal && <button type="button" className="primary-button big-button" onClick={state.leaveTemple}>Leave the temple</button>}
            {!atGoal && cleared && <WaysOn state={state} sites={sites} site={site} />}
          </section>
        )}
        {/* Round 174: after the end, the player may go on talking; nothing more is counted. */}
        {resolved && (chatting
          ? (
            <p className="chat-note" role="status">Chatting on with {name}. The conversation is complete: nothing more is counted.{' '}
              <button type="button" className="text-button" onClick={state.stopChatting} disabled={isLoading}>Done chatting</button>
            </p>
          )
          : <button type="button" className="secondary-button chat-on" onClick={state.keepChatting} disabled={isLoading}>Keep chatting with {name} and you might learn a secret</button>)}
      </div>
      {/* Round 174: a complete conversation can go on as a chat that changes nothing. */}
      {(!resolved || chatting) && (
        <InputBar value={state.draft} onChange={state.setDraft} onSend={(text) => { speaker.stop(); if (state.display?.waitGame === true) setGaming(true); state.sendMessage(text); }} name={name} loading={isLoading} disabled={isLoading || encounterLoading || !encounter}
          listener={listener} language={language} onListen={() => speaker.stop()} />
      )}
      {gaming && <WaitGame ready={!isLoading} name={name} onDone={() => setGaming(false)} />}
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
      <p>{dungeon.sites.length === 1 ? `${dungeon.sites[0].characterName ?? 'The character'} lets you pass.` : `All ${dungeon.sites.length} let you pass.`}{words > 0 && ` Your Spellbook holds ${words} ${words === 1 ? 'entry' : 'words and phrases'}.`}</p>
      <div className="button-row">
        <button type="button" className="primary-button big-button" onClick={state.playAgain} disabled={isLoading}>Play again</button>
        <button type="button" className="secondary-button big-button" onClick={state.stay} disabled={isLoading}>{dungeon.id === 'micromort_mountain' ? 'Stay on the mountain' : 'Stay in the temple'}</button>
        <button type="button" className="secondary-button big-button" onClick={state.openSpellbook}>Spellbook</button>
      </div>
    </section>
  );
}

export default function DungeonScreen({ useStore, speech = browserSpeech(), ambience = browserAmbience(), titleMusic = browserTitleMusic() }) {
  const state = useStore();
  // Round 127: ambient music. Browsers let a page make sound only after a tap, so it starts at the first one. It
  // drops while a line is read aloud and is silent while the microphone listens.
  // Round 132: the conversation panel's height as the player dragged it, kept from one conversation to the next.
  const [sheetHeight, setSheetHeight] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // round 175
  const musicWanted = state.display?.music !== false;
  // Round 172: the Audio volumes. The ambience runs while either the music or the effects (the rain, the thunder)
  // can be heard; switching the music off silences its bus and leaves the effects.
  const volume = volumesOf(state.display?.volume);
  const audioWanted = volume.master > 0 && (musicWanted || volume.effects > 0);
  // The title music (titleMusic.js) loops on the title. Setting out fades it away over 30 seconds; the generated
  // chords stay silent until it has gone, then come in. Switching the music off on the title stops it quickly.
  // Round 187: the title music goes on while the road is being found (a server waking up can take a while); it fades
  // once the road is here and the game has begun.
  const onTitle = (state.mode !== 'road' && state.phase === 'attract') || (state.mode === 'road' && !state.road);
  const titleWanted = onTitle && musicWanted && volume.master > 0 && volume.music > 0 && titleMusic.supported;
  const [titleHold, setTitleHold] = useState(titleWanted);
  // The title's gate: 'checking' while the first play() is tried, 'blocked' when the browser wants a tap first (the
  // title then shows only "Tap to begin"), 'open' otherwise. Any touch or key on the title starts the music.
  const [titleGate, setTitleGate] = useState(titleWanted ? 'checking' : 'open');
  useEffect(() => { titleMusic.setVolume?.(volume.master * volume.music); }, [titleMusic, volume.master, volume.music]);
  useEffect(() => {
    if (titleWanted) {
      setTitleHold(true);
      titleMusic.play();
      let current = true;
      titleMusic.audible.then((heard) => { if (current) setTitleGate((gate) => (gate === 'checking' ? (heard ? 'open' : 'blocked') : gate)); });
      if (typeof window === 'undefined') return () => { current = false; };
      // The rest of the title comes in a moment after the tap, so the tap's own click (iOS sends it after touchend)
      // cannot land on the Journey button that takes the place of "Tap to begin".
      let opening = null;
      const begin = () => {
        if (!titleMusic.heard) titleMusic.play();
        opening ??= window.setTimeout(() => { if (current) setTitleGate('open'); }, GATE_DELAY);
      };
      for (const name of GESTURES) window.addEventListener(name, begin, { capture: true });
      return () => {
        current = false;
        window.clearTimeout(opening);
        for (const name of GESTURES) window.removeEventListener(name, begin, { capture: true });
      };
    }
    setTitleGate('open');
    if (!titleMusic.playing) { setTitleHold(false); return undefined; }
    const seconds = onTitle ? AMBIENCE_HANDOVER : TITLE_MUSIC.fadeOut;
    titleMusic.fadeOut(seconds);
    const timer = setTimeout(() => setTitleHold(false), seconds * 1000);
    return () => clearTimeout(timer);
    // onTitle is read only when titleWanted changes
  }, [titleWanted, titleMusic]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    ambience.setVolumes?.({ master: volume.master, music: musicWanted && !titleHold ? volume.music : 0, effects: volume.effects }, { ease: titleHold ? 0.05 : 2 });
  }, [ambience, musicWanted, titleHold, volume.master, volume.music, volume.effects]);
  useEffect(() => { if (speech.speaker) speech.speaker.volume = volume.voice * volume.master; }, [speech, volume.voice, volume.master]);
  useEffect(() => {
    if (!audioWanted || !ambience.supported || typeof window === 'undefined') return undefined;
    // Round 184: any touch or key starts it (not only a click), and later ones wake a context iOS suspended or
    // interrupted (a call, Siri, another app's sound).
    const begin = () => { if (ambience.running) ambience.resume?.(); else ambience.start(); };
    for (const name of GESTURES) window.addEventListener(name, begin, { capture: true });
    const watch = window.setInterval(() => ambience.setLevel(speech.listener.listening ? 'mute' : speech.speaker.speaking ? 'duck' : 'full'), 400);
    return () => {
      for (const name of GESTURES) window.removeEventListener(name, begin, { capture: true });
      window.clearInterval(watch);
      ambience.stop();
    };
  }, [audioWanted, ambience, speech]);
  // Round 126: iOS Safari lets a page speak on its own only after it has spoken from inside a tap. The first tap does.
  const voicesWanted = state.display?.voices !== false;
  useEffect(() => {
    if (!voicesWanted || !speech.speaker.supported || typeof window === 'undefined') return undefined;
    const prime = () => speech.speaker.prime();
    window.addEventListener('click', prime, { once: true, capture: true });
    return () => window.removeEventListener('click', prime, { capture: true });
  }, [voicesWanted, speech]);
  // Round 146: on the road the rain is heard under the music, as heavy as it falls; elsewhere it is dry.
  // Round 204: the legacy dungeons have the road's sky and its rain, by the same seed, wherever they are entered from.
  const skySeed = state.road?.seed ?? state.titleSeed ?? null;
  const roadWeather = useWeather(skySeed);
  const rainNow = roadWeather?.rain ?? 0;
  useEffect(() => { ambience.setRain?.(audioWanted ? rainNow : 0); }, [ambience, audioWanted, rainNow]);
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
  // Round 144: on the road the phases are the road's own.
  const onRoad = state.mode === 'road';
  const roadTalking = onRoad && state.roadPhase === 'encounter';
  const roadEncounter = roadTalking && state.encounter?.road ? state.encounter : null;
  // Round 160 (issue #8): on the road a unit's gate stands in a legacy dungeon. While the player stands at that
  // dungeon's node the level behind the road's panels is the dungeon's own, at its first site (loaded only now: the
  // dungeon's host is its own chunk). The gate's keeper is a character without a model, so the site shows its beacon.
  // Round 185: a gate of streamlined mode has a conversation at each of several of the dungeon's sites (`siteId`).
  const legacyId = onRoad ? state.road?.here?.dungeon?.id ?? null : null;
  const legacySite = onRoad ? state.road?.here?.dungeon?.siteId ?? null : null;
  const legacy = useMemo(() => {
    const bundle = legacyId ? state.legacy?.[legacyId] : null;
    if (!bundle) return null;
    const at = bundle.sites.findIndex((entry) => entry.id === legacySite);
    const startIndex = at >= 0 ? at : Math.max(0, bundle.sites.findIndex((entry) => entry.id === bundle.start));
    return {
      dungeon: { ...bundle, sites: bundle.sites.map((entry, index) => (index === startIndex ? { ...entry, figure: null } : entry)) },
      startIndex,
      sites: Object.fromEntries(bundle.sites.map((entry, index) => [entry.id, { state: index === startIndex ? 'current' : 'visited', cleared: false, reachable: false }])),
    };
  }, [legacyId, legacySite, state.legacy]);
  // Round 191: the legacy dungeon's camera on rails, as the dungeon mode had it. It enters on foot, from outside the
  // gate, and from one of the gate's encounters to the next it walks the path between their sites at eye height
  // (director.walk), through the gate passages, in place of a drop from the sky to each. `legacyTrail` remembers the
  // site the camera stood at before this one in the same dungeon.
  const legacyTrail = useRef({ id: null, index: null, from: null });
  if (!legacy) legacyTrail.current = { id: null, index: null, from: null };
  else if (legacyTrail.current.id !== legacyId) legacyTrail.current = { id: legacyId, index: legacy.startIndex, from: null };
  else if (legacyTrail.current.index !== legacy.startIndex) legacyTrail.current = { id: legacyId, index: legacy.startIndex, from: legacyTrail.current.index };
  const legacyFrom = legacyTrail.current.from;
  const legacyPhase = { hub: 'enter', travel: legacyFrom !== null ? 'walk' : 'enter', encounter: 'encounter' }[state.roadPhase] ?? 'enter';
  const shellPhase = onRoad ? ({ hub: 'site', travel: 'walk', encounter: 'encounter' }[state.roadPhase] ?? 'site') : phase;
  const returnLabel = onRoad ? (roadTalking ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the road')
    : inEncounter || inParty_ ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the temple';
  // A site conversation under way that the store holds (the player left it for the site's card): Talk waits for it.
  const held = !inParty_ && state.encounter?.state === 'ongoing' ? state.encounter : null;
  const canTalk = ['attract', 'world', 'overview', 'site', 'victory'].includes(phase) || (inEncounter && state.encounter?.state === 'resolved');
  // Meanings stay hidden while a conversation is open or opening, whatever the snapshot says (round 017; review 1, R1.4).
  const conversing = state.encounter?.state === 'ongoing' || state.encounterLoading;
  const spellbook = conversing && !state.spellbook.inEncounter ? { ...state.spellbook, inEncounter: true } : state.spellbook;

  // Round 175: the title screen shows the road's landscape from above the clouds, and stays up after its button is
  // pressed until the road is here; the camera then zooms down into it.
  const atTitle = !onRoad && phase === 'attract';
  const titleShown = atTitle || (onRoad && !state.road);
  const titleSite = titleShown ? (state.road?.at ?? state.titleAt ?? '') : null;
  // Round 175: the map is always at hand. On the road it opens over whatever is on the screen, a conversation too;
  // in a place of the world map it is the place's own map (a conversation under way is left for it, and waits).
  const dungeonMap = !onRoad && !['attract', 'world', 'overview', 'victory'].includes(phase) && !inParty_;
  const openMapNow = onRoad ? (state.road ? () => state.openRoadPanel('map') : null)
    : dungeonMap ? () => { if (inEncounter && state.encounter?.state === 'ongoing') state.leaveConversation(); state.openMap(); } : null;
  const mapName = onRoad ? 'Map' : 'Map of the place';
  // What the menu's way out of a conversation does: the conversation waits, unfinished, where it was left.
  const ongoing = state.encounter?.state === 'ongoing';
  const leave = roadTalking && ongoing ? ['Leave the conversation', state.leaveRoadConversation]
    : !onRoad && inEncounter && ongoing ? ['Leave the conversation', state.leaveConversation]
    : inParty_ && ongoing ? ['Leave the conversation', state.leaveParty] : [null, null];
  const descending = onRoad && Boolean(state.road) && state.roadArrival === 'arrive' && !state.roadArrived && !state.roadError;
  const badge = (state.spellbook.dueCount ?? 0) + (state.guideNote?.unread?.length ?? 0);
  const panelBack = roadTalking ? `Back to ${state.encounter?.character?.name ?? 'the conversation'}` : 'Back to the road';

  return (
    <div className={`app-shell phase-${atTitle ? 'title' : shellPhase}${titleShown ? ' at-title' : ''}${onRoad ? ' on-road' : ''}${state.settingsOpen ? ' settings-open' : ''}`} style={{ '--panel-alpha': state.display?.panelOpacity ?? 0.7 }}>
      {onRoad && legacy
        ? <DungeonView dungeon={legacy.dungeon} phase={legacyPhase} siteIndex={legacy.startIndex} walkFrom={legacyFrom} sites={legacy.sites} insets={insets} onArrive={state.onRoadArrived}
          closed={state.closedObjectives} resolved={state.encounter?.state === 'resolved'} beat={state.beat} tilt={state.display?.tiltLook === true} glitch={state.display?.glitch === true} seed={skySeed} onThunder={() => { if (audioWanted) ambience.thunder?.(); }} />
        : onRoad || atTitle
        ? <RoadView road={state.road} seed={state.titleSeed} title={titleSite} shown={state.roadShown} arrival={state.roadArrival} from={state.roadFrom} talking={roadTalking || (state.roadPhase === 'hub' && Boolean(state.road?.current))} insets={insets} onArrive={state.onRoadArrived} onThunder={() => { if (audioWanted) ambience.thunder?.(); }}
          closed={state.closedObjectives} resolved={state.encounter?.state === 'resolved'} beat={state.beat} tilt={state.display?.tiltLook === true} />
        : <DungeonView dungeon={dungeon} phase={phase} siteIndex={siteIndex} walkFrom={state.walkFrom} sites={sites} insets={insets} onArrive={state.onCameraArrived}
          closed={state.closedObjectives} resolved={state.encounter?.state === 'resolved'} beat={state.beat} tilt={state.display?.tiltLook === true} glitch={state.display?.glitch === true} seed={skySeed} onThunder={() => { if (audioWanted) ambience.thunder?.(); }} />}

      <header className="hud" ref={hudRef}>
        {!atTitle && <div className="hud-title"><strong>ParaLLang</strong><span>{onRoad ? ROAD_NAME : dungeon.name}</span></div>}
        {!atTitle && <LevelChip progression={state.progression} />}
        {!onRoad && !atTitle && phase !== 'world' && (
          <ol className="pips" aria-label={`${cleared.length} of ${dungeon.sites.length} sites cleared`}>
            {dungeon.sites.map((entry, index) => (
              <li key={entry.id} className={cleared.includes(entry.id) ? 'done' : (atSite && index === siteIndex ? 'current' : undefined)} />
            ))}
          </ol>
        )}
        {/* Round 175: the same two buttons everywhere: the map (when there is one to show) and the menu. */}
        <nav aria-label="Menu">
          {onRoad && <CurriculumChip state={state} />}
          {openMapNow && <button type="button" className="secondary-button map-button" onClick={openMapNow} disabled={!onRoad && (state.isLoading || state.travelling)}>Map</button>}
          <button type="button" className="secondary-button menu-button" onClick={() => setMenuOpen(true)} aria-label={`Menu${badge > 0 ? `, ${badge} new` : ''}`} aria-haspopup="true">
            <span aria-hidden="true">☰</span> Menu{badge > 0 && <span className="due-badge" aria-hidden="true">{badge}</span>}
          </button>
        </nav>
      </header>

      {state.error && <div className="error-banner" role="alert"><span>{state.error}</span><button type="button" onClick={state.clearError} aria-label="Dismiss error">×</button></div>}

      <div className="dock" ref={dockRef}>
        {/* Round 175: while the camera comes down from the sky into the road, a line says where to; the site's card
            comes when it is there (on a phone the card would hide the whole descent). */}
        {onRoad && state.roadPhase === 'hub' && (descending ? <section className="caption" role="status"><span>Coming down to {state.road.here.name}…</span></section>
          : state.road && !state.roadWelcomed ? <WelcomeCard onClose={state.dismissWelcome} /> : <HubCard state={state} />)}
        {onRoad && state.roadPhase === 'travel' && <RoadCaption state={state} />}
        {roadTalking && <EncounterSheet state={state} site={null} sites={{}} speech={speech} height={sheetHeight} onHeight={setSheetHeight}
          road={{ title: roadEncounter?.road.title ?? 'A conversation', subtitle: roadEncounter ? `${roadEncounter.character.name}, ${roadEncounter.character.role} · ${roadEncounter.road.place}` : '' }} />}
        {atTitle && <TitleScreen state={state} gate={titleGate} />}
        {!onRoad && phase === 'world' && <WorldCard state={state} cleared={cleared} />}
        {!onRoad && phase === 'overview' && <OverviewCard state={state} sites={sites} />}
        {!onRoad && (phase === 'approach' || phase === 'walk') && <TravelCaption state={state} site={site} />}
        {!onRoad && inEncounter && <EncounterSheet state={state} site={site} sites={sites} speech={speech} height={sheetHeight} onHeight={setSheetHeight} />}
        {!onRoad && phase === 'site' && site && <SiteCard state={state} sites={sites} site={site} />}
        {!onRoad && inParty_ && <EncounterSheet state={state} site={site} sites={sites} party speech={speech} height={sheetHeight} onHeight={setSheetHeight} />}
        {!onRoad && phase === 'victory' && <VictoryCard state={state} />}
      </div>

      {onRoad && state.roadPanel && state.road && state.view === 'dialogue' && (
        <div className="overlay road-overlay">
          {state.roadPanel === 'map' && <RoadMap state={state} onClose={state.closeRoadPanel} closeLabel={panelBack} />}
          {state.roadPanel === 'curriculum' && <CurriculumPanel state={state} onClose={state.closeRoadPanel} closeLabel={panelBack} />}
        </div>
      )}

      {state.view !== 'dialogue' && (
        <div className="overlay">
          {state.view === 'party' && <PartyPanel party={state.party} sites={dungeon.sites} held={held} starting={state.partyStarting} canTalk={canTalk} isLoading={state.isLoading || state.travelling} onTalk={state.talkTo} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'guidebook' && <Guidebook guidebook={state.guidebook} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'spellbook' && <Spellbook spellbook={spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
          {state.view === 'review' && <ReviewPanel
            key={state.reviewChallenge?.id ?? 'result'}
            challenge={state.reviewChallenge} result={state.reviewResult} language={state.language} isLoading={state.isLoading}
            onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
            onContinue={() => state.startReview()} onReturn={state.returnToDialogue} returnLabel={returnLabel}
          />}
        </div>
      )}

      {menuOpen && <GameMenu state={state} onClose={() => setMenuOpen(false)} onMap={openMapNow} mapLabel={mapName} leave={leave[0]} onLeave={leave[1]} />}

      {state.slotsOpen && <SaveSlots slots={state.saveSlots} languages={state.languages} onSwitch={state.switchSlot} onDelete={state.deleteSlot} onClose={state.closeSlots} />}
      {state.settingsOpen && <SettingsSheet settings={state.settings} onSave={state.saveSettings} onClose={state.closeSettings} panelOpacity={state.display?.panelOpacity} onPanelOpacity={state.setPanelOpacity} tiltLook={state.display?.tiltLook === true} onTiltLook={state.setTiltLook}
        beginner={state.display?.beginner !== false} onBeginner={state.setBeginner}
        light={state.display?.light === true} onLight={state.setLight}
        follow={state.display?.follow !== false} onFollow={state.setFollow} waitGame={state.display?.waitGame === true} onWaitGame={state.setWaitGame} glitch={state.display?.glitch === true} onGlitch={state.setGlitch}
        streamlined={state.display?.streamlined !== false} onStreamlined={state.setStreamlined}
        immersion={state.display?.immersion} onImmersion={state.setImmersion} immersionAuto={state.display?.immersionAuto !== false} onImmersionAuto={state.setImmersionAuto} languageName={state.language?.name}
        music={musicWanted} onMusic={(on) => { state.setMusic(on); if (on) ambience.start(); }} musicSupported={ambience.supported}
        volume={volume} onVolume={(channel, value) => { state.setVolume(channel, value); if (value > 0) ambience.start(); }}
        voices={state.display?.voices !== false} onVoices={state.setVoices} narrator={state.display?.narrator !== false} onNarrator={state.setNarrator} narratorVoice={state.display?.narratorVoice} onNarratorVoice={state.setNarratorVoice} speechSupport={{ speak: speech.speaker.supported, listen: speech.listener.supported }}
        savedAt={state.savedAt} onExportCopy={state.exportCopy} onImportCopy={state.importCopy} saveStore={state.saveStore} />}
    </div>
  );
}
