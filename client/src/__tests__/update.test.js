// Round 218: on the title a newer build on the site is loaded, once per build.
import { expect, test, vi } from 'vitest';
import { updateIfNewer } from '../viewport.js';

const page = () => { const values = new Map(); return { sessionStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } }; };

test('a newer build reloads the page once; the same build, or none read, does not', async () => {
  const win = page();
  const reload = vi.fn();
  expect(await updateIfNewer({ build: 'a', win, latest: async () => 'a', reload })).toBe(false);
  expect(await updateIfNewer({ build: 'a', win, latest: async () => null, reload })).toBe(false);
  expect(reload).not.toHaveBeenCalled();
  expect(await updateIfNewer({ build: 'a', win, latest: async () => 'b', reload })).toBe(true);
  expect(reload).toHaveBeenCalledTimes(1);
  // The reload came back on the old files (a cache still serving them): no second reload for the same build.
  expect(await updateIfNewer({ build: 'a', win, latest: async () => 'b', reload })).toBe(false);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(await updateIfNewer({ build: 'a', win: {}, latest: async () => 'c', reload })).toBe(false); // no session storage
});
