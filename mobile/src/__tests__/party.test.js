// Round 021: SAVE / LEAVE after a saveable NPC is defeated, the map invitation and the Party screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../../App.js';
import DialoguePanel from '../components/DialoguePanel.js';
import MapPanel from '../components/MapPanel.js';
import PartyPanel from '../components/PartyPanel.js';
import { createGameStore, useGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const learnerId = '11111111-1111-4111-8111-111111111111';
const gerald = { characterId: 'imp_coffee_001', name: 'Gerald', encounterId: 'imp_coffee_greeting', locationId: 'coffee_cart', locationName: 'The Coffee Cart', joinedAt: '2026-01-15T12:00:00.000Z' };
const resolvedEncounter = (character = { id: 'imp_coffee_001', name: 'Gerald', saveable: true }, encounterId = 'imp_coffee_greeting') => ({
  id: 'encounter-1', encounterId, location: 'coffee_cart', character, resolvedMessage: `${character.name} is won over.`,
  version: 3, state: 'resolved', encounter_state: 'resolved', committedPlayerTurns: 2, difficulty: 0.35,
  must_translate: false, hints_available: false, hints: { used: 0, remaining: 0, limit: 0 }, currentObjective: null,
  transcript: [{ id: 'npc-1', role: 'npc', narrative: 'A verdict.', protected: false, dialogue: { speaker: character.name, native: 'Va bene.', translation: 'All right.', translationAvailable: true, words: [] } }],
});
const cartLocation = (encounter) => ({ id: 'coffee_cart', name: 'The Coffee Cart', state: 'current', adjacent: false, map: { x: 0.2, y: 0.66 }, description: 'A cart.', vocabularyFocus: ['drinks'], encounter });
const geraldDone = { id: 'imp_coffee_greeting', completed: true, characterName: 'Gerald', characterId: 'imp_coffee_001', saveable: true };
const worldWith = (encounter) => ({ currentLocationId: 'coffee_cart', locations: [cartLocation(encounter)], paths: [] });
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };

