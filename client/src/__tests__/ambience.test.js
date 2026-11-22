// @vitest-environment node
// Round 127: ambient music made with the Web Audio API. The chords are a table of this game's own; the music is
// slow, quiet, never repeats, and gives way to speech.
import { describe, expect, test } from 'vitest';
import { AMBIENCE, CHORDS, RANGE, SCALE, createAmbience, nextChord, noteFrequency } from '../ambience.js';

describe('the chords', () => {
  test('every voicing is four notes of D flat major, low to high, inside the range, with no leading note in the bass', () => {
    expect(CHORDS).toHaveLength(8);
    for (const chord of CHORDS) {
      expect(chord.notes, chord.name).toHaveLength(4);
      expect([...chord.notes].sort((a, b) => a - b)).toEqual(chord.notes);
      for (const note of chord.notes) {
        expect(SCALE, `${chord.name} ${note}`).toContain(note % 12);
        expect(note).toBeGreaterThanOrEqual(RANGE.low);
        expect(note).toBeLessThanOrEqual(RANGE.high);
      }
      expect(chord.notes[0] % 12).not.toBe(0); // C is the scale's leading note
    }
    expect(new Set(CHORDS.map((chord) => chord.notes.join())).size).toBe(8);
  });

  test('every chord has neighbours, none is its own, and a long walk visits them all without standing still', () => {
    CHORDS.forEach((chord, index) => {
      expect(chord.next.length).toBeGreaterThanOrEqual(2);
      expect(chord.next).not.toContain(index);
      for (const to of chord.next) expect(CHORDS[to]).toBeTruthy();
    });
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const seen = new Set();
    let current = 0;
    for (let i = 0; i < 400; i++) {
      const next = nextChord(current, random);
      expect(next).not.toBe(current);
      seen.add(next);
      current = next;
    }
    expect(seen.size).toBe(8);
    expect(nextChord(0, () => 0)).toBe(CHORDS[0].next[0]);
    expect(nextChord(0, () => 0.9999)).toBe(CHORDS[0].next.at(-1));
    expect(nextChord(99)).toBe(0);
  });

  test('the notes are in tune', () => {
    expect(noteFrequency(69)).toBe(440);
    expect(noteFrequency(57)).toBeCloseTo(220, 9);
    expect(noteFrequency(61)).toBeCloseTo(277.18, 2); // D flat 4
  });

  test('nothing in the music is fast or loud', () => {
    expect(AMBIENCE.attack).toBeGreaterThanOrEqual(4);
    expect(AMBIENCE.release).toBeGreaterThanOrEqual(AMBIENCE.attack);
    expect(AMBIENCE.period).toBeGreaterThan(AMBIENCE.attack);
    expect(AMBIENCE.levels.full).toBeLessThanOrEqual(0.14);
    expect(AMBIENCE.levels.duck).toBeLessThan(AMBIENCE.levels.full / 2);
    expect(AMBIENCE.levels.mute).toBe(0);
  });
});

