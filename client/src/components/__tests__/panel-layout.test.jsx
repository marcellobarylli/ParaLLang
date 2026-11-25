// Round 132: the objective box stands in the conversation after the opening line and folds into a bar when it has
// been scrolled past; the conversation panel has a handle that drags it between the top bar and nothing.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialoguePanel, { BAR_ROOM } from '../DialoguePanel.jsx';
import SheetHandle, { SHEET_SNAP, SHEET_STEP, settleHeight, sheetLimits } from '../SheetHandle.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const italian = { code: 'it', name: 'Italian', tag: 'it-IT' };
const npc = (id, native) => ({ id, role: 'npc', narrative: `Narration ${id}.`, protected: false, dialogue: { speaker: 'Portia', native, translation: 'x', words: [] } });
const OPEN = [{ id: 'greet', prompt: 'Greet Portia in Italian.' }, { id: 'introduce', prompt: 'Tell Portia who you are, in Italian.' }];
const encounter = (extra = {}) => ({
  id: 'e1', version: 1, state: 'ongoing', committedPlayerTurns: 0, difficulty: 0.2, hints_available: true, hints: { used: 0, remaining: 2, limit: 2 },
  character: { name: 'Portia' }, companionBriefing: ['Portia only lets in people who greet her properly.'], hearts: { used: 0, limit: 3 },
  currentObjective: OPEN[0], openObjectives: OPEN, transcript: [npc('n1', 'Benvenuto!')], ...extra,
});
const kinds = (container) => [...container.querySelector('main').children].map((child) => child.className.split(' ')[0]);

test('the opening line comes first, then the objective box, then the briefing, then the rest', () => {
  const { container, rerender } = render(<DialoguePanel encounter={encounter()} language={italian} isLoading={false} onHelp={() => {}} beginner />);
  expect(kinds(container)).toEqual(['objective-pin', 'npc-message', 'objective-card', 'briefing-card']);
  expect(container.querySelector('.objective-pin').children).toHaveLength(0); // no bar while the box is in view
  const later = encounter({ committedPlayerTurns: 1, transcript: [npc('n1', 'Benvenuto!'), { id: 'p1', role: 'player', text: 'Ciao!' }, npc('n2', 'Bene.')], openObjectives: [OPEN[1]], currentObjective: OPEN[1] });
  rerender(<DialoguePanel encounter={later} language={italian} isLoading onHelp={() => {}} beginner />);
  expect(kinds(container)).toEqual(['objective-pin', 'npc-message', 'objective-card', 'player-message', 'npc-message', 'thinking']);
  // The one box stays at its first place and shows what is open now.
  expect(container.querySelectorAll('section.objective-card')).toHaveLength(1);
  expect(container.querySelector('section.objective-card').textContent).toContain('Tell Portia who you are, in Italian.');
  expect(container.querySelector('section.objective-card').textContent).not.toContain('Greet Portia');
});

// The panel inside a scrolling text 400 px high whose top is at 100; `place(bottom)` puts the box's bottom edge
// there and scrolls.
function mountPanel(props = {}) {
  const view = render(<div className="sheet-scroll"><DialoguePanel encounter={encounter()} language={italian} isLoading={false} onHelp={() => {}} beginner {...props} /></div>);
  const root = view.container.querySelector('.sheet-scroll');
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: 400 });
  root.getBoundingClientRect = () => ({ top: 100, bottom: 500, height: 400 });
  const place = (bottom) => act(() => {
    const card = view.container.querySelector('section.objective-card');
    if (card) card.getBoundingClientRect = () => ({ top: bottom - 120, bottom, height: 120 });
    fireEvent.scroll(root);
  });
  return { ...view, root, place };
}

