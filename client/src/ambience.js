// Round 127: quiet ambient music behind the dungeon, made in the browser with the Web Audio API. There is no audio
// file: slow, beatless chords fade into each other, each chosen as the music goes, so it never repeats. The chords
// are this game's own (a table in D flat major). The music keeps out of the way of speech: `setLevel('duck')` while
// a character's line is read aloud, `setLevel('mute')` while the microphone listens.

// A4 = 440 Hz is MIDI note 69.
export const noteFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
// The notes of D flat major, as pitch classes (C = 0).
export const SCALE = Object.freeze([1, 3, 5, 6, 8, 10, 0]);
export const RANGE = Object.freeze({ low: 44, high: 75 }); // A flat 2 to E flat 5
// Eight voicings of four notes (MIDI numbers, low to high) and the chords each may move to.
export const CHORDS = Object.freeze([
  { name: 'D♭ add9', notes: [49, 56, 63, 65], next: [1, 2, 6, 7] },
  { name: 'G♭ maj7', notes: [54, 61, 65, 70], next: [0, 3, 4, 6] },
  { name: 'B♭m7', notes: [46, 56, 61, 65], next: [0, 1, 4, 5] },
  { name: 'A♭ sus', notes: [44, 56, 61, 63], next: [0, 2, 7] },
  { name: 'E♭m9', notes: [51, 58, 65, 66], next: [1, 3, 5] },
  { name: 'Fm7', notes: [53, 60, 63, 68], next: [1, 2, 6] },
  { name: 'G♭ add9', notes: [54, 61, 68, 70], next: [0, 3, 7] },
  { name: 'D♭ maj7', notes: [49, 60, 65, 68], next: [1, 2, 6] },
]);

/** The chord after `current`: one of its neighbours, by `random` (a number in [0, 1)). */
export function nextChord(current, random = Math.random) {
  const choices = CHORDS[current]?.next ?? [0];
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

// Seconds, and gains on Web Audio's scale (1 is full).
export const AMBIENCE = Object.freeze({
  period: 14, // a new chord this often
  attack: 6, // a chord's fade in
  release: 9, // and its fade out, under the next chord
  voice: 0.16, // a note's gain at its loudest
  detune: 4, // cents either side, the two oscillators of a note
  cutoff: 900, // Hz, the low-pass filter
  sway: 180, // Hz, how far a slow oscillator moves it
  swayRate: 0.03, // Hz
  reverb: 4, // seconds of decaying noise
  fadeIn: 4, // the start
  fadeOut: 1.5, // the stop
  levels: Object.freeze({ full: 0.14, duck: 0.045, mute: 0 }),
  // Round 146: the weather of The Journey 2. Rain is filtered noise under the chords, as loud as it is heavy;
  // thunder is a low rumble that swells and dies away.
  // Round 172: both are sound effects on a bus of their own (the Effects volume), and far quieter: a downpour peaks
  // at 0.035, under a fifth of what it was (1.4 × the music's 0.14), so the rain stays in the background.
  rain: Object.freeze({ gain: 0.035, low: 700, high: 5200, ease: 1.5 }),
  thunder: Object.freeze({ gain: 0.09, cutoff: 140, swell: 0.35, lasts: 3.2 }),
  // The effects bus by level: it drops a little under a spoken line and is silent while the microphone listens.
  effectLevels: Object.freeze({ full: 1, duck: 0.6, mute: 0 }),
});

/** A volume from the Settings sliders: 0 to 1, and 1 for anything that is not a number. */
const volumeOf = (value) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1);

/**
 * The ambience of this browser.
 *
 *   supported            the browser has the Web Audio API
 *   running
 *   start()              call inside a tap (browsers let a page make sound only after one)
 *   stop()
 *   setLevel(name)       'full', 'duck' (a line is spoken) or 'mute' (the microphone listens)
 *   setRain(amount)      0 (dry) to 1 (a downpour): the sound of rain under the music (round 146)
 *   thunder()            one rumble
 *   setVolumes({ master, music, effects })   0 to 1 each (round 172). The chain is
 *                        chords → level → music → out ← effects ← rain, thunder; out (the master volume) → speakers.
 */
