// Round 029 (backlog C1): the Rift's forced repetition on the map. The server computes the drill
// (spellbook.drill); the map only shows it.
import { render, screen, userEvent } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';
import { createGameStore } from '../stores/gameStore.js';

const riftHere = (completed = false) => ({
  currentLocationId: 'the_rift',
  locations: [{ id: 'the_rift', name: 'The Rift', state: 'current', adjacent: false, map: { x: 0.7, y: 0.1 }, description: 'A seam.', vocabularyFocus: [], gate: { sealed: false, required: 5, completed: 5 }, encounter: { id: 'the_rift_errata', completed, characterName: 'Errata', characterId: 'rift_errata_001', saveable: false } }],
  paths: [],
});
const drill = { encounterId: 'the_rift_errata', characterName: 'Errata', vocabularyIds: ['chorizo', 'ahora'] };
const props = { isLoading: false, onMove: jest.fn(), party: [] };

test('a pending drill disables Talk and its button starts the review with the first card', async () => {
  const user = userEvent.setup();
  const onDrill = jest.fn();
  const onEnterEncounter = jest.fn();
  await render(<MapPanel {...props} world={riftHere()} drill={drill} onDrill={onDrill} onEnterEncounter={onEnterEncounter} />);
  expect(screen.getByText('Errata reviews everything you have learned. Review 2 due words first.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Talk to Errata' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Review 2 due words' }));
  expect(onDrill).toHaveBeenCalledWith('chorizo');
});

test('with no drill, or at a completed Rift, Talk is enabled and there is no note', async () => {
  for (const [world, pending] of [[riftHere(), null], [riftHere(true), drill]]) {
    await render(<MapPanel {...props} world={world} drill={pending} onDrill={jest.fn()} onEnterEncounter={jest.fn()} />);
    expect(screen.getByRole('button', { name: /^Talk to Errata/ })).toBeEnabled();
    expect(screen.queryByText(/reviews everything you have learned/)).toBeNull();
  }
});

test('an encounter under way elsewhere is named, with a way back instead of the review button', async () => {
  const user = userEvent.setup();
  const onReturnToEncounter = jest.fn();
  await render(<MapPanel {...props} world={riftHere()} drill={{ ...drill, vocabularyIds: ['ahora'] }} ongoing={{ character: { name: 'Marginalia' } }} onDrill={jest.fn()} onReturnToEncounter={onReturnToEncounter} onEnterEncounter={jest.fn()} />);
  expect(screen.getByText('Errata reviews everything you have learned. Finish your conversation with Marginalia first, then review 1 due word.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Review/ })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Return to Marginalia' }));
  expect(onReturnToEncounter).toHaveBeenCalled();
});

test('the store starts the drill from the map and returns to it; returnToEncounter reopens the dialogue', async () => {
  const challenge = { id: 'c1', vocabularyId: 'chorizo', target: 'chorizo', kind: 'word', practice: false };
  const api = { createReview: jest.fn(async () => ({ challenge, spellbook: { cards: [], dueCount: 1, drill } })) };
  const store = createGameStore({ api, storage: null });
  store.setState({ learnerId: 'l1', view: 'map', returnView: 'dialogue', encounter: { id: 'e1', state: 'ongoing' } });
  await store.getState().startDrill('chorizo');
  expect(api.createReview).toHaveBeenCalledWith('l1', 'chorizo');
  expect(store.getState()).toMatchObject({ view: 'review', returnView: 'map', reviewChallenge: challenge });
  store.getState().returnToEncounter();
  expect(store.getState().view).toBe('dialogue');
});
