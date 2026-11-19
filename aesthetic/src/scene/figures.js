import { BoxGeometry, ConeGeometry, CylinderGeometry, OctahedronGeometry } from 'three';
import { createRandom } from '../util/random.js';
import { M, MeshBuilder } from './geometry.js';

// Round 122: the characters of the dungeon's sites as figures, in place of the placeholder beacons. Each is built in
// code from a few boxes, cones and cylinders with vertex colours, after its character sheet
// (content/characters/enemies/), and is one mesh in the `plain` PS1 material: lit, fogged and jittered like the level.
//
// A figure stands on the site's ground point (the group's origin) and faces +z; the host turns it to the camera.
// The limits, which test/figures.test.js checks:
//   at most 160 triangles     the level has 62,408 of the style's 64,000, and there are seven figures
//   at most 2.2 m tall        on a phone the conversation leaves the top 38% of the screen, 4 m from the site
//   within 0.9 m of its axis  the sites stand between walls, gate piers and a library
//   `focus`                   the height of the face, near the 1.35 m the camera looks at
//   `clearance`               how far the lowest point floats above the ground (0 for all but Errata)

const UNIT = new BoxGeometry(1, 1, 1);

// Colours are multiplied by the level's light (about 0.5 in shade to 1.1 in sun), so a value above 1 reads as lit
// from within: the threads, the seam and the sparks.
const C = Object.freeze({
  stone: [0.66, 0.7, 0.62], stoneDark: [0.46, 0.5, 0.44], mortar: [0.1, 0.09, 0.08], thread: [1.9, 1.3, 2.4],
  wood: [0.5, 0.36, 0.2], woodDark: [0.3, 0.2, 0.12], brass: [0.95, 0.75, 0.3],
  bean: [0.3, 0.18, 0.1], apron: [0.92, 0.9, 0.82], cup: [1.25, 1.25, 1.2], eye: [1.6, 1.5, 0.9],
  skin: [0.95, 0.72, 0.58], shirt: [0.9, 0.88, 0.84], red: [0.75, 0.16, 0.14], trousers: [0.22, 0.22, 0.26], ham: [0.86, 0.45, 0.42], steel: [0.8, 0.84, 0.9],
  basin: [0.62, 0.64, 0.6], water: [0.16, 0.26, 0.3], gnome: [0.3, 0.55, 0.3], cap: [0.8, 0.2, 0.16], spark: [2.4, 1.9, 0.7],
  worm: [0.86, 0.8, 0.62], wormDark: [0.7, 0.62, 0.46], bookA: [0.5, 0.16, 0.14], bookB: [0.16, 0.3, 0.42], bookC: [0.5, 0.42, 0.2], pencil: [1.1, 0.85, 0.2], lens: [0.7, 0.86, 0.95],
  coat: [0.36, 0.5, 0.5], band: [0.78, 0.62, 0.3], candle: [0.95, 0.92, 0.8], staff: [0.4, 0.3, 0.2],
  jacket: [0.88, 0.42, 0.14], boot: [0.3, 0.2, 0.14], sock: [0.8, 0.18, 0.16], swollen: [1.5, 0.55, 0.5], hat: [0.2, 0.36, 0.7], bobble: [0.95, 0.94, 0.9], rockSeat: [0.5, 0.5, 0.52], beard: [0.42, 0.3, 0.2],
  rift: [0.1, 0.07, 0.16], riftEdge: [0.24, 0.14, 0.36], seam: [2.6, 2.2, 3], tile: [1.5, 1.45, 1.3],
});

// A builder's three tools. `box` is given by its width, height and depth, its centre in x and z, and its foot y0.
function tools(b) {
  const put = (geometry, matrix, color, jitter = 0.06) => b.add('plain', geometry, { matrix, color, jitter });
  return {
    box: (color, w, h, d, x = 0, y0 = 0, z = 0, { ry = 0, rx = 0, rz = 0 } = {}) => put(UNIT, M(x, y0 + h / 2, z, ry, w, h, d, rx, rz), color),
    // A cylinder or a cone frustum standing on y0. `open` leaves the ends off.
    tube: (color, rTop, rBottom, h, x = 0, y0 = 0, z = 0, { sides = 6, open = true, rx = 0, rz = 0, ry = 0 } = {}) => put(new CylinderGeometry(rTop, rBottom, h, sides, 1, open), M(x, y0 + h / 2, z, ry, 1, 1, 1, rx, rz), color),
    cone: (color, r, h, x, y0, z, { sides = 4, rx = 0, rz = 0 } = {}) => put(new ConeGeometry(r, h, sides, 1, true), M(x, y0 + h / 2, z, 0, 1, 1, 1, rx, rz), color),
    gem: (color, r, x, y, z) => put(new OctahedronGeometry(r, 0), M(x, y, z), color, 0),
  };
}

