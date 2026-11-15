// Round 114: the settings sheet edits the server URL and access token; the gear button in the top bar opens it.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsSheet from '../SettingsSheet.jsx';
import App from '../../App.jsx';
import { useGameStore } from '../../stores/useGameStore.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('the sheet saves the URL and token it was edited to, and Close closes it', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={onSave} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.type(screen.getByLabelText('Server URL'), 'https://parallang.example.com');
  await user.type(screen.getByLabelText('Access token'), 'secret-token');
  expect(screen.getByLabelText('Access token').type).toBe('password');
  await user.click(screen.getByRole('button', { name: 'Save and connect' }));
  expect(onSave).toHaveBeenCalledWith({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledOnce();
});

test('the gear in the top bar opens the sheet over the dungeon screen', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null });
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
});

// Round 117: the opacity of the text panels over the level.
test('the opacity slider reports each move as a number and shows the percentage', () => {
  const onPanelOpacity = vi.fn();
  const view = render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} panelOpacity={0.7} onPanelOpacity={onPanelOpacity} />);
  const slider = screen.getByLabelText('Text panel opacity');
  expect(slider.type).toBe('range');
  expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['0', '100', '5', '70']);
  expect(screen.getByText('70%')).toBeTruthy();
  fireEvent.change(slider, { target: { value: '35' } });
  expect(onPanelOpacity).toHaveBeenCalledWith(0.35);
  view.rerender(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} panelOpacity={0.35} onPanelOpacity={onPanelOpacity} />);
  expect(slider.value).toBe('35');
  expect(screen.getByText('35%')).toBeTruthy();
});

test('moving the slider on the dungeon screen sets the panels at once, hides the dock behind the sheet, and saves nothing else', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => new Promise(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7 } });
  const { container } = render(<App />);
  const shell = container.querySelector('.app-shell');
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.7');
  expect(shell.classList.contains('settings-open')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  expect(shell.classList.contains('settings-open')).toBe(true);
  const requests = fetchMock.mock.calls.length;
  fireEvent.change(screen.getByLabelText('Text panel opacity'), { target: { value: '30' } });
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.3');
  expect(useGameStore.getState().display).toEqual({ panelOpacity: 0.3 });
  expect(JSON.parse(localStorage.getItem('parallang.display'))).toEqual({ panelOpacity: 0.3 });
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  expect(fetchMock.mock.calls.length).toBe(requests);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(shell.classList.contains('settings-open')).toBe(false);
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.3');
  localStorage.removeItem('parallang.display');
});
