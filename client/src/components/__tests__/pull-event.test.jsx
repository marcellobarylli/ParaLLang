// Round 213 (issue #23): the pull on the screen, against the real server logic and with no canvas (jsdom has none,
// so the event shows nothing to watch and offers the way on at once; what is drawn is checked in a browser,
// scripts/pull-check.mjs). Settings' "Developer" jumps to the gate that ends A1; its conversation is finished; Continue
// leads to the event over everything, and its own Continue back to the road on the pulled land.
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import SettingsSheet, { jumpTargets } from '../SettingsSheet.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON, DUNGEONS } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { cleanUp, createRoadServer } from '../../__tests__/roadServer.js';

vi.setConfig({ testTimeout: 40_000 });
afterEach(cleanup);
afterAll(cleanUp);

function memoryStorage(display = { strict: true }) {
  const values = new Map([['parallang.display', JSON.stringify(display)], ['parallang.welcomed', '1']]);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
const silent = { speaker: { supported: false, speaking: false, speak() {}, stop() {}, prime() {} }, listener: { supported: false, listening: false, start() { return false; }, stop() {} } };
const noMusic = { supported: false, start() {}, stop() {}, setLevel() {} };

async function mount({ storage = memoryStorage() } = {}) {
  const server = createRoadServer();
  const useStore = createGameStore({ api: server.api, storage, dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const user = userEvent.setup();
  render(<DungeonScreen useStore={useStore} speech={silent} ambience={noMusic} />);
  await user.click(await screen.findByLabelText(/comfortable with basic/, {}, { timeout: 20_000 }));
  await user.click(await screen.findByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }, { timeout: 20_000 }));
  await screen.findByRole('button', { name: /^Talk to / }, { timeout: 20_000 });
  return { server, user, storage, s: () => useStore.getState() };
}

test('the places to jump to are every unit and, streamlined, the gate after every third; the gates that end a level say so', async () => {
  const { s } = await mount();
  const streamlined = jumpTargets(s().curriculum, true);
  expect(streamlined.filter((target) => target.value.startsWith('unit:'))).toHaveLength(36);
  expect(streamlined.filter((target) => target.value.startsWith('gate:'))).toHaveLength(12);
  expect(streamlined[0]).toEqual({ value: 'unit:greetings', label: 'A1 · 1. Hello and goodbye' });
  expect(streamlined.filter((target) => /the land is pulled/.test(target.label)).map((target) => target.label)).toEqual([
    'A1 · the gate after 12, its last conversation (then A2: the land is pulled)',
    'A2 · the gate after 24, its last conversation (then B1: the land is pulled)',
  ]);
  // The full pacing has a gate to every unit: only the two that end a level are offered.
  const full = jumpTargets(s().curriculum, false);
  expect(full.filter((target) => target.value.startsWith('gate:')).map((target) => target.label)).toEqual([
    'A1 · the gate after 12 (then A2: the land is pulled)',
    'A2 · the gate after 24 (then B1: the land is pulled)',
  ]);
  expect(jumpTargets(null)).toEqual([]);
});

test('Settings has "Developer": the mode is off until ticked and kept; without a curriculum it says where the units come from', async () => {
  const user = userEvent.setup();
  const onDev = vi.fn();
  const onJump = vi.fn(async () => true);
  const base = { settings: { serverUrl: 'https://s.example', token: 't' }, onSave() {}, onClose() {}, site: { build: 'b', latestBuild: async () => 'b', reload() {}, viewport: () => ({ installed: false, window: [390, 844], layoutHeight: 844, unitHeight: 844, screen: [390, 844], gap: 0 }) } };
  const view = render(<SettingsSheet {...base} onDev={onDev} onJump={onJump} />);
  expect(screen.queryByLabelText('Jump to')).toBe(null);
  await user.click(screen.getByLabelText('Developer mode'));
  expect(onDev).toHaveBeenCalledWith(true);
  view.rerender(<SettingsSheet {...base} dev onDev={onDev} onJump={onJump} />);
  expect(screen.getByText(/Open the road once/)).toBeTruthy();
  expect(screen.queryByLabelText('Jump to')).toBe(null);
  // With a curriculum: the list, the jump and what it answers.
  const curriculum = { stages: [{ cefr: 'A1', units: [{ id: 'one', title: 'One' }, { id: 'two', title: 'Two' }, { id: 'three', title: 'Three' }] }, { cefr: 'A2', units: [{ id: 'four', title: 'Four' }] }] };
  view.rerender(<SettingsSheet {...base} dev onDev={onDev} onJump={onJump} curriculum={curriculum} />);
  await user.click(screen.getByRole('button', { name: 'Jump' }));
  expect(onJump).toHaveBeenLastCalledWith({ unitId: 'one', gate: false, unpull: false });
  expect(await screen.findByText(/conversation waits where you stand/)).toBeTruthy();
  await user.selectOptions(screen.getByLabelText('Jump to'), 'gate:three');
  await user.click(screen.getByLabelText('Undo the pulls first'));
  await user.click(screen.getByRole('button', { name: 'Jump' }));
  expect(onJump).toHaveBeenLastCalledWith({ unitId: 'three', gate: true, unpull: true });
  expect(await screen.findByText(/The gate is the next site/)).toBeTruthy();
  onJump.mockResolvedValueOnce(false);
  await user.click(screen.getByRole('button', { name: 'Jump' }));
  expect(await screen.findByText(/The jump failed/)).toBeTruthy();
});

test('from Settings to the gate that ends A1, through it, and Continue leads to the pull over everything, then back to the road', async () => {
  const { user, server, s, storage } = await mount();
  // Settings, Developer: on, and the jump.
  await user.click(screen.getByRole('button', { name: /^Menu/ }));
  await user.click(screen.getByRole('button', { name: /^Settings/ }));
  await user.click(screen.getByLabelText('Developer mode'));
  expect(JSON.parse(storage.values.get('parallang.display')).dev).toBe(true);
  const gate = within(screen.getByLabelText('Jump to')).getByRole('option', { name: /the gate after 12, its last conversation/ });
  await user.selectOptions(screen.getByLabelText('Jump to'), gate);
  await user.click(screen.getByRole('button', { name: 'Jump' }));
  expect(await screen.findByText(/The gate is the next site/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  // The gate is an old place, a walk away; its last conversation.
  await user.click(await screen.findByRole('button', { name: /^Enter / }));
  await vi.waitFor(() => expect(s().roadPhase).toBe('encounter'), { timeout: 20_000 });
  await s().sendMessage(server.fullAnswer(s().learnerId));
  await vi.waitFor(() => expect(s().road.event?.number).toBe(1), { timeout: 20_000 });
  expect(screen.queryByRole('dialog', { name: 'The land is pulled' })).toBe(null);
  // The way on is one button, and it does not walk.
  const at = s().road.at;
  await user.click(await screen.findByRole('button', { name: 'Continue' }));
  const event = await screen.findByRole('dialog', { name: 'The land is pulled' });
  expect(s().road.at).toBe(at);
  expect(event.querySelectorAll('canvas')).toHaveLength(2);
  // With nothing to draw on, the way on is offered at once; it tells the road, and the event is gone.
  await user.click(await within(event).findByRole('button', { name: 'Continue' }));
  await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'The land is pulled' })).toBe(null), { timeout: 10_000 });
  expect([s().road.event, s().road.pulled.length, s().roadPhase]).toEqual([null, 1, 'hub']);
  // The road again: the way on walks now.
  expect(await screen.findByRole('button', { name: /^(Continue|Enter )/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Map' })).toBeTruthy();
});
