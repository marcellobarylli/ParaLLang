import { useEffect, useRef, useState } from 'react';
import { BREATH, BREATH_CYCLE, BREATH_TURN, breathLevel, breathProgress, newBreath, stepBreath } from '../breath.js';
import Narration from './Narration.jsx';

// Round 214: the breathing, drawn over the conversation panel while a reply is on its way. The panel does not go
// away: its text fades and the panel itself turns more see-through (index.css, `.sheet.breathing`), and this is
// drawn over it. Nothing is written on it: a light swells with the breath in and sinks with the breath out, and a
// small light goes once round a ring for each breath (from the upper left, clockwise), through two glowing stretches, one where the breath turns
// (let go) and one where the next begins (press), each with its best moment in the middle. `ready` says the reply
// has come; the breathing then ends with a breath out (breath.js) and calls `onDone` once it has faded.
const FADE_MS = 700;
const GOLD = '228 184 71';
const GOLD_HI = '246 220 140';
const TURMERIC = '226 150 16';
const INK ='236 236 228';
const TAU = Math.PI * 2;

export const browserFrames = () => ({
  request: (callback) => globalThis.requestAnimationFrame(callback),
  cancel: (id) => globalThis.cancelAnimationFrame(id),
});

/** A light with no edge: brightest at its middle, nothing at `radius`. */
function glow(context, x, y, radius, colour, alpha, body = 0.42) {
  if (alpha <= 0.003 || radius <= 0) return;
  const light = context.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, `rgb(${colour} / ${Math.min(1, alpha)})`);
  light.addColorStop(0.45, `rgb(${colour} / ${Math.min(1, alpha) * body})`);
  light.addColorStop(1, `rgb(${colour} / 0)`);
  context.fillStyle = light;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
}

// Round 214, amended 2026-11-28 (the owner): the breath in begins 45 degrees anticlockwise of north (up and to the left) and goes clockwise round.
// Angles are the canvas's: 0 is east, and they grow clockwise, so north is -PI / 2.
export const BREATH_START = -Math.PI / 2; // the breath in is at the top; the light starts 45 degrees before it (breath.js `lead`)
export const angleOf = (share) => BREATH_START + share * TAU;

/** A stretch of the ring that glows, fading to nothing at both ends, with its best moment in the middle. */
function zone(context, cx, cy, ring, share, alpha, bloom) {
  if (alpha <= 0.003) return;
  const half = (BREATH.tolerance / BREATH_CYCLE) * TAU;
  const middle = angleOf(share);
  const lights = Math.max(12, Math.round((half * ring) / 1.4)); // one every pixel and a half or so: they run together
  for (let i = 0; i <= lights; i += 1) {
    const along = -1 + (2 * i) / lights;
    const at = middle + along * half;
    glow(context, cx + Math.cos(at) * ring, cy + Math.sin(at) * ring, 10, GOLD_HI, alpha * 0.13 * (1 - along ** 4), 0.5);
  }
  glow(context, cx + Math.cos(middle) * ring, cy + Math.sin(middle) * ring, 10 + bloom * 24, GOLD_HI, alpha * (0.9 - bloom * 0.3));
}

/** A faint word just outside the ring at a stretch's best moment, in the stretch's own colour. */
function label(context, cx, cy, ring, share, text, alpha) {
  if (alpha <= 0.003) return;
  const at = angleOf(share);
  const out = ring + 22;
  context.save();
  context.font = "13px 'Courier New', Courier, monospace";
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = `rgb(${GOLD_HI} / ${alpha * 0.55})`;
  context.fillText(text, cx + Math.cos(at) * out, cy + Math.sin(at) * out);
  context.restore();
}

