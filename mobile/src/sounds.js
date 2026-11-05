// Round 037 (backlog C4a): two short UI cues, synthesized by scripts/gen-ui-sounds.mjs. A sound never breaks play:
// every failure is swallowed. The ring/silent switch mutes them, and they mix with the player's own audio.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOURCES = {
  pass: require('../assets/sounds/pass.wav'),
  resolve: require('../assets/sounds/resolve.wav'),
};
export const CUE_NAMES = Object.freeze(Object.keys(SOURCES));

let players = new Map();
let modeSet = null;

export function resetSoundsForTests() { players = new Map(); modeSet = null; }

export async function playCue(name) {
  if (!SOURCES[name]) return;
  try {
    modeSet ??= Promise.resolve(setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' })).catch(() => {});
    await modeSet;
    let player = players.get(name);
    if (!player) { player = createAudioPlayer(SOURCES[name]); players.set(name, player); }
    await Promise.resolve(player.seekTo(0)).catch(() => {});
    player.play();
  } catch { /* no sound, no harm */ }
}
