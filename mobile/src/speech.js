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

// expo-speech takes the voice's identifier string, not the voice object.
// Round 041 (critique 1.8): the location ambience is lowered while the voice speaks.
export async function speak(text, { tag, voice }, speech = Speech, duck = duckAmbience) {
  await speech.stop();
  const restore = () => duck(false);
  duck(true);
  speech.speak(text, { language: tag, voice: voice.identifier, onDone: restore, onStopped: restore, onError: restore });
}
