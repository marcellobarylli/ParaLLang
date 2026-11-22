import { useEffect, useMemo, useRef, useState } from 'react';
import { createTerrain } from '../../../server/src/road/terrain.js';
import { GRAPH, createGraph } from '../../../server/src/road/graph.js';
import { currentWeather, onWeatherPin } from '../scene/weatherClock.js';

// Round 144: what the dock and the overlays show on The Long Way Home. The server's view of the road (`state.road`)
// says where the player is, who waits there and what each site ahead offers; the curriculum with the player's marks
// is `state.curriculum`. Nothing here decides anything: a button asks the store, the store asks the server.
//
// The characters have no models: a character is its description, shown in words (the owner asked for placeholders).

export const KIND = Object.freeze({
  lesson: { label: 'New', mark: 'N', what: 'New words' },
  review: { label: 'Review', mark: 'R', what: 'Earlier words, mixed' },
  repair: { label: 'Again', mark: 'A', what: 'A lesson again' },
  checkpoint: { label: 'Gate', mark: 'G', what: 'The gate of the unit, without hints' },
});
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
      <small>{offer.character.name}, {offer.character.role} · {offer.unitTitle}</small>
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
      <p className="next-line">Next: <strong>{next.offer.title}</strong> ({KIND[next.offer.kind].what.toLowerCase()}) with {next.offer.character.name}, {next.offer.character.role}, at {next.name}.</p>
      <button type="button" className="primary-button big-button" onClick={state.roadContinue} disabled={busy}>{state.roadTravelling ? 'Setting off…' : 'Continue'}</button>
    </>
  );
}

/** The player stands at a site with no conversation open. */
export function HubCard({ state }) {
  const { road, curriculum, roadLoading, roadError, encounterLoading } = state;
  if (!road) {
    return (
      <section className="card road-card" aria-label="The Long Way Home">
        <p className="eyebrow">The Long Way Home</p>
        <h2>{roadLoading ? 'Finding the road…' : 'The road is not here'}</h2>
        {roadError && <div className="problem" role="alert"><p>{roadError}</p><button type="button" className="secondary-button" onClick={state.openSettings}>Open Settings</button></div>}
        <div className="button-row"><button type="button" className="text-button" onClick={state.leaveRoad}>World map</button></div>
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
      <h2>{road.here.name}</h2>
      <WeatherLine seed={road.seed} />
      {waiting ? (
        <>
          <p className="who"><strong>{waiting.character.name}</strong>, {waiting.character.role}</p>
          <p className="description">{waiting.character.description}</p>
          <p className="what"><span className={`kind-tag kind-${waiting.kind}`}>{KIND[waiting.kind].label}</span> {waiting.title} <small>· {waiting.unitTitle}</small></p>
          <button type="button" className="primary-button big-button" onClick={() => state.roadTalk()} disabled={encounterLoading || state.roadTravelling}>{talkLabel}</button>
        </>
      ) : (
        <>
          <p>Nobody is waiting here now. A cairn marks the spot.</p>
          <WayOn state={state} />
        </>
      )}
      {roadError && <p className="problem" role="alert">{roadError}</p>}
      <RailsSwitch state={state} />
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => state.openRoadPanel('map')}>Map</button>
        <button type="button" className="secondary-button" onClick={() => state.openRoadPanel('curriculum')}>Curriculum</button>
        <button type="button" className="text-button" onClick={state.leaveRoad}>World map</button>
      </div>
    </section>
  );
}

export function RoadCaption({ state }) {
  const { road, roadArrived, encounterLoading, roadError } = state;
  const waiting = road?.current;
  if (roadError) return <section className="caption caption-problem" role="alert"><span>{roadError}</span></section>;
  const text = roadArrived && encounterLoading ? `${firstName(waiting?.character)} is getting ready to talk…` : `On the way to ${road?.here?.name ?? 'the next site'}…`;
  return <section className="caption" role="status">{text}</section>;
}

