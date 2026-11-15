// Round 118: the installed page on iOS. `100vh` is the screen; the layout area is short by the status bar's inset.
import { afterEach, expect, test, vi } from 'vitest';
import { bottomGap, describeViewport, isInstalled, latestBuild, measureViewport, reloadPage, watchBottomGap } from '../viewport.js';

afterEach(() => { vi.restoreAllMocks(); document.documentElement.style.removeProperty('--bottom-gap'); });

test('the gap is the difference in the installed page only, and never negative or absurd', () => {
  expect(bottomGap({ unitHeight: 852, layoutHeight: 787, installed: true })).toBe(65);
  expect(bottomGap({ unitHeight: 852, layoutHeight: 787.4, installed: true })).toBe(65);
  expect(bottomGap({ unitHeight: 852, layoutHeight: 787, installed: false })).toBe(0); // a tab: the browser's bars
  expect(bottomGap({ unitHeight: 852, layoutHeight: 852, installed: true })).toBe(0);
  expect(bottomGap({ unitHeight: 787, layoutHeight: 852, installed: true })).toBe(0);
  expect(bottomGap({ unitHeight: 852, layoutHeight: 400, installed: true })).toBe(0); // not the bug: leave the layout alone
  for (const junk of [undefined, NaN, 0, -5]) {
    expect(bottomGap({ unitHeight: junk, layoutHeight: 787, installed: true })).toBe(0);
    expect(bottomGap({ unitHeight: 852, layoutHeight: junk, installed: true })).toBe(0);
  }
});

test('installed means the home-screen flag or a standalone or fullscreen display mode', () => {
  const media = (matching) => ({ matchMedia: (query) => ({ matches: query === matching }), navigator: {} });
  expect(isInstalled(media('(display-mode: standalone)'))).toBe(true);
  expect(isInstalled(media('(display-mode: fullscreen)'))).toBe(true);
  expect(isInstalled(media('(display-mode: browser)'))).toBe(false);
  expect(isInstalled({ navigator: { standalone: true } })).toBe(true);
  expect(isInstalled({ navigator: {}, matchMedia: () => { throw new Error('no'); } })).toBe(false);
  expect(isInstalled(null)).toBe(false);
});

test('the measurement reads the window and the watcher writes --bottom-gap', () => {
  const view = measureViewport(window);
  expect(view).toMatchObject({ installed: false, gap: 0, window: [window.innerWidth, window.innerHeight] });
  expect(describeViewport({ ...view, installed: true, gap: 65 }, '0.1.0+abc')).toMatch(/^Build 0\.1\.0\+abc · installed · window .* · gap 65$/);
  const stop = watchBottomGap(window);
  expect(document.documentElement.style.getPropertyValue('--bottom-gap')).toBe('0px');
  stop();
  expect(document.querySelectorAll('html > div').length).toBe(0); // the probe is removed
  expect(measureViewport(null)).toMatchObject({ installed: false, gap: 0 });
  expect(watchBottomGap(null)()).toBeUndefined();
});

test('the reload navigates to the same page with a fresh query, keeping what was there', () => {
  const replace = vi.fn();
  reloadPage({ location: { href: 'https://example.github.io/ParaLLang/?x=1#top', replace } });
  const url = new URL(replace.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe('https://example.github.io/ParaLLang/');
  expect(url.searchParams.get('x')).toBe('1');
  expect(url.searchParams.get('reload')).toMatch(/^[a-z0-9]+$/);
  expect(url.hash).toBe('#top');
});

test('outside a production build the site is not asked for its build', async () => {
  const fetchImpl = vi.fn();
  expect(await latestBuild(window, fetchImpl)).toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
});
