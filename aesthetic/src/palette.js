// The colour tokens of the look, in sRGB hex. The pipeline works in display (gamma) space the
// way the PlayStation did, so these values go to the GPU as they are: no linear conversion.

export const PALETTE = {
  // Khmer sandstone and laterite
  sandstone: '#b29b74',
  sandstoneLight: '#cbb68c',
  sandstoneDark: '#6f5c43',
  mortar: '#4a3d2e',
  laterite: '#85573f',
  lateriteDark: '#57362a',
  roof: '#857761',
  lichen: '#8e9168',
  moss: '#566a35',

  // Jungle
  grass: '#62803a',
  grassDry: '#9a9a52',
  dirt: '#7a5e3c',
  leafDark: '#2c4a24',
  leaf: '#4b7a2f',
  leafLight: '#86a845',
  palmTrunk: '#7b6649',
  palmTrunkDark: '#4f402e',
  rachis: '#7d6e3c',
  root: '#6b5642',
  rootDark: '#3f3226',

  // Water
  water: '#2f5552',
  waterLight: '#6a948a',
  lily: '#4f7d36',
  lotus: '#e59bb0',

  // Fungi on dead roots
  mushroomStem: '#ddd0aa',
  mushroomCap: '#c2633d',

  // The strings between the worlds (corruption)
  stringGlow: '#c08cff',
};

export function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function hexToBytes(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
