// The title screen's music: a recorded track (public/music/title.mp3), looped while the title is up. When the player
// sets out it fades away over TITLE_MUSIC.fadeOut seconds, under the game. The volume goes through a Web Audio gain,
// since iOS Safari ignores an audio element's own `volume`. Browsers let a page make sound only after a tap, so
// `play()` may do nothing until the first one: `audible` says whether it did, and the title then asks for a tap
// (DungeonScreen), which calls `play()` again.
//
// Track: "The Journey - Tibetan Cloudlands 01" by WanderingArc (Pixabay, Pixabay Content Licence), re-encoded at
// 128 kbps.

export const TITLE_MUSIC = Object.freeze({
  src: 'music/title.mp3', // relative to the site's base
  fadeIn: 2, // seconds, on the title
  fadeOut: 30, // seconds, once the game starts
  gain: 0.6, // at full volume, beside the generated music's quieter bed
  verdict: 400, // ms: how long a play() is given to be heard before `audible` says it was blocked
});

const SILENT = 0.0001; // an exponential ramp cannot reach 0

/**
 * The title music of this browser.
 *
 *   supported
 *   playing            the track is meant to be heard (true from play() until a fade-out starts)
 *   play()             start, or come back from a fade-out, fading in over TITLE_MUSIC.fadeIn
 *   audible            a promise: true if the last play() is heard, false if the browser blocked it (no tap yet)
 *   heard              true while the track is actually sounding
 *   fadeOut(seconds)   fade to silence over `seconds` (TITLE_MUSIC.fadeOut), then pause
 *   setVolume(v)       0 to 1: the Settings' master × music
 */
export function createTitleMusic({ scope = typeof window !== 'undefined' ? window : {}, src } = {}) {
  const Context = scope.AudioContext ?? scope.webkitAudioContext;
  const AudioElement = scope.Audio;
  const supported = typeof Context === 'function' && typeof AudioElement === 'function';
  const later = (fn, ms) => (scope.setTimeout ?? setTimeout)(fn, ms);
  const cancel = (id) => (scope.clearTimeout ?? clearTimeout)(id);
  const url = src ?? `${import.meta.env?.BASE_URL ?? '/'}${TITLE_MUSIC.src}`;
  let chain = null; // { context, element, fade, volume }
  let volume = 1;
  let playing = false;
  let pauseTimer = null;
  let audible = Promise.resolve(false);

  function build() {
    if (chain) return chain;
    try {
      const element = new AudioElement();
      element.src = url;
      element.loop = true;
      element.preload = 'auto';
      element.crossOrigin = 'anonymous';
      const context = new Context();
      const source = context.createMediaElementSource(element);
      const fade = context.createGain();
      fade.gain.value = SILENT;
      const level = context.createGain();
      level.gain.value = volume * TITLE_MUSIC.gain;
      source.connect(fade);
      fade.connect(level);
      level.connect(context.destination);
      chain = { context, element, fade, level };
      scope.document?.addEventListener?.('visibilitychange', onVisibility);
    } catch { chain = null; }
    return chain;
  }

  // A hidden page goes quiet, and picks the track up where it was on return.
  function onVisibility() {
    if (!chain || !playing) return;
    if (scope.document?.hidden) chain.element.pause();
    else Promise.resolve(chain.element.play()).catch(() => {});
  }

  function rampTo(target, seconds) {
    const { context, fade } = chain;
    const now = context.currentTime;
    fade.gain.cancelScheduledValues?.(now);
    fade.gain.setValueAtTime(Math.max(SILENT, fade.gain.value), now);
    fade.gain.exponentialRampToValueAtTime(Math.max(SILENT, target), now + seconds);
  }

  return {
    supported,
    get playing() { return playing; },
    get audible() { return audible; },
    get heard() { return Boolean(chain && playing && !chain.element.paused && chain.context.state === 'running'); },
    play() {
      if (!supported || !build()) return false;
      cancel(pauseTimer);
      pauseTimer = null;
      playing = true;
      try { Promise.resolve(chain.context.resume?.()).catch(() => {}); } catch { /* not yet allowed */ }
      const { element, context } = chain;
      // Refused before the first tap (NotAllowedError); the context of a page without one stays suspended.
      // element.play() is called at once, not in a promise, so a tap's play() is inside the tap (older iOS needs it).
      let attempt;
      try { attempt = Promise.resolve(element.play()); } catch (error) { attempt = Promise.reject(error); }
      const refused = attempt.then(() => false, (error) => error?.name === 'NotAllowedError');
      audible = new Promise((resolve) => {
        refused.then((blocked) => { if (blocked) resolve(false); else if (context.state === 'running') resolve(true); });
        later(() => resolve(context.state === 'running'), TITLE_MUSIC.verdict);
      });
      rampTo(1, TITLE_MUSIC.fadeIn);
      return true;
    },
    fadeOut(seconds = TITLE_MUSIC.fadeOut) {
      if (!chain || !playing) return;
      playing = false;
      rampTo(SILENT, seconds);
      cancel(pauseTimer);
      pauseTimer = later(() => { pauseTimer = null; if (!playing) chain.element.pause(); }, seconds * 1000 + 100);
    },
    setVolume(next) {
      volume = typeof next === 'number' && Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 1;
      if (chain) chain.level.gain.setTargetAtTime(volume * TITLE_MUSIC.gain, chain.context.currentTime, 0.05);
    },
  };
}

let shared = null;
export function browserTitleMusic() {
  shared ??= createTitleMusic();
  return shared;
}
