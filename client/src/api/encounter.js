import { TOKEN_HEADER, loadSettings } from './settings.js';

// Round 114: requests go to the server URL from the settings (empty: this page's origin, as with the dev proxy) and
// carry the access token, when one is set, as X-ParaLLang-Token.
export function createLearningApi({ getSettings = () => loadSettings(), fetchImpl } = {}) {
  async function request(path, { learnerId, method = 'GET', body, signal } = {}) {
    const { serverUrl, token } = getSettings();
    const doFetch = fetchImpl ?? globalThis.fetch;
    let response;
    try {
      response = await doFetch(`${serverUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
          ...(token ? { [TOKEN_HEADER]: token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw Object.assign(new Error(`The server did not answer${serverUrl ? ` at ${serverUrl}` : ''}. Check the server URL in Settings, or wait a minute if it was asleep.`), { code: 'UNREACHABLE', retryable: true });
    }
    let data;
    try { data = await response.json(); }
    catch { throw Object.assign(new Error(`The server returned an unreadable response (${response.status}).`), { status: response.status }); }
    if (!response.ok) {
      const message = response.status === 401 ? 'The server refused the access token. Check it in Settings.' : data.error?.message || `Request failed (${response.status}).`;
      throw Object.assign(new Error(message), {
        status: response.status,
        code: data.error?.code,
        retryable: data.error?.retryable,
        details: data.error?.details,
      });
    }
    return data;
  }

  return {
    createLearner: (learnerId) => request('/api/learner', { method: 'POST', body: learnerId ? { learnerId } : {} }),
    startEncounter: (learnerId, restart = false) => request('/api/encounter/start', { learnerId, method: 'POST', body: { restart } }),
    currentEncounter: (learnerId) => request('/api/encounter/current', { learnerId }),
    sendDialogue: (learnerId, payload) => request('/api/encounter/dialogue', { learnerId, method: 'POST', body: payload }),
    revealHelp: (learnerId, payload) => request('/api/encounter/help', { learnerId, method: 'POST', body: payload }),
    getSpellbook: (learnerId) => request('/api/spellbook', { learnerId }),
    createReview: (learnerId, vocabularyId) => request('/api/spellbook/review', { learnerId, method: 'POST', body: vocabularyId ? { vocabularyId } : {} }),
    submitReview: (learnerId, payload) => request('/api/spellbook/review/submit', { learnerId, method: 'POST', body: payload }),
  };
}

export const learningApi = createLearningApi();

// Phase 1 names remain as small wrappers for callers outside the app.
export const startEncounter = learningApi.startEncounter;
export const sendDialogue = learningApi.sendDialogue;
