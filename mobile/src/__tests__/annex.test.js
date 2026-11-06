// Round 111 (backlog B8): a redacted annex in a containment file, read anyway at a cost (a hint fewer per task in the
// next conversation the player finishes).
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook from '../components/Spellbook.js';
import DialoguePanel from '../components/DialoguePanel.js';
import { createGameStore } from '../stores/gameStore.js';

const A = '11111111-1111-4111-8111-111111111111';
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const flush = () => new Promise((done) => setTimeout(done, 0));
const deferred = () => { let resolve; const promise = new Promise((res) => { resolve = res; }); return { promise, resolve }; };
const redaction = 'Your companion has blacked out every line of it. "Trust me on this."';
const unread = { id: 'cm001_second_verse', title: 'Annex A: the second verse', redaction, read: false, readAt: null, strainPending: false, hidden: false, text: null, translation: null, glossary: null, exposureNote: null };
const readAnnex = {
  ...unread, read: true, readAt: '2026-11-06T10:00:00Z', strainPending: true, text: 'Seconda strofa, da non cantare.',
  translation: 'Second verse, not to be sung.', glossary: [{ word: 'strofa', meaning: 'verse' }, { word: 'labbra', meaning: 'lips' }, { word: 'soltanto', meaning: 'only' }, { word: 'ritorno', meaning: 'return' }],
  exposureNote: 'Exposure log: read in full by the bearer of this Spellbook.',
};
const file = (annex) => ({
  encounterId: 'cracked_fountain_letharger', locationName: 'The Cracked Fountain', designation: 'CM-001', name: 'Dopo, dopo, domani!', class: 'Brainrot (mild)',
  properties: { virulence: 'High.', harm: 'Low.', incubation: 'Now.', vector: 'Song.', containment: 'Do not hum.' }, notes: ['Recovered.'], ...(annex ? { annex } : {}),
});
const book = (annex, inEncounter = false) => ({ inEncounter, dueCount: 0, cards: [], containmentFiles: [file(annex)], journeyFragments: [] });
const show = (spellbook, props = {}) => render(<Spellbook spellbook={spellbook} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} {...props} />);

afterEach(() => jest.restoreAllMocks());

