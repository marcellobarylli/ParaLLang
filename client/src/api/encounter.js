import { GEMINI_KEY_HEADER, TOKEN_HEADER, announceAccessProblem, loadGeminiKey, loadSettings } from './settings.js';

// Round 114: requests go to the server URL from the settings (empty: this page's origin, as with the dev proxy) and
// carry the access token, when one is set, as X-ParaLLang-Token.
// Round 121: the contract of the dungeon's routes this client speaks (server/src/errors.js). A server that has moved
// on tells an older page to reload.
export const CLIENT_CONTRACT = 121;

export function createLearningApi({ getSettings = () => loadSettings(), getGeminiKey = () => loadGeminiKey(), fetchImpl } = {}) {
  async function request(path, { learnerId, method = 'GET', body, signal } = {}) {
    const { serverUrl, token } = getSettings();
    const geminiKey = getGeminiKey();
    const doFetch = fetchImpl ?? globalThis.fetch;
    let response;
    try {
      response = await doFetch(`${serverUrl}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
          ...(token ? { [TOKEN_HEADER]: token } : {}),
          ...(geminiKey ? { [GEMINI_KEY_HEADER]: geminiKey } : {}),
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
      announceAccessProblem(response.status, data.error?.code); // round 171: the friend code or a Gemini key is asked for
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
    // Round 115: `options` is { restart, dungeonId, encounterId }; a bare boolean is the old `restart` flag. With a
    // dungeonId the server starts the run's next site.
    startEncounter: (learnerId, options = {}) => {
      // Round 148: `immersion` is the share of target language the player chose for the characters' lines.
      const { restart = false, dungeonId, encounterId, road = false, immersion } = typeof options === 'object' && options !== null ? options : { restart: options === true };
      return request('/api/encounter/start', { learnerId, method: 'POST', body: { restart, ...(dungeonId ? { dungeonId, client: CLIENT_CONTRACT } : {}), ...(encounterId ? { encounterId } : {}), ...(road ? { road: true } : {}), ...(typeof immersion === 'number' ? { immersion } : {}) } });
    },
    // Round 144: The Journey 2: the learner's place on the endless graph with what waits ahead and the
    // curriculum's marks; a walk to a site (`leave` drops the road's conversation under way); a new road.
    getRoad: (learnerId, { seed = null } = {}) => request(seed ? `/api/road?seed=${encodeURIComponent(seed)}` : '/api/road', { learnerId }), // round 175: the title's seed for a new road
    // Round 161: the whole journey, as the ids of the sites walked to, for the map's "Show Journey so far".
    getRoadWalk: (learnerId) => request('/api/road/walk', { learnerId }),
    moveRoad: (learnerId, body) => request('/api/road/move', { learnerId, method: 'POST', body }),
    resetRoad: (learnerId, body = {}) => request('/api/road/reset', { learnerId, method: 'POST', body }),
    // Round 173: streamlined mode on or off; answers with the road's view.
    setRoadMode: (learnerId, streamlined) => request('/api/road/mode', { learnerId, method: 'POST', body: { streamlined } }),
    // Round 144: the whole save, for the copy this browser keeps, and the copy put back on a server that lost it.
    exportSave: (learnerId) => request('/api/save', { learnerId }),
    // Round 146: the server's health check, which says where it keeps its saves (round 145). No token is needed.
    getHealth: () => request('/api/health'),
    restoreSave: (copy) => request('/api/save/restore', { method: 'POST', body: copy }),
    // Round 119: the map and the run on it. (The bare path is the one the client of rounds 115 to 118 read; the
    // server answers it with a note to reload.)
    getDungeon: (learnerId, dungeonId) => request(`/api/dungeons/${encodeURIComponent(dungeonId)}/map?client=${CLIENT_CONTRACT}`, { learnerId }),
    // Round 120: the party, as the app has it (rounds 021 to 023).
    getParty: (learnerId) => request('/api/party', { learnerId }),
    recruit: (learnerId, encounterId) => request('/api/party/recruit', { learnerId, method: 'POST', body: { encounterId } }),
    // Round 119: a walk to a neighbouring site; `leave` drops the dungeon's conversation under way.
    moveDungeon: (learnerId, dungeonId, body) => request(`/api/dungeons/${encodeURIComponent(dungeonId)}/move`, { learnerId, method: 'POST', body: { ...body, client: CLIENT_CONTRACT } }),
    resetDungeon: (learnerId, dungeonId) => request(`/api/dungeons/${encodeURIComponent(dungeonId)}/reset`, { learnerId, method: 'POST', body: { client: CLIENT_CONTRACT } }),
    currentEncounter: (learnerId) => request('/api/encounter/current', { learnerId }),
    sendDialogue: (learnerId, payload) => request('/api/encounter/dialogue', { learnerId, method: 'POST', body: payload }),
    revealHelp: (learnerId, payload) => request('/api/encounter/help', { learnerId, method: 'POST', body: payload }),
    // Round 157: the guidebook's entries, and their being read when it is opened.
    getGuidebook: (learnerId) => request('/api/guidebook', { learnerId }),
    readGuidebook: (learnerId) => request('/api/guidebook/read', { learnerId, method: 'POST', body: {} }),
    getSpellbook: (learnerId) => request('/api/spellbook', { learnerId }),
    createReview: (learnerId, vocabularyId) => request('/api/spellbook/review', { learnerId, method: 'POST', body: vocabularyId ? { vocabularyId } : {} }),
    submitReview: (learnerId, payload) => request('/api/spellbook/review/submit', { learnerId, method: 'POST', body: payload }),
  };
}

export const learningApi = createLearningApi();

// Phase 1 names remain as small wrappers for callers outside the app.
export const startEncounter = learningApi.startEncounter;
export const sendDialogue = learningApi.sendDialogue;