// A recorder in place of the Web Audio API, with a clock the test moves.
function fakeAudio({ hidden = false } = {}) {
  const scope = { contexts: [], timers: [], document: { hidden, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, removeEventListener(name) { delete this.listeners[name]; } } };
  const param = (value = 0) => ({ value, events: [], setValueAtTime(v, t) { this.events.push(['set', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); }, setTargetAtTime(v, t, tau) { this.events.push(['target', v, t, tau]); }, cancelScheduledValues(t) { this.events.push(['cancel', t]); } });
  const node = (kind, extra = {}) => ({ kind, to: [], connect(target) { this.to.push(target); }, ...extra });
  scope.AudioContext = function AudioContext() {
    scope.contexts.push(this);
    Object.assign(this, {
      currentTime: 0, sampleRate: 1000, state: 'running', destination: node('destination'), made: [], closed: false, resumed: 0, suspended: 0,
      resume() { this.resumed += 1; }, suspend() { this.suspended += 1; }, close() { this.closed = true; },
      createGain() { const n = node('gain', { gain: param(1) }); this.made.push(n); return n; },
      createOscillator() { const n = node('oscillator', { type: 'sine', frequency: param(440), detune: param(0), started: null, stopped: null, start(t = 0) { this.started = t; }, stop(t) { this.stopped = t; } }); this.made.push(n); return n; },
      createBiquadFilter() { const n = node('filter', { type: '', frequency: param(350) }); this.made.push(n); return n; },
      createConvolver() { const n = node('convolver', { buffer: null }); this.made.push(n); return n; },
      createBuffer(channels, length, rate) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { channels, length, rate, getChannelData: (c) => data[c] }; },
    });
  };
  scope.setTimeout = (fn, ms) => { scope.timers.push({ fn, ms, cancelled: false }); return scope.timers.length - 1; };
  scope.clearTimeout = (id) => { if (scope.timers[id]) scope.timers[id].cancelled = true; };
  // Runs the newest timer that is still armed, `seconds` later on the audio clock.
  scope.fire = (seconds) => { const timer = scope.timers.findLast((t) => !t.cancelled && !t.fired); timer.fired = true; scope.contexts.at(-1).currentTime += seconds; timer.fn(); };
  return scope;
}
const voices = (context) => context.made.filter((n) => n.kind === 'oscillator' && n.type === 'triangle');
const master = (context) => context.made.find((n) => n.kind === 'gain' && n.to.includes(context.destination));