// Portia: a stone archway with a half-translated sign, glowing threads in her cracks, and mortar that moves like a
// mouth. Her face is on the lintel.
function archway(b) {
  const { box } = tools(b);
  for (const side of [-1, 1]) box(C.stone, 0.42, 1.7, 0.5, side * 0.62, 0, 0);
  box(C.stoneDark, 1.66, 0.3, 0.56, 0, 1.7, 0);
  box(C.stone, 0.36, 0.4, 0.6, 0, 1.78, 0); // the keystone
  for (const side of [-1, 1]) box(C.eye, 0.12, 0.09, 0.05, side * 0.42, 1.86, 0.29);
  box(C.mortar, 0.5, 0.06, 0.05, 0, 1.73, 0.29); // the mouth
  box(C.thread, 0.05, 0.9, 0.04, -0.62, 0.5, 0.26, { rz: 0.28 });
  box(C.thread, 0.05, 0.7, 0.04, 0.66, 0.2, 0.26, { rz: -0.4 });
  box(C.wood, 0.6, 0.3, 0.05, 0.05, 1.22, 0.08, { rz: 0.16 }); // the sign, hung askew
}

// Gerald: a foot-tall imp the colour of over-roasted beans, in a tiny barista apron, with an espresso cup. He stands
// on his coffee cart, which brings him to the height the camera looks at.
function imp(b) {
  const { box, tube, cone } = tools(b);
  box(C.wood, 0.9, 0.62, 0.56, 0, 0.3, 0);
  box(C.woodDark, 1.02, 0.1, 0.68, 0, 0.92, 0);
  for (const side of [-1, 1]) tube(C.woodDark, 0.24, 0.24, 0.07, side * 0.5, 0.173, 0.02, { sides: 6, open: false, rz: Math.PI / 2 }); // wheels on the ground, their axle along x
  box(C.bean, 0.26, 0.3, 0.18, 0, 1.02, 0.05); // body
  box(C.apron, 0.22, 0.22, 0.03, 0, 1.03, 0.15);
  box(C.bean, 0.28, 0.22, 0.22, 0, 1.32, 0.05); // head
  for (const side of [-1, 1]) cone(C.bean, 0.045, 0.14, side * 0.1, 1.53, 0.05, { sides: 3 });
  for (const side of [-1, 1]) box(C.eye, 0.06, 0.05, 0.02, side * 0.07, 1.43, 0.165);
  box(C.cup, 0.09, 0.09, 0.09, 0.22, 1.16, 0.12);
}

// Mortimer: a broad man in a striped apron, with a hat that is, on closer inspection, also a ham.
function charcutier(b) {
  const { box } = tools(b);
  box(C.trousers, 0.5, 0.8, 0.3, 0, 0, 0);
  box(C.shirt, 0.78, 0.72, 0.44, 0, 0.8, 0);
  for (const [i, color] of [C.red, C.apron, C.red].entries()) box(color, 0.2, 0.92, 0.05, (i - 1) * 0.2, 0.5, 0.25); // the striped apron
  for (const side of [-1, 1]) box(C.shirt, 0.2, 0.62, 0.22, side * 0.5, 0.86, 0.02);
  box(C.skin, 0.36, 0.34, 0.34, 0, 1.52, 0.02);
  box(C.woodDark, 0.26, 0.06, 0.04, 0, 1.59, 0.2); // moustache
  for (const side of [-1, 1]) box(C.mortar, 0.05, 0.05, 0.03, side * 0.08, 1.71, 0.2); // eyes, under the hat
  box(C.ham, 0.42, 0.2, 0.3, 0.02, 1.86, 0.02, { rz: 0.12 }); // the hat that is a ham
  box(C.steel, 0.03, 0.26, 0.3, 0.62, 0.72, 0.16); // cleaver
}

