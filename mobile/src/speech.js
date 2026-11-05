import * as Speech from 'expo-speech';
import { duckAmbience } from './ambience.js';

const primarySubtag = (tag) => String(tag ?? '').split(/[-_]/)[0].toLowerCase();

// A voice for the pack's BCP 47 tag: an exact match first (it-IT), then any voice sharing the primary subtag (it-CH).
export async function findVoice(tag, speech = Speech) {
  if (!tag) return null;
  let voices;
  try { voices = await speech.getAvailableVoicesAsync(); } catch { return null; }
  const matches = (voices ?? []).filter((voice) => primarySubtag(voice.language) === primarySubtag(tag));
  return matches.find((voice) => voice.language.toLowerCase() === tag.toLowerCase()) ?? matches[0] ?? null;
}

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
export function resetVoiceCacheForTests() { voiceCache.clear(); }

// expo-speech takes the voice's identifier string, not the voice object.
// Round 041 (critique 1.8): the location ambience is lowered while the voice speaks.
// Round 055 (critique 1.7): only the latest utterance restores it, so the previous word's late onStopped cannot
// bring the ambience back up under the next one.
let generation = 0;
export async function speak(text, { tag, voice }, speech = Speech, duck = duckAmbience) {
  generation += 1;
  const mine = generation;
  await speech.stop();
  const restore = () => { if (mine === generation) duck(false); };
  duck(true);
  speech.speak(text, { language: tag, voice: voice.identifier, onDone: restore, onStopped: restore, onError: restore });
}

// Round 055 (critique 1.8): leaving the encounter silences the voice and restores the ambience.
export function stopSpeech(speech = Speech, duck = duckAmbience) {
  generation += 1;
  duck(false);
  return Promise.resolve(speech.stop()).catch(() => {});
}
