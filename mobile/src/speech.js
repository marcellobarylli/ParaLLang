import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { duckAmbience } from './ambience.js';

const primarySubtag = (tag) => String(tag ?? '').split(/[-_]/)[0].toLowerCase();
// Round 061 (critique 1.5): en_GB and en-GB are the same tag.
const foldTag = (tag) => String(tag ?? '').replaceAll('_', '-').toLowerCase();
// Apple's novelty voices (Bubbles, Zarvox…) and Eloquence voices are never picked.
const NOVELTY = /^com\.apple\.(?:speech\.synthesis\.voice|eloquence)\./;

// A voice for the pack's BCP 47 tag: an exact match first (it-IT), then any voice sharing the primary subtag (it-CH).
export async function findVoice(tag, speech = Speech) {
  if (!tag) return null;
  let voices;
  try { voices = await speech.getAvailableVoicesAsync(); } catch { return null; }
  const matches = (voices ?? []).filter((voice) => primarySubtag(voice.language) === primarySubtag(tag) && !NOVELTY.test(String(voice.identifier ?? '')));
  return matches.find((voice) => foldTag(voice.language) === foldTag(tag)) ?? matches[0] ?? null;
}

// Round 061 (backlog C10): the narrator reads the English narration, in a British voice where there is one.
export const NARRATOR = Object.freeze({ tag: 'en-GB', name: 'English' });

// Round 055 (critiques 1.1, 1.2): one lookup per tag, shared by every button mounted in the same render (the
// in-flight promise is cached). A miss is dropped, so the next mount looks again (voices can arrive late on iOS).
const voiceCache = new Map();
export function voiceFor(tag) {
  if (!tag) return Promise.resolve(null);
  if (!voiceCache.has(tag)) {
    const pending = findVoice(tag).then((voice) => { if (!voice && voiceCache.get(tag) === pending) voiceCache.delete(tag); return voice; });
    voiceCache.set(tag, pending);
  }
  return voiceCache.get(tag);
}
// Round 064 (backlog C10d): one AppState subscription, made by the first speak. Leaving the app (background, not
// inactive: decision 1) stops the voice; on return the ambience is undocked if nothing is speaking (critique 1.3), so
// an interruption that cut the voice without a callback cannot leave it lowered. Module defaults only (critique 1.1).
let subscription = null;
function listen() {
  if (subscription) return;
  try {
    subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') { stopSpeech(); return; }
      if (state !== 'active') return;
      const asked = generation; // round 065 Amendment 1: a word started meanwhile keeps its duck
      Promise.resolve()
        .then(() => Speech.isSpeakingAsync())
        .catch(() => false)
        .then((speaking) => { if (!speaking && asked === generation) duckAmbience(false); });
    });
  } catch { subscription = null; }
}

// Tests start without the cache or the subscription (critique 1.2).
export function resetVoiceCacheForTests() {
  voiceCache.clear();
  subscription?.remove?.();
  subscription = null;
}

// expo-speech takes the voice's identifier string, not the voice object.
// Round 041 (critique 1.8): the location ambience is lowered while the voice speaks.
// Round 055 (critique 1.7): only the latest utterance restores it, so the previous word's late onStopped cannot
// bring the ambience back up under the next one.
let generation = 0;
export async function speak(text, { tag, voice }, speech = Speech, duck = duckAmbience) {
  listen(); // round 064 (critique 1.5): before the first await
  generation += 1;
  const mine = generation;
  await speech.stop();
  if (mine !== generation) return; // round 063 (critique 1.1): a stop or a newer word came during the wait
  const restore = () => { if (mine === generation) duck(false); };
  duck(true);
  // Round 089 (review R1.4): a throw (no voice, a native error) must not leave the ambience lowered.
  try { speech.speak(text, { language: tag, voice: voice.identifier, onDone: restore, onStopped: restore, onError: restore }); }
  catch { restore(); }
}

// Round 055 (critique 1.8): leaving the encounter silences the voice and restores the ambience.
export function stopSpeech(speech = Speech, duck = duckAmbience) {
  generation += 1;
  duck(false);
  return Promise.resolve(speech.stop()).catch(() => {});
}