// Flick: a gnome no taller than a teacup, made mostly of movement, trailing sparks. He is caught in mid-step on the
// rim of a cracked stone basin.
function letharger(b) {
  const { box, tube, cone, gem } = tools(b);
  tube(C.basin, 0.22, 0.32, 0.74, 0, 0, 0, { sides: 6 });
  tube(C.basin, 0.72, 0.42, 0.36, 0, 0.74, 0, { sides: 8, open: false });
  tube(C.water, 0.6, 0.6, 0.02, 0, 1.09, 0, { sides: 8, open: false });
  box(C.mortar, 0.05, 0.3, 0.3, -0.2, 0.8, 0.5, { ry: 0.5 }); // the crack
  box(C.gnome, 0.13, 0.15, 0.1, 0.34, 1.12, 0.5, { rz: -0.2 });
  box(C.skin, 0.11, 0.1, 0.1, 0.36, 1.27, 0.5);
  cone(C.cap, 0.07, 0.16, 0.37, 1.37, 0.5, { sides: 4, rz: -0.25 });
  gem(C.spark, 0.05, 0.1, 1.36, 0.56);
  gem(C.spark, 0.04, -0.08, 1.24, 0.6);
  gem(C.spark, 0.03, -0.26, 1.42, 0.5);
}

// Marginalia: a bookworm with half-moon spectacles and a pencil, risen from the books she has not yet eaten.
function bookworm(b) {
  const { box, tube } = tools(b);
  box(C.bookA, 0.92, 0.13, 0.7, 0, 0, 0, { ry: 0.12 });
  box(C.bookB, 0.8, 0.12, 0.62, 0.04, 0.13, 0.02, { ry: -0.2 });
  box(C.bookC, 0.7, 0.1, 0.56, -0.03, 0.25, 0, { ry: 0.3 });
  tube(C.worm, 0.36, 0.4, 0.34, 0, 0.35, -0.05);
  tube(C.wormDark, 0.33, 0.36, 0.32, 0.03, 0.69, 0);
  tube(C.worm, 0.3, 0.33, 0.3, 0, 1.01, 0.06);
  tube(C.worm, 0.22, 0.3, 0.2, 0, 1.31, 0.1, { open: false }); // the head
  for (const side of [-1, 1]) box(C.lens, 0.14, 0.07, 0.03, side * 0.11, 1.33, 0.4); // half-moon spectacles
  box(C.mortar, 0.4, 0.025, 0.035, 0, 1.4, 0.4);
  box(C.pencil, 0.04, 0.04, 0.3, 0.3, 1.4, 0.12, { ry: 0.3 });
  box(C.apron, 0.4, 0.04, 0.3, 0.36, 0.36, 0.42, { ry: -0.5, rx: -0.3 }); // an open book before her
}

// Bambieshart: a tall, stooped traveller in a faded brocade coat, with a face like a kindly wet candle.
function wanderer(b) {
  const { box, tube } = tools(b);
  tube(C.coat, 0.3, 0.44, 1.12, 0, 0, 0);
  tube(C.band, 0.455, 0.47, 0.09, 0, 0.05, 0); // the brocade's bands
  tube(C.band, 0.36, 0.38, 0.07, 0, 0.62, 0);
  box(C.coat, 0.48, 0.52, 0.32, 0, 1.08, 0.08, { rx: 0.3 }); // the stoop
  for (const side of [-1, 1]) box(C.coat, 0.13, 0.62, 0.15, side * 0.31, 0.92, 0.14, { rx: 0.2 });
  box(C.candle, 0.25, 0.32, 0.25, 0, 1.56, 0.26);
  box(C.candle, 0.09, 0.2, 0.07, 0, 1.44, 0.4); // the face runs downward
  box(C.mortar, 0.19, 0.035, 0.03, 0, 1.75, 0.385); // eyes
  box(C.staff, 0.05, 1.98, 0.05, 0.46, 0, 0.24);
}

// Eduardo (round 133): a broad hiker in an expensive orange jacket and a bobble hat, sitting on a flat rock halfway up
// Micromort Mountain, one boot off and the ankle swelling like a loaf of bread, holding it with the air of a man who
// has decided it is fine.
function hiker(b) {
  const { box, gem } = tools(b);
  box(C.rockSeat, 0.95, 0.42, 0.78, 0, 0, -0.18, { ry: 0.1 });
  box(C.trousers, 0.3, 0.2, 0.62, -0.2, 0.42, 0.12); // the good leg, bent
  box(C.trousers, 0.28, 0.16, 0.72, 0.22, 0.42, 0.22, { ry: -0.1 }); // the other, stretched out
  box(C.sock, 0.2, 0.14, 0.3, 0.26, 0.4, 0.62, { ry: -0.1 }); // the sock, where the boot was
  box(C.swollen, 0.2, 0.17, 0.2, 0.25, 0.46, 0.5, { ry: -0.1 }); // the ankle
  box(C.boot, 0.2, 0.24, 0.34, 0.6, 0, 0.3, { ry: 0.5 }); // the boot, set aside
  box(C.jacket, 0.62, 0.62, 0.44, 0, 0.62, -0.14, { rx: 0.2 }); // the torso, leaning in
  box(C.jacket, 0.14, 0.14, 0.5, 0.24, 0.7, 0.2, { rx: 0.15 }); // an arm, down to the ankle
  box(C.skin, 0.28, 0.28, 0.26, 0, 1.28, 0);
  box(C.beard, 0.24, 0.12, 0.1, 0, 1.2, 0.14);
  box(C.hat, 0.32, 0.16, 0.3, 0, 1.54, -0.01);
  gem(C.bobble, 0.1, 0, 1.7, -0.01);
}

