import { useId, useMemo } from 'react';
import odyssey from '../../../content/world/odyssey.yaml';
import odysseyMap from '../../../content/world/odyssey-map.json';

// Round 163 (issue #13): a chart of the voyage of Odysseus, shown beside the narrator's remark that a long walk on
// rails looks like a random walk. Round 165 put a real map under it and drew it as an old sea chart.
//
// What is real: the coast (Natural Earth's land at 1:10m, in content/world/odyssey-map.json), the degrees on the
// border, and the places of the names. What is tradition: where each stop stands (content/world/odyssey.yaml says
// what that rests on). What is neither: the line between two stops, which is only the shortest way by sea.
//
// The projection is the plain one of an old chart: longitude across and latitude up, a degree of longitude drawn
// as long as it is on the ground at the middle of the frame (the cosine of that latitude), so shapes are true there.
export const ODYSSEY = odyssey;
export const ODYSSEY_MAP = odysseyMap;
const UNIT = 5; // chart units a degree of latitude
const BORDER = 2; // the width of the border round the map, in chart units
const ROSE = 4.4; // the reach of the compass rose's long points

const squeeze = (frame) => Math.cos((((frame.north + frame.south) / 2) * Math.PI) / 180);
const fix = (n) => Math.round(n * 100) / 100;

/** Where a place is on the chart: [x, y] in the chart's own units. */
export function chartPoint(place, frame = odyssey.frame) {
  return [(place.lon - frame.west) * UNIT * squeeze(frame), (frame.north - place.lat) * UNIT];
}

/** A flat list of whole numbers (lon, lat, lon, lat, ...) as places. */
export function placesOf(flat, scale = odysseyMap.scale) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ lon: flat[i] / scale, lat: flat[i + 1] / scale });
  return out;
}

const landPath = (rings, frame, scale) => rings.map((ring) => `M${placesOf(ring, scale).map((place) => chartPoint(place, frame).map(fix).join(' ')).join('L')}Z`).join('');

/** A leg of the route as a path, its corners rounded as a pen rounds them. */
function legPath(leg, frame, scale) {
  const points = placesOf(leg, scale).map((place) => chartPoint(place, frame));
  const at = ([x, y]) => `${fix(x)} ${fix(y)}`;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (points.length < 3) return `M${points.map(at).join('L')}`;
  let d = `M${at(points[0])}L${at(mid(points[0], points[1]))}`;
  for (let i = 1; i < points.length - 1; i += 1) d += `Q${at(points[i])} ${at(mid(points[i], points[i + 1]))}`;
  return `${d}L${at(points.at(-1))}`;
}

/** The border's scale: one bar a whole degree, dark and light by turns. */
function degreeBars(frame, width, height) {
  const bars = [];
  const k = UNIT * squeeze(frame);
  for (let d = Math.floor(frame.west); d < frame.east; d += 1) {
    const [a, b] = [Math.max(frame.west, d), Math.min(frame.east, d + 1)];
    if (d % 2 === 0) bars.push({ key: `x${d}`, x: (a - frame.west) * k, w: (b - a) * k, across: true });
  }
  for (let d = Math.floor(frame.south); d < frame.north; d += 1) {
    const [a, b] = [Math.max(frame.south, d), Math.min(frame.north, d + 1)];
    if (d % 2 === 0) bars.push({ key: `y${d}`, y: (frame.north - b) * UNIT, h: (b - a) * UNIT, across: false });
  }
  const band = BORDER * 0.45;
  return bars.flatMap((bar) => (bar.across
    ? [<rect key={`${bar.key}t`} className="bar" x={fix(bar.x)} y={-band} width={fix(bar.w)} height={band} />, <rect key={`${bar.key}b`} className="bar" x={fix(bar.x)} y={height} width={fix(bar.w)} height={band} />]
    : [<rect key={`${bar.key}l`} className="bar" x={-band} y={fix(bar.y)} width={band} height={fix(bar.h)} />, <rect key={`${bar.key}r`} className="bar" x={width} y={fix(bar.y)} width={band} height={fix(bar.h)} />]));
}

