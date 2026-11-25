import { useEffect, useMemo, useRef, useState } from 'react';
import { createTerrain } from '../../../server/src/road/terrain.js';
import { createGraph } from '../../../server/src/road/graph.js';
import { currentWeather, onWeatherPin } from '../scene/weatherClock.js';
import { ROAD_MAP, createMapView, renderMap } from '../roadMap.js';
import { ROAD_NAME } from '../atlas.js';
import Narration, { hasNarration } from './Narration.jsx';
import { GuideNote } from './Guidebook.jsx';
import OdysseyChart from './OdysseyChart.jsx';

// Round 144: what the dock and the overlays show on The Journey 2. The server's view of the road (`state.road`)
// says where the player is, who waits there and what each site ahead offers; the curriculum with the player's marks
// is `state.curriculum`. Nothing here decides anything: a button asks the store, the store asks the server.
//
// The characters have no models: a character is its description, shown in words (the owner asked for placeholders).

export const KIND = Object.freeze({
  lesson: { label: 'New', mark: 'N', what: 'New words' },
  unit: { label: 'Unit', mark: 'U', what: 'The whole unit in one conversation' }, // round 173: streamlined mode
  review: { label: 'Review', mark: 'R', what: 'Earlier words, mixed' },
  repair: { label: 'Again', mark: 'A', what: 'A lesson again' },
  checkpoint: { label: 'Gate', mark: 'G', what: 'The gate of the unit, without hints' },
  // Round 185: streamlined mode's gate, after every three units: one conversation for each, in an old place.
  gate: { label: 'Gate', mark: 'G', what: 'The gate of the last three units, one conversation for each' },
});
/** Round 160: " · Ta Prohm in 3 conversations or more": how far the unit's gate is, and the dungeon it stands in. */
export function gateLine(gate) {
  if (!gate?.dungeon) return '';
  return gate.hops > 0 ? ` · ${gate.dungeon.name} in ${gate.hops} ${gate.hops === 1 ? 'conversation' : 'conversations'} or more` : ` · ${gate.dungeon.name} is near`;
}
const WAY = Object.freeze({ path: 'a path', ford: 'a ford through water', pass: 'a steep pass', ferry: 'a ferry across the water' });
const percent = (value) => `${Math.round((value ?? 0) * 100)} %`;
const firstName = (character) => character?.name?.split(' ')[0] ?? 'them';

/** "A1 · unit 3 of 12 · Where you are from", or what stands in for it when the curriculum is finished. */
export function positionLine(curriculum) {
  if (!curriculum) return '';
  if (curriculum.complete || !curriculum.position) return 'The curriculum is finished: the road goes on as review';
  const units = curriculum.stages.flatMap((stage) => stage.units);
  const index = units.findIndex((unit) => unit.id === curriculum.position.unitId);
  return `${curriculum.position.cefr} · unit ${index + 1} of ${units.length} · ${curriculum.position.unitTitle}`;
}

// Round 146: the time of day and the weather of the road of `seed`, as the level shows them (the same clock and seed).
// Looked at again every few seconds.
export function useWeather(seed, now = () => Date.now()) {
  const [weather, setWeather] = useState(() => (seed === null || seed === undefined ? null : currentWeather(seed, now())));
  useEffect(() => {
    if (seed === null || seed === undefined) { setWeather(null); return undefined; }
    const look = () => setWeather(currentWeather(seed, now()));
    look();
    const timer = setInterval(look, 4000);
    const stop = onWeatherPin(look);
    return () => { clearInterval(timer); stop(); };
  }, [seed]);
  return weather;
}
const SKY_MARK = { clear: '☀', 'grey skies': '☁', 'light rain': '☂', 'heavy rain': '☂', 'a storm': '⚡' };
function WeatherLine({ seed }) {
  const weather = useWeather(seed);
  if (!weather) return null;
  const mark = weather.part === 'night' && weather.sky === 'clear' ? '☾' : SKY_MARK[weather.sky];
  return <p className="weather-line" aria-label={`The weather: ${weather.label}`}><span aria-hidden="true">{mark}</span> {weather.label}</p>;
}

