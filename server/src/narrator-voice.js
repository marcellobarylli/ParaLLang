// Round 202: the narrator's voice from a hosted model. The browser's own speech on an iPhone is Apple's compact voice
// (Safari does not give a page the better ones), so the narration is read by Gemini's text-to-speech instead:
// `gemini-3.8-flash-tts` through generateContent with responseModalities ["AUDIO"] and a prebuilt voice, which answers
// with base64 16-bit PCM at 24 kHz, mono (ai.google.dev/gemini-api/docs/speech-generation, read through search
// summaries: the page itself is outside the session's network). The PCM is wrapped as a WAV here, which every browser
// plays. A clip is kept in memory by its text, since the narrator's written passages come round again.
import { createHash } from 'node:crypto';
import { AppError } from './errors.js';

export const NARRATOR_MODEL = 'gemini-3.8-flash-tts';
// Round 208: the player picks the narrator's voice in Settings from these (Google's labels: Charon "informative",
// Gacrux "mature", Algenib "gravelly"); any other name is read as the default. Round 207's Puck is gone.
// Round 209: Algenib is the default, and three voices Google lists as female: Sulafat, Vindemiatrix and Aoede.
export const NARRATOR_VOICES = Object.freeze(['Algenib', 'Charon', 'Gacrux', 'Sulafat', 'Vindemiatrix', 'Aoede']);
export const FEMALE_VOICES = Object.freeze(['Sulafat', 'Vindemiatrix', 'Aoede']);
export const NARRATOR_VOICE = 'Algenib';
// Round 206: the direction is a set of notes above a marked transcript (the layout of Google's prompting guide for
// its speech models), not a sentence run on into the text, which the voice read aloud as part of the story. The notes
// end by saying only the transcript is spoken. Round 210: a storyteller narrating a fantasy tale, played straight; the
// silliness is left to the text (rounds 206 to 209 asked the voice for it as well).
export const NARRATOR_STYLE = [
  '# AUDIO PROFILE: The Narrator',
  'A seasoned storyteller narrating a fantasy tale to a listener by the fire: rich, warm and assured, with a quiet sense of wonder. The story is told straight; any humour is in the words and is left to speak for itself.',
  '### DIRECTOR\'S NOTES',
  'Style: classic fantasy narration; immersive and evocative, with gentle gravity in the mysterious moments and lightness in the bright ones. No comic voices, no winks, no exaggeration.',
  'Pace: measured and unhurried, with natural pauses between sentences.',
  'Accent: words that are not English are said as a native speaker of their language says them.',
  'Speak only the words under TRANSCRIPT. Never say these notes or the headings aloud.',
  '#### TRANSCRIPT',
].join('\n');
/** The notes for a voice (round 209 gave the female voices their own; round 210's notes have no "he" or "she"). */
export const narratorStyleFor = () => NARRATOR_STYLE;
export const NARRATOR_MAX_CHARS = 1500;
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 25_000;
const CACHE_CLIPS = 120;

/** Raw 16-bit little-endian PCM as a WAV file. */
export function wavOf(pcm, { rate = 24000, channels = 1 } = {}) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * channels * 2, 28); header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const unavailable = (message, details = {}) => new AppError(message, { status: 503, code: 'NARRATOR_UNAVAILABLE', retryable: false, details });

/**
 * createNarratorVoice({ apiKey, model, voice }) -> { available(key), speak(text, { apiKey }) -> { audio: Buffer, type } }
 * `speak` throws NARRATOR_UNAVAILABLE (503) when there is no key or Google does not answer with audio; the page then
 * reads with the device's voice, as before. `details.pause` is true when it is worth asking again later (a spent
 * allowance, an overload) and false when it is not (no key, a refused key, an unknown model).
 */
export function createNarratorVoice({ apiKey = null, model = NARRATOR_MODEL, voice = NARRATOR_VOICE, fetchImpl = (...args) => fetch(...args), logger = console } = {}) {
  const clips = new Map();
  let last = null; // how the last call to the model went, for the health check: 'ok' or 'failed (status)'
  return {
    model, voice,
    status: () => ({ hosted: Boolean(apiKey), model, voice, last }),
    available: (key = null) => Boolean(key || apiKey),
    async speak(text, { apiKey: given = null, voice: asked = null } = {}) {
      const speaker = NARRATOR_VOICES.includes(asked) ? asked : voice;
      const line = String(text ?? '').replace(/\s+/g, ' ').trim();
      if (!line || !/[\p{L}\p{N}]/u.test(line)) throw new AppError('Nothing to read.', { status: 400, code: 'VALIDATION_ERROR' });
      if (line.length > NARRATOR_MAX_CHARS) throw new AppError('That is too long to read in one go.', { status: 400, code: 'VALIDATION_ERROR' });
      const key = given || apiKey;
      if (!key) throw unavailable('The narrator has no hosted voice on this server.', { pause: false });
      const id = createHash('sha256').update(`${model}|${speaker}|${line}`).digest('hex');
      const kept = clips.get(id);
      if (kept) { clips.delete(id); clips.set(id, kept); return kept; }
      let response;
      try {
        response = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${narratorStyleFor(speaker)}\n${line}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker } } } },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        last = `failed (${error?.name ?? 'no answer'})`;
        logger.warn?.(`narrator voice: ${error?.name ?? 'error'} ${error?.message ?? ''}`);
        throw unavailable('The narrator\'s voice did not answer.', { pause: true });
      }
      if (!response.ok) {
        let reason = '';
        try { const body = await response.json(); reason = String((Array.isArray(body) ? body[0] : body)?.error?.message ?? '').slice(0, 300); } catch { /* no reason given */ }
        last = `failed (${response.status}${reason ? `: ${reason}` : ''})`;
        logger.warn?.(`narrator voice: ${model} answered ${response.status} ${reason}`);
        throw unavailable('The narrator\'s voice is not available just now.', { pause: response.status === 429 || response.status >= 500, status: response.status });
      }
      let part = null;
      try { part = (await response.json())?.candidates?.[0]?.content?.parts?.find((each) => each?.inlineData?.data)?.inlineData ?? null; } catch { part = null; }
      if (!part) { last = 'failed (an answer without sound)'; logger.warn?.(`narrator voice: ${model} answered without audio`); throw unavailable('The narrator\'s voice answered without sound.', { pause: true }); }
      const bytes = Buffer.from(part.data, 'base64');
      const type = String(part.mimeType ?? '').toLowerCase();
      // A container (wav, mp3, ogg) is passed on as it is; raw PCM ("audio/L16;codec=pcm;rate=24000") is wrapped.
      const contained = /wav|mpeg|mp3|ogg|opus|aac|flac/.test(type);
      const rate = Number(type.match(/rate=(\d+)/)?.[1]) || 24000;
      const clip = contained ? { audio: bytes, type: type.split(';')[0] } : { audio: wavOf(bytes, { rate }), type: 'audio/wav' };
      last = 'ok';
      clips.set(id, clip);
      if (clips.size > CACHE_CLIPS) clips.delete(clips.keys().next().value);
      return clip;
    },
  };
}