export function createAmbience({ scope = typeof window !== 'undefined' ? window : {}, random = Math.random } = {}) {
  const Context = scope.AudioContext ?? scope.webkitAudioContext;
  const supported = typeof Context === 'function';
  const later = (fn, ms) => (scope.setTimeout ?? setTimeout)(fn, ms);
  const cancel = (id) => (scope.clearTimeout ?? clearTimeout)(id);
  // resume, suspend and close answer with promises that may reject (a context not yet allowed to run): that is not an error here.
  const quietly = (context, method) => { try { Promise.resolve(context[method]?.()).catch(() => {}); } catch { /* the same */ } };
  let live = null; // { context, master, input, timer, chord }
  let level = 'full';
  let rain = 0;
  let volumes = { master: 1, music: 1, effects: 1 };

  // Two seconds of noise, played round and round: the rain's and the thunder's raw material.
  function noise(context) {
    const length = Math.floor(context.sampleRate * 2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = random() * 2 - 1;
    return buffer;
  }
  // The rain's chain, from a looping noise source to the master gain. Null where the browser lacks a part of it.
  function rainChain(context, effects) {
    if (!context.createBufferSource || !context.createBiquadFilter) return null;
    try {
      const source = context.createBufferSource();
      source.buffer = noise(context);
      source.loop = true;
      const high = context.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = AMBIENCE.rain.low;
      const low = context.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = AMBIENCE.rain.high;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(high);
      high.connect(low);
      low.connect(gain);
      gain.connect(effects);
      source.start?.();
      return { gain, buffer: source.buffer };
    } catch { return null; }
  }

  function impulse(context) {
    const length = Math.floor(context.sampleRate * AMBIENCE.reverb);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (random() * 2 - 1) * (1 - i / length) ** 3;
    }
    return buffer;
  }

  function playChord(session, index) {
    const { context, input } = session;
    const at = context.currentTime;
    const end = at + AMBIENCE.period + AMBIENCE.release;
    for (const midi of CHORDS[index].notes) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(AMBIENCE.voice, at + AMBIENCE.attack);
      gain.gain.setValueAtTime(AMBIENCE.voice, at + AMBIENCE.period);
      gain.gain.linearRampToValueAtTime(0, end);
      gain.connect(input);
      for (const cents of [-AMBIENCE.detune, AMBIENCE.detune]) {
        const oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.value = noteFrequency(midi);
        oscillator.detune.value = cents;
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(end + 0.5);
      }
    }
  }

  function tick(session) {
    if (live !== session) return;
    // A hidden page's audio clock stands still: no chord is scheduled into it.
    if (!scope.document?.hidden) {
      session.chord = session.chord === null ? 0 : nextChord(session.chord, random);
      playChord(session, session.chord);
    }
    session.timer = later(() => tick(session), AMBIENCE.period * 1000);
  }

  const onVisibility = () => {
    if (!live) return;
    quietly(live.context, scope.document?.hidden ? 'suspend' : 'resume');
  };

  const api = {
    supported,
    get running() { return live !== null; },
    get level() { return level; },
    get chord() { return live?.chord ?? null; },
    start() {
      if (!supported || live) return false;
      let context;
      try { context = new Context(); } catch { return false; }
      quietly(context, 'resume');
      const out = context.createGain();
      out.gain.value = volumes.master;
      out.connect(context.destination);
      const music = context.createGain();
      music.gain.value = volumes.music;
      music.connect(out);
      const effects = context.createGain();
      effects.gain.setValueAtTime(0, context.currentTime);
      effects.gain.linearRampToValueAtTime(AMBIENCE.effectLevels[level] * volumes.effects, context.currentTime + AMBIENCE.fadeIn);
      effects.connect(out);
      const master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(AMBIENCE.levels[level], context.currentTime + AMBIENCE.fadeIn);
      master.connect(music);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = AMBIENCE.cutoff;
      const sway = context.createOscillator();
      sway.frequency.value = AMBIENCE.swayRate;
      const swayDepth = context.createGain();
      swayDepth.gain.value = AMBIENCE.sway;
      sway.connect(swayDepth);
      swayDepth.connect(filter.frequency);
      sway.start();
      const dry = context.createGain();
      dry.gain.value = 0.6;
      const wet = context.createGain();
      wet.gain.value = 0.5;
      const reverb = context.createConvolver();
      reverb.buffer = impulse(context);
      filter.connect(dry);
      filter.connect(reverb);
      reverb.connect(wet);
      dry.connect(master);
      wet.connect(master);
      live = { context, master, out, music, effects, input: filter, timer: null, chord: null, rain: rainChain(context, effects) };
      live.rain?.gain.gain.setTargetAtTime?.(rain * AMBIENCE.rain.gain, context.currentTime, AMBIENCE.rain.ease);
      scope.document?.addEventListener?.('visibilitychange', onVisibility);
      tick(live);
      return true;
    },
    stop() {
      const session = live;
      if (!session) return;
      live = null;
      cancel(session.timer);
      scope.document?.removeEventListener?.('visibilitychange', onVisibility);
      const { context, out } = session;
      out.gain.cancelScheduledValues?.(context.currentTime);
      out.gain.setTargetAtTime(0, context.currentTime, AMBIENCE.fadeOut / 4);
      later(() => quietly(context, 'close'), AMBIENCE.fadeOut * 1000 + 100);
    },
    get rain() { return rain; },
    setRain(amount) {
      const next = Math.min(1, Math.max(0, Number(amount) || 0));
      if (Math.abs(next - rain) < 0.01) return;
      rain = next;
      live?.rain?.gain.gain.setTargetAtTime?.(rain * AMBIENCE.rain.gain, live.context.currentTime, AMBIENCE.rain.ease);
    },
    thunder() {
      if (!live?.rain) return false;
      const { context, effects } = live;
      try {
        const source = context.createBufferSource();
        source.buffer = live.rain.buffer;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = AMBIENCE.thunder.cutoff;
        const gain = context.createGain();
        const at = context.currentTime;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(AMBIENCE.thunder.gain, at + AMBIENCE.thunder.swell);
        gain.gain.linearRampToValueAtTime(0, at + AMBIENCE.thunder.lasts);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(effects);
        source.start(at);
        source.stop(at + AMBIENCE.thunder.lasts + 0.1);
        return true;
      } catch { return false; }
    },
    setLevel(name) {
      if (!Object.hasOwn(AMBIENCE.levels, name) || name === level) return;
      level = name;
      if (!live) return;
      const { context, master, effects } = live;
      const ease = name === 'full' ? 0.8 : 0.15;
      master.gain.cancelScheduledValues?.(context.currentTime);
      master.gain.setTargetAtTime(AMBIENCE.levels[name], context.currentTime, ease);
      effects.gain.cancelScheduledValues?.(context.currentTime);
      effects.gain.setTargetAtTime(AMBIENCE.effectLevels[name] * volumes.effects, context.currentTime, ease);
    },
    get volumes() { return { ...volumes }; },
    setVolumes(next = {}) {
      volumes = { master: volumeOf(next.master ?? volumes.master), music: volumeOf(next.music ?? volumes.music), effects: volumeOf(next.effects ?? volumes.effects) };
      if (!live) return;
      const { context } = live;
      live.out.gain.setTargetAtTime(volumes.master, context.currentTime, 0.05);
      live.music.gain.setTargetAtTime(volumes.music, context.currentTime, 0.05);
      live.effects.gain.cancelScheduledValues?.(context.currentTime);
      live.effects.gain.setTargetAtTime(AMBIENCE.effectLevels[level] * volumes.effects, context.currentTime, 0.05);
    },
  };
  return api;
}

/** The ambience of this browser, made once. */
let shared = null;
export function browserAmbience() {
  shared ??= createAmbience();
  return shared;
}
