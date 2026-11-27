import { useEffect, useRef, useState } from 'react';
import { WAIT_GAME, newGame, stepGame } from '../waitGame.js';

// Round 203 (experimental): the waiting game, drawn over the conversation panel while a reply is on its way. The
// panel goes opaque as it comes in and back to the player's own opacity as it goes. `ready` says the reply has come:
// the game then runs out (waitGame.js) and calls `onDone` once it has faded.
const FADE_MS = 420;
const SHIP = ['...##...', '..####..', '..#..#..', '.######.', '########', '##.##.##', '#..##..#', '.##..##.'];
const INVADERS = [
  ['..#..#..', '...##...', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.'],
  ['.#....#.', '#.####.#', '########', '#.#..#.#', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],
  ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],
];
const INVADER_COLOURS = ['#9ad8e6', '#b5e7bb', '#e6a3c4'];

export const browserFrames = () => ({
  request: (callback) => globalThis.requestAnimationFrame(callback),
  cancel: (id) => globalThis.cancelAnimationFrame(id),
});

function sprite(context, rows, x, y, half, colour) {
  const cell = (half * 2) / rows.length;
  context.fillStyle = colour;
  rows.forEach((row, r) => { for (let c = 0; c < row.length; c += 1) if (row[c] === '#') context.fillRect(Math.round(x - half + c * cell), Math.round(y - half + r * cell), Math.ceil(cell), Math.ceil(cell)); });
}

function draw(context, game) {
  context.clearRect(0, 0, game.width, game.height);
  const shipLine = game.height - WAIT_GAME.shipY;
  context.fillStyle = 'rgb(255 255 255 / .12)';
  context.fillRect(0, Math.round(shipLine + WAIT_GAME.shipHalf + 3), game.width, 1);
  context.fillStyle = '#f6dc8c';
  for (const pellet of game.pellets) context.fillRect(Math.round(pellet.x - 1.5), Math.round(pellet.y - 4), 3, 8);
  for (const invader of game.invaders) sprite(context, INVADERS[invader.kind % INVADERS.length], invader.x, invader.y, WAIT_GAME.invaderHalf, INVADER_COLOURS[invader.kind % INVADER_COLOURS.length]);
  for (const burst of game.bursts) {
    const spread = 4 + burst.age * 60;
    context.fillStyle = `rgb(246 220 140 / ${Math.max(0, 1 - burst.age / 0.3)})`;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3], [0, 1.3], [-1.3, 0], [1.3, 0]]) context.fillRect(Math.round(burst.x + dx * spread - 1.5), Math.round(burst.y + dy * spread - 1.5), 3, 3);
  }
  sprite(context, SHIP, game.shipX, shipLine, WAIT_GAME.shipHalf, game.lost ? '#6c6e69' : '#e4b847');
}

export default function WaitGame({ ready, name = 'them', onDone, frames = null, random = Math.random }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [shown, setShown] = useState(false);
  const [hud, setHud] = useState({ lives: WAIT_GAME.lives, score: 0, lost: false });

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
    let game = newGame(size);
    let thumb = null; // where the thumb is, across the field
    let shownHud = { lives: game.lives, score: 0, lost: false };
    let last = null;
    let frame = null;
    let leaving = null;
    const tick = (now) => {
      frame = null;
      measure();
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      game = stepGame(game, { dt, shipX: thumb, ready: readyRef.current, random, width: size.width, height: size.height });
      thumb = null; // the figure stays where the thumb left it
      if (context) draw(context, game);
      if (game.lives !== shownHud.lives || game.score !== shownHud.score || game.lost !== shownHud.lost) {
        shownHud = { lives: game.lives, score: game.score, lost: game.lost };
        setHud(shownHud);
      }
      if (game.done) {
        setShown(false);
        leaving = setTimeout(() => doneRef.current?.({ score: game.score, lost: game.lost }), FADE_MS);
        return;
      }
      frame = clock.request(tick);
    };
    frame = clock.request((now) => { setShown(true); tick(now); });

    const place = (event) => { thumb = event.clientX - root.getBoundingClientRect().left; };
    const hold = (event) => { place(event); try { root.setPointerCapture?.(event.pointerId); } catch { /* not a live pointer */ } };
    const key = (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      thumb = (thumb ?? game.shipX) + (event.key === 'ArrowLeft' ? -28 : 28);
    };
    root.addEventListener('pointerdown', hold);
    root.addEventListener('pointermove', place);
    globalThis.addEventListener?.('keydown', key);
    return () => {
      if (frame !== null) clock.cancel(frame);
      clearTimeout(leaving);
      root.removeEventListener('pointerdown', hold);
      root.removeEventListener('pointermove', place);
      globalThis.removeEventListener?.('keydown', key);
    };
  }, []);

  const status = hud.lost
    ? `They got through. Nothing for it but to wait for ${name}.`
    : ready ? `${name} has answered. See off the last of them.` : `Waiting for ${name}. Drag left and right.`;
  return (
    <div ref={rootRef} className={`wait-game${shown ? ' shown' : ''}${hud.lost ? ' lost' : ''}`} role="group" aria-label="Waiting game">
      <canvas ref={canvasRef} className="wait-game-field" aria-hidden="true" />
      <p className="wait-game-hud">
        <span className="wait-game-lives" role="img" aria-label={`${hud.lives} ${hud.lives === 1 ? 'life' : 'lives'}`}>{'♥'.repeat(hud.lives)}<i>{'♥'.repeat(WAIT_GAME.lives - hud.lives)}</i></span>
        <span className="wait-game-score" aria-label={`${hud.score} shot down`}>{hud.score}</span>
      </p>
      <p className="wait-game-status" role="status">{status}</p>
    </div>
  );
}