describe('the ambience', () => {
  test('nothing is made before the start; a start builds the chain, fades in quietly and plays the first chord', () => {
    const scope = fakeAudio();
    const ambience = createAmbience({ scope, random: () => 0 });
    expect(ambience.supported).toBe(true);
    expect(ambience.running).toBe(false);
    expect(scope.contexts).toHaveLength(0);
    expect(ambience.start()).toBe(true);
    expect(ambience.start()).toBe(false); // once
    expect(scope.contexts).toHaveLength(1);
    const context = scope.contexts[0];
    expect(context.resumed).toBe(1);
    expect(master(context).gain.events).toEqual([['set', 0, 0], ['ramp', AMBIENCE.levels.full, AMBIENCE.fadeIn]]);
    const filter = context.made.find((n) => n.kind === 'filter');
    expect([filter.type, filter.frequency.value]).toEqual(['lowpass', AMBIENCE.cutoff]);
    const reverb = context.made.find((n) => n.kind === 'convolver');
    expect(reverb.buffer.length).toBe(AMBIENCE.reverb * 1000);
    const tail = reverb.buffer.getChannelData(0);
    expect(Math.abs(tail[tail.length - 1])).toBeLessThan(1e-6); // the noise has died away
    // The first chord: each of its four notes on two oscillators a few cents apart, into the filter.
    expect(ambience.chord).toBe(0);
    const sounding = voices(context);
    expect(sounding).toHaveLength(8);
    expect([...new Set(sounding.map((o) => o.frequency.value))]).toEqual(CHORDS[0].notes.map(noteFrequency));
    expect([...new Set(sounding.map((o) => o.detune.value))].sort((a, b) => a - b)).toEqual([-AMBIENCE.detune, AMBIENCE.detune]);
    for (const oscillator of sounding) {
      const gain = oscillator.to[0];
      expect(gain.to).toEqual([filter]);
      expect(gain.gain.events).toEqual([['set', 0, 0], ['ramp', AMBIENCE.voice, AMBIENCE.attack], ['set', AMBIENCE.voice, AMBIENCE.period], ['ramp', 0, AMBIENCE.period + AMBIENCE.release]]);
      expect(oscillator.started).toBe(0);
      expect(oscillator.stopped).toBe(AMBIENCE.period + AMBIENCE.release + 0.5); // gone once its fade is over
    }
  });

  test('a new chord follows each period, a neighbour of the last, fading in while the last fades out', () => {
    const scope = fakeAudio();
    let pick = 0.99;
    const ambience = createAmbience({ scope, random: () => pick });
    ambience.start();
    const context = scope.contexts[0];
    expect(scope.timers.at(-1).ms).toBe(AMBIENCE.period * 1000);
    scope.fire(AMBIENCE.period);
    expect(ambience.chord).toBe(CHORDS[0].next.at(-1));
    const second = voices(context).slice(8);
    expect(second).toHaveLength(8);
    expect(second[0].started).toBe(AMBIENCE.period);
    expect(second[0].to[0].gain.events[1]).toEqual(['ramp', AMBIENCE.voice, AMBIENCE.period + AMBIENCE.attack]);
    pick = 0;
    scope.fire(AMBIENCE.period);
    expect(ambience.chord).toBe(CHORDS[CHORDS[0].next.at(-1)].next[0]);
    expect(voices(context)).toHaveLength(24);
  });

  test('speech lowers it and the microphone silences it, and it comes back slowly', () => {
    const scope = fakeAudio();
    const ambience = createAmbience({ scope });
    ambience.setLevel('duck'); // before the start: it starts ducked
    ambience.start();
    const gain = master(scope.contexts[0]).gain;
    expect(gain.events.at(-1)).toEqual(['ramp', AMBIENCE.levels.duck, AMBIENCE.fadeIn]);
    ambience.setLevel('mute');
    expect(gain.events.at(-1)).toEqual(['target', 0, 0, 0.15]);
    ambience.setLevel('mute');
    ambience.setLevel('louder');
    expect(gain.events.filter(([kind]) => kind === 'target')).toHaveLength(1);
    ambience.setLevel('full');
    expect(gain.events.at(-1)).toEqual(['target', AMBIENCE.levels.full, 0, 0.8]);
    expect(ambience.level).toBe('full');
  });

  test('a hidden page gets no chords and its clock is suspended; it resumes when shown', () => {
    const scope = fakeAudio();
    const ambience = createAmbience({ scope });
    ambience.start();
    const context = scope.contexts[0];
    scope.document.hidden = true;
    scope.document.listeners.visibilitychange();
    expect(context.suspended).toBe(1);
    scope.fire(AMBIENCE.period);
    expect(voices(context)).toHaveLength(8);
    scope.document.hidden = false;
    scope.document.listeners.visibilitychange();
    expect(context.resumed).toBe(2);
    scope.fire(AMBIENCE.period);
    expect(voices(context)).toHaveLength(16);
  });

  test('a stop fades out, schedules no more chords and closes; it can start again', () => {
    const scope = fakeAudio();
    const ambience = createAmbience({ scope });
    ambience.start();
    const context = scope.contexts[0];
    ambience.stop();
    ambience.stop();
    expect(ambience.running).toBe(false);
    expect(master(context).gain.events.at(-1)).toEqual(['target', 0, 0, AMBIENCE.fadeOut / 4]);
    expect(scope.timers[0].cancelled).toBe(true);
    expect(scope.document.listeners.visibilitychange).toBeUndefined();
    expect(context.closed).toBe(false);
    scope.fire(AMBIENCE.fadeOut);
    expect(context.closed).toBe(true);
    expect(voices(context)).toHaveLength(8);
    expect(ambience.start()).toBe(true);
    expect(scope.contexts).toHaveLength(2);
  });

  test('a browser without Web Audio is unsupported and does nothing; the prefixed name counts', () => {
    const none = createAmbience({ scope: {} });
    expect(none.supported).toBe(false);
    expect(none.start()).toBe(false);
    expect(() => { none.stop(); none.setLevel('duck'); }).not.toThrow();
    const scope = fakeAudio();
    scope.webkitAudioContext = scope.AudioContext;
    delete scope.AudioContext;
    expect(createAmbience({ scope }).start()).toBe(true);
    // A context whose resume is refused (no tap yet) is not an error.
    const refused = fakeAudio();
    const Inner = refused.AudioContext;
    refused.AudioContext = function Refusing() { Inner.call(this); this.resume = () => Promise.reject(new Error('NotAllowedError')); };
    expect(createAmbience({ scope: refused }).start()).toBe(true);
    const broken = createAmbience({ scope: { AudioContext: function Broken() { throw new Error('no device'); } } });
    expect(broken.start()).toBe(false);
    expect(broken.running).toBe(false);
  });
});