function draw(context, game, view) {
  const { width, height, held, veil } = view;
  context.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const ring = Math.max(44, Math.min(132, Math.min(width, height) * 0.34));
  const level = breathLevel(game);
  // The breath itself: a light that swells and sinks, brighter while the panel is held.
  const body = ring * (0.3 + 0.48 * level);
  glow(context, cx, cy, body * 1.5, GOLD, 0.2 + 0.1 * level + held * 0.2 + game.warmth * 0.1, 0.62);
  glow(context, cx, cy, body * 0.85, GOLD_HI, 0.1 + held * (0.26 + 0.1 * level) + game.warmth * 0.08, 0.55);
  // What a turn kept in time leaves: a slow ring going out from the breath.
  const bloom = { press: 0, release: 0 };
  for (const mark of game.marks) {
    const life = mark.age / BREATH.markFor;
    const strength = (mark.grade === 'perfect' ? 0.42 : 0.2) * (1 - life) ** 2;
    const radius = body + life * ring * 0.9;
    const tint = mark.grade === 'perfect' ? TURMERIC : GOLD_HI; // the best moment goes out as a turmeric circle
    context.save();
    context.shadowColor = `rgb(${tint} / ${strength})`;
    context.shadowBlur = 18;
    for (const [width, share] of [[14, 0.22], [5, 0.4], [1.5, 0.7]]) { // a band that is brightest in its middle, with no edge
      context.strokeStyle = `rgb(${tint} / ${strength * share})`;
      context.lineWidth = width;
      context.beginPath();
      context.arc(cx, cy, radius, 0, TAU);
      context.stroke();
    }
    context.restore();
    bloom[mark.turn] = Math.max(bloom[mark.turn], (1 - life) * (mark.grade === 'perfect' ? 1 : 0.5));
  }
  // The ring, the two stretches where a turn is in time, and the small light going round.
  context.save();
  context.shadowColor = `rgb(${INK} / ${0.3 * veil})`;
  context.shadowBlur = 6;
  context.lineWidth = 1.5;
  context.strokeStyle = `rgb(${INK} / ${0.13 * veil})`;
  context.beginPath();
  context.arc(cx, cy, ring, 0, TAU);
  context.stroke();
  context.restore();
  zone(context, cx, cy, ring, BREATH_TURN, Math.max(veil, bloom.release), bloom.release);
  zone(context, cx, cy, ring, 0, veil, bloom.press);
  label(context, cx, cy, ring, 0, 'in', veil);
  label(context, cx, cy, ring, BREATH_TURN, 'out', veil);
  const share = breathProgress(game);
  for (let i = 12; i >= 1; i -= 1) { // the way it came, fading
    const at = angleOf(share - i * 0.0035);
    glow(context, cx + Math.cos(at) * ring, cy + Math.sin(at) * ring, 7, INK, 0.07 * (1 - i / 13) * veil);
  }
  const at = angleOf(share);
  glow(context, cx + Math.cos(at) * ring, cy + Math.sin(at) * ring, 13, INK, 0.95 * veil);
}