/** The compass rose: eight points, each half dark and half light, and the lines of the winds running out of it. */
function Rose({ at: [x, y] }) {
  const point = (angle, reach) => [Math.sin((angle * Math.PI) / 180) * reach, -Math.cos((angle * Math.PI) / 180) * reach];
  const ray = (angle, reach, waist) => {
    const [tip, left, right] = [point(angle, reach), point(angle - 45, waist), point(angle + 45, waist)];
    const d = (a, b) => `M0 0L${fix(a[0])} ${fix(a[1])}L${fix(b[0])} ${fix(b[1])}Z`;
    return [<path key={`${angle}d`} className="rose-dark" d={d(tip, left)} />, <path key={`${angle}l`} className="rose-light" d={d(tip, right)} />];
  };
  return (
    <g className="rose" transform={`translate(${fix(x)} ${fix(y)})`}>
      <circle className="rose-ring" r={ROSE * 0.7} />
      <circle className="rose-ring" r={ROSE * 0.62} />
      {[45, 135, 225, 315].flatMap((angle) => ray(angle, ROSE * 0.62, ROSE * 0.16))}
      {[0, 90, 180, 270].flatMap((angle) => ray(angle, ROSE, ROSE * 0.2))}
      <text className="rose-north" y={-ROSE - 0.5}>N</text>
    </g>
  );
}

