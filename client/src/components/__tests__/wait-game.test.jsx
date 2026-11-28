// Round 203, changed in round 227 (one life, no hearts, "While you wait"): the waiting game on the page, with the frames driven by hand (jsdom has no canvas to draw on).
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

test('the game comes in, runs while the reply is awaited, runs out when it is ready and then hands the panel back; it shows no hearts', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  const { rerender } = render(<WaitGame ready={false} name="Gerald" onDone={onDone} frames={frames} random={() => 0.5} />); // they come down the middle, where the figure stands
  const game = screen.getByRole('group', { name: 'Waiting game' });
  expect(game.className).not.toContain('shown');
  act(() => frames.run(0.1));
  expect(game.className).toContain('shown'); // opaque over the panel
  expect(screen.getByRole('status').textContent).toBe('Waiting for Gerald. Drag left and right.');
  expect(game.textContent).not.toContain('♥'); // one life: no hearts
  expect(screen.queryByRole('img')).toBeNull();
  act(() => frames.run(3));
  expect(screen.getByLabelText(/shot down/).textContent).not.toBe('0');
  expect(onDone).not.toHaveBeenCalled();
  rerender(<WaitGame ready name="Gerald" onDone={onDone} frames={frames} random={() => 0.5} />);
  expect(screen.getByRole('status').textContent).toBe('Gerald has answered. See off the last of them.');
  act(() => frames.run(10));
  expect(frames.waiting).toBe(false);
  expect(game.className).not.toContain('shown'); // fading back to the panel
  await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  expect(onDone.mock.calls[0][0].lost).toBe(false);
});

test('one invader that gets past loses the game; the panel comes back only when the reply is ready', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  const { rerender } = render(<WaitGame ready={false} name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />); // they come down the left edge, away from the figure
  act(() => frames.run(20));
  expect(screen.getByRole('group', { name: 'Waiting game' }).className).toContain('lost');
  expect(screen.getByRole('status').textContent).toBe('One got through. Nothing for it but to wait for Gerald.');
  expect(frames.waiting).toBe(true);
  expect(onDone).not.toHaveBeenCalled();
  rerender(<WaitGame ready name="Gerald" onDone={onDone} frames={frames} random={() => 0.02} />);
  act(() => frames.run(0.1));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith({ score: 0, lost: true }));
});

test('"While you wait" in Settings picks the game: Space Invaders is kept in this browser and the mode survives switching to Nothing', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  const store = createGameStore({ storage, dungeon: DUNGEON });
  const choose = (value) => act(() => { fireEvent.change(screen.getByLabelText('While you wait'), { target: { value } }); });
  const view = () => {
    const { display, setWaitMode } = store.getState();
    return render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={() => {}} onClose={() => {}} waitMode={display.breathing ? display.waitMode : 'none'} onWaitMode={setWaitMode} />);
  };
  const first = view();
  choose('invaders');
  expect(store.getState().display).toMatchObject({ breathing: true, waitMode: 'invaders' });
  expect(loadDisplay(storage)).toMatchObject({ breathing: true, waitMode: 'invaders' });
  choose('none');
  expect(loadDisplay(storage)).toMatchObject({ breathing: false, waitMode: 'invaders' });
  first.unmount();
  view();
  expect(screen.getByLabelText('While you wait').value).toBe('none');
  choose('meditation');
  expect(loadDisplay(storage)).toMatchObject({ breathing: true, waitMode: 'meditation' });
  expect(loadDisplay(memoryStorageOf({ waitMode: 'tetris' })).waitMode).toBe('meditation'); // an unknown mode reads as the default
});

function memoryStorageOf(display) {
  return { getItem: () => JSON.stringify(display), setItem: () => {} };
}
