// Round 114: the settings sheet edits the server URL and access token; the gear button in the top bar opens it.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsSheet from '../SettingsSheet.jsx';
import App from '../../App.jsx';
import { useGameStore } from '../../stores/useGameStore.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('the sheet saves the URL and token it was edited to, and Cancel closes it', async () => {
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
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
});

test('the gear in the top bar opens the sheet over the dungeon screen', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null });
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
});
