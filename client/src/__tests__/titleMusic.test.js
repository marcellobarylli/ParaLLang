// @vitest-environment node
// The title screen's recorded music: it loops on the title, fades in, and fades out over 30 seconds when the game
// starts, through a Web Audio gain (iOS ignores an audio element's volume).
import { describe, expect, test, vi } from 'vitest';
import { TITLE_MUSIC, createTitleMusic } from '../titleMusic.js';

function fakeScope() {
  const calls = [];
  const param = (name) => ({
    value: 1,
    cancelScheduledValues: () => calls.push([name, 'cancel']),
    setValueAtTime: (v) => calls.push([name, 'set', v]),
    exponentialRampToValueAtTime: (v, t) => calls.push([name, 'ramp', v, t]),
    setTargetAtTime: (v) => calls.push([name, 'target', v]),
  });
  const gains = [];
  class Context {
    constructor() { this.currentTime = 10; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createMediaElementSource() { return { connect: () => {} }; }
    createGain() { const gain = { gain: param(gains.length ? 'level' : 'fade'), connect: () => {} }; gains.push(gain); return gain; }
  }
  const elements = [];
  class Audio {
    constructor() { this.paused = true; elements.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const timers = [];
  return { calls, elements, timers, scope: { AudioContext: Context, Audio, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {} } };
}

describe('the title music', () => {
  test('loops the track and fades in on play', () => {
    const { scope, elements, calls } = fakeScope();
    const music = createTitleMusic({ scope, src: 'title.mp3' });
    expect(music.supported).toBe(true);
    expect(music.play()).toBe(true);
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ src: 'title.mp3', loop: true, paused: false });
    expect(music.playing).toBe(true);
    expect(calls).toContainEqual(['fade', 'ramp', 1, 10 + TITLE_MUSIC.fadeIn]);
  });

  test('fades out over 30 seconds when the game starts, then pauses', () => {
    const { scope, elements, calls, timers } = fakeScope();
    const music = createTitleMusic({ scope, src: 'title.mp3' });
    music.play();
    music.fadeOut();
    expect(TITLE_MUSIC.fadeOut).toBe(30);
    const ramp = calls.filter(([name, kind]) => name === 'fade' && kind === 'ramp').at(-1);
    expect(ramp[2]).toBeLessThan(0.001);
    expect(ramp[3]).toBe(10 + 30);
    expect(music.playing).toBe(false);
    expect(elements[0].paused).toBe(false); // still heard while it fades
    timers.at(-1).fn();
    expect(elements[0].paused).toBe(true);
  });

  test('back on the title before the fade ends, it comes back and is not paused', () => {
    const { scope, elements, timers } = fakeScope();
    const music = createTitleMusic({ scope, src: 'title.mp3' });
    music.play();
    music.fadeOut();
    music.play();
    timers.at(-1).fn();
    expect(elements[0].paused).toBe(false);
    expect(elements).toHaveLength(1);
  });

  test('the Settings volume scales its gain; no Web Audio, no music', () => {
    const { scope, calls } = fakeScope();
    const music = createTitleMusic({ scope, src: 'title.mp3' });
    music.play();
    music.setVolume(0.5);
    expect(calls).toContainEqual(['level', 'target', 0.5 * TITLE_MUSIC.gain]);
    const none = createTitleMusic({ scope: {}, src: 'title.mp3' });
    expect(none.supported).toBe(false);
    expect(none.play()).toBe(false);
    expect(() => none.fadeOut()).not.toThrow();
    vi.restoreAllMocks();
  });
});
