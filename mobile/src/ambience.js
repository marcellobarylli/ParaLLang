// Round 041 (backlog C4b): a quiet loop for the player's current location, synthesized by scripts/gen-ambient.js.
// One location plays at a time; every failure is swallowed. It pauses while the app is in the background (no
// background playback) and resumes on return. The audio mode is the cues' (sounds.js): the silent switch mutes it.
import { AppState } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { ensureAudioMode } from './sounds.js';

const SOURCES = {
  market_entrance: require('../assets/ambience/market_entrance.wav'),
  coffee_cart: require('../assets/ambience/coffee_cart.wav'),
  butchers_stall: require('../assets/ambience/butchers_stall.wav'),
  cracked_fountain: require('../assets/ambience/cracked_fountain.wav'),
  old_bookshop: require('../assets/ambience/old_bookshop.wav'),
  the_high_gate: require('../assets/ambience/the_high_gate.wav'),
  the_rift: require('../assets/ambience/the_rift.wav'),
};
export const AMBIENCE_IDS = Object.freeze(Object.keys(SOURCES));
export const AMBIENCE_VOLUME = 0.5;

export const DUCKED_VOLUME = 0.15; // while the pronunciation button speaks (critique 1.8)

let players = new Map();
let wanted = null; // the location that should be heard, or null; set at once on every change (critique 1.5)
let ducked = false;
let subscription = null;
let generation = 0;

function player(id) {
  let found = players.get(id);
  if (!found) {
    found = createAudioPlayer(SOURCES[id]);
    found.loop = true;
    players.set(id, found);
  }
  found.volume = ducked ? DUCKED_VOLUME : AMBIENCE_VOLUME;
  return found;
}

// One reconcile for every change: pause every player but the wanted one, then play that one.
async function reconcile() {
  const mine = ++generation;
  try {
    const id = wanted && SOURCES[wanted] ? wanted : null;
    for (const [key, each] of players) if (key !== id) { try { each.pause(); } catch { /* ignore */ } }
    if (!id) return;
    await ensureAudioMode();
    if (mine !== generation) return; // a later change won meanwhile
    player(id).play();
  } catch { /* no ambience, no harm */ }
}

// expo-audio itself pauses players when the app goes to the background and resumes them on return (no background
// playback). Returning to the foreground also reconciles, which restarts the loop after a call or Siri (critique 1.4).
function listen() {
  if (subscription) return;
  try {
    subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reconcile(); });
  } catch { subscription = null; }
}

// Plays the loop of `locationId` (null or an unknown id: silence). Calling it again with the same id does nothing.
export function setAmbience(locationId) {
  const id = locationId ?? null;
  listen();
  if (id === wanted) return Promise.resolve();
  wanted = id;
  return reconcile();
}

// Lowers the loop while speech plays, and back.
export function duckAmbience(on) {
  ducked = Boolean(on);
  const current = wanted && players.get(wanted);
  if (current) { try { current.volume = ducked ? DUCKED_VOLUME : AMBIENCE_VOLUME; } catch { /* ignore */ } }
}

export function resetAmbienceForTests() {
  subscription?.remove?.();
  players = new Map(); wanted = null; ducked = false; subscription = null; generation = 0;
}
