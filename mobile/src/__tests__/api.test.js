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

// Round 040: the optional server token.
test('with a token every request carries X-ParaLLang-Token; without one, none', async () => {
  const fetch = jest.fn(async () => response(200, {}));
  const api = createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch, token: 'tok-123' });
  await api.getWorld('learner-1');
  await api.createLearner();
  await api.deleteLearner('learner-1');
  await api.getOnboarding();
  expect(fetch.mock.calls.map(([, init]) => [init.method, init.headers['X-ParaLLang-Token']])).toEqual([
    ['GET', 'tok-123'], ['POST', 'tok-123'], ['DELETE', 'tok-123'], ['GET', 'tok-123'],
  ]);
  expect(fetch.mock.calls[2][1].headers).toEqual({ 'X-Learner-Id': 'learner-1', 'X-ParaLLang-Token': 'tok-123' });
  const plain = jest.fn(async () => response(200, {}));
  await createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch: plain, token: null }).getWorld('learner-1');
  expect(plain.mock.calls[0][1].headers).toEqual({ 'X-Learner-Id': 'learner-1' });
});

test('a 401 for a missing token names the app setting; other errors keep the server message', async () => {
  const fetch = jest.fn(async () => response(401, { error: { code: 'UNAUTHORIZED', message: 'A valid X-ParaLLang-Token header is required.' } }));
  const api = createLearningApi({ baseUrl: 'http://127.0.0.1:3001', fetch, token: null });
  await expect(api.getWorld('learner-1')).rejects.toMatchObject({
    message: "The ParaLLang server needs its token. Start Expo with EXPO_PUBLIC_PARALLANG_TOKEN set to the server's PARALLANG_TOKEN.",
    status: 401, code: 'UNAUTHORIZED',
  });
  const wrong = jest.fn(async () => response(401, { error: { code: 'UNAUTHORIZED', message: 'A valid X-ParaLLang-Token header is required.' } }));
  const sent = createLearningApi({ baseUrl: 'x', fetch: wrong, token: 'tok-wrong' }).getWorld('l');
  await expect(sent).rejects.toMatchObject({ message: "The app's EXPO_PUBLIC_PARALLANG_TOKEN does not match the server's PARALLANG_TOKEN." });
  const other = jest.fn(async () => response(401, { error: { code: 'SOMETHING_ELSE', message: 'Other.' } }));
  await expect(createLearningApi({ baseUrl: 'x', fetch: other }).getWorld('l')).rejects.toMatchObject({ message: 'Other.' });
});

test('a token a header cannot carry is reported as a setting, without its value and without a request', async () => {
  const fetch = jest.fn();
  await expect(createLearningApi({ baseUrl: 'x', fetch, token: 'two words' }).getWorld('l')).rejects.toMatchObject({ code: 'BAD_TOKEN_SETTING', message: expect.not.stringContaining('two words') });
  expect(fetch).not.toHaveBeenCalled();
});

test('config reads and trims EXPO_PUBLIC_PARALLANG_TOKEN at import; blank means none', () => {
  for (const [value, expected] of [['  tok-1 ', 'tok-1'], ['   ', null], [undefined, null]]) {
    jest.isolateModules(() => {
      if (value === undefined) delete process.env.EXPO_PUBLIC_PARALLANG_TOKEN; else process.env.EXPO_PUBLIC_PARALLANG_TOKEN = value;
      expect(require('../config.js').API_TOKEN).toBe(expected);
    });
  }
  delete process.env.EXPO_PUBLIC_PARALLANG_TOKEN;
});
