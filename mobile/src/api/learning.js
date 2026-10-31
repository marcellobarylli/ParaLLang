import { API_URL } from '../config.js';

export function createLearningApi({ baseUrl = API_URL, fetch: fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  async function request(path, { learnerId, method = 'GET', body, signal } = {}) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw Object.assign(new Error(`Can't reach the ParaLLang server at ${baseUrl}. Start it with npm run dev:server.`), {
        code: 'SERVER_UNREACHABLE',
        retryable: true,
      });
    }
    let data;
    try { data = await response.json(); }
    catch { throw Object.assign(new Error(`The server returned an unreadable response (${response.status}).`), { status: response.status }); }
    if (!response.ok) {
      throw Object.assign(new Error(data.error?.message || `Request failed (${response.status}).`), {
        status: response.status,
        code: data.error?.code,
        retryable: data.error?.retryable,
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
