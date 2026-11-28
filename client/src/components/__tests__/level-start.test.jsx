// Round 218: on the owner's phone the road's gate showed only the green backdrop: the level did not start. A start
// that fails (no WebGL context yet) is tried again; a level that cannot be loaded at all says the page was updated
// under it and offers a reload. The three.js host is replaced by a recorder that fails as asked.
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DungeonView from '../DungeonView.jsx';
import { DUNGEON } from '../../dungeon.js';

const level = vi.hoisted(() => ({ failures: 0, made: 0 }));
vi.mock('../../scene/levelView.js', () => ({
  createLevelView: () => {
    if (level.failures > 0) { level.failures -= 1; throw new Error('Error creating WebGL context.'); }
    level.made += 1;
    return { setPhase() {}, setEncounter() {}, setLook() {}, setInsets() {}, setLabels() {}, setProgress() {}, setGlitch() {}, dispose() {} };
  },
}));

beforeEach(() => { level.failures = 0; level.made = 0; window.WebGLRenderingContext = function WebGLRenderingContext() {}; });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.WebGLRenderingContext; });

const shown = (container) => container.querySelector('.level').className;

test('a start that fails is tried again, and the level is drawn', async () => {
  level.failures = 2;
  const { container } = render(<DungeonView dungeon={DUNGEON} phase="enter" siteIndex={0} onArrive={() => {}} />);
  await vi.waitFor(() => expect(shown(container)).toContain('level-ready'), { timeout: 4000 });
  expect(level.made).toBe(1);
  expect(screen.queryByRole('status')).toBe(null);
});

test('a start that keeps failing leaves the backdrop, and the camera arrives at once so the game goes on', async () => {
  level.failures = 5;
  const onArrive = vi.fn();
  const { container } = render(<DungeonView dungeon={DUNGEON} phase="enter" siteIndex={0} onArrive={onArrive} />);
  await vi.waitFor(() => expect(shown(container)).toContain('level-unavailable'), { timeout: 4000 });
  expect(container.querySelector('.level-backdrop')).toBeTruthy();
  await vi.waitFor(() => expect(onArrive).toHaveBeenCalledWith('enter'));
});