function OfferLine({ offer }) {
  return (
    <span className="site-text">
      <strong><span className={`kind-tag kind-${offer.kind}`}>{KIND[offer.kind].label}</span> {offer.title}</strong>
      <small>{offer.character.name}, {offer.character.role} · {offer.unitTitle}{offer.dungeon ? ` · in ${offer.dungeon.name}` : ''}</small>
    </span>
  );
}

// The sites ahead, each with what waits there. The rails' own choice is first and marked.
export function WaysAhead({ state, onPick = state.roadTravel }) {
  const { road } = state;
  const sites = [...road.frontier].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return (
    <ul className="ways road-ways" aria-label="Ways on">
      {sites.map((site) => (
        <li key={site.id}>
          <button type="button" className={site.recommended ? 'primary-button' : 'secondary-button'} onClick={() => onPick(site.id)} disabled={state.roadTravelling || state.encounterLoading || state.isLoading}>
            <OfferLine offer={site.offer} />
          </button>
          <small className="way-why">{site.name}, by {WAY[site.way] ?? 'a way'}{site.recommended ? ' · the pacing\'s choice' : ''}</small>
        </li>
      ))}
    </ul>
  );
}

function RailsSwitch({ state }) {
  const on = state.display?.rails !== false;
  return (
    <label className="setting-check rails-switch">
      <input type="checkbox" checked={on} onChange={(event) => state.setRails(event.target.checked)} />
      <span>On rails</span>
      <small>{on ? 'The way on is chosen for you.' : 'You choose the way on.'}</small>
    </label>
  );
}

// The way on after a conversation, or at a site where nobody waits: one button on rails, the choices otherwise.
function WayOn({ state }) {
  const { road } = state;
  const rails = state.display?.rails !== false;
  const next = road.frontier.find((site) => site.id === road.rails) ?? null;
  const busy = state.roadTravelling || state.encounterLoading || state.isLoading;
  if (!road.frontier.length) return <p>The road ends here, which it is not supposed to do.</p>;
  if (!rails || !next) return <WaysAhead state={state} />;
  return (
    <>
      <p className="next-line">Next: <strong>{next.offer.title}</strong> ({KIND[next.offer.kind].what.toLowerCase()}) with {next.offer.character.name}, {next.offer.character.role}, {next.offer.dungeon ? `in ${next.offer.dungeon.name}, beyond ${next.name}` : `at ${next.name}`}.</p>
      {/* Round 160: the next site is a legacy dungeon's node: the way on enters the dungeon. */}
      <button type="button" className="primary-button big-button" onClick={state.roadContinue} disabled={busy}>{state.roadTravelling ? 'Setting off…' : next.offer.dungeon ? `Enter ${next.offer.dungeon.name}` : 'Continue'}</button>
    </>
  );
}

/** The player stands at a site with no conversation open. */
// Round 180: the opening message. The camera has come down to the start of the journey and the first character
// stands there behind it; the arrival's card waits until it is closed.
export function WelcomeCard({ onClose }) {
  return (
    <div className="welcome-backdrop">
      <section className="card welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <p className="eyebrow">Before you set out</p>
        <h2 id="welcome-title">In the beginning was the Word</h2>
        <p>We believe a language is learned best the way you learned your first one: by living in it.</p>
        <p>So this world is learned by talking to the people who live in it. Ask them things, get to know them, pick up their words as they use them, and some of what they would rather you did not ask.</p>
        <p className="welcome-teaser">Listen closely, though. Lately the words here have begun to mean a little more than they should, and something is pulling at the seams. Whatever it is seems to be pulling from your side.</p>
        <button type="button" className="primary-button big-button" onClick={onClose} autoFocus>Set out</button>
      </section>
    </div>
  );
}

