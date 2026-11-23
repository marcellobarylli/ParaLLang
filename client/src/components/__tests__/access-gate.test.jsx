// Round 171: the friend code and the Gemini key steps.
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessGate, { initialGate } from '../AccessGate.jsx';
import { createLearningApi } from '../../api/encounter.js';
import { ACCESS_EVENT, GEMINI_KEY_STORAGE, SETTINGS_KEY, loadGeminiKey, loadSettings } from '../../api/settings.js';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());
const announce = (kind, code) => act(() => { globalThis.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail: { kind, code } })); });

test('a hosted page with no code asks for one; a local page or a stored code does not', () => {
  expect(initialGate({ sameOrigin: false, settings: { token: '' } })).toEqual({ kind: 'code', first: true });
  expect(initialGate({ sameOrigin: false, settings: { token: 'code' } })).toBeNull();
  expect(initialGate({ sameOrigin: true, settings: { token: '' } })).toBeNull();
});

test('the friend code is kept with the server URL and the page reloads', async () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ serverUrl: 'https://server.example', token: '' }));
  const reload = vi.fn();
  render(<AccessGate reload={reload} />);
  expect(screen.queryByRole('dialog')).toBeNull(); // the test page is same-origin
  announce('code', 'UNAUTHORIZED');
  expect(screen.getByText(/That code did not work/)).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Friend code'), ' road-friends ');
  await userEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(loadSettings()).toEqual({ serverUrl: 'https://server.example', token: 'road-friends' });
  expect(reload).toHaveBeenCalledOnce();
});

test('no model for a friend shows the three steps; the key is kept in this browser and can be removed', async () => {
  const reload = vi.fn();
  render(<AccessGate reload={reload} />);
  announce('model', 'MODEL_QUOTA_EXHAUSTED');
  expect(screen.getByText(/shared free allowance has run out/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /aistudio.google.com\/apikey/ }).getAttribute('href')).toBe('https://aistudio.google.com/apikey');
  await userEvent.type(screen.getByLabelText('Your Gemini key'), 'AIza-my-key');
  await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
  expect(localStorage.getItem(GEMINI_KEY_STORAGE)).toBe('AIza-my-key');
  announce('model', 'MODEL_KEY_INVALID');
  expect(screen.getByText(/did not accept that key/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Remove my key' }));
  expect(loadGeminiKey()).toBe('');
  expect(reload).toHaveBeenCalledTimes(2);
});

test('requests carry the friend\'s key, and a refused code or a missing model is announced', async () => {
  const seen = [];
  const listen = (event) => seen.push(event.detail);
  globalThis.addEventListener(ACCESS_EVENT, listen);
  const answers = [
    { ok: false, status: 401, json: async () => ({ error: { code: 'UNAUTHORIZED' } }) },
    { ok: false, status: 503, json: async () => ({ error: { code: 'MODEL_SETUP_REQUIRED', message: 'No model.' } }) },
    { ok: false, status: 503, json: async () => ({ error: { code: 'PROVIDER_FAILURE', message: 'Busy.' } }) },
  ];
  const fetchImpl = vi.fn(async () => answers.shift());
  const api = createLearningApi({ getSettings: () => ({ serverUrl: '', token: 'road-friends' }), getGeminiKey: () => 'AIza-my-key', fetchImpl });
  for (let i = 0; i < 3; i += 1) await api.createLearner(null).catch(() => {});
  globalThis.removeEventListener(ACCESS_EVENT, listen);
  expect(fetchImpl.mock.calls[0][1].headers['X-Gemini-Key']).toBe('AIza-my-key');
  expect(seen).toEqual([{ kind: 'code', code: 'UNAUTHORIZED' }, { kind: 'model', code: 'MODEL_SETUP_REQUIRED' }]);
});
