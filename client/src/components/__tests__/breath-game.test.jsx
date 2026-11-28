// Round 214: the breathing on the page, with the frames driven by hand (jsdom has no canvas to draw on).
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BreathGame, { BreathIntro } from '../BreathGame.jsx';
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

test('it comes in with a breath in, has no text, and with the reply ready at once still breathes three whole breaths', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  render(<BreathGame ready onDone={onDone} frames={frames} />);
  const game = screen.getByRole('group', { name: 'Breathing' });
  expect(game.className).not.toContain('shown');
  act(() => frames.run(0.1));
  expect(game.className).toContain('shown');
  expect(game.textContent).toBe(''); // nothing is written during the breathing
  expect(game.dataset.phase).toBe('in');
  act(() => frames.run(4.1));
  expect(game.dataset.phase).toBe('out');
  act(() => frames.run(25));
  expect(game.dataset.cycle).toBe('2');
  expect(game.dataset.closing).toBe('yes');
  expect(frames.waiting).toBe(true);
  expect(onDone).not.toHaveBeenCalled();
  act(() => frames.run(1.5));
  expect(frames.waiting).toBe(false);
  expect(game.dataset.phase).toBe('out'); // it ends on the breath out
  expect(game.className).not.toContain('shown');
  await waitFor(() => expect(onDone).toHaveBeenCalledWith({ cycles: 3, kept: 0, perfect: 0 }), { timeout: 2000 });
});

test('with no reply it keeps breathing past three breaths, and ends with the breath in which the reply comes', async () => {
  const frames = handFrames();
  const onDone = vi.fn();
  const { rerender } = render(<BreathGame ready={false} onDone={onDone} frames={frames} />);
  const game = screen.getByRole('group', { name: 'Breathing' });
  act(() => frames.run(42));
  expect(game.dataset.cycle).toBe('4');
  expect(game.dataset.phase).toBe('in');
  expect(frames.waiting).toBe(true);
  rerender(<BreathGame ready onDone={onDone} frames={frames} />);
  act(() => frames.run(7.5));
  expect(frames.waiting).toBe(true); // the breath is finished first
  expect(onDone).not.toHaveBeenCalled();
  act(() => frames.run(1));
  expect(frames.waiting).toBe(false);
  await waitFor(() => expect(onDone).toHaveBeenCalledWith({ cycles: 5, kept: 0, perfect: 0 }), { timeout: 2000 });
});

test('the panel is held for the breath in and let go at the turn; the space bar holds it too', () => {
  const frames = handFrames();
  render(<BreathGame ready={false} onDone={() => {}} frames={frames} />);
  const game = screen.getByRole('group', { name: 'Breathing' });
  act(() => frames.run(0.5));
  fireEvent.pointerDown(game, { pointerId: 1 });
  act(() => frames.run(0.1));
  expect(game.dataset.held).toBe('yes');
  act(() => frames.run(3.4)); // four seconds: the turn
  fireEvent.pointerUp(game, { pointerId: 1 });
  act(() => frames.run(0.1));
  expect(game.dataset.held).toBe('no');
  expect(game.dataset.kept).toBe('1');
  act(() => frames.run(5.9)); // ten seconds: the next breath begins
  fireEvent.keyDown(game, { key: ' ', code: 'Space' });
  act(() => frames.run(0.1));
  expect(game.dataset.held).toBe('yes');
  expect(game.dataset.kept).toBe('2');
  fireEvent.keyUp(game, { key: ' ', code: 'Space' });
  act(() => frames.run(0.1));
  expect(game.dataset.held).toBe('no');
});

test('the few words before the first breathing: the guidebook entry, and a button that begins', () => {
  const onBegin = vi.fn();
  render(<BreathIntro entry={{ id: 'the_breath', title: 'A breath while you wait', segments: [{ text: 'Nobody here answers at once.' }] }} onBegin={onBegin} />);
  const card = screen.getByRole('dialog', { name: 'A breath while you wait' });
  expect(card.textContent).toContain('Nobody here answers at once.');
  expect(card.textContent).toContain('Entered in your guidebook.');
  act(() => screen.getByRole('button', { name: 'Begin' }).click());
  expect(onBegin).toHaveBeenCalledOnce();
});

test('the breathing is on unless switched off in Settings, and the switch is kept in this browser', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  expect(loadDisplay(storage).breathing).toBe(true);
  values.set('parallang.display', JSON.stringify({ waitGame: false })); // a display saved before this round: on, whatever the old game's switch said
  expect(loadDisplay(storage).breathing).toBe(true);
  expect('waitGame' in loadDisplay(storage)).toBe(false);
  const store = createGameStore({ storage, dungeon: DUNGEON });
  expect(store.getState().display.breathing).toBe(true);
  const view = () => render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={() => {}} onClose={() => {}} breathing={store.getState().display.breathing} onBreathing={store.getState().setBreathing} />);
  const first = view();
  const box = screen.getByLabelText('Breathe while you wait');
  expect(box.checked).toBe(true);
  act(() => box.click());
  expect(store.getState().display.breathing).toBe(false);
  expect(loadDisplay(storage).breathing).toBe(false);
  first.unmount();
  view();
  expect(screen.getByLabelText('Breathe while you wait').checked).toBe(false);
});