export function HubCard({ state }) {
  const { road, curriculum, roadLoading, roadError, encounterLoading } = state;
  if (!road) {
    return (
      <section className="card road-card" aria-label={ROAD_NAME}>
        <p className="eyebrow">{ROAD_NAME}</p>
        <h2>{roadLoading ? 'Finding the road…' : 'The road is not here'}</h2>
        {roadError && <div className="problem" role="alert"><p>{roadError}</p><button type="button" className="secondary-button" onClick={state.openSettings}>Open Settings</button></div>}
        <div className="button-row"><button type="button" className="text-button" onClick={state.toTitle}>Back to the title</button></div>
      </section>
    );
  }
  const waiting = road.current;
  const held = state.encounter?.state === 'ongoing' && state.encounter.road?.node === road.at;
  const name = firstName(waiting?.character);
  const talkLabel = encounterLoading ? `${name} is getting ready to talk…` : held ? 'Back to the conversation' : `Talk to ${name}`;
  return (
    <section className="card road-card" aria-label={road.here.name}>
      <p className="eyebrow">{positionLine(curriculum)}</p>
      {/* Round 160: in a legacy dungeon the place is the dungeon's; on the road it has its biome beside its name. */}
      <h2>{road.here.dungeon ? `${road.here.dungeon.name}: ${road.here.dungeon.siteName}` : road.here.name}</h2>
      {!road.here.dungeon && road.here.biomeName && <p className="biome-line">{road.here.biomeName}{gateLine(road.gate)}</p>}
      {!road.here.dungeon && <WeatherLine seed={road.seed} />}
      {/* Round 156: what the narrator said of the arrival here. */}
      <Narration narration={road.narration} />
      <GuideNote note={state.guideNote} onOpen={state.openGuidebook} />
      {waiting ? (
        <>
          <p className="who"><strong>{waiting.character.name}</strong>, {waiting.character.role}</p>
          <p className="description">{waiting.character.description}</p>
          <p className="what"><span className={`kind-tag kind-${waiting.kind}`}>{KIND[waiting.kind].label}</span> {waiting.title} <small>· {waiting.unitTitle}</small></p>
          <button type="button" className="primary-button big-button" onClick={() => state.roadTalk()} disabled={encounterLoading || state.roadTravelling}>{talkLabel}</button>
        </>
      ) : (
        <>
          <p className="narrative">Nobody waits here now. Somebody has left a cairn, the way people do when they expect not to be believed.</p>
          <WayOn state={state} />
        </>
      )}
      {roadError && <p className="problem" role="alert">{roadError}</p>}
      {/* Round 175: the map, the curriculum and the ways out are in the top bar and its menu, as everywhere. */}
      <RailsSwitch state={state} />
    </section>
  );
}

export function RoadCaption({ state }) {
  const { road, roadArrived, encounterLoading, roadError } = state;
  const waiting = road?.current;
  if (roadError) return <section className="caption caption-problem" role="alert"><span>{roadError}</span></section>;
  const text = roadArrived && encounterLoading ? `${firstName(waiting?.character)} is getting ready to talk…` : road?.here?.dungeon ? `Entering ${road.here.dungeon.name}…` : `On the way to ${road?.here?.name ?? 'the next site'}…`;
  // Round 156: while the camera walks, the narrator tells the way taken. Round 166: the passage stays until the
  // character is ready to talk, so there is something to read while the conversation loads, and what the game is
  // doing ("On the way to…", "… is getting ready to talk…") is the passage's last sentence.
  return <section className="caption" role="status">{hasNarration(road?.narration) ? <Narration narration={road.narration} after={text} /> : <span>{text}</span>}</section>;
}

