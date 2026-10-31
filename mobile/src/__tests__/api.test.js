import { createLearningApi } from '../api/learning.js';

const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('builds absolute URLs from the base URL and sends the learner header', async () => {
  const fetch = jest.fn(async () => response(200, { challenge: null }));
  const api = createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch });
  await api.createReview('learner-1', 'caffe');
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3001/api/spellbook/review', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Learner-Id': 'learner-1' },
    body: JSON.stringify({ vocabularyId: 'caffe' }),
  }));
});

test('keeps the server error fields', async () => {
  const fetch = jest.fn(async () => response(503, { error: { code: 'CLI_TIMEOUT', message: 'The selected CLI timed out.', retryable: true } }));
  const api = createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch });
  await expect(api.sendDialogue('learner-1', {})).rejects.toMatchObject({ message: 'The selected CLI timed out.', status: 503, code: 'CLI_TIMEOUT', retryable: true });
});

test('a network failure names the server address and how to start it', async () => {
  const fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
  const api = createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch });
  await expect(api.createLearner()).rejects.toMatchObject({
    message: "Can't reach the ParaLLang server at http://127.0.0.1:3001. Start it with npm run dev:server.",
    code: 'SERVER_UNREACHABLE',
    retryable: true,
  });
});