export default function OdysseyChart({ chart = odyssey, map = odysseyMap }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { frame, stops } = chart;
  const [width, height] = [(frame.east - frame.west) * UNIT * squeeze(frame), (frame.north - frame.south) * UNIT].map(fix);
  const land = useMemo(() => landPath(map.rings, frame, map.scale), [map, frame]);
  const legs = useMemo(() => map.route.map((leg) => legPath(leg, frame, map.scale)), [map, frame]);
  const points = stops.map((stop) => chartPoint(stop, frame));
  // A stop met a second time is not numbered again.
  const numbered = stops.filter((stop) => !stop.again);
  const numberOf = (stop) => numbered.findIndex((other) => other.name === (stop.again ? stop.name.replace(/ again$/, '') : stop.name)) + 1;
  const rose = chart.rose ? chartPoint(chart.rose, frame) : null;
  const winds = rose ? Array.from({ length: 16 }, (_, n) => {
    const angle = (n * Math.PI) / 8;
    return { key: n, x2: fix(rose[0] + Math.sin(angle) * 2 * width), y2: fix(rose[1] - Math.cos(angle) * 2 * width), main: n % 2 === 0 };
  }) : [];
  const title = chart.cartouche ?? [];
  const plate = { w: 21, h: 3.1 + title.length * 2.5 };
  return (
    <figure className="odyssey-chart">
      <svg viewBox={`${-BORDER} ${-BORDER} ${fix(width + 2 * BORDER)} ${fix(height + 2 * BORDER)}`} role="img" aria-label={`${chart.title}: a line through ${numbered.length} stops, from ${stops[0].name} to ${stops.at(-1).name}`}>
        <defs>
          <path id={`${id}-land`} d={land} />
          <clipPath id={`${id}-sheet`}><rect width={width} height={height} /></clipPath>
          {/* The stains and the grain of old paper. */}
          <filter id={`${id}-paper`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="11" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.29  0 0 0 0 0.13  1.5 0 0 0 -0.58" />
          </filter>
          <radialGradient id={`${id}-age`} cx="50%" cy="50%" r="72%">
            <stop offset="55%" stopColor="#5a3a14" stopOpacity="0" />
            <stop offset="100%" stopColor="#5a3a14" stopOpacity="0.42" />
          </radialGradient>
        </defs>
        <rect className="mount" x={-BORDER} y={-BORDER} width={fix(width + 2 * BORDER)} height={fix(height + 2 * BORDER)} />
        <g clipPath={`url(#${id}-sheet)`}>
          <rect className="sea" width={width} height={height} />
          {/* Lines drawn along the shore, as an engraver shades the sea: each a thin line left between two strokes. */}
          <g className="shore">
            {[[4.6, 4.2], [2.9, 2.5], [1.5, 1.1]].flatMap(([ink, gap], n) => [
              <use key={`i${n}`} className={`shore-ink shore-${n}`} href={`#${id}-land`} strokeWidth={ink} />,
              <use key={`g${n}`} className="shore-gap" href={`#${id}-land`} strokeWidth={gap} />,
            ])}
          </g>
          <g className="winds">{winds.map((wind) => <line key={wind.key} className={wind.main ? 'wind main' : 'wind'} x1={fix(rose[0])} y1={fix(rose[1])} x2={wind.x2} y2={wind.y2} />)}</g>
          <use className="land" href={`#${id}-land`} />
          <g className="names">
            {(chart.labels ?? []).map((label) => {
              const [x, y] = chartPoint(label, frame).map(fix);
              return <text key={label.text} className={`name ${label.kind}`} x={x} y={y} transform={label.turn ? `rotate(${label.turn} ${x} ${y})` : undefined}>{label.text}</text>;
            })}
          </g>
          {rose ? <Rose at={rose} /> : null}
          {title.length ? (
            <g className="cartouche" transform={`translate(${fix(width - plate.w - 1.6)} ${fix(height - plate.h - 1.6)})`}>
              <rect className="plate" width={plate.w} height={plate.h} />
              <rect className="plate-rule" x="0.6" y="0.6" width={plate.w - 1.2} height={plate.h - 1.2} />
              {/* Each line is fitted to the plate, whatever serif the device has. */}
              {title.map((line, n) => <text key={line} className={n === 0 ? 'plate-title' : 'plate-line'} x={plate.w / 2} y={3.3 + n * 2.5} textLength={fix(Math.min(plate.w - 3.4, line.length * 1.25))} lengthAdjust="spacingAndGlyphs">{line}</text>)}
            </g>
          ) : null}
          {/* The paper's stains lie over the map and under the voyage, which is drawn in fresh ink. */}
          <rect className="paper" width={width} height={height} filter={`url(#${id}-paper)`} />
          <g className="voyage">
            {legs.map((d, n) => <path key={`e${n}`} className="route-edge" d={d} />)}
            {legs.map((d, n) => <path key={`r${n}`} className={`route${stops[n].unplaced || stops[n + 1].unplaced ? ' off' : ''}`} data-leg={n + 1} d={d} />)}
          </g>
          {stops.map((stop, index) => {
            if (stop.again) return null;
            const [x, y] = points[index].map(fix);
            const [dx, dy] = stop.label ?? [0, 0];
            return (
              <g key={stop.name} className={`stop${stop.unplaced ? ' unplaced' : ''}${index === 0 || index === stops.length - 1 ? ' end' : ''}`} transform={`translate(${x} ${y})`}>
                {stop.label ? <><line className="lead" x2={dx} y2={dy} /><circle className="place" r="0.55" /></> : null}
                <circle className="disc" cx={dx} cy={dy} r="1.75" />
                <text x={dx} y={dy + 0.8}>{numberOf(stop)}</text>
              </g>
            );
          })}
          <rect className="age" width={width} height={height} fill={`url(#${id}-age)`} />
        </g>
        {degreeBars(frame, width, height)}
        <rect className="neat" width={width} height={height} />
        <rect className="neat" x={-BORDER * 0.45} y={-BORDER * 0.45} width={fix(width + BORDER * 0.9)} height={fix(height + BORDER * 0.9)} />
        <rect className="neat outer" x={-BORDER * 0.8} y={-BORDER * 0.8} width={fix(width + BORDER * 1.6)} height={fix(height + BORDER * 1.6)} />
      </svg>
      <ol className="odyssey-stops">
        {numbered.map((stop) => (
          <li key={stop.name}><strong>{stop.name}</strong> <small>{stop.place}{stop.disputed ? ' (disputed)' : ''}{stop.unplaced ? ' (on no map)' : ''}</small></li>
        ))}
      </ol>
      <figcaption><strong>{chart.title}.</strong> {chart.caption}{chart.credit ? <> <small className="credit">{chart.credit}</small></> : null}</figcaption>
    </figure>
  );
}
