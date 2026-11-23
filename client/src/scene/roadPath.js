// Round 176: the line the camera follows from one site to another. It goes the way a walker would: the shortest walk
// along the graph's ways (graph.route), each way's points end to end. Then it is smoothed: the corners where one way
// meets the next, and the small kinks of each way, are rounded off, so the line curves through the country near the
// ways without following every bend of them. Its two ends stay where they are. Pure: tested in Node.

export const ROAD_PATH = Object.freeze({
  spacing: 3, // metres between the points of the smoothed line
  smooth: 16, // metres: how far the rounding reaches (the spread of the smoothing)
  passes: 2,
});

const lengths = (points) => {
  const out = [0];
  for (let n = 1; n < points.length; n += 1) out.push(out[n - 1] + Math.hypot(points[n][0] - points[n - 1][0], points[n][1] - points[n - 1][1]));
  return out;
};

/** `points` ([[x, z], ...]) again, a point every `spacing` metres along them, both ends kept. */
export function resample(points, spacing = ROAD_PATH.spacing) {
  if (points.length < 2) return points.map((point) => [...point]);
  const run = lengths(points);
  const total = run.at(-1);
  const count = Math.max(1, Math.round(total / spacing));
  const out = [];
  let k = 1;
  for (let n = 0; n <= count; n += 1) {
    const d = (n / count) * total;
    while (k < points.length - 1 && run[k] < d) k += 1;
    const span = run[k] - run[k - 1] || 1;
    const u = Math.min(1, Math.max(0, (d - run[k - 1]) / span));
    out.push([points[k - 1][0] + (points[k][0] - points[k - 1][0]) * u, points[k - 1][1] + (points[k][1] - points[k - 1][1]) * u]);
  }
  return out;
}

/**
 * `points` smoothed: a Gaussian average along the line, `smooth` metres wide, narrowed towards the ends so that the
 * first and the last point stay put and the line leaves and reaches them without a kink.
 */
export function smoothPath(points, { spacing = ROAD_PATH.spacing, smooth = ROAD_PATH.smooth, passes = ROAD_PATH.passes } = {}) {
  let line = resample(points, spacing);
  const sigma = smooth / spacing; // in points
  for (let pass = 0; pass < passes; pass += 1) {
    const last = line.length - 1;
    line = line.map((point, n) => {
      const reach = Math.min(Math.ceil(sigma * 2.5), n, last - n);
      if (reach <= 0) return point;
      let [x, z, w] = [0, 0, 0];
      for (let k = -reach; k <= reach; k += 1) {
        const weight = Math.exp(-(k * k) / (2 * sigma * sigma));
        x += line[n + k][0] * weight;
        z += line[n + k][1] * weight;
        w += weight;
      }
      return [x / w, z / w];
    });
  }
  return line;
}

/**
 * The camera's line from site `fromId` to site `toId` on `graph`: the shortest walk along the ways, smoothed. Null
 * when no walk is found (the caller then goes straight over the country).
 */
export function travelLine(graph, fromId, toId, options = {}) {
  const walk = graph.route?.(fromId, toId);
  if (!walk || walk.length < 2) return null;
  const points = [];
  for (let n = 1; n < walk.length; n += 1) {
    const leg = graph.pathPoints(walk[n - 1], walk[n]);
    if (!leg) return null;
    points.push(...(points.length ? leg.slice(1) : leg));
  }
  return { sites: walk, points: smoothPath(points, options) };
}