describe('the resolved encounter offers SAVE / LEAVE for a saveable NPC', () => {
  test('Save recruits by encounter id and Leave goes back', async () => {
    const user = userEvent.setup();
    const onRecruit = jest.fn();
    const onLeave = jest.fn();
    await render(<DialoguePanel encounter={resolvedEncounter()} language={language} isLoading={false} party={[]} onRecruit={onRecruit} onLeave={onLeave} />);
    expect(screen.getByText('Gerald could join your party.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Gerald to your party' }));
    expect(onRecruit).toHaveBeenCalledWith('imp_coffee_greeting');
    await user.press(screen.getByRole('button', { name: 'Leave Gerald and return to the map' }));
    expect(onLeave).toHaveBeenCalled();
  });

  test('a member is shown as such, and a character who is not saveable gets no offer', async () => {
    const { rerender } = await render(<DialoguePanel encounter={resolvedEncounter()} language={language} isLoading={false} party={[gerald]} onRecruit={jest.fn()} onLeave={jest.fn()} />);
    expect(screen.getByText('Gerald is in your party.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Save Gerald/ })).toBeNull();
    await rerender(<DialoguePanel encounter={resolvedEncounter({ id: 'archway_portia_001', name: 'Portia', saveable: false }, 'market_entrance_tutorial')} language={language} isLoading={false} party={[]} onRecruit={jest.fn()} onLeave={jest.fn()} />);
    expect(screen.queryByText(/could join your party/)).toBeNull();
  });
});

describe('the map keeps the invitation open', () => {
  test('a completed, saveable encounter can be invited from its location card', async () => {
    const user = userEvent.setup();
    const onRecruit = jest.fn();
    await render(<MapPanel world={worldWith(geraldDone)} isLoading={false} onMove={jest.fn()} onEnterEncounter={jest.fn()} party={[]} onRecruit={onRecruit} />);
    expect(screen.queryByRole('button', { name: /Leave/ })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Save Gerald to your party' }));
    expect(onRecruit).toHaveBeenCalledWith('imp_coffee_greeting');
  });

  test('no invitation before the win, for a character who is not saveable, or for a member', async () => {
    const props = { isLoading: false, onMove: jest.fn(), onEnterEncounter: jest.fn(), onRecruit: jest.fn() };
    const { rerender } = await render(<MapPanel world={worldWith({ ...geraldDone, completed: false })} party={[]} {...props} />);
    expect(screen.queryByText(/could join your party/)).toBeNull();
    await rerender(<MapPanel world={worldWith({ id: 'market_entrance_tutorial', completed: true, characterName: 'Portia', characterId: 'archway_portia_001', saveable: false })} party={[]} {...props} />);
    expect(screen.queryByText(/could join your party/)).toBeNull();
    await rerender(<MapPanel world={worldWith(geraldDone)} party={[gerald]} {...props} />);
    expect(screen.getByText('Gerald is in your party.')).toBeOnTheScreen();
  });
});

test('the Party screen lists members or says nobody has joined', async () => {
  const { rerender } = await render(<PartyPanel party={[]} onReturn={jest.fn()} returnLabel="Return to the map" />);
  expect(screen.getByText(/No one has joined you yet/)).toBeOnTheScreen();
  await rerender(<PartyPanel party={[gerald]} onReturn={jest.fn()} returnLabel="Return to the map" />);
  expect(screen.getByLabelText('Gerald, met at The Coffee Cart')).toBeOnTheScreen();
});

describe('the store', () => {
  const fakeApi = (overrides = {}) => ({
    createLearner: jest.fn(async () => ({ learnerId, recovered: true, language })),
    getWorld: jest.fn(async () => ({ world: worldWith(geraldDone) })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    recruit: jest.fn(async () => ({ party: [gerald], joined: true })),
    ...overrides,
  });
  const storage = { getItem: jest.fn(async () => learnerId), setItem: jest.fn(async () => {}) };

  test('loads the party at startup and recruits with a notice', async () => {
    const api = fakeApi({ getParty: jest.fn(async () => ({ party: [] })) });
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    expect(api.getParty).toHaveBeenCalledWith(learnerId);
    expect(store.getState().party).toEqual([]);
    await store.getState().recruit('imp_coffee_greeting');
    expect(api.recruit).toHaveBeenCalledWith(learnerId, 'imp_coffee_greeting');
    expect(store.getState().party).toEqual([gerald]);
    expect(store.getState().notice).toBe('Gerald joined your party.');
    api.recruit.mockResolvedValueOnce({ party: [gerald], joined: false });
    await store.getState().recruit('imp_coffee_greeting');
    expect(store.getState().notice).toBeNull();
  });

  test('a recruit answered after a learner switch is dropped', async () => {
    let answer;
    const api = fakeApi({ recruit: jest.fn(() => new Promise((resolve) => { answer = resolve; })) });
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    const pending = store.getState().recruit('imp_coffee_greeting');
    store.getState().recruit('imp_coffee_greeting');
    expect(api.recruit).toHaveBeenCalledTimes(1);
    store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
    answer({ party: [gerald], joined: true });
    await pending;
    expect(store.getState().party).toEqual([]);
    expect(store.getState().notice).toBeNull();
  });
});

test('in the app, saving Gerald fills the Party screen and Leave returns to the map with the invitation', async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('parallang.onboardingSeen', '1');
  useGameStore.setState({
    learnerId: null, language: null, encounter: null, spellbook, world: null, onboarding: null, party: [], notice: null, view: 'map', returnView: 'map',
    reviewChallenge: null, reviewResult: null, assessment: null, draft: '', pendingInput: null, isLoading: false, error: null,
  });
  let party = [];
  const response = (status, data) => ({ ok: status < 300, status, json: async () => data });
  globalThis.fetch = jest.fn(async (url, options = {}) => {
    const path = new URL(String(url)).pathname;
    if (path === '/api/learner') return response(201, { learnerId, recovered: false, language });
    if (path === '/api/world') return response(200, { world: worldWith(geraldDone) });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party });
    if (path === '/api/encounter/start') return response(200, { encounter: resolvedEncounter(), spellbook });
    if (path === '/api/party/recruit') {
      expect(JSON.parse(options.body)).toEqual({ encounterId: 'imp_coffee_greeting' });
      party = [gerald];
      return response(200, { party, joined: true });
    }
    return response(404, { error: { message: `unexpected ${path}` } });
  });
  try {
    const user = userEvent.setup();
    await render(<App />);
    await screen.findByRole('button', { name: 'Party, 0 members' });
    await user.press(screen.getByRole('button', { name: 'Talk to Gerald again' }));
    await user.press(await screen.findByRole('button', { name: 'Leave Gerald and return to the map' }));
    expect(await screen.findByRole('button', { name: 'Save Gerald to your party' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Gerald to your party' }));
    expect(await screen.findByText('Gerald joined your party.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Party, 1 member' }));
    expect(screen.getByLabelText('Gerald, met at The Coffee Cart')).toBeOnTheScreen();
  } finally { delete globalThis.fetch; }
});

// Round 022: conversations with party members.
describe('party conversations', () => {
  const member = { ...gerald, conversations: 2, conversationId: 'gerald_coffee_break' };

  test('the Party screen shows the count and Talk starts the conversation', async () => {
    const user = userEvent.setup();
    const onTalk = jest.fn();
    await render(<PartyPanel party={[member]} onTalk={onTalk} onReturn={jest.fn()} returnLabel="Return to the map" />);
    expect(screen.getByText(/Conversations: 2/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Talk to Gerald' }));
    expect(onTalk).toHaveBeenCalledWith('gerald_coffee_break');
  });

  test('Talk waits while another encounter is under way, and resumes its own', async () => {
    const props = { party: [member], onTalk: jest.fn(), onReturn: jest.fn(), returnLabel: 'Return' };
    const { rerender } = await render(<PartyPanel {...props} ongoing={{ encounterId: 'butchers_stall_charcutier', character: { name: 'Mortimer' } }} />);
    expect(screen.getByRole('button', { name: 'Talk to Gerald' })).toBeDisabled();
    expect(screen.getByText('Finish your conversation with Mortimer first.')).toBeOnTheScreen();
    await rerender(<PartyPanel {...props} ongoing={{ encounterId: 'gerald_coffee_break', character: { name: 'Gerald' } }} />);
    expect(screen.getByRole('button', { name: 'Talk to Gerald' })).toBeEnabled();
    expect(screen.queryByText(/Finish your conversation/)).toBeNull();
  });

  test('a resolved party conversation offers no recruitment', async () => {
    await render(<DialoguePanel encounter={{ ...resolvedEncounter(undefined, 'gerald_coffee_break'), partyConversation: true }} language={language} isLoading={false} party={[]} onRecruit={jest.fn()} onLeave={jest.fn()} />);
    expect(screen.queryByText(/could join your party/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Save Gerald/ })).toBeNull();
  });

  test('talkTo starts the named conversation and a resolution refreshes the count', async () => {
    const storage = { getItem: jest.fn(async () => learnerId), setItem: jest.fn(async () => {}) };
    const ongoing = { ...resolvedEncounter(undefined, 'gerald_coffee_break'), state: 'ongoing', encounter_state: 'ongoing', partyConversation: true, version: 1 };
    const api = {
      createLearner: jest.fn(async () => ({ learnerId, recovered: true, language })),
      getWorld: jest.fn(async () => ({ world: worldWith(geraldDone) })),
      getSpellbook: jest.fn(async () => spellbook),
      getParty: jest.fn().mockResolvedValueOnce({ party: [{ ...member, conversations: 0 }] }).mockResolvedValue({ party: [{ ...member, conversations: 1 }] }),
      startEncounter: jest.fn(async () => ({ encounter: ongoing, spellbook })),
      sendDialogue: jest.fn(async () => ({ encounter: { ...ongoing, state: 'resolved', version: 2 }, spellbook, assessment: { overallFeedback: 'ok', objectiveResults: [] } })),
    };
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    store.getState().talkTo({ nativeEvent: {} });
    expect(api.startEncounter).not.toHaveBeenCalled();
    await store.getState().talkTo('gerald_coffee_break');
    expect(api.startEncounter).toHaveBeenCalledWith(learnerId, false, 'gerald_coffee_break');
    expect(store.getState().view).toBe('dialogue');
    await store.getState().sendMessage('Un buon caffè, grazie!');
    expect(store.getState().party[0].conversations).toBe(1);
  });
});
