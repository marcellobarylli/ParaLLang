// Round 126: the dungeon speaks and listens, with the browser's own speech synthesis and recognition. Nothing here
// calls a server: the model gives and takes text as before, and speech is added at the two ends of the text.
//
// Speaking. A character sheet may carry `voice: { kind, pitch, rate }` (the server passes it on with the encounter).
// The kind picks a system voice of the target language and gives a pitch and a rate; the sheet's own pitch and rate
// go over the kind's. A device with one voice of the language gives every character that voice, told apart by
// pitch and rate.
//
// Listening. `SpeechRecognition` (`webkitSpeechRecognition` in Safari) in the target language writes what it hears
// into the reply box. The player sends it.

// Pitch and rate on SpeechSynthesisUtterance's scales (pitch 0 to 2, rate 1 is normal). `names` are voices to prefer,
// best first: Apple's and Google's Italian and Spanish voices by gender, and Apple's novelty voices for `funny`.
export const VOICE_KINDS = Object.freeze({
  female: { pitch: 1.1, rate: 0.95, names: ['Alice', 'Federica', 'Emma', 'Paola', 'Mónica', 'Monica', 'Paulina', 'Marisol', 'Flo', 'Sandy', 'Shelley', 'Elsa', 'Isabella', 'Elvira', 'Helena', 'Laura', 'Sabina', 'female', 'donna', 'mujer'] },
  male: { pitch: 0.8, rate: 0.95, names: ['Luca', 'Cosimo', 'Diego', 'Jorge', 'Juan', 'Carlos', 'Eddy', 'Reed', 'Rocko', 'Diego', 'Pablo', 'Alvaro', 'Álvaro', 'Raul', 'Raúl', 'male', 'uomo', 'hombre'] },
  creature: { pitch: 1.6, rate: 1.05, names: ['Shelley', 'Sandy', 'Flo', 'Eddy'] },
  funny: { pitch: 0.5, rate: 0.8, names: ['Grandpa', 'Grandma', 'Rocko', 'Reed'] },
});
const PLAIN = Object.freeze({ kind: null, pitch: 1, rate: 1, names: [] });
const clamp = (value, lo, hi, fallback) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : fallback);

/** The kind, pitch, rate and preferred voice names for a character sheet's `voice` (or for none). */
export function voiceProfile(voice) {
  const kind = Object.hasOwn(VOICE_KINDS, voice?.kind) ? voice.kind : null;
  const base = kind ? VOICE_KINDS[kind] : PLAIN;
  return { kind, pitch: clamp(voice?.pitch, 0, 2, base.pitch), rate: clamp(voice?.rate, 0.5, 2, base.rate), names: base.names };
}

const primary = (tag) => String(tag ?? '').split(/[-_]/)[0].toLowerCase();
const ofLanguage = (voices, tag) => {
  const wanted = primary(tag);
  if (!wanted) return [];
  const all = (voices ?? []).filter((voice) => primary(voice.lang) === wanted);
  // The pack's own region first (it-IT before it-CH, es-ES before es-MX).
  const exact = all.filter((voice) => String(voice.lang).replace('_', '-').toLowerCase() === String(tag).toLowerCase());
  return [...exact, ...all.filter((voice) => !exact.includes(voice))];
};
const named = (voice, name) => new RegExp(`(^|[^\\p{L}])${name}([^\\p{L}]|$)`, 'iu').test(voice.name ?? '');
const better = (voice) => /enhanced|premium|natural|neural/i.test(voice.name ?? '');

/** The system voice for a profile in the language `tag`, or null when the device has none of that language. */
export function pickVoice(voices, tag, profile = PLAIN) {
  const candidates = ofLanguage(voices, tag);
  if (!candidates.length) return null;
  for (const name of profile.names ?? []) {
    const matches = candidates.filter((voice) => named(voice, name));
    if (matches.length) return matches.find(better) ?? matches[0];
  }
  // No voice of the kind: one that is not another kind's by name, so a `male` character does not get "Alice" when
  // there is an unnamed voice beside her.
  const others = Object.entries(VOICE_KINDS).filter(([kind]) => kind !== profile.kind && (kind === 'female' || kind === 'male')).flatMap(([, value]) => value.names);
  const neutral = candidates.filter((voice) => !others.some((name) => named(voice, name)));
  const pool = profile.kind && neutral.length ? neutral : candidates;
  return pool.find(better) ?? pool[0];
}