/** Under a finished conversation: what it did to the curriculum, and the way on. */
export function RoadResolved({ state, encounter }) {
  const { road, roadResult: result } = state;
  const recorded = road && road.current === null; // the road has been read again after the last answer
  return (
    <>
      <p className="narrative">{encounter.resolvedMessage ?? `${encounter.character?.name ?? 'They'} lets you pass.`}</p>
      {result && (
        <p className="road-result" role="status">
          {result.kind === 'checkpoint'
            ? (result.passed ? `Through the gate, with ${percent(result.score)}.` : `Not through the gate yet: ${percent(result.score)}, and it opens at ${percent(result.needed)}. A lesson again first, then another try with other questions.`)
            : result.kind === 'gate'
              ? (result.part < result.of ? `The gate, ${result.part} of ${result.of}: ${percent(result.score)} said cleanly. Further in, someone else is waiting.` : `Through the gate: all ${result.of} conversations, the last with ${percent(result.score)} said cleanly.`)
              : `${KIND[result.kind].label}: ${percent(result.score)} said cleanly.`}
          {result.opened?.unitTitle && ` A new unit begins: ${result.opened.unitTitle}.`}
          {result.opened?.complete && ' That was the last unit of the curriculum. The road goes on as review.'}
        </p>
      )}
      {recorded ? <WayOn state={state} /> : <p className="next-line" role="status">Writing it down…</p>}
      <RailsSwitch state={state} />
    </>
  );
}

// A square lying on the ground as the map shows it: twice as wide as it is deep.
const MAP_TILE = (half) => `${-half},0 0,${-half * 0.58} ${half},0 0,${half * 0.58}`;

/**
 * The map: the landscape around the walk seen from far off and above at an angle (roadMap.js), so its hills and
 * lakes show, with the sites visited, the ways between them and each site ahead with what waits there. A tap picks
 * a site; "Walk here" goes.
 */
