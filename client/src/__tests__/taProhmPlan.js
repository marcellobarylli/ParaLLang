// Round 115: Ta Prohm's wall plan, encoded by hand from aesthetic/src/scene/taprohm.js: where a walker's centre may
// not be. Round 119: shared by the dungeon file's test (sites and paths) and the director's (the camera on a walk).
import { TA_PROHM } from '@parallang/aesthetic';

const G = TA_PROHM.gallery;
export const PASSAGE = 1.1; // half the width of a gate passage: the piers stand from 1.1 to 3.2 either side of the axis
const WALKER = 0.35; // room a walker needs either side

// Where a walker's centre may not be, from the level's plan. With `SHOULDER` 0 it is the stone itself: where no part
// of a figure may be (round 122).
export function blocked(x, z, SHOULDER = WALKER) {
  const [ax, az] = [Math.abs(x), Math.abs(z)];
  const inPassage = ax < PASSAGE - SHOULDER && z > 0;
  for (const ring of TA_PROHM.rings) {
    const inBand = ax < ring.hx + SHOULDER && az < ring.hz + SHOULDER && (ax > ring.hx - G.depth - SHOULDER || az > ring.hz - G.depth - SHOULDER);
    if (inBand && !(inPassage && az > ring.hz - G.depth - SHOULDER)) return 'a gallery';
    // The gate pavilion is deeper than its gallery (G.depth + 1.6, centred on the gallery).
    if (ax < 3.2 + SHOULDER && z > ring.hz - G.depth - 0.8 - SHOULDER && z < ring.hz + 0.8 + SHOULDER && !inPassage) return 'a gate pavilion';
  }
  const W = TA_PROHM.outer;
  // The east gopura: wings to 10 m either side of the passage, 4.2 m deep, centred G.depth / 2 beyond the wall line.
  if (ax < 10 + SHOULDER && z > W + G.depth / 2 - 2.1 - SHOULDER && z < W + G.depth / 2 + 2.1 + SHOULDER && !inPassage) return 'the east gopura';
  if ((Math.abs(ax - W) < 0.6 + SHOULDER && az < W + 1) || (Math.abs(az - W) < 0.6 + SHOULDER && ax < W + 1 && !(z > 0 && ax < 10))) return 'the outer wall';
  if (ax < 3.7 + SHOULDER && az < 3.7 + SHOULDER) return 'the sanctuary';
  if (Math.abs(x + 26) < 3.5 + SHOULDER && Math.abs(z - 22) < 2.5 + SHOULDER) return 'the library';
  return null;
}