// Errata: a tear in the air shaped roughly like a person described by two witnesses who disagree, with letters
// drifting off it. It floats.
function erratum(b) {
  const { box } = tools(b);
  const up = 0.25;
  box(C.rift, 0.17, 0.62, 0.14, -0.14, up, 0.02);
  box(C.riftEdge, 0.17, 0.56, 0.14, 0.17, up + 0.08, -0.04);
  box(C.rift, 0.5, 0.26, 0.2, 0.04, up + 0.62, 0);
  box(C.riftEdge, 0.56, 0.44, 0.22, -0.07, up + 0.86, 0.03, { rz: 0.07 });
  box(C.rift, 0.72, 0.16, 0.2, 0.08, up + 1.28, -0.02, { rz: -0.06 });
  box(C.riftEdge, 0.26, 0.26, 0.22, -0.05, up + 1.4, 0.03, { rz: 0.2 });
  box(C.seam, 0.04, 1.5, 0.03, 0.02, up + 0.1, 0.14, { rz: 0.03 });
  for (const [x, y, z, rz] of [[-0.55, 1.5, 0.1, 0.5], [0.6, 1.05, 0.14, -0.4], [-0.62, 0.7, 0.06, 2.6], [0.5, 1.72, 0.02, 3.4], [0.66, 0.5, 0.1, 1.1]]) {
    box(C.tile, 0.1, 0.13, 0.02, x, up + y - 0.25, z, { rz }); // the letters, some of them upside down
  }
}

// `focus` is the height of the face, `clearance` how far the figure floats, both after `scale`. The scale brings the
// tall figures down: the camera looks 1.35 m above a site, and on a phone a conversation's last hold shows from about
// 0.9 to 1.8 m there, so a face much above 1.5 m would leave the screen.
export const FIGURES = Object.freeze({
  archway: Object.freeze({ build: archway, scale: 1, focus: 1.8, clearance: 0 }), // the start site: the camera stands back and above
  imp: Object.freeze({ build: imp, scale: 1, focus: 1.42, clearance: 0 }),
  charcutier: Object.freeze({ build: charcutier, scale: 0.86, focus: 1.42, clearance: 0 }),
  letharger: Object.freeze({ build: letharger, scale: 1, focus: 1.27, clearance: 0 }),
  bookworm: Object.freeze({ build: bookworm, scale: 1, focus: 1.38, clearance: 0 }),
  wanderer: Object.freeze({ build: wanderer, scale: 0.86, focus: 1.44, clearance: 0 }),
  hiker: Object.freeze({ build: hiker, scale: 1, focus: 1.34, clearance: 0 }), // round 133: Eduardo, seated, with his hat at 1.7 m
  erratum: Object.freeze({ build: erratum, scale: 0.84, focus: 1.47, clearance: 0.21 }),
});

/**
 * Builds the figure `name` in `materials.plain`. Returns { name, group, mesh, triangles, height, radius, lowest,
 * focus, clearance }, or null for a name FIGURES does not know. `radius` is the farthest any vertex is from the
 * vertical axis. The same seed gives the same vertex data.
 */
export function createFigure(name, materials, { seed = 7 } = {}) {
  const figure = Object.hasOwn(FIGURES, name) ? FIGURES[name] : null;
  if (!figure) return null;
  const b = new MeshBuilder(createRandom(seed));
  figure.build(b);
  const triangles = b.triangleCount();
  const group = b.build(materials, `figure:${name}`);
  const mesh = group.children[0];
  if (figure.scale !== 1) mesh.geometry.scale(figure.scale, figure.scale, figure.scale);
  const position = mesh.geometry.attributes.position;
  let [height, lowest, radius] = [0, Infinity, 0];
  for (let i = 0; i < position.count; i++) {
    height = Math.max(height, position.getY(i));
    lowest = Math.min(lowest, position.getY(i));
    radius = Math.max(radius, Math.hypot(position.getX(i), position.getZ(i)));
  }
  return { name, group, mesh, triangles, height, radius, lowest, focus: figure.focus, clearance: figure.clearance };
}