export function RoadMap({ state, onClose, closeLabel = 'Back to the road' }) {
  const { road } = state;
  const { terrain, graph } = useMemo(() => { const made = createTerrain(road.seed); return { terrain: made, graph: createGraph(made) }; }, [road.seed]);
  const canvasRef = useRef(null);
  const [picked, setPicked] = useState(road.rails ?? road.frontier[0]?.id ?? null);
  useEffect(() => { if (!road.frontier.some((site) => site.id === picked)) setPicked(road.rails ?? road.frontier[0]?.id ?? null); }, [road.frontier, road.rails, picked]);
  const sites = useMemo(() => {
    const point = (id) => graph.node(id);
    return { trail: road.trail.map(point).filter(Boolean), here: point(road.at), ahead: road.frontier.map((site) => point(site.id)) };
  }, [graph, road.trail, road.at, road.frontier]);
  // Round 161 (issue #9): "Show Journey so far". The whole walk, as the server keeps it, painted on the map; the frame
  // then holds all of it, from as far off as that takes. The walk is of this landscape (its seed) or it is not shown.
  const journey = state.journeyShown && state.journey?.seed === road.seed ? state.journey : null;
  const walked = useMemo(() => (journey ? journey.nodes.map((id) => graph.node(id)).filter(Boolean) : null), [journey, graph]);
  // The frame holds the last sites of the trail and every site ahead; the rest of the trail shows where it falls.
  const view = useMemo(() => (walked?.length
    ? createMapView([...walked, sites.here].filter(Boolean), { farthest: ROAD_MAP.journey })
    : createMapView([...sites.trail.slice(-ROAD_MAP.recent), ...sites.ahead, sites.here].filter(Boolean))), [sites, walked]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.('2d');
    if (!context) return;
    const picture = renderMap(terrain, view);
    Object.assign(canvas, { width: picture.width, height: picture.height });
    const image = context.createImageData(picture.width, picture.height);
    image.data.set(picture.data);
    context.putImageData(image, 0, 0);
  }, [terrain, view]);
  const place = (node) => view.project(node.x, node.z, node.y);
  const at = (node) => { const [x, y] = place(node); return `translate(${x.toFixed(2)} ${y.toFixed(2)})`; };
  // A way lies on the ground: every point of it is drawn at its own height.
  const line = (a, b) => (graph.pathPoints(a, b) ?? [[graph.node(a).x, graph.node(a).z], [graph.node(b).x, graph.node(b).z]])
    .map(([x, z]) => view.project(x, z, terrain.heightAt(x, z)).map((value) => value.toFixed(2)).join(',')).join(' ');
  const cleared = new Set(road.cleared);
  const chosen = road.frontier.find((site) => site.id === picked) ?? null;
  const busy = state.roadTravelling || state.encounterLoading || state.isLoading || state.roadPhase === 'travel';
  const leaving = state.roadPhase === 'encounter' && state.encounter?.state === 'ongoing';
  return (
    <main className="road-map-panel" aria-label="The map of the road">
      <div className="panel-heading">
        <div><h2>The map</h2><p>{road.here.name} · {road.step} {road.step === 1 ? 'conversation' : 'conversations'} so far</p></div>
        <button type="button" className="secondary-button" onClick={onClose}>{closeLabel}</button>
      </div>
      <div className="road-map" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
        <canvas ref={canvasRef} width={ROAD_MAP.columns} height={Math.round((ROAD_MAP.columns * view.height) / view.width)} aria-hidden="true" />
        <svg viewBox={`0 0 ${view.width} ${view.height}`} role="img" aria-label={`A map with ${road.frontier.length} ${road.frontier.length === 1 ? 'site' : 'sites'} ahead`}>
          {!walked && sites.trail.slice(1).map((site, index) => <polyline key={`t${index}${site.id}`} className="map-way walked" points={line(sites.trail[index].id, site.id)} />)}
          {!walked && road.frontier.map((site) => <polyline key={`f${site.id}`} className={`map-way ahead way-${site.way}`} points={line(site.from, site.id)} />)}
          {/* Round 161: the journey: one line through every site walked to, in order, and a mark where it began. */}
          {walked && walked.length > 1 && <polyline className="map-journey-edge" points={walked.map((node) => place(node).map((value) => value.toFixed(2)).join(',')).join(' ')} />}
          {walked && walked.length > 1 && <polyline className="map-journey" points={walked.map((node) => place(node).map((value) => value.toFixed(2)).join(',')).join(' ')} />}
          {walked && walked[0] && <g className="map-journey-start" transform={at(walked[0])}><circle r="1.5" /><title>Where the journey began</title></g>}
          {!walked && sites.trail.filter((site) => site.id !== road.at).map((site, index) => <polygon key={`s${index}${site.id}`} className={`map-site ${cleared.has(site.id) ? 'cleared' : 'visited'}`} points={MAP_TILE(1.5)} transform={at(site)} />)}
          {sites.here && <g className="map-here" transform={at(sites.here)}><polygon className="ring" points={MAP_TILE(4.2)} /><polygon points={MAP_TILE(2.3)} /><line y2="-5" /><rect x="-1.1" y="-7.2" width="2.2" height="2.2" /></g>}
          {!walked && road.frontier.map((site, index) => sites.ahead[index] && (
            <g key={site.id} className={`map-ahead kind-${site.offer.kind}${site.offer.dungeon ? ' dungeon' : ''}${site.id === picked ? ' picked' : ''}${site.recommended ? ' rails' : ''}`} transform={at(sites.ahead[index])}
              role="button" tabIndex="0" aria-label={`${site.offer.dungeon ? `${site.offer.dungeon.name}, beyond ${site.name}` : site.name}: ${KIND[site.offer.kind].label}, ${site.offer.title}`} aria-pressed={site.id === picked}
              onClick={() => setPicked(site.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPicked(site.id); } }}>
              <rect className="hit" x="-4.4" y="-10.4" width="8.8" height="12" />
              <ellipse className="foot" rx="2" ry="1.1" />
              <line className="stem" y2="-3.2" />
              {/* Round 160: a legacy dungeon's node is a gate with a stepped top, not a sign. */}
              {site.offer.dungeon
                ? <polygon className="sign" points="-3.6,-3.2 -3.6,-8.4 -2,-8.4 -2,-10 -0.9,-10 -0.9,-11.4 0.9,-11.4 0.9,-10 2,-10 2,-8.4 3.6,-8.4 3.6,-3.2 1.3,-3.2 1.3,-6.2 -1.3,-6.2 -1.3,-3.2" />
                : <rect className="sign" x="-2.9" y="-9" width="5.8" height="5.8" />}
              {!site.offer.dungeon && <text y="-4.7">{KIND[site.offer.kind].mark}</text>}
            </g>
          ))}
        </svg>
      </div>
      {/* Round 161 (issue #9): the whole walk so far, painted on the map. */}
      <div className="button-row journey-row">
        <button type="button" className="secondary-button" aria-pressed={state.journeyShown === true} onClick={state.toggleJourney} disabled={state.journeyLoading}>
          {state.journeyShown ? 'Hide the journey' : 'Show Journey so far'}
        </button>
        {state.journeyShown && <small role="status">{journey ? `${journey.hops} ${journey.hops === 1 ? 'walk' : 'walks'} from where you began${journey.kept <= journey.hops ? ` (the last ${journey.kept - 1} are kept)` : ''}.` : 'Reading the journey…'}</small>}
      </div>
      {/* Round 163 (issue #13): a journey of a hundred walks, shown whole: the narrator remarks on it, and shows the
          one other line like it. */}
      {journey && state.journeyRemark && (
        <aside className="journey-remark" aria-label="The narrator, on your journey">
          <Narration narration={state.journeyRemark} />
          <OdysseyChart />
        </aside>
      )}
      <p className="map-legend"><small>
        {road.streamlined && <><span className="kind-tag kind-unit">U</span> a whole unit in one conversation (streamlined, in Settings) · </>}<span className="kind-tag kind-lesson">N</span> new words · <span className="kind-tag kind-review">R</span> review · <span className="kind-tag kind-repair">A</span> a lesson again · <span className="kind-tag kind-checkpoint">G</span> {road.streamlined ? 'the gate of the last three units, three conversations' : 'the unit\'s gate'}, which stands in an old place (the stepped gate on the map).{road.gate?.dungeon ? ` The next is ${road.gate.dungeon.name}${road.gate.hops > 0 ? `, in ${road.gate.hops} ${road.gate.hops === 1 ? 'conversation' : 'conversations'} or more` : ', and it is near'}.` : ''} The ringed sign is the pacing's choice; the small tiles are where you have been, and the white post is where you stand. Heights are drawn taller than they are.
      </small></p>
      {chosen && !walked && (
        <section className="map-choice" aria-live="polite">
          <OfferLine offer={chosen.offer} />
          <p className="description">{chosen.offer.character.description}</p>
          <small className="way-why">{chosen.offer.dungeon ? `${chosen.offer.dungeon.name}, beyond ${chosen.name}` : chosen.name}, by {WAY[chosen.way] ?? 'a way'}{chosen.offer.why ? ` · ${chosen.offer.why}` : ''}</small>
          {/* Round 175: from a conversation under way too: it is left unfinished, as Leave leaves it. */}
          <button type="button" className="primary-button big-button" onClick={() => state.roadTravel(chosen.id)} disabled={busy}>{leaving ? 'Leave the conversation and walk here' : chosen.offer.dungeon ? `Enter ${chosen.offer.dungeon.name}` : 'Walk here'}</button>
          {leaving && <small className="way-why">{state.encounter.character?.name ?? 'They'} will not have let you pass; the conversation can be had again later.</small>}
        </section>
      )}
      <RailsSwitch state={state} />
    </main>
  );
}

