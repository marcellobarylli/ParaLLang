// Round 090 (review R1.3 of rounds 029–039): a save the server cannot read must not lock the player out of the others.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../../App.js';
import { useGameStore } from '../stores/gameStore.js';
import { SLOTS_KEY } from '../stores/saveSlots.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const world = { currentLocationId: 'market_entrance', locations: [{ id: 'market_entrance', name: 'Market Entrance', state: 'current', adjacent: false, map: { x: 0.5, y: 0.9 }, description: 'An arch.', encounter: null }], paths: [] };
const slot = (learnerId, label) => ({ learnerId, label, createdAt: '2026-11-05T12:00:00.000Z' });

test('after a failed start the header offers Saves; the screen continues another save and offers no Remove', async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('parallang.onboardingSeen', '1');
  await AsyncStorage.setItem(SLOTS_KEY, JSON.stringify({ version: 1, activeId: A, slots: [slot(A, 'Save 1'), slot(B, 'Save 2')] }));
  useGameStore.setState({
    learnerId: null, language: null, encounter: null, spellbook, world: null, onboarding: null, party: [], notice: null, view: 'map', returnView: 'map',
    reviewChallenge: null, reviewResult: null, assessment: null, draft: '', pendingInput: null, isLoading: false, error: null, saves: [],
  });
  const response = (status, data) => ({ ok: status < 300, status, json: async () => data });
  globalThis.fetch = jest.fn(async (url, init = {}) => {
    const path = new URL(String(url)).pathname;
    if (path === '/api/learner') {
      const { learnerId } = JSON.parse(init.body ?? '{}');
      if (learnerId === A) return response(503, { error: { code: 'SAVE_UNREADABLE', message: 'This learner save contains invalid JSON. The original file was preserved.', retryable: true } });
      return response(200, { learnerId, recovered: true, language });
    }
    if (path === '/api/world') return response(200, { world });
    if (path === '/api/encounter/current') return response(200, { encounter: null, spellbook });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party: [] });
    throw new Error(`Unexpected fetch ${path}`);
  });
  const user = userEvent.setup();
  await render(<App />);
  expect(await screen.findByText(/invalid JSON/)).toBeTruthy();
  await user.press(await screen.findByRole('button', { name: 'Saves' }));
  expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Continue Save 2' }));
  expect(await screen.findByText('Now playing Save 2.')).toBeTruthy();
  expect(useGameStore.getState().learnerId).toBe(B);
  delete globalThis.fetch;
});
