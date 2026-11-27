import { GEMINI_KEY_HEADER, TOKEN_HEADER, loadGeminiKey, loadSettings } from './settings.js';
import { loadDisplay } from '../display.js';

// Round 202: the narrator's hosted voice. The server reads a narration with a text-to-speech model and answers with
// a sound file (POST /api/narrate). When it has no voice (no key), this stops asking for the rest of the visit; when
// the voice is busy or its allowance is spent, it stops for a while. Either way the answer here is null and the
// device's own voice reads the narration.
export const NARRATE_MAX_CHARS = 1500;
export const NARRATE_PAUSE_MS = 5 * 60 * 1000;
const KEPT = 24;

/** createNarratorClips() -> async (text) => Blob | null */
export function createNarratorClips({ getSettings = () => loadSettings(), getGeminiKey = () => loadGeminiKey(), getVoice = () => loadDisplay().narratorVoice, fetchImpl, now = () => Date.now() } = {}) {
  let off = false;
  let pausedUntil = 0;
  const kept = new Map();
  return async function clipOf(text) {
    const line = String(text ?? '').trim();
    if (!line || line.length > NARRATE_MAX_CHARS || off || now() < pausedUntil) return null;
    const voice = getVoice() ?? null; // round 208: the voice picked in Settings; a clip is kept by voice and text
    const id = `${voice}|${line}`;
    if (kept.has(id)) return kept.get(id);
    const doFetch = fetchImpl ?? globalThis.fetch;
    if (typeof doFetch !== 'function') return null;
    const { serverUrl, token } = getSettings();
    const geminiKey = getGeminiKey();
    let response;
    try {
      response = await doFetch(`${serverUrl}/api/narrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { [TOKEN_HEADER]: token } : {}), ...(geminiKey ? { [GEMINI_KEY_HEADER]: geminiKey } : {}) },
        body: JSON.stringify({ text: line, ...(voice ? { voice } : {}) }),
      });
    } catch { pausedUntil = now() + NARRATE_PAUSE_MS; return null; }
    if (!response.ok) {
      let error = null;
      try { error = (await response.json())?.error ?? null; } catch { error = null; }
      // No voice on this server (or one before round 202, which answers 404): not asked again this visit.
      if (response.status === 404 || (error?.code === 'NARRATOR_UNAVAILABLE' && error?.details?.pause === false)) off = true;
      else if (response.status !== 400) pausedUntil = now() + NARRATE_PAUSE_MS;
      return null;
    }
    let blob = null;
    try { blob = await response.blob(); } catch { return null; }
    if (!blob || !blob.size) return null;
    kept.set(id, blob);
    if (kept.size > KEPT) kept.delete(kept.keys().next().value);
    return blob;
  };
}