export default function BreathGame({ ready, onDone, frames = null }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [shown, setShown] = useState(false);
  const [seen, setSeen] = useState({ phase: 'in', cycle: 0, held: false, kept: 0, closing: false });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const clock = frames ?? browserFrames();
    let context = null;
    try { context = canvas.getContext?.('2d') ?? null; } catch { context = null; }
    let size = { width: 0, height: 0 };
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const next = { width: Math.round(rect.width) || 320, height: Math.round(rect.height) || 320 };
      if (next.width === size.width && next.height === size.height) return;
      size = next;
      const ratio = Math.min(3, globalThis.devicePixelRatio || 1);
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      context?.setTransform?.(ratio, 0, 0, ratio, 0, 0);
    };
    measure();
    let game = newBreath();
    const holds = new Set(); // what holds the panel now: pointers, and the space bar
    let held = 0; // how lit the breath is, following the hold softly
    let veil = 1; // the ring and its stretches: they fade as the last breath goes out
    let shownState = { phase: 'in', cycle: 0, held: false, kept: 0, closing: false };
    let last = null;
    let frame = null;
    let leaving = null;
    const tick = (now) => {
      frame = null;
      measure();
      const dt = last === null ? 0 : Math.min(120, Math.max(0, (now - last) / 1000));
      last = now;
      // A long gap (the page was in the background) is taken in steps, so that the breath keeps its time.
      let left = dt;
      do {
        const part = Math.min(left, BREATH.maxStep);
        game = stepBreath(game, { dt: part, ready: readyRef.current, held: holds.size > 0 });
        left -= part;
      } while (left > 1e-9);
      const ease = (rate) => 1 - Math.exp(-dt * rate);
      held += ((game.held ? 1 : 0) - held) * ease(7);
      veil += ((game.closing ? Math.max(0, Math.min(1, (BREATH.exhale - game.t) / 2 - 0.25)) : 1) - veil) * ease(5);
      // A drawing that fails must not stop the breath: the reply waits for it to end.
      if (context) { try { draw(context, game, { ...size, held, veil }); } catch { context = null; } }
      if (game.phase !== shownState.phase || game.cycle !== shownState.cycle || game.held !== shownState.held || game.kept !== shownState.kept || game.closing !== shownState.closing) {
        shownState = { phase: game.phase, cycle: game.cycle, held: game.held, kept: game.kept, closing: game.closing };
        setSeen(shownState);
      }
      if (game.done) {
        setShown(false);
        leaving = setTimeout(() => doneRef.current?.({ cycles: game.cycle, kept: game.kept, perfect: game.perfect }), FADE_MS);
        return;
      }
      frame = clock.request(tick);
    };
    frame = clock.request((now) => { setShown(true); tick(now); });

    const down = (event) => {
      event.preventDefault?.();
      holds.add(event.pointerId ?? 'pointer');
      try { root.setPointerCapture?.(event.pointerId); } catch { /* not a live pointer */ }
    };
    const up = (event) => { holds.delete(event.pointerId ?? 'pointer'); };
    const keyDown = (event) => { if (event.key === ' ' || event.code === 'Space') { event.preventDefault(); holds.add('space'); } };
    const keyUp = (event) => { if (event.key === ' ' || event.code === 'Space') { event.preventDefault(); holds.delete('space'); } };
    const quiet = (event) => event.preventDefault(); // a long press is the game, not a menu or a selection
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('lostpointercapture', up);
    root.addEventListener('keydown', keyDown);
    root.addEventListener('keyup', keyUp);
    root.addEventListener('contextmenu', quiet);
    root.addEventListener('selectstart', quiet);
    try { root.focus?.({ preventScroll: true }); } catch { /* nothing to focus */ }
    return () => {
      if (frame !== null) clock.cancel(frame);
      clearTimeout(leaving);
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', up);
      root.removeEventListener('lostpointercapture', up);
      root.removeEventListener('keydown', keyDown);
      root.removeEventListener('keyup', keyUp);
      root.removeEventListener('contextmenu', quiet);
      root.removeEventListener('selectstart', quiet);
    };
  }, []);

  return (
    <div ref={rootRef} className={`breath${shown ? ' shown' : ''}`} role="group" tabIndex={-1} aria-label="Breathing"
      data-phase={seen.phase} data-cycle={seen.cycle} data-held={seen.held ? 'yes' : 'no'} data-kept={seen.kept} data-closing={seen.closing ? 'yes' : 'no'}>
      <canvas ref={canvasRef} className="breath-field" aria-hidden="true" />
    </div>
  );
}

/**
 * The few words before the first breathing of a game: the guidebook's entry on it (`entry` is the server's
 * { title, segments }), told once. `onBegin` starts the breathing.
 */
export function BreathIntro({ entry, onBegin }) {
  return (
    <div className="breath-intro" role="dialog" aria-label={entry.title}>
      <div className="breath-intro-card">
        <strong>{entry.title}</strong>
        <Narration narration={entry} />
        <small>Entered in your guidebook.</small>
        <button type="button" className="primary-button big-button" onClick={onBegin} autoFocus>Begin</button>
      </div>
    </div>
  );
}