/** Under a finished conversation: what it did to the curriculum, and the way on. */
export function RoadResolved({ state, encounter }) {
  const { road, roadResult: result } = state;
  const recorded = road && road.current === null; // the road has been read again after the last answer
  return (
    <>
      <p>{encounter.resolvedMessage ?? `${encounter.character?.name ?? 'They'} lets you pass.`}</p>
      {result && (
        <p className="road-result" role="status">
          {result.kind === 'checkpoint'
            ? (result.passed ? `Through the gate, with ${percent(result.score)}.` : `Not through the gate yet: ${percent(result.score)}, and it opens at ${percent(result.needed)}. A lesson again first, then another try with other questions.`)
            : `${KIND[result.kind].label}: ${percent(result.score)} said cleanly.`}
          {result.opened?.unitTitle && ` A new unit begins: ${result.opened.unitTitle}.`}
          {result.opened?.complete && ' That was the last unit of the curriculum. The road goes on as review.'}
        </p>
      )}
      {recorded ? <WayOn state={state} /> : <p className="next-line" role="status">Writing it down…</p>}
      <RailsSwitch state={state} />
      <div className="button-row">
        <button type="button" className="text-button" onClick={() => { state.toRoadHub(); state.openRoadPanel('map'); }} disabled={!recorded || state.roadTravelling}>Map</button>
        <button type="button" className="text-button" onClick={() => { state.toRoadHub(); state.openRoadPanel('curriculum'); }} disabled={!recorded || state.roadTravelling}>Curriculum</button>
      </div>
    </>
  );
}

// The colour of a point of the landscape on the map, by what grows there and how high it is.
const MAP_COLOURS = { water: [47, 85, 82], shore: [186, 168, 120], meadow: [118, 142, 74], forest: [62, 98, 52], highland: [140, 136, 122], snow: [226, 230, 232] };
function shade(terrain, x, z) {
  const h = terrain.heightAt(x, z);
  const base = MAP_COLOURS[terrain.biomeAt(x, z, h)];
  // A hillshade from the slope towards the north-west, so ridges and valleys read.
  const light = Math.max(0.72, Math.min(1.22, 1 + (terrain.heightAt(x - 12, z - 12) - h) * -0.02));
  return base.map((value) => Math.max(0, Math.min(255, value * light)));
}

/**
 * The map: the landscape around the walk from above, the sites visited and the ways between them, and each site
 * ahead with what waits there. A tap picks a site; "Walk here" goes.
 */
