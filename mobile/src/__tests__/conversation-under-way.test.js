// Round 091 (review R1.1 of rounds 017–028): the map's Talk never replaces a conversation under way elsewhere; the
// card offers the way back and a way out, and a 409 from the server teaches the app which conversation it holds.
import { render, screen, userEvent } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';
import { createGameStore } from '../stores/gameStore.js';

const butchers = { currentLocationId: 'butchers_stall', locations: [{ id: 'butchers_stall', name: "The Butcher's Stall", state: 'current', adjacent: false, map: { x: 0.2, y: 0.5 }, description: 'Hams.', vocabularyFocus: [], encounter: { id: 'butchers_stall_charcutier', completed: false, characterName: 'Mortimer', characterId: 'charcutier_mortimer_001', saveable: true } }], paths: [] };
const flick = { id: 'enc-f', encounterId: 'flick_slow_walk', character: { name: 'Flick' }, version: 3, state: 'ongoing', transcript: [], hints: { remaining: 1, limit: 2 } };
const props = { isLoading: false, onMove: jest.fn(), party: [], world: butchers };

test('a party conversation under way elsewhere: Talk waits, the card offers the way back and a way out', async () => {
  const user = userEvent.setup();
  const onReturnToEncounter = jest.fn();
  const onLeaveForEncounter = jest.fn();
  const onEnterEncounter = jest.fn();
  await render(<MapPanel {...props} ongoing={flick} onReturnToEncounter={onReturnToEncounter} onLeaveForEncounter={onLeaveForEncounter} onEnterEncounter={onEnterEncounter} />);
  expect(screen.getByText('Finish your conversation with Flick first.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Talk to Mortimer, unavailable: finish your conversation with Flick first' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Return to Flick' }));
  expect(onReturnToEncounter).toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Leave Flick and talk to Mortimer' }));
  expect(onLeaveForEncounter).toHaveBeenCalledTimes(1);
  expect(onEnterEncounter).not.toHaveBeenCalled();
});

test('the same encounter under way here keeps Talk; nothing under way shows no note', async () => {
  for (const ongoing of [{ ...flick, encounterId: 'butchers_stall_charcutier', character: { name: 'Mortimer' } }, null]) {
    await render(<MapPanel {...props} ongoing={ongoing} onReturnToEncounter={jest.fn()} onLeaveForEncounter={jest.fn()} onEnterEncounter={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Talk to Mortimer' })).toBeEnabled();
    expect(screen.queryByText(/Finish your conversation/)).toBeNull();
  }
});

test('without a name the note still reads', async () => {
  await render(<MapPanel {...props} ongoing={{ ...flick, character: undefined }} onReturnToEncounter={jest.fn()} onLeaveForEncounter={jest.fn()} onEnterEncounter={jest.fn()} />);
  expect(screen.getByText('Finish the conversation under way first.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Return to the conversation' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Leave it and talk to Mortimer' })).toBeOnTheScreen();
});

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const learnerId = '11111111-1111-4111-8111-111111111111';
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1', inEncounter: true };
function storeWith(overrides = {}) {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  const storage = { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
  const api = {
    createLearner: jest.fn(async () => ({ learnerId, recovered: true, language })),
    getWorld: jest.fn(async () => ({ world: butchers })), getSpellbook: jest.fn(async () => spellbook), getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => null),
    startEncounter: jest.fn(async () => ({ encounter: { ...flick, id: 'enc-m', encounterId: 'butchers_stall_charcutier', character: { name: 'Mortimer' }, version: 1 }, spellbook })),
    ...overrides,
  };
  return { api, store: createGameStore({ api, storage, cue: jest.fn(), ambience: jest.fn() }) };
}

test('leaving is a restart start of the encounter here', async () => {
  const { api, store } = storeWith({ currentEncounter: jest.fn(async () => ({ encounter: flick, spellbook })) });
  await store.getState().initialize();
  expect(store.getState().encounter.encounterId).toBe('flick_slow_walk');
  await store.getState().leaveAndEnter();
  expect(api.startEncounter).toHaveBeenCalledWith(learnerId, true, 'butchers_stall_charcutier');
  expect(store.getState().encounter.encounterId).toBe('butchers_stall_charcutier');
  expect(store.getState().view).toBe('dialogue');
});

test('a 409 CONVERSATION_UNDER_WAY makes the store take the conversation the server holds', async () => {
  const underWay = Object.assign(new Error('Finish your conversation with Flick first.'), { code: 'CONVERSATION_UNDER_WAY', status: 409 });
  const currentEncounter = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue({ encounter: flick, spellbook });
  const { store } = storeWith({ currentEncounter, startEncounter: jest.fn(async () => { throw underWay; }) });
  await store.getState().initialize();
  expect(store.getState().encounter).toBeNull(); // startup's currentEncounter failed
  await store.getState().enterEncounter();
  expect(store.getState().error).toBe('Finish your conversation with Flick first.');
  expect(store.getState().encounter.encounterId).toBe('flick_slow_walk');
  expect(store.getState().view).toBe('map');
});
