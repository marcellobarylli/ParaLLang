// Round 031 (backlog A11): save slots on the device, each a learner on the server.
import { render, screen, userEvent } from '@testing-library/react-native';
import { createGameStore } from '../stores/gameStore.js';
import { MAX_SAVES, SLOTS_KEY, nextLabel, parseSlots, withActive } from '../stores/saveSlots.js';
import SavesPanel from '../components/SavesPanel.js';
import Header from '../components/Header.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';
const worldFor = (id) => ({ currentLocationId: `loc-${id.slice(0, 1)}`, locations: [], paths: [] });
const spellbookFor = (id) => ({ cards: [], dueCount: Number(id.slice(0, 1)), contentVersion: 'v1' });
const encounterFor = (id) => ({ id: `enc-${id.slice(0, 1)}`, encounterId: 'imp_coffee_greeting', version: 7, state: 'ongoing', transcript: [], hints: { remaining: 1, limit: 2 } });
const slot = (learnerId, label) => ({ learnerId, label, createdAt: '2026-11-05T12:00:00.000Z' });

function memoryStorage(entries = {}) {
  const values = new Map([['parallang.onboardingSeen', '1'], ...Object.entries(entries)]);
  return { values, getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}

// Each null createLearner gets the next fresh id; a known id is recovered.
function fakeApi(fresh = [A, B, C, D], overrides = {}) {
  const queue = [...fresh];
  return {
    createLearner: jest.fn(async (id) => ({ learnerId: id ?? queue.shift(), recovered: Boolean(id), language })),
    getWorld: jest.fn(async (id) => ({ world: worldFor(id) })),
    getSpellbook: jest.fn(async (id) => spellbookFor(id)),
    getParty: jest.fn(async () => ({ party: [] })),
    currentEncounter: jest.fn(async (id) => ({ encounter: id === A ? encounterFor(id) : null, spellbook: spellbookFor(id) })),
    getOnboarding: jest.fn(async () => null),
    createReview: jest.fn(), submitReview: jest.fn(), moveTo: jest.fn(), startEncounter: jest.fn(),
    ...overrides,
  };
}
const record = (storage) => JSON.parse(storage.values.get(SLOTS_KEY));

describe('the device record', () => {
  test('parse keeps valid slots, drops bad, duplicate and extra ones, and repairs the active id', () => {
    const raw = JSON.stringify({ version: 1, activeId: 'gone', slots: [slot(A, 'Save 1'), slot('not-a-uuid', 'Save 2'), slot(A, 'Again'), { learnerId: B }, slot(B, 'Save 2'), slot(C, 'Save 3'), slot(D, 'Save 4')] });
    expect(parseSlots(raw)).toEqual({ version: 1, activeId: A, slots: [slot(A, 'Save 1'), slot(B, 'Save 2'), slot(C, 'Save 3')] });
    expect(parseSlots('{not json')).toBeNull();
    expect(parseSlots(JSON.stringify({ slots: [slot('x', 'Save 1')] }))).toBeNull();
    expect(parseSlots(null)).toBeNull();
  });

  test('labels take the lowest free number; withActive adds an unknown id and keeps a known one', () => {
    expect(nextLabel([slot(A, 'Save 2')])).toBe('Save 1');
    expect(nextLabel([slot(A, 'Save 1'), slot(B, 'Save 2')])).toBe('Save 3');
    const now = new Date('2026-11-05T12:00:00.000Z');
    expect(withActive(null, A, now)).toEqual({ version: 1, activeId: A, slots: [slot(A, 'Save 1')] });
    const two = withActive({ slots: [slot(A, 'Save 1')] }, B, now);
    expect(two.slots.map((s) => s.label)).toEqual(['Save 1', 'Save 2']);
    expect(withActive(two, A, now)).toEqual({ ...two, activeId: A });
  });
});

describe('the store', () => {
  test('a legacy learner id becomes Save 1; a fresh install gets Save 1 from the server', async () => {
    const legacy = memoryStorage({ 'parallang.learnerId': B });
    const api = fakeApi();
    const store = createGameStore({ api, storage: legacy });
    await store.getState().initialize();
    expect(api.createLearner).toHaveBeenCalledWith(B);
    expect(record(legacy)).toMatchObject({ version: 1, activeId: B, slots: [{ learnerId: B, label: 'Save 1' }] });
    expect(store.getState().saves).toHaveLength(1);

    const fresh = memoryStorage();
    const freshStore = createGameStore({ api: fakeApi(), storage: fresh });
    await freshStore.getState().initialize();
    expect(record(fresh)).toMatchObject({ activeId: A, slots: [{ learnerId: A, label: 'Save 1' }] });
    expect(fresh.values.get('parallang.learnerId')).toBe(A);
  });

  test('the active slot wins over the legacy key; an unparsable record falls back to it', async () => {
    const storage = memoryStorage({ 'parallang.learnerId': A, [SLOTS_KEY]: JSON.stringify({ version: 1, activeId: B, slots: [slot(A, 'Save 1'), slot(B, 'Save 2')] }) });
    const api = fakeApi();
    await createGameStore({ api, storage }).getState().initialize();
    expect(api.createLearner).toHaveBeenCalledWith(B);
    expect(record(storage).slots).toHaveLength(2);

    const broken = memoryStorage({ 'parallang.learnerId': C, [SLOTS_KEY]: '{oops' });
    const brokenApi = fakeApi();
    await createGameStore({ api: brokenApi, storage: broken }).getState().initialize();
    expect(brokenApi.createLearner).toHaveBeenCalledWith(C);
  });

  test('a new save is a new learner, recorded, loaded on the map; switching back loads the server\'s encounter', async () => {
    const storage = memoryStorage();
    const api = fakeApi();
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    store.setState({ view: 'spellbook', returnView: 'dialogue', notice: 'Gerald joined your party.', draft: 'ciao', pendingInput: { text: 'x' }, assessment: { overallFeedback: 'ok' }, reviewChallenge: { id: 'r' }, reviewResult: { passed: true }, error: 'old', onboarding: { title: 't' } });
    await store.getState().newSave();
    const state = store.getState();
    expect(api.createLearner).toHaveBeenLastCalledWith(B);
    expect(record(storage)).toMatchObject({ activeId: B, slots: [{ learnerId: A, label: 'Save 1' }, { learnerId: B, label: 'Save 2' }] });
    expect(storage.values.get('parallang.learnerId')).toBe(B);
    expect(state).toMatchObject({
      learnerId: B, world: worldFor(B), spellbook: spellbookFor(B), encounter: null, view: 'map', returnView: 'map',
      notice: 'Now playing Save 2.', draft: '', pendingInput: null, assessment: null, reviewChallenge: null, reviewResult: null,
      error: null, onboarding: null, isLoading: false,
    });

    await store.getState().switchSave(A);
    expect(api.currentEncounter).toHaveBeenLastCalledWith(A);
    expect(store.getState()).toMatchObject({ learnerId: A, world: worldFor(A), encounter: encounterFor(A), spellbook: spellbookFor(A), notice: 'Now playing Save 1.' });
    expect(record(storage).activeId).toBe(A);
  });

  test('no more than three saves; busy, unknown and current targets are refused', async () => {
    const storage = memoryStorage();
    const api = fakeApi();
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    await store.getState().newSave();
    await store.getState().newSave();
    expect(store.getState().saves).toHaveLength(MAX_SAVES);
    const calls = api.createLearner.mock.calls.length;
    await store.getState().newSave();
    await store.getState().switchSave(C);
    await store.getState().switchSave(D);
    store.setState({ isLoading: true });
    await store.getState().switchSave(A);
    expect(api.createLearner.mock.calls.length).toBe(calls);
    expect(store.getState().learnerId).toBe(C);
  });

  test('a failed switch keeps the current save and its record; a failed new save stays recorded, inactive', async () => {
    const storage = memoryStorage();
    let fail = false;
    const api = fakeApi([A, B], { getWorld: jest.fn(async (id) => { if (fail) throw new Error('Server down'); return { world: worldFor(id) }; }) });
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    fail = true;
    await store.getState().newSave();
    expect(store.getState()).toMatchObject({ learnerId: A, error: 'Server down', isLoading: false });
    expect(record(storage)).toMatchObject({ activeId: A, slots: [{ learnerId: A }, { learnerId: B, label: 'Save 2' }] });
    expect(storage.values.get('parallang.learnerId')).toBe(A);
    await store.getState().switchSave(B);
    expect(store.getState().learnerId).toBe(A);
    fail = false;
    await store.getState().switchSave(B);
    expect(store.getState().learnerId).toBe(B);
  });

  test('a review reply or failure that lands after a switch is dropped', async () => {
    let finishReview;
    let failMove;
    const api = fakeApi([A, B], {
      createReview: jest.fn(() => new Promise((resolve) => { finishReview = resolve; })),
      moveTo: jest.fn(() => new Promise((_, reject) => { failMove = reject; })),
    });
    const store = createGameStore({ api, storage: memoryStorage() });
    await store.getState().initialize();
    await store.getState().newSave();
    await store.getState().switchSave(A);

    const review = store.getState().startReview();
    store.setState({ isLoading: false }); // as if the switch ran while the review was pending
    await store.getState().switchSave(B);
    finishReview({ challenge: { id: 'old' }, spellbook: spellbookFor(A) });
    await review;
    expect(store.getState()).toMatchObject({ learnerId: B, reviewChallenge: null, view: 'map', spellbook: spellbookFor(B) });

    const move = store.getState().moveTo('somewhere');
    store.setState({ isLoading: false });
    await store.getState().switchSave(A);
    failMove(new Error('old failure'));
    await move;
    expect(store.getState()).toMatchObject({ learnerId: A, error: null });
  });

  test('a save the server lost is recreated through createLearner', async () => {
    const storage = memoryStorage({ [SLOTS_KEY]: JSON.stringify({ version: 1, activeId: A, slots: [slot(A, 'Save 1'), slot(B, 'Save 2')] }) });
    const api = fakeApi();
    const store = createGameStore({ api, storage });
    await store.getState().initialize();
    await store.getState().switchSave(B);
    expect(api.createLearner).toHaveBeenLastCalledWith(B);
    expect(api.createLearner.mock.invocationCallOrder.at(-1)).toBeLessThan(api.getWorld.mock.invocationCallOrder.at(-1));
  });
});

describe('the screen', () => {
  const saves = [slot(A, 'Save 1'), slot(B, 'Save 2')];
  test('the current save is selected with its place; others continue; a new save below the limit', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    const onNew = jest.fn();
    const { rerender } = await render(<SavesPanel saves={saves} activeId={A} place="The Coffee Cart" dueCount={2} isLoading={false} onContinue={onContinue} onNew={onNew} onReturn={jest.fn()} />);
    expect(screen.getByLabelText('Save 1, current save')).toHaveProp('aria-selected', true);
    expect(screen.getByText('Current save · The Coffee Cart · 2 due for review')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continue Save 2' }));
    expect(onContinue).toHaveBeenCalledWith(B);
    await user.press(screen.getByRole('button', { name: 'Start a new save' }));
    expect(onNew).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Continue Save 1' })).toBeNull();

    await rerender(<SavesPanel saves={[...saves, slot(C, 'Save 3')]} activeId={A} isLoading={false} onContinue={onContinue} onNew={onNew} onReturn={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Start a new save' })).toBeNull();
    expect(screen.getByText('Three saves is the most this device keeps.')).toBeOnTheScreen();
  });

  test('the header shows Saves only when given it', async () => {
    const { rerender } = await render(<Header dueCount={0} onSpellbook={jest.fn()} onSaves={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Saves' })).toBeOnTheScreen();
    await rerender(<Header dueCount={0} onSpellbook={jest.fn()} onSaves={null} />);
    expect(screen.queryByRole('button', { name: 'Saves' })).toBeNull();
    await rerender(<Header hideNav dueCount={0} onSpellbook={jest.fn()} onSaves={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Saves' })).toBeNull();
  });
});

// Round 038 (A11b): the device forgets a save that is not the current one, after the system's confirmation.
describe('removing a save', () => {
  const three = (extra = {}) => memoryStorage({ [SLOTS_KEY]: JSON.stringify({ version: 1, activeId: A, slots: [slot(A, 'Save 1'), slot(B, 'Save 2'), slot(C, 'Save 3')] }), ...extra });

  test('removes a non-current slot; refuses the current one, an unknown id, no learner, and while loading', async () => {
    const storage = three();
    const store = createGameStore({ api: fakeApi([D]), storage });
    expect(await store.getState().removeSave(B)).toBe(false); // no learner yet
    await store.getState().initialize();
    store.getState().snapshotsByLearner.set(B, { encounter: null, spellbook: null });
    expect(await store.getState().removeSave(A)).toBe(false);
    expect(await store.getState().removeSave(D)).toBe(false);
    store.setState({ isLoading: true });
    expect(await store.getState().removeSave(B)).toBe(false);
    store.setState({ isLoading: false });
    expect(store.getState().saves.map((s) => s.label)).toEqual(['Save 1', 'Save 2', 'Save 3']);

    expect(await store.getState().removeSave(B)).toBe(true);
    expect(store.getState().saves.map((s) => s.label)).toEqual(['Save 1', 'Save 3']);
    expect(record(storage)).toEqual({ version: 1, activeId: A, slots: [slot(A, 'Save 1'), slot(C, 'Save 3')], nextNumber: 3 });
    expect(store.getState().snapshotsByLearner.has(B)).toBe(false);
    expect(store.getState()).toMatchObject({ isLoading: false, notice: 'Save 2 was removed from this device.' });

    // Critique 1.4: the removed number is not given out again, also after a restart.
    await store.getState().newSave();
    expect(store.getState().saves.map((s) => s.label)).toEqual(['Save 1', 'Save 3', 'Save 4']);
    expect(parseSlots(storage.values.get(SLOTS_KEY)).nextNumber).toBe(3);
  });

  test('the store is locked while it forgets; a switch or new save meanwhile is refused and nothing comes back', async () => {
    const storage = three();
    let finish;
    const store = createGameStore({ api: fakeApi([D]), storage });
    await store.getState().initialize();
    storage.setItem.mockImplementationOnce((key, value) => new Promise((resolve) => { finish = () => { storage.values.set(key, value); resolve(); }; }));
    const removing = store.getState().removeSave(B);
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().switchSave(B)).toBeUndefined();
    await store.getState().newSave();
    finish();
    expect(await removing).toBe(true);
    expect(record(storage).slots.map((s) => s.learnerId)).toEqual([A, C]);
    // A load of a slot that is no longer listed does nothing.
    store.setState({ isLoading: true });
    await store.getState()._loadSave(B, 0);
    expect(store.getState().saves.map((s) => s.learnerId)).toEqual([A, C]);
  });

  test('a failed write puts the slot back and says so; the legacy key never points at a removed save', async () => {
    const storage = three({ 'parallang.learnerId': C });
    const store = createGameStore({ api: fakeApi(), storage });
    await store.getState().initialize();
    storage.values.set('parallang.learnerId', C); // as if a switch's second write had failed
    storage.setItem.mockImplementationOnce(async () => { throw new Error('disk full'); });
    expect(await store.getState().removeSave(C)).toBe(false);
    expect(store.getState().saves).toHaveLength(3);
    expect(store.getState()).toMatchObject({ isLoading: false });
    expect(store.getState().error).toMatch(/could not forget that save: disk full/);
    expect(await store.getState().removeSave(C)).toBe(true);
    expect(storage.values.get('parallang.learnerId')).toBe(A);
  });

  test('the Saves screen asks through the system alert; only Remove removes; the current save has none', async () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    const onRemove = jest.fn();
    await render(<SavesPanel saves={[slot(A, 'Save 1'), slot(B, 'Save 2')]} activeId={A} isLoading={false} onContinue={jest.fn()} onNew={jest.fn()} onReturn={jest.fn()} onRemove={onRemove} />);
    expect(screen.queryByRole('button', { name: 'Remove Save 1' })).not.toBeOnTheScreen();
    expect(screen.getByText('To remove this save, continue another one first.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Remove Save 2' }));
    const [title, message, buttons] = alert.mock.calls[0];
    expect([title, message]).toEqual(['Remove Save 2?', 'This device forgets Save 2. You cannot open it again from this app.']);
    expect(buttons.map((b) => [b.text, b.style])).toEqual([['Keep Save 2', 'cancel'], ['Remove', 'destructive']]);
    expect(onRemove).not.toHaveBeenCalled();
    buttons[1].onPress();
    expect(onRemove).toHaveBeenCalledWith(B);
    alert.mockRestore();
  });
});