test('scrolled past, the box folds into a bar: a tap unfolds the objectives, another folds them, and it goes when the box is back', async () => {
  const user = userEvent.setup();
  const { container, place } = mountPanel();
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull();
  place(900); // below the visible text: not past it
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull();
  place(300); // in view
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull();
  place(100 + BAR_ROOM + 1); // a little more than the bar's room still shows
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull();
  place(100 + BAR_ROOM); // only the bar's room is left
  const bar = screen.getByRole('button', { name: /Objective/ });
  expect(bar.textContent).toContain('2 to do');
  expect(bar.getAttribute('aria-expanded')).toBe('false');
  expect(container.querySelectorAll('.objective-list')).toHaveLength(1); // only the box in the flow
  await user.click(bar);
  expect(bar.getAttribute('aria-expanded')).toBe('true');
  const unfolded = container.querySelector('.objective-unfolded');
  expect(unfolded.textContent).toContain('Greet Portia in Italian.');
  expect(unfolded.querySelector('.hearts').textContent).toBe('♥♥♥');
  await user.click(bar);
  expect(container.querySelector('.objective-unfolded')).toBeNull();
  await user.click(bar);
  place(300); // the player scrolled back to the box
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull();
  place(-500);
  expect(screen.getByRole('button', { name: /Objective/ }).getAttribute('aria-expanded')).toBe('false'); // folded again
});

test('a jump from below the view to above it shows the bar (the end of the text after a turn), with no scroll event at all', () => {
  const { container, rerender } = mountPanel();
  // The box is below the visible text; then a turn arrives and the sheet jumps to its end, the box now far above.
  container.querySelector('section.objective-card').getBoundingClientRect = () => ({ top: -900, bottom: -780, height: 120 });
  const later = encounter({ version: 2, committedPlayerTurns: 1, transcript: [npc('n1', 'Benvenuto!'), { id: 'p1', role: 'player', text: 'Ciao!' }, npc('n2', 'Bene.')] });
  rerender(<div className="sheet-scroll"><DialoguePanel encounter={later} language={italian} isLoading={false} onHelp={() => {}} beginner /></div>);
  expect(screen.getByRole('button', { name: /Objective/ })).toBeTruthy();
});

test('a conversation that is still being prepared when the panel appears gets its bar all the same', () => {
  const { place, rerender } = mountPanel({ encounter: null });
  expect(screen.getByText('Preparing the conversation…')).toBeTruthy();
  rerender(<div className="sheet-scroll"><DialoguePanel encounter={encounter()} language={italian} isLoading={false} onHelp={() => {}} /></div>);
  place(0);
  expect(screen.getByRole('button', { name: /Objective/ })).toBeTruthy();
});

test('the bar counts what is left and says when the conversation is complete; a text with no layout has no bar', () => {
  const { place, rerender } = mountPanel({ encounter: encounter({ openObjectives: undefined }) });
  place(0);
  expect(screen.getByRole('button', { name: /Objective/ }).textContent).toContain('1 to do');
  rerender(<div className="sheet-scroll"><DialoguePanel encounter={encounter({ state: 'resolved', currentObjective: null, openObjectives: [] })} language={italian} isLoading={false} onHelp={() => {}} /></div>);
  expect(screen.getByRole('button', { name: /Objective/ }).textContent).toContain('complete');
  cleanup();
  render(<div className="sheet-scroll"><DialoguePanel encounter={encounter()} language={italian} isLoading={false} onHelp={() => {}} /></div>);
  expect(screen.queryByRole('button', { name: /Objective/ })).toBeNull(); // jsdom: every rectangle is zero
});

test('a dragged height stays inside its limits and goes to an end when it is near one', () => {
  const limits = { min: 30, max: 740 };
  expect(settleHeight(400, limits)).toBe(400);
  expect(settleHeight(30 + SHEET_SNAP, limits)).toBe(30);
  expect(settleHeight(30 + SHEET_SNAP + 1, limits)).toBe(30 + SHEET_SNAP + 1);
  expect(settleHeight(740 - SHEET_SNAP, limits)).toBe(740);
  expect(settleHeight(-50, limits)).toBe(30);
  expect(settleHeight(5000, limits)).toBe(740);
  expect(settleHeight(60, limits, 0)).toBe(60);
});

// jsdom has no PointerEvent, so its pointer events carry no coordinates: a MouseEvent of the pointer's type does.
const pointer = (type) => (element, { clientY, pointerId = 1, button = 0 }) => act(() => { element.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button }), { pointerId })); });
const [pointerDown, pointerMove, pointerUp] = ['pointerdown', 'pointermove', 'pointerup'].map(pointer);