export function RoadMap({ state, onClose }) {
  const { road } = state;
  const { terrain, graph } = useMemo(() => { const made = createTerrain(road.seed); return { terrain: made, graph: createGraph(made) }; }, [road.seed]);
  const canvasRef = useRef(null);
  const [picked, setPicked] = useState(road.rails ?? road.frontier[0]?.id ?? null);
  useEffect(() => { if (!road.frontier.some((site) => site.id === picked)) setPicked(road.rails ?? road.frontier[0]?.id ?? null); }, [road.frontier, road.rails, picked]);
  const sites = useMemo(() => {
    const point = (id) => { const node = graph.node(id); return node ? { id, x: node.x, z: node.z } : null; };
    return { trail: road.trail.map(point).filter(Boolean), here: point(road.at) };
  }, [graph, road.trail, road.at]);
  // The frame: every site of the trail shown and of the frontier, with a margin, square, at least five cells wide.
  const frame = useMemo(() => {
    const all = [...sites.trail.slice(-24), ...road.frontier.map((site) => ({ x: site.at[0], z: site.at[1] })), sites.here].filter(Boolean);
    const [minX, maxX] = [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
    const [minZ, maxZ] = [Math.min(...all.map((p) => p.z)), Math.max(...all.map((p) => p.z))];
    const span = Math.max(GRAPH.cell * 5, maxX - minX + GRAPH.cell * 1.6, maxZ - minZ + GRAPH.cell * 1.6);
    return { x: (minX + maxX) / 2 - span / 2, z: (minZ + maxZ) / 2 - span / 2, span };
  }, [sites, road.frontier]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.('2d');
    if (!context) return;
    const n = canvas.width;
    const image = context.createImageData(n, n);
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const [r, g, b] = shade(terrain, frame.x + ((i + 0.5) / n) * frame.span, frame.z + ((j + 0.5) / n) * frame.span);
        image.data.set([r, g, b, 255], (j * n + i) * 4);
      }
    }
    context.putImageData(image, 0, 0);
  }, [terrain, frame]);
  const u = (x) => ((x - frame.x) / frame.span) * 100;
  const v = (z) => ((z - frame.z) / frame.span) * 100;
  const line = (a, b) => (graph.pathPoints(a, b) ?? [[graph.node(a).x, graph.node(a).z], [graph.node(b).x, graph.node(b).z]]).map(([x, z]) => `${u(x).toFixed(2)},${v(z).toFixed(2)}`).join(' ');
  const cleared = new Set(road.cleared);
  const chosen = road.frontier.find((site) => site.id === picked) ?? null;
  const busy = state.roadTravelling || state.encounterLoading || state.isLoading;
  return (
    <main className="road-map-panel" aria-label="The map of the road">
      <div className="panel-heading">
        <div><h2>The map</h2><p>{road.here.name} · {road.step} {road.step === 1 ? 'conversation' : 'conversations'} so far</p></div>
        <button type="button" className="secondary-button" onClick={onClose}>Back to the road</button>
      </div>
      <div className="road-map">
        <canvas ref={canvasRef} width="112" height="112" aria-hidden="true" />
        <svg viewBox="0 0 100 100" role="img" aria-label={`A map with ${road.frontier.length} ${road.frontier.length === 1 ? 'site' : 'sites'} ahead`}>
          {sites.trail.slice(1).map((site, index) => <polyline key={`t${site.id}`} className="map-way walked" points={line(sites.trail[index].id, site.id)} />)}
          {road.frontier.map((site) => <polyline key={`f${site.id}`} className={`map-way ahead way-${site.way}`} points={line(site.from, site.id)} />)}
          {sites.trail.filter((site) => site.id !== road.at).map((site) => <rect key={site.id} className={`map-site ${cleared.has(site.id) ? 'cleared' : 'visited'}`} x={u(site.x) - 1.1} y={v(site.z) - 1.1} width="2.2" height="2.2" />)}
          {sites.here && <g className="map-here" transform={`translate(${u(sites.here.x)} ${v(sites.here.z)})`}><rect x="-2" y="-2" width="4" height="4" /><rect className="ring" x="-3.4" y="-3.4" width="6.8" height="6.8" /></g>}
          {road.frontier.map((site) => (
            <g key={site.id} className={`map-ahead kind-${site.offer.kind}${site.id === picked ? ' picked' : ''}${site.recommended ? ' rails' : ''}`} transform={`translate(${u(site.at[0])} ${v(site.at[1])})`}
              role="button" tabIndex="0" aria-label={`${site.name}: ${KIND[site.offer.kind].label}, ${site.offer.title}`} aria-pressed={site.id === picked}
              onClick={() => setPicked(site.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPicked(site.id); } }}>
              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" />
              <text y="1.5">{KIND[site.offer.kind].mark}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="map-legend"><small>
        <span className="kind-tag kind-lesson">N</span> new words · <span className="kind-tag kind-review">R</span> review · <span className="kind-tag kind-repair">A</span> a lesson again · <span className="kind-tag kind-checkpoint">G</span> the unit's gate. The ringed site is the pacing's choice; small squares are where you have been.
      </small></p>
      {chosen && (
        <section className="map-choice" aria-live="polite">
          <OfferLine offer={chosen.offer} />
          <p className="description">{chosen.offer.character.description}</p>
          <small className="way-why">{chosen.name}, by {WAY[chosen.way] ?? 'a way'}{chosen.offer.why ? ` · ${chosen.offer.why}` : ''}</small>
          <button type="button" className="primary-button big-button" onClick={() => state.roadTravel(chosen.id)} disabled={busy || state.encounter?.state === 'ongoing'}>Walk here</button>
          {state.encounter?.state === 'ongoing' && <small className="way-why">Finish or leave your conversation first.</small>}
        </section>
      )}
      <RailsSwitch state={state} />
    </main>
  );
}

/** Where the player is in the curriculum: every stage, unit and lesson with its marks, and how the pacing sees them. */
export function CurriculumPanel({ state, onClose }) {
  const { curriculum, road, savedAt } = state;
  if (!curriculum) return null;
  const { totals } = curriculum;
  return (
    <main className="curriculum-panel" aria-label="The curriculum">
      <div className="panel-heading">
        <div><h2>The curriculum</h2><p>{positionLine(curriculum)}</p></div>
        <button type="button" className="secondary-button" onClick={onClose}>Back to the road</button>
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