/** Where the player is in the curriculum: every stage, unit and lesson with its marks, and how the pacing sees them. */
export function CurriculumPanel({ state, onClose, closeLabel = 'Back to the road' }) {
  const { curriculum, road, savedAt } = state;
  if (!curriculum) return null;
  const { totals } = curriculum;
  return (
    <main className="curriculum-panel" aria-label="The curriculum">
      <div className="panel-heading">
        <div><h2>The curriculum</h2><p>{positionLine(curriculum)}</p></div>
        <button type="button" className="secondary-button" onClick={onClose}>{closeLabel}</button>
      </div>
      <p className="curriculum-totals">
        {totals.lessonsDone} of {totals.lessonsTotal} lessons · {totals.unitsDone} of {totals.unitsTotal} units · {road?.step ?? 0} conversations.
        {curriculum.successRate !== null && ` Lately ${percent(curriculum.successRate)} said cleanly; the pacing aims at about ${percent(curriculum.target)}: lower, and reviews come more often; higher, and they thin out.`}
      </p>
      <p className="saved-line"><small>{savedAt ? `Saved on the server and copied to this browser at ${new Date(savedAt).toLocaleTimeString()}.` : 'Saved on the server after every answer.'}</small></p>
      {curriculum.stages.map((stage) => (
        <section className="stage" key={stage.id}>
          <h3><span className="cefr">{stage.cefr}</span> {stage.name}</h3>
          <p className="can-do">{stage.canDo}</p>
          <ol className="units">
            {stage.units.map((unit) => (
              <li key={unit.id} className={`unit unit-${unit.state}`}>
                <div className="unit-head">
                  <strong>{unit.title}</strong>
                  <span className="unit-state">{unit.state === 'done' ? 'done' : unit.state === 'current' ? 'you are here' : 'locked'}</span>
                </div>
                <small className="can-do">{unit.canDo}</small>
                <small className="grammar">{unit.grammar}</small>
                <ul className="lessons">
                  {unit.lessons.map((lesson) => (
                    <li key={lesson.id} className={lesson.done ? 'done' : undefined}>
                      <span aria-hidden="true">{lesson.done ? '✓' : '·'}</span> {lesson.title}
                      {lesson.done > 0 && <small> {percent(lesson.best)}{lesson.done > 1 ? ` · ${lesson.done} times` : ''}</small>}
                    </li>
                  ))}
                  <li className={unit.checkpoint.passed ? 'done gate' : 'gate'}>
                    <span aria-hidden="true">{unit.checkpoint.passed ? '✓' : '▸'}</span> The gate
                    {unit.checkpoint.tries > 0 && <small> {percent(unit.checkpoint.best)}{unit.checkpoint.passed ? '' : ` · ${unit.checkpoint.tries} ${unit.checkpoint.tries === 1 ? 'try' : 'tries'}`}</small>}
                  </li>
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {road?.log?.length > 0 && (
        <section className="stage journal">
          <h3>The journal</h3>
          <ol className="journal-list">
            {road.log.map((entry) => (
              <li key={entry.step}><span className={`kind-tag kind-${entry.kind}`}>{KIND[entry.kind]?.label ?? entry.kind}</span> {entry.title} <small>· {entry.character}, {entry.role}, at {entry.place} · {percent(entry.score)}</small></li>
            ))}
          </ol>
        </section>
      )}
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => state.newRoad()} disabled={state.roadLoading || state.encounter?.state === 'ongoing'}>A new landscape (the curriculum is kept)</button>
      </div>
    </main>
  );
}

/** The top bar's chip on the road: the stage and how far through it. */
export function CurriculumChip({ state }) {
  const { curriculum } = state;
  if (!curriculum) return null;
  const { totals } = curriculum;
  return (
    <button type="button" className="secondary-button curriculum-chip" onClick={() => state.openRoadPanel('curriculum')} aria-label={`The curriculum: ${positionLine(curriculum)}`}>
      {curriculum.position?.cefr ?? '★'} <span className="due-badge">{totals.unitsDone}/{totals.unitsTotal}</span>
    </button>
  );
}
