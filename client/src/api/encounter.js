async function request(path, { learnerId, method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
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

export const learningApi = {
  createLearner: (learnerId) => request('/api/learner', { method: 'POST', body: learnerId ? { learnerId } : {} }),
  startEncounter: (learnerId, restart = false) => request('/api/encounter/start', { learnerId, method: 'POST', body: { restart } }),
  currentEncounter: (learnerId) => request('/api/encounter/current', { learnerId }),
  sendDialogue: (learnerId, payload) => request('/api/encounter/dialogue', { learnerId, method: 'POST', body: payload }),
  revealHelp: (learnerId, payload) => request('/api/encounter/help', { learnerId, method: 'POST', body: payload }),
  getSpellbook: (learnerId) => request('/api/spellbook', { learnerId }),
  createReview: (learnerId, vocabularyId) => request('/api/spellbook/review', { learnerId, method: 'POST', body: vocabularyId ? { vocabularyId } : {} }),
  submitReview: (learnerId, payload) => request('/api/spellbook/review/submit', { learnerId, method: 'POST', body: payload }),
};

// Phase 1 names remain as small wrappers for callers outside the app.
export const startEncounter = learningApi.startEncounter;
export const sendDialogue = learningApi.sendDialogue;