// Round 146: the rain of The Long Way Home under the music, and thunder.
describe('rain and thunder', () => {
  function withNoise() {
    const scope = fakeAudio();
    const Base = scope.AudioContext;
    scope.AudioContext = function AudioContext() {
      Base.call(this);
      this.createBufferSource = () => { const n = { kind: 'source', to: [], buffer: null, loop: false, started: null, stopped: null, connect(target) { this.to.push(target); }, start(t = 0) { this.started = t; }, stop(t) { this.stopped = t; } }; this.made.push(n); return n; };
    };
    return scope;
  }
  const rainGain = (context) => { const source = context.made.find((n) => n.kind === 'source' && n.loop); return source.to[0].to[0].to[0]; };

  test('rain is looping noise through two filters into the master, silent until it rains, as loud as it is heavy', () => {
    const scope = withNoise();
    const ambience = createAmbience({ scope, random: () => 0.5 });
    ambience.setRain(0.4); // before the start: remembered
    ambience.start();
    const context = scope.contexts[0];
    const source = context.made.find((n) => n.kind === 'source');
    expect([source.loop, source.started]).toEqual([true, 0]);
    expect(source.to[0].type).toBe('highpass');
    expect(source.to[0].to[0].type).toBe('lowpass');
    const gain = rainGain(context);
    expect(gain.to).toEqual([master(context)]); // under the master: it ducks and mutes with the music
    expect(gain.gain.value).toBe(0);
    expect(gain.gain.events.at(-1)).toEqual(['target', 0.4 * AMBIENCE.rain.gain, 0, AMBIENCE.rain.ease]);
    ambience.setRain(1);
    expect(gain.gain.events.at(-1)).toEqual(['target', AMBIENCE.rain.gain, 0, AMBIENCE.rain.ease]);
    const events = gain.gain.events.length;
    ambience.setRain(1.004); // no change worth a ramp
    expect(gain.gain.events).toHaveLength(events);
    ambience.setRain(0);
    expect(gain.gain.events.at(-1)[1]).toBe(0);
    ambience.setRain('nonsense');
    expect(ambience.rain).toBe(0);
  });

  test('thunder is one low rumble that swells and dies away; without the music there is none', () => {
    const scope = withNoise();
    const ambience = createAmbience({ scope, random: () => 0.5 });
    expect(ambience.thunder()).toBe(false);
    ambience.start();
    const context = scope.contexts[0];
    context.currentTime = 12;
    expect(ambience.thunder()).toBe(true);
    const rumble = context.made.filter((n) => n.kind === 'source').at(-1);
    expect([rumble.loop, rumble.started]).toEqual([false, 12]);
    expect(rumble.stopped).toBeCloseTo(12 + AMBIENCE.thunder.lasts + 0.1);
    const [filter] = rumble.to;
    expect([filter.type, filter.frequency.value]).toEqual(['lowpass', AMBIENCE.thunder.cutoff]);
    expect(filter.to[0].gain.events).toEqual([['set', 0, 12], ['ramp', AMBIENCE.thunder.gain, 12 + AMBIENCE.thunder.swell], ['ramp', 0, 12 + AMBIENCE.thunder.lasts]]);
  });

  test('a browser without a noise source plays the music and no rain', () => {
    const scope = fakeAudio();
    const ambience = createAmbience({ scope, random: () => 0 });
    expect(ambience.start()).toBe(true);
    ambience.setRain(1);
    expect(ambience.thunder()).toBe(false);
    expect(ambience.rain).toBe(1);
  });
});