/** A line as it is read: no emphasis marks, one space between words. */
export const spokenText = (text) => String(text ?? '').replace(/[*_~`#]+/g, '').replace(/\s+/g, ' ').trim();

/**
 * Reads lines aloud with `scope.speechSynthesis`.
 *
 *   supported                       the browser can speak
 *   available(tag)                  it has a voice of that language
 *   speak({ text, tag, voice })     stops the line before and reads this one; `voice` is the character sheet's
 *   stop()
 *   prime()                         call inside a tap: iOS Safari lets a page speak on its own only after that
 */
export function createSpeaker(scope = typeof window !== 'undefined' ? window : {}) {
  const synthesis = scope.speechSynthesis ?? null;
  const Utterance = scope.SpeechSynthesisUtterance;
  const supported = Boolean(synthesis && typeof Utterance === 'function');
  let primed = false;
  const voices = () => (supported ? synthesis.getVoices?.() ?? [] : []);
  return {
    supported,
    available: (tag) => ofLanguage(voices(), tag).length > 0,
    speak({ text, tag, voice } = {}) {
      const line = spokenText(text);
      if (!supported || !line) return null;
      const profile = voiceProfile(voice);
      const chosen = pickVoice(voices(), tag, profile);
      const utterance = new Utterance(line);
      // With no voice of the language the browser still gets the tag and may find one itself.
      utterance.lang = chosen?.lang ?? tag ?? '';
      if (chosen) utterance.voice = chosen;
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      synthesis.cancel?.();
      synthesis.speak(utterance);
      primed = true;
      return utterance;
    },
    stop() { if (supported) synthesis.cancel?.(); },
    prime() {
      if (!supported || primed) return;
      primed = true;
      const utterance = new Utterance(' ');
      utterance.volume = 0;
      synthesis.speak(utterance);
    },
  };
}

// What to tell the player when recognition ends without words, by SpeechRecognition's error codes.
export const LISTEN_PROBLEMS = Object.freeze({
  'not-allowed': 'The microphone is not allowed here. The keyboard\'s own microphone key still works.',
  'service-not-allowed': 'This browser will not listen here (a page opened from the home screen may not). Open the page in Safari, or use the keyboard\'s microphone key.',
  'audio-capture': 'No microphone was found.',
  network: 'The speech service could not be reached.',
  'language-not-supported': 'This browser cannot listen in this language.',
  failed: 'Listening could not start. The keyboard\'s own microphone key still works.',
});

/**
 * Writes what the microphone hears as text, with `scope.SpeechRecognition`.
 *
 *   supported
 *   start({ tag, onText(text, final), onEnd(problem) })   `problem` is a key of LISTEN_PROBLEMS, or null
 *   stop()                                                ends listening; what was heard is kept
 *   listening
 */
export function createListener(scope = typeof window !== 'undefined' ? window : {}) {
  const Recognition = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  const supported = typeof Recognition === 'function';
  let current = null;
  const api = {
    supported,
    get listening() { return current !== null; },
    start({ tag, onText = () => {}, onEnd = () => {} } = {}) {
      if (!supported) { onEnd('failed'); return false; }
      api.stop();
      let recognition;
      try { recognition = new Recognition(); } catch { onEnd('failed'); return false; }
      const session = { recognition, problem: null, ended: false };
      const end = () => {
        if (session.ended) return;
        session.ended = true;
        if (current === session) current = null;
        onEnd(session.problem);
      };
      recognition.lang = tag ?? '';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const results = [...(event.results ?? [])];
        const text = results.map((result) => result[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim();
        if (text) onText(text, results.length > 0 && results.every((result) => result.isFinal));
      };
      // 'no-speech' and 'aborted' are a silence and a stop, not problems.
      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        session.problem = Object.hasOwn(LISTEN_PROBLEMS, event.error) ? event.error : 'failed';
      };
      recognition.onend = end;
      current = session;
      try { recognition.start(); } catch { session.problem = 'failed'; end(); return false; }
      return true;
    },
    stop() {
      const session = current;
      if (!session) return;
      try { session.recognition.stop(); } catch { /* already stopped */ }
    },
  };
  return api;
}

/** The speaker and the listener of this browser, made once. */
let shared = null;
export function browserSpeech() {
  shared ??= { speaker: createSpeaker(), listener: createListener() };
  return shared;
}
