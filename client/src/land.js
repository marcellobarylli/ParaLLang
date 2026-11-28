// Round 213 (issue #23): the land of a road as this browser stands on it: the landscape of the road's seed with the
// pulls the learner has watched (server/src/road/pulls.js). The map, the 3D level and the world event all take it
// from here, so they agree. The last few are kept: a pull is solved once.
import { createTerrain } from '../../server/src/road/terrain.js';
import { createGraph } from '../../server/src/road/graph.js';
import { pullKey, withPulls } from '../../server/src/road/pulls.js';

const kept = new Map();

/** What identifies a land: its seed and its pulls. */
export const landKey = (seed, pulled = []) => `${seed}#${pullKey(pulled ?? [])}`;

/**
 * { terrain, graph, plain, key }: the pulled land and its graph (the plain ones when nothing is pulled), and
 * `plain`, the same land with no pulls ({ terrain, graph }).
 */
export function landOf(seed, pulled = []) {
  const key = landKey(seed, pulled);
  if (kept.has(key)) return kept.get(key);
  const plainKey = landKey(seed, []);
  const plain = kept.get(plainKey)?.plain ?? (() => { const terrain = createTerrain(seed); return { terrain, graph: createGraph(terrain) }; })();
  const made = withPulls(plain.terrain, plain.graph, pulled ?? []);
  const land = Object.freeze({ terrain: made.terrain, graph: made.graph, plain, key });
  if (kept.size >= 6) kept.delete(kept.keys().next().value);
  kept.set(key, land);
  return land;
}