test('unread: bars, the companion\'s line, and the read asks first; only "Read it" reads', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onReadAnnex = jest.fn();
  const user = userEvent.setup();
  await show(book(unread), { onReadAnnex });
  expect(screen.getByRole('heading', { name: 'Annex A: the second verse' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Redacted text')).toBeOnTheScreen();
  expect(screen.getByText(redaction)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Read it anyway' }));
  const [title, message, buttons] = alert.mock.calls[0];
  expect(title).toBe('Read Annex A: the second verse?');
  expect(message).toMatch(/a hint fewer for each objective of the next conversation you finish/);
  expect(buttons.map((b) => [b.text, b.style])).toEqual([['Leave it redacted', 'cancel'], ['Read it', 'destructive']]);
  expect(onReadAnnex).not.toHaveBeenCalled();
  buttons[1].onPress();
  expect(onReadAnnex).toHaveBeenCalledWith('cm001_second_verse');
});

test('no read button while an encounter is under way, by the server\'s Spellbook or the app\'s encounter', async () => {
  const { rerender } = await show(book(unread, true));
  expect(screen.queryByRole('button', { name: 'Read it anyway' })).toBeNull();
  expect(screen.getByText('Your companion keeps it redacted while a conversation is under way.')).toBeOnTheScreen();
  await rerender(<Spellbook spellbook={book(unread)} appInEncounter language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Read it anyway' })).toBeNull();
});

test('read: the text, the translation behind a toggle, the exposure note and the pending strain', async () => {
  const user = userEvent.setup();
  await show(book(readAnnex));
  expect(screen.queryByLabelText('Redacted text')).toBeNull();
  expect(screen.getByText(readAnnex.text)).toBeOnTheScreen();
  expect(screen.queryByText(readAnnex.translation)).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Show translation' }));
  expect(screen.getByText(readAnnex.translation)).toBeOnTheScreen();
  expect(screen.getByText(readAnnex.exposureNote)).toBeOnTheScreen();
  expect(screen.getByText(/Your companion is still recovering/)).toBeOnTheScreen();
});

test('read during an encounter: the text stays, the translation waits; a spent strain shows no note', async () => {
  await show(book({ ...readAnnex, hidden: true, translation: null, glossary: null, strainPending: false }, true));
  expect(screen.getByText(readAnnex.text)).toBeOnTheScreen();
  expect(screen.getByText('The translation waits until the encounter is over.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show translation' })).toBeNull();
  expect(screen.queryByText(/still recovering/)).toBeNull();
});

test('a file with no annex shows none', async () => {
  await show(book(null));
  expect(screen.queryByText(/Annex/)).toBeNull();
});

function setup() {
  const api = {
    createLearner: jest.fn(async (id) => ({ learnerId: id ?? A, language })),
    getWorld: jest.fn(async () => ({ world: { currentLocationId: null, locations: [], paths: [] } })),
    getSpellbook: jest.fn(async () => book(unread)),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => ({ onboarding: null })),
    readAnnex: jest.fn(async () => ({ charged: true, spellbook: book(readAnnex) })),
  };
  const storage = { getItem: jest.fn(async (key) => (key === 'parallang.onboardingSeen' ? '1' : null)), setItem: jest.fn(async () => {}) };
  return { api, store: createGameStore({ api, storage, cue: () => {}, ambience: () => {} }) };
}

describe('the store', () => {
  test('readAnnex applies the reply\'s Spellbook, and a refresh begun before it is dropped', async () => {
    const { api, store } = setup();
    await store.getState().initialize();
    const late = deferred();
    api.getSpellbook.mockReturnValueOnce(late.promise);
    store.getState().refreshSpellbook();
    await store.getState().readAnnex('cm001_second_verse');
    expect(api.readAnnex).toHaveBeenCalledWith(A, 'cm001_second_verse');
    expect(store.getState().spellbook.containmentFiles[0].annex.read).toBe(true);
    expect(store.getState().isLoading).toBe(false);
    late.resolve(book(unread));
    await flush();
    expect(store.getState().spellbook.containmentFiles[0].annex.read).toBe(true);
  });

  test('a refused read shows the server\'s message; nothing is sent while the app holds an ongoing encounter', async () => {
    const { api, store } = setup();
    await store.getState().initialize();
    api.readAnnex.mockRejectedValueOnce(Object.assign(new Error('Your companion keeps the redaction in place while a conversation is under way.'), { status: 409, code: 'IN_ENCOUNTER' }));
    await store.getState().readAnnex('cm001_second_verse');
    expect(store.getState().error).toBe('Your companion keeps the redaction in place while a conversation is under way.');
    expect(store.getState().isLoading).toBe(false);
    store.setState({ encounter: { id: 'e', state: 'ongoing' } });
    await store.getState().readAnnex('cm001_second_verse');
    expect(api.readAnnex).toHaveBeenCalledTimes(1);
  });

  test('a refused IN_ENCOUNTER read refreshes the Spellbook, so the server\'s inEncounter removes the button', async () => {
    const { api, store } = setup();
    await store.getState().initialize();
    api.readAnnex.mockRejectedValueOnce(Object.assign(new Error('Your companion keeps the redaction in place while a conversation is under way.'), { status: 409, code: 'IN_ENCOUNTER' }));
    api.getSpellbook.mockResolvedValueOnce(book(unread, true));
    await store.getState().readAnnex('cm001_second_verse');
    await flush();
    expect(store.getState().spellbook.inEncounter).toBe(true);
  });

  // Review R1.10: the read Spellbook is the save's snapshot, so switching away and back keeps it.
  test('switching saves away and back keeps the read annex', async () => {
    const { store } = setup();
    await store.getState().initialize();
    await store.getState().readAnnex('cm001_second_verse');
    store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
    expect(store.getState().spellbook.containmentFiles ?? []).toEqual([]);
    store.getState().switchLearnerForTest(A);
    expect(store.getState().spellbook.containmentFiles[0].annex.read).toBe(true);
  });

  test('a reply for a save the player has left is dropped', async () => {
    const { api, store } = setup();
    await store.getState().initialize();
    const slow = deferred();
    api.readAnnex.mockReturnValueOnce(slow.promise);
    const reading = store.getState().readAnnex('cm001_second_verse');
    store.setState({ learnerId: '22222222-2222-4222-8222-222222222222' });
    slow.resolve({ charged: true, spellbook: book(readAnnex) });
    await reading;
    expect(store.getState().spellbook.containmentFiles[0].annex.read).toBe(false);
  });
});

test('the dialogue panel says the companion is recovering only while a strained conversation is ongoing', async () => {
  const encounter = (state, strained) => ({
    id: 'e', state, encounter_state: state, difficulty: 0.3, currentObjective: state === 'ongoing' ? { id: 'o', prompt: 'Order a coffee.' } : null,
    hints: { used: 0, remaining: 1, limit: 1, strained }, hints_available: true, transcript: [], character: { name: 'Gerald' }, companionBriefing: null,
  });
  const props = { language, isLoading: false, onSend: () => {}, onHelp: () => {}, onRestart: () => {} };
  const { rerender } = await render(<DialoguePanel encounter={encounter('ongoing', true)} {...props} />);
  expect(screen.getByText(/Hints: 1\/1 \(your companion is recovering\)/)).toBeOnTheScreen();
  await rerender(<DialoguePanel encounter={encounter('resolved', true)} {...props} />);
  expect(screen.queryByText(/recovering/)).toBeNull();
  await rerender(<DialoguePanel encounter={encounter('ongoing', false)} {...props} />);
  expect(screen.queryByText(/recovering/)).toBeNull();
});
