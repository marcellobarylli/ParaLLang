// The title before the browser allows sound: only the name and "Tap to begin". The tap starts the title music and
// brings in the Journey button a moment later; a browser that allows sound shows the title as it is.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../../stores/useGameStore.js';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const JOURNEY = 'The Journey 2: Journathan Returns (again)';
const speech = { speaker: { supported: false, speaking: false, prime: vi.fn() }, listener: { supported: false, listening: false } };
const ambience = { supported: false, start: vi.fn(), stop: vi.fn(), setLevel: vi.fn(), setVolumes: vi.fn() };
function fakeTitleMusic(allowed) {
  const music = { supported: true, playing: false, heard: false, setVolume: vi.fn(), fadeOut: vi.fn(), audible: Promise.resolve(allowed) };
  music.play = vi.fn(() => { music.playing = true; return true; });
  return music;
}

async function showTitle(titleMusic) {
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, music: true } });
  const { default: DungeonScreen } = await import('../DungeonScreen.jsx');
  render(<DungeonScreen useStore={useGameStore} speech={speech} ambience={ambience} titleMusic={titleMusic} />);
  await act(async () => { await titleMusic.audible; });
}

test('blocked: "Tap to begin" alone, and the tap plays the music and then shows the Journey button', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const titleMusic = fakeTitleMusic(false);
  await showTitle(titleMusic);
  expect(screen.getByRole('heading', { name: 'ParaLLang' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: JOURNEY })).toBeNull();
  const tap = screen.getByRole('button', { name: 'Tap to begin' });
  expect(titleMusic.play).toHaveBeenCalledOnce();
  fireEvent.pointerUp(tap);
  expect(titleMusic.play).toHaveBeenCalledTimes(2); // inside the tap, where the browser allows it
  expect(screen.queryByRole('button', { name: JOURNEY })).toBeNull(); // not yet: the tap's click must not reach it
  act(() => { vi.advanceTimersByTime(500); });
  expect(screen.getByRole('button', { name: JOURNEY })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Tap to begin' })).toBeNull();
});

test('allowed: the title as it is, with no tap asked for', async () => {
  const titleMusic = fakeTitleMusic(true);
  await showTitle(titleMusic);
  expect(screen.getByRole('button', { name: JOURNEY })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Tap to begin' })).toBeNull();
});

test('music off: no gate and no title music', async () => {
  const titleMusic = fakeTitleMusic(false);
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, music: false } });
  const { default: DungeonScreen } = await import('../DungeonScreen.jsx');
  render(<DungeonScreen useStore={useGameStore} speech={speech} ambience={ambience} titleMusic={titleMusic} />);
  expect(screen.getByRole('button', { name: JOURNEY })).toBeTruthy();
  expect(titleMusic.play).not.toHaveBeenCalled();
});
