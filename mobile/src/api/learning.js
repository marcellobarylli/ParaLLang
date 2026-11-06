import { API_TOKEN, API_URL, validToken } from '../config.js';

export function createLearningApi({ baseUrl = API_URL, token = API_TOKEN, fetch: fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  async function request(path, { learnerId, method = 'GET', body, signal } = {}) {
    if (token && !validToken(token)) {
      throw Object.assign(new Error('EXPO_PUBLIC_PARALLANG_TOKEN holds characters a header cannot carry (spaces or control characters). Set it to the server\'s PARALLANG_TOKEN and restart Expo.'), { code: 'BAD_TOKEN_SETTING' });
    }
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
          ...(token ? { 'X-ParaLLang-Token': token } : {}),
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
      // Round 040: the server's 401 names its header; the player needs the app setting.
      // Critique 1.4: a missing token and a wrong one get their own message; neither shows the value.
      const unauthorized = response.status === 401 && data.error?.code === 'UNAUTHORIZED';
      const message = !unauthorized ? data.error?.message || `Request failed (${response.status}).`
        : token ? 'The app\'s EXPO_PUBLIC_PARALLANG_TOKEN does not match the server\'s PARALLANG_TOKEN.'
          : 'The ParaLLang server needs its token. Start Expo with EXPO_PUBLIC_PARALLANG_TOKEN set to the server\'s PARALLANG_TOKEN.';
      throw Object.assign(new Error(message), {
        status: response.status,
        code: data.error?.code,
        retryable: data.error?.retryable,
      });
    }
    return data;
  }

  return {
    createLearner: (learnerId) => request('/api/learner', { method: 'POST', body: learnerId ? { learnerId } : {} }),
    deleteLearner: (learnerId) => request('/api/learner', { learnerId, method: 'DELETE' }), // Round 039
    startEncounter: (learnerId, restart = false, encounterId = null) => request('/api/encounter/start', { learnerId, method: 'POST', body: encounterId ? { restart, encounterId } : { restart } }),
    currentEncounter: (learnerId) => request('/api/encounter/current', { learnerId }),
    sendDialogue: (learnerId, payload) => request('/api/encounter/dialogue', { learnerId, method: 'POST', body: payload }),
    revealHelp: (learnerId, payload) => request('/api/encounter/help', { learnerId, method: 'POST', body: payload }),
    getTurnProgress: (learnerId, attemptId) => request(`/api/encounter/progress?attemptId=${encodeURIComponent(attemptId)}`, { learnerId }), // round 070
    getOnboarding: () => request('/api/onboarding'),
    getWorld: (learnerId) => request('/api/world', { learnerId }),
    getAtmosphere: (learnerId) => request('/api/world/atmosphere', { learnerId }), // round 053
    moveTo: (learnerId, locationId) => request('/api/world/move', { learnerId, method: 'POST', body: { locationId } }),
    getParty: (learnerId) => request('/api/party', { learnerId }),
    recruit: (learnerId, encounterId) => request('/api/party/recruit', { learnerId, method: 'POST', body: { encounterId } }),
    getSpellbook: (learnerId) => request('/api/spellbook', { learnerId }),
    createReview: (learnerId, vocabularyId) => request('/api/spellbook/review', { learnerId, method: 'POST', body: vocabularyId ? { vocabularyId } : {} }),
    submitReview: (learnerId, payload) => request('/api/spellbook/review/submit', { learnerId, method: 'POST', body: payload }),
  };
}

export const learningApi = createLearningApi();
