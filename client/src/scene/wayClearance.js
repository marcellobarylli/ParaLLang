// Round 192: no tree or plant grows on the road. The track drawn along a way is 1.6 m wide (createTrack's width);
// the owner asked for a margin of half its width again on each side, so nothing stands within 1.6 m of a way's
// centreline (a tree's trunk, a plant's whole spread). Pure: tested in Node.
//
// `graph` is server/src/road/graph.js's. A chunk asks once for the ways near it: the ways of the sites within two
// cells of its middle, cut to the chunk's box and the margin.

export const WAY_CLEARANCE = Object.freeze({ half: 0.8, margin: 0.8, trunk: 0.35 });
export const clearance = () => WAY_CLEARANCE.half + WAY_CLEARANCE.margin;

function segmentDistance(x, z, [ax, az], [bx, bz]) {
  const [dx, dz] = [bx - ax, bz - az];
  const span2 = dx * dx + dz * dz || 1;
  const u = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / span2));
  return Math.hypot(x - (ax + dx * u), z - (az + dz * u));
}

/** The segments of the ways that come within `reach` metres of the box [x0, x1] x [z0, z1]. */
export function waySegments(graph, x0, z0, x1, z1, reach = clearance() + 2) {
  const segments = [];
  const seen = new Set();
  for (const node of graph.nodesNear((x0 + x1) / 2, (z0 + z1) / 2, 2)) {
    for (const other of graph.neighbours(node.id)) {
      const pair = node.id < other ? `${node.id}|${other}` : `${other}|${node.id}`;
      if (seen.has(pair)) continue;
      seen.add(pair);
      const points = graph.pathPoints(node.id, other) ?? [];
      for (let n = 1; n < points.length; n += 1) {
        const [a, b] = [points[n - 1], points[n]];
        if (Math.max(a[0], b[0]) < x0 - reach || Math.min(a[0], b[0]) > x1 + reach || Math.max(a[1], b[1]) < z0 - reach || Math.min(a[1], b[1]) > z1 + reach) continue;
        segments.push([a, b]);
      }
    }
  }
  return segments;
}

/**
 * `terrain` with its trees and undergrowth kept off the ways of `graph`: a tree whose trunk, or a plant whose
 * spread, comes within the clearance of a way's centreline does not grow.
 */
export function clearOfWays(terrain, graph, chunk) {
  const near = (cx, cz) => {
    const segments = waySegments(graph, cx * chunk, cz * chunk, (cx + 1) * chunk, (cz + 1) * chunk);
    return (x, z, spread) => segments.some(([a, b]) => segmentDistance(x, z, a, b) < clearance() + spread);
  };
  return Object.freeze({
    ...terrain,
    treesIn(cx, cz) {
      const blocked = near(cx, cz);
      return terrain.treesIn(cx, cz).filter((tree) => !blocked(tree.x, tree.z, WAY_CLEARANCE.trunk));
    },
    undergrowthIn(cx, cz) {
      const blocked = near(cx, cz);
      return (terrain.undergrowthIn?.(cx, cz) ?? []).filter((plant) => !blocked(plant.x, plant.z, plant.size * (plant.kind === 'fern' ? 1.5 : 1)));
    },
  });
}
