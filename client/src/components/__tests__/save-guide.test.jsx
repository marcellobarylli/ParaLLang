// Round 146: the guide to the GitHub save, beside "Your save" in Settings. It says where the server keeps its saves
// now (from the server's health check) and opens the steps to switch the GitHub save on.
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveGuide, { saveStoreLine } from '../SaveGuide.jsx';
import SettingsSheet from '../SettingsSheet.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';

afterEach(cleanup);

test('one line says where the saves are: on the disk, on GitHub, failing, or unknown', () => {
  expect(saveStoreLine({ kind: 'disk' })).toMatch(/on its own disk only\. On the free hosting plan a restart of the server loses them/);
  expect(saveStoreLine({ kind: 'disk', problem: 'PARALLANG_GITHUB_REPO must be owner/name.' })).toMatch(/its GitHub settings are wrong: PARALLANG_GITHUB_REPO must be owner\/name\./);
  expect(saveStoreLine({ kind: 'github', lastWriteAt: null, lastWriteOk: null })).toMatch(/writes its saves to GitHub \(nothing written since its last start yet\)\. A restart of the server loses nothing/);
  expect(saveStoreLine({ kind: 'github', lastWriteAt: '2026-11-22T17:00:00.000Z', lastWriteOk: true })).toMatch(/last written /);
  expect(saveStoreLine({ kind: 'github', lastWriteAt: '2026-11-22T17:00:00.000Z', lastWriteOk: false })).toMatch(/the last write failed/);
  expect(saveStoreLine(null)).toMatch(/could not be read/);
});

test('the guide opens beside the save and gives every step by its name', async () => {
  const user = userEvent.setup();
  render(<SaveGuide store={{ kind: 'disk' }} serverUrl="https://parallang.example.com" />);
  expect(screen.getByRole('status').textContent).toMatch(/disk only/);
  expect(screen.queryByRole('region', { name: 'How to keep the saves on GitHub' })).toBe(null);
  const button = screen.getByRole('button', { name: 'Guide: keep the saves on GitHub' });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  await user.click(button);
  const guide = screen.getByRole('region', { name: 'How to keep the saves on GitHub' });
  expect(within(guide).getAllByRole('listitem').filter((item) => item.parentElement.tagName === 'OL')).toHaveLength(4);
  for (const text of ['Fine-grained tokens', 'Contents: Read and write', 'PARALLANG_GITHUB_TOKEN', 'PARALLANG_GITHUB_REPO', 'owner/name', 'Environment', '"kind": "github"', 'saves', 'PARALLANG_GITHUB_BRANCH', 'README']) {
    expect(guide.textContent).toContain(text);
  }
  expect(within(guide).getByRole('link', { name: /health check/ }).getAttribute('href')).toBe('https://parallang.example.com/api/health');
  await user.click(screen.getByRole('button', { name: 'Close the guide' }));
  expect(screen.queryByRole('region', { name: 'How to keep the saves on GitHub' })).toBe(null);
});

test('Settings shows the guide under "Your save", and the store reads the server\'s save store when Settings opens', async () => {
  const noop = () => {};
  render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={noop} onClose={noop} onExportCopy={async () => null} onImportCopy={async () => false}
    saveStore={{ kind: 'github', lastWriteAt: null, lastWriteOk: null }} site={{ build: 'b', latestBuild: async () => 'b', reload: noop, viewport: () => ({ installed: false, window: [1440, 900], layoutHeight: 900, unitHeight: 900, screen: [1440, 900], gap: 0 }), requestTilt: async () => 'granted' }} />);
  expect(screen.getByText('Your save')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toMatch(/writes its saves to GitHub/);
  expect(screen.getByRole('button', { name: 'Guide: keep the saves on GitHub' })).toBeTruthy();

  const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language: { code: 'it', name: 'Italian', tag: 'it-IT' } };
  const api = { createLearner: vi.fn(async () => identity), getDungeon: vi.fn(async () => ({})), getHealth: vi.fn(async () => ({ status: 'ok', saves: { kind: 'disk' } })) };
  const store = createGameStore({ api, storage: { getItem: () => null, setItem: noop }, dungeon: DUNGEON });
  expect(store.getState().saveStore).toBe(null);
  store.getState().openSettings();
  await vi.waitFor(() => expect(store.getState().saveStore).toEqual({ kind: 'disk' }));
  // A server from before round 145 says nothing of its saves, and one that does not answer leaves it unknown.
  api.getHealth.mockResolvedValueOnce({ status: 'ok' });
  store.getState().openSettings();
  await vi.waitFor(() => expect(store.getState().saveStore).toBe(null));
  api.getHealth.mockRejectedValueOnce(new Error('asleep'));
  store.getState().openSettings();
  await vi.waitFor(() => expect(api.getHealth).toHaveBeenCalledTimes(3));
  expect(store.getState().saveStore).toBe(null);
});
