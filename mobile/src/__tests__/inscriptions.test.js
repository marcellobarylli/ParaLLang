// Round 082: inscriptions, lore hidden in plain sight: "Look closer" on the map card, a section in the Spellbook, and the
// move that carries the Spellbook (a new place's inscription, the Rift's drill).
import * as Speech from 'expo-speech';
import { render, screen, userEvent } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';
import Spellbook from '../components/Spellbook.js';
import { createGameStore } from '../stores/gameStore.js';

const A = '11111111-1111-4111-8111-111111111111';
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const onMap = { id: 'keystone', where: 'Carved on the keystone.', text: 'Chi entra prende la voce del ramo.' };
const place = (id, inscription) => ({ id, name: id, state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: `The ${id}.`, vocabularyFocus: [], encounter: null, ...(inscription ? { inscription } : {}) });
const worldAt = (id, inscription) => ({ currentLocationId: id, locations: [place(id, inscription)], paths: [] });
const props = { language, isLoading: false, onMove: jest.fn(), onEnterEncounter: jest.fn() };

test('"Look closer" shows where it is written, the text and the Spellbook note, and closes on a move', async () => {
  const user = userEvent.setup();
  const { rerender } = await render(<MapPanel world={worldAt('entrance', onMap)} {...props} />);
  expect(screen.queryByText(onMap.text)).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Look closer', expanded: false }));
  expect(screen.getByText(onMap.text)).toBeOnTheScreen();
  expect(screen.getByText(onMap.where)).toBeOnTheScreen();
  expect(screen.getByText('Its translation is in your Spellbook.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Look away', expanded: true }));
  expect(screen.queryByText(onMap.text)).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Look closer' }));
  const other = { id: 'menu_board', where: 'Chalked on the board.', text: 'Le ordinazioni di ieri.' };
  await rerender(<MapPanel world={worldAt('cart', other)} {...props} />);
  expect(screen.queryByText(other.text)).toBeNull();
  expect(screen.getByRole('button', { name: 'Look closer', expanded: false })).toBeOnTheScreen();
});

test('a place without an inscription has no button', async () => {
  await render(<MapPanel world={worldAt('entrance')} {...props} />);
  expect(screen.queryByRole('button', { name: 'Look closer' })).toBeNull();
});

const card = (extra) => ({
  id: 'keystone', locationId: 'market_entrance', locationName: 'Market Entrance', where: 'Carved on the keystone.',
  text: 'Chi entra prende la voce del ramo.', hidden: false, translation: 'Whoever enters takes on the voice of the branch.',
  glossary: [{ word: 'ramo', meaning: 'branch' }, { word: 'chi', meaning: 'whoever' }], ...extra,
});
const book = (inscriptions, inEncounter = false) => ({ inEncounter, dueCount: 0, cards: [], containmentFiles: [], journeyFragments: [], ...(inscriptions ? { inscriptions } : {}) });
const show = (spellbook) => render(<Spellbook spellbook={spellbook} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} />);

test('the Spellbook section shows the text, and the glossary and translation behind a toggle', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([{ identifier: 'alice', language: 'it-IT', name: 'Alice', quality: 'Default' }]);
  const user = userEvent.setup();
  await show(book([card()]));
  expect(screen.getByRole('heading', { name: 'Inscriptions' })).toBeOnTheScreen();
  expect(screen.getByRole('heading', { name: 'Market Entrance' })).toBeOnTheScreen();
  expect(screen.getByText('Chi entra prende la voce del ramo.')).toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: 'Hear the inscription in Italian' })).toBeOnTheScreen();
  expect(screen.queryByText('Whoever enters takes on the voice of the branch.')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Show translation', expanded: false }));
  expect(screen.getByText('Whoever enters takes on the voice of the branch.')).toBeOnTheScreen();
  expect(screen.getByText(/: branch/)).toBeOnTheScreen();
});

test('during an encounter the card says the translation waits; no section without inscriptions', async () => {
  await show(book([card({ hidden: true, translation: null, glossary: null })], true));
  expect(screen.getByText('Chi entra prende la voce del ramo.')).toBeOnTheScreen();
  expect(screen.getByText('The translation waits until the encounter is over.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show translation' })).toBeNull();
  await show(book(undefined));
  expect(screen.queryByRole('heading', { name: 'Inscriptions' })).toBeNull();
});

function storeWith(moveTo) {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  const storage = { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
  const api = {
    createLearner: jest.fn(async () => ({ learnerId: A, language })),
    getWorld: jest.fn(async () => ({ world: worldAt('entrance', onMap) })),
    getSpellbook: jest.fn(async () => book([card()])),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => null),
    moveTo,
  };
  return createGameStore({ api, storage, cue: jest.fn(), ambience: jest.fn() });
}

test('the store takes the Spellbook a move sends (with its drill) and keeps its own when none comes', async () => {
  const drill = { encounterId: 'the_rift_errata', characterName: 'Errata', vocabularyIds: ['adesso'] };
  const sent = { ...book([card(), card({ id: 'seam', locationId: 'the_rift', locationName: 'The Rift' })]), drill };
  const store = storeWith(jest.fn(async () => ({ world: worldAt('rift'), spellbook: sent })));
  await store.getState().initialize();
  await store.getState().moveTo('rift');
  expect(store.getState().spellbook).toEqual(sent);
  expect(store.getState().world.currentLocationId).toBe('rift');
  // The per-learner snapshot follows, so switching back does not bring the old Spellbook.
  store.getState().switchLearnerForTest(A);
  expect(store.getState().spellbook).toEqual(sent);

  const older = storeWith(jest.fn(async () => ({ world: worldAt('cart') })));
  await older.getState().initialize();
  const before = older.getState().spellbook;
  await older.getState().moveTo('cart');
  expect(older.getState().spellbook).toBe(before);
  expect(older.getState().world.currentLocationId).toBe('cart');
});
