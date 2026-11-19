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
});

/**
 * The ambience of this browser.
 *
 *   supported            the browser has the Web Audio API
 *   running
 *   start()              call inside a tap (browsers let a page make sound only after one)
 *   stop()
 *   setLevel(name)       'full', 'duck' (a line is spoken) or 'mute' (the microphone listens)
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
      const master = context.createGain();
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(AMBIENCE.levels[level], context.currentTime + AMBIENCE.fadeIn);
      master.connect(context.destination);
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
      live = { context, master, input: filter, timer: null, chord: null };
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
      const { context, master } = session;
      master.gain.cancelScheduledValues?.(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, AMBIENCE.fadeOut / 4);
      later(() => quietly(context, 'close'), AMBIENCE.fadeOut * 1000 + 100);
    },
    setLevel(name) {
      if (!Object.hasOwn(AMBIENCE.levels, name) || name === level) return;
      level = name;
      if (!live) return;
      const { context, master } = live;
      master.gain.cancelScheduledValues?.(context.currentTime);
      master.gain.setTargetAtTime(AMBIENCE.levels[name], context.currentTime, name === 'full' ? 0.8 : 0.15);
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
