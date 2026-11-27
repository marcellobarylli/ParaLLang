// Round 203: the waiting game on the page, with the frames driven by hand (jsdom has no canvas to draw on).
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import WaitGame from '../WaitGame.jsx';
import SettingsSheet from '../SettingsSheet.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { loadDisplay } from '../../display.js';
import { DUNGEON } from '../../dungeon.js';

beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function handFrames() {
  let pending = null;
  let now = 0;
  return {
    request: (callback) => { pending = callback; return 1; },
    cancel: () => { pending = null; },
    run(seconds) { for (let t = 0; t < seconds && pending; t += 1 / 60) { const callback = pending; pending = null; now += 1000 / 60; callback(now); } },
    get waiting() { return pending !== null; },
  };
}

test('the game comes in, runs while the reply is awaited, runs out when it is ready and then hands the panel back', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  const { rerender } = render(<WaitGame ready={false} name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />);
  const game = screen.getByRole('group', { name: 'Waiting game' });
  expect(game.className).not.toContain('shown');
  act(() => frames.run(0.1));
  expect(game.className).toContain('shown'); // opaque over the panel
  expect(screen.getByRole('status').textContent).toBe('Waiting for Gerald. Drag left and right.');
  expect(screen.getByRole('img', { name: '3 lives' })).toBeTruthy();
  act(() => frames.run(2));
  expect(onDone).not.toHaveBeenCalled();
  rerender(<WaitGame ready name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />);
  expect(screen.getByRole('status').textContent).toBe('Gerald has answered. See off the last of them.');
  act(() => frames.run(0.05));
  expect(frames.waiting).toBe(true); // the last ones still come down
  expect(onDone).not.toHaveBeenCalled();
  act(() => frames.run(10));
  expect(frames.waiting).toBe(false);
  expect(game.className).not.toContain('shown'); // fading back to the panel
  expect(screen.getByRole('img', { name: '1 life' })).toBeTruthy(); // the two that were out got past; no more came
  await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
});

test('three that get past lose the game; the panel comes back only when the reply is ready', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  const { rerender } = render(<WaitGame ready={false} name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />); // they come down the left edge, away from the figure
  act(() => frames.run(40));
  expect(screen.getByRole('img', { name: '0 lives' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('They got through. Nothing for it but to wait for Gerald.');
  expect(frames.waiting).toBe(true);
  expect(onDone).not.toHaveBeenCalled();
  rerender(<WaitGame ready name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />);
  act(() => frames.run(0.1));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith({ score: 0, lost: true }));
});

test('the game is off unless switched on in Settings, and the switch is kept in this browser', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  expect(loadDisplay(storage).waitGame).toBe(false);
  const store = createGameStore({ storage, dungeon: DUNGEON });
  expect(store.getState().display.waitGame).toBe(false);
  const view = () => render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={() => {}} onClose={() => {}} waitGame={store.getState().display.waitGame} onWaitGame={store.getState().setWaitGame} />);
  const first = view();
  const box = screen.getByLabelText('A game while you wait (experimental)');
  expect(box.checked).toBe(false);
  act(() => box.click());
  expect(store.getState().display.waitGame).toBe(true);
  expect(loadDisplay(storage).waitGame).toBe(true);
  first.unmount();
  view();
  expect(screen.getByLabelText('A game while you wait (experimental)').checked).toBe(true);
});
