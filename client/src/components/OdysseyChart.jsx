import odyssey from '../../../content/world/odyssey.yaml';

// Round 163 (issue #13): a chart of the voyage of Odysseus, shown beside the narrator's remark that a long walk on
// rails looks like a random walk. It is drawn here from content/world/odyssey.yaml (the stops in the poem's order,
// each where tradition most often puts it) and is a sketch, not a map taken from anywhere: that file says why, and
// what it rests on. Longitude runs across and latitude up, a degree of each the same length.
export const ODYSSEY = odyssey;
const UNIT = 5; // overlay units a degree

/** Where a stop is on the chart: [x, y] in the chart's own units. */
export function chartPoint(stop, frame = odyssey.frame) {
  return [(stop.lon - frame.west) * UNIT, (frame.north - stop.lat) * UNIT];
}

export default function OdysseyChart({ chart = odyssey }) {
  const { frame, stops } = chart;
  const [width, height] = [(frame.east - frame.west) * UNIT, (frame.north - frame.south) * UNIT];
  const points = stops.map((stop) => chartPoint(stop, frame));
  // A stop met a second time is not numbered again.
  const numbered = stops.filter((stop) => !stop.again);
  const numberOf = (stop) => numbered.findIndex((other) => other.name === (stop.again ? stop.name.replace(/ again$/, '') : stop.name)) + 1;
  return (
    <figure className="odyssey-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chart.title}: a line through ${numbered.length} stops, from ${stops[0].name} to ${stops.at(-1).name}`}>
        <rect className="sea" width={width} height={height} />
        {/* A faint grid, every two degrees: the only scale a sketch should claim. */}
        {Array.from({ length: Math.floor((frame.east - frame.west) / 2) + 1 }, (_, n) => <line key={`v${n}`} className="grid" x1={n * 2 * UNIT} x2={n * 2 * UNIT} y1="0" y2={height} />)}
        {Array.from({ length: Math.floor((frame.north - frame.south) / 2) + 1 }, (_, n) => <line key={`h${n}`} className="grid" y1={n * 2 * UNIT} y2={n * 2 * UNIT} x1="0" x2={width} />)}
        <polyline className="route-edge" points={points.map((point) => point.join(',')).join(' ')} />
        <polyline className="route" points={points.map((point) => point.join(',')).join(' ')} />
        {stops.map((stop, index) => (stop.again ? null : (
          <g key={stop.name} className={`stop${stop.unplaced ? ' unplaced' : ''}${index === 0 || index === stops.length - 1 ? ' end' : ''}`} transform={`translate(${points[index][0]} ${points[index][1]})`}>
            <circle r="2.1" />
            <text y="0.9">{numberOf(stop)}</text>
          </g>
        )))}
      </svg>
      <ol className="odyssey-stops">
        {numbered.map((stop) => (
          <li key={stop.name}><strong>{stop.name}</strong> <small>{stop.place}{stop.disputed ? ' (disputed)' : ''}{stop.unplaced ? ' (on no map)' : ''}</small></li>
        ))}
      </ol>
      <figcaption><strong>{chart.title}.</strong> {chart.caption}</figcaption>
    </figure>
  );
}