// The handle inside a screen of 844 with a top bar ending at 104 and a panel 520 tall.
function mount(onHeight, sheetHeight = 520) {
  const rect = (top, height) => () => ({ top, bottom: top + height, height, left: 0, right: 390, width: 390 });
  const view = render(<div className="app-shell"><header className="hud" /><section className="sheet"><SheetHandle height={null} onHeight={onHeight} /></section></div>);
  view.container.querySelector('.app-shell').getBoundingClientRect = rect(0, 844);
  view.container.querySelector('.hud').getBoundingClientRect = rect(0, 104);
  view.container.querySelector('.sheet').getBoundingClientRect = rect(844 - sheetHeight, sheetHeight);
  const handle = screen.getByRole('button', { name: /Drag to resize the conversation/ });
  handle.getBoundingClientRect = rect(844 - sheetHeight, 30);
  return handle;
}

test('the limits are the strip alone and the room under the top bar', () => {
  const handle = mount(() => {});
  expect(sheetLimits(handle)).toEqual({ min: 30, max: 740 });
});

test('dragging the handle changes the height by the distance dragged, stops at the top bar and at the strip, and snaps near them', () => {
  const onHeight = vi.fn();
  const handle = mount(onHeight);
  pointerDown(handle, { clientY: 330, pointerId: 1, button: 0 });
  pointerMove(handle, { clientY: 328, pointerId: 1 }); // a tremor is not a drag
  expect(onHeight).not.toHaveBeenCalled();
  pointerMove(handle, { clientY: 230, pointerId: 1 });
  expect(onHeight).toHaveBeenLastCalledWith(620);
  pointerMove(handle, { clientY: -400, pointerId: 1 });
  expect(onHeight).toHaveBeenLastCalledWith(740); // the top bar's edge
  pointerMove(handle, { clientY: 130, pointerId: 1 });
  pointerUp(handle, { clientY: 130, pointerId: 1 });
  expect(onHeight).toHaveBeenLastCalledWith(740); // 720: within the snap of the top
  pointerDown(handle, { clientY: 330, pointerId: 2, button: 0 });
  pointerMove(handle, { clientY: 2000, pointerId: 2 });
  expect(onHeight).toHaveBeenLastCalledWith(30);
  pointerUp(handle, { clientY: 2000, pointerId: 2 });
  expect(onHeight).toHaveBeenLastCalledWith(30);
  pointerMove(handle, { clientY: 100, pointerId: 2 }); // no drag under way
  expect(onHeight).toHaveBeenLastCalledWith(30);
});

test('a tap on the strip of a panel that is down brings it back; the keys move it too', () => {
  const onHeight = vi.fn();
  const down = mount(onHeight, 30);
  pointerDown(down, { clientY: 820, pointerId: 1, button: 0 });
  pointerUp(down, { clientY: 820, pointerId: 1 });
  expect(onHeight).toHaveBeenLastCalledWith(null);
  cleanup();
  const keys = vi.fn();
  const handle = mount(keys);
  pointerDown(handle, { clientY: 330, pointerId: 1, button: 0 });
  pointerUp(handle, { clientY: 330, pointerId: 1 });
  expect(keys).not.toHaveBeenCalled(); // a tap on a panel that is up does nothing
  fireEvent.keyDown(handle, { key: 'ArrowUp' });
  expect(keys).toHaveBeenLastCalledWith(520 + SHEET_STEP);
  fireEvent.keyDown(handle, { key: 'ArrowDown' });
  expect(keys).toHaveBeenLastCalledWith(520 - SHEET_STEP);
  fireEvent.keyDown(handle, { key: 'Home' });
  expect(keys).toHaveBeenLastCalledWith(740);
  fireEvent.keyDown(handle, { key: 'End' });
  expect(keys).toHaveBeenLastCalledWith(30);
  fireEvent.keyDown(handle, { key: 'a' });
  expect(keys).toHaveBeenCalledTimes(4);
});

// Round 186: before it is dragged, the panel fills the room under the top bar.
test('the panel\'s own height is the whole room under the top bar, measured again on a resize, and a dragged height replaces it', () => {
  const handle = mount(() => {});
  const sheet = handle.closest('.sheet');
  act(() => { window.dispatchEvent(new Event('resize')); });
  expect(sheet.style.getPropertyValue('--sheet-full')).toBe('740px');
  cleanup();
  const dragged = render(<section className="sheet"><SheetHandle height={300} onHeight={() => {}} /></section>);
  expect(dragged.container.querySelector('.sheet').style.getPropertyValue('--sheet-full')).toBe('');
});
