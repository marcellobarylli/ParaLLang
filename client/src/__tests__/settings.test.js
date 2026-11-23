// Round 114: the server URL and access token from the settings sheet reach every request; a Pages build with no
// server says so instead of calling GitHub Pages' /api.
import { afterEach, expect, test, vi } from 'vitest';
import { createLearningApi } from '../api/encounter.js';
import { SETTINGS_KEY, loadSettings, normalizeServerUrl, saveSettings, settingsProblem } from '../api/settings.js';
import { createGameStore } from '../stores/gameStore.js';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: vi.fn((key) => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)), values };
}
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
afterEach(() => vi.restoreAllMocks());

test('settings load with defaults, save trimmed, and survive a broken stored value', () => {
  const storage = memoryStorage();
  expect(loadSettings(storage)).toEqual({ serverUrl: '', token: '' });
  expect(saveSettings({ serverUrl: ' https://parallang.example.com/// ', token: ' secret-token ' }, storage)).toEqual({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
  expect(JSON.parse(storage.values.get(SETTINGS_KEY))).toEqual({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
  expect(loadSettings(storage)).toEqual({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
  expect(loadSettings(memoryStorage({ [SETTINGS_KEY]: '{not json' }))).toEqual({ serverUrl: '', token: '' });
  expect(normalizeServerUrl(undefined)).toBe('');
});

test('a production build needs a server URL; a URL must be http(s)', () => {
  expect(settingsProblem({ serverUrl: '' }, { sameOrigin: false })).toMatch(/No server is set/);
  expect(settingsProblem({ serverUrl: '' }, { sameOrigin: true })).toBeNull();
  expect(settingsProblem({ serverUrl: 'parallang.example.com' }, { sameOrigin: false })).toMatch(/must start with https/);
  expect(settingsProblem({ serverUrl: 'https://parallang.example.com' }, { sameOrigin: false })).toBeNull();
});

test('requests go to the server URL and carry the token header; 401 and no answer say what to check', async () => {
  const fetchImpl = vi.fn(async () => ok({ learnerId: 'id', recovered: false }));
  const settings = { serverUrl: 'https://parallang.example.com', token: 'secret-token' };
  const api = createLearningApi({ getSettings: () => settings, fetchImpl });
  await api.createLearner(null);
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe('https://parallang.example.com/api/learner');
  expect(init.headers['X-ParaLLang-Token']).toBe('secret-token');

  settings.token = '';
  settings.serverUrl = '';
  await api.getSpellbook('learner-1');
  expect(fetchImpl.mock.calls[1][0]).toBe('/api/spellbook');
  expect(fetchImpl.mock.calls[1][1].headers).toEqual({ 'X-Learner-Id': 'learner-1' });

  const refused = createLearningApi({ getSettings: () => settings, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'A valid X-ParaLLang-Token header is required.' } }) }) });
  await expect(refused.createLearner(null)).rejects.toThrow(/refused the access token\. Check it in Settings/);
  const asleep = createLearningApi({ getSettings: () => ({ serverUrl: 'https://parallang.example.com', token: '' }), fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await expect(asleep.createLearner(null)).rejects.toMatchObject({ code: 'UNREACHABLE', message: expect.stringMatching(/did not answer at https:\/\/parallang\.example\.com/) });
});

test('the store explains a missing server without a request, and saved settings reconnect with the new URL and token', async () => {
  const storage = memoryStorage();
  const dungeon = { id: 'ta_prohm', name: 'Ta Prohm', level: 'taprohm', start: 'face_gate', goal: 'face_gate', entrance: [[0, 96]], sites: [{ id: 'face_gate', encounterId: 'market_entrance_tutorial', name: 'The Face Gate', at: [3.5, 63], characterName: null }], paths: [] };
  const progress = { run: 1, at: 'face_gate', complete: false, clearedSiteIds: [], visitedSiteIds: ['face_gate'], sites: { face_gate: { state: 'current', cleared: false, reachable: false } } };
  const fetchImpl = vi.fn(async (url) => (String(url).endsWith('/api/learner')
    ? ok({ learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language: { code: 'it', name: 'Italian', tag: 'it-IT' } })
    : String(url).endsWith('/api/party') ? ok({ party: [] }) // round 120: the party is read beside the map
      : ok({ dungeon: { ...dungeon, sites: [{ ...dungeon.sites[0], characterName: 'Portia' }] }, progress })));
  vi.stubGlobal('fetch', fetchImpl);
  const store = createGameStore({ storage, dungeon, sameOrigin: false });
  await store.getState().initialize();
  expect(store.getState().serverProblem).toMatch(/No server is set\. Open Settings/);
  expect(store.getState().connection).toBe('offline');
  expect(fetchImpl).not.toHaveBeenCalled();

  store.getState().openSettings();
  expect(store.getState().settingsOpen).toBe(true);
  await store.getState().saveSettings({ serverUrl: 'https://parallang.example.com/', token: 'secret-token' });
  expect(store.getState().settingsOpen).toBe(false);
  expect(store.getState().serverProblem).toBeNull();
  expect(store.getState().connection).toBe('ready');
  expect(store.getState().dungeon.sites[0].characterName).toBe('Portia');
  // Round 175: on the title the road is read too, with the title's landscape for a new road.
  const seed = store.getState().titleSeed;
  expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(['https://parallang.example.com/api/learner', 'https://parallang.example.com/api/dungeons/ta_prohm/map?client=121', 'https://parallang.example.com/api/party', `https://parallang.example.com/api/road?seed=${seed}`]);
  for (const [, init] of fetchImpl.mock.calls) expect(init.headers['X-ParaLLang-Token']).toBe('secret-token');
  expect(loadSettings(storage)).toEqual({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
});
