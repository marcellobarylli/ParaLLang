import { useEffect, useRef, useState } from 'react';
import { PULL_EVENT, buckleShare, createPullEvent, hopSeconds } from '../pullEvent.js';
import { paintMap } from '../roadMap.js';

// Round 213 (issue #23): the world event of a pull, on the whole screen with nothing else on it: the map from far
// off, the web of every way growing outward in faint grey as it is generated, the journey so far in black, one walk
// at a time, and then the land sinking at the sites of the journey (pullEvent.js says what is shown; this draws it).
// Nothing is shown until the land before and after the pull is worked out. When it is over a single button leads on.
//
// Two canvases: the map's picture, small and shown large as the map always is, painted again each frame while the
// land sinks; and over it, at the screen's own sharpness, the lines. Web that is whole and does not move is drawn
// once onto a sheet of its own, so a frame draws only what grows or sinks.

const smooth = (value) => { const u = Math.min(1, Math.max(0, value)); return u * u * (3 - 2 * u); };
const context2d = (canvas) => { try { return canvas?.getContext?.('2d') ?? null; } catch { return null; } };

export default function PullEvent({ road, walk = null, onDone }) {
  const rootRef = useRef(null);
  const pictureRef = useRef(null);
  const overlayRef = useRef(null);
  const [stage, setStage] = useState('playing'); // 'playing' | 'done'
  const [leaving, setLeaving] = useState(false);
  const number = road?.event?.number ?? null;

  useEffect(() => {
    const pull = road?.event?.pull;
    const [root, picture, overlay] = [rootRef.current, pictureRef.current, overlayRef.current];
    const [paint, draw] = [context2d(picture), context2d(overlay)];
    // No canvas (an old browser, the tests' jsdom): there is nothing to watch, and the way on is offered at once.
    if (!pull || !root || !paint || !draw) { setStage('done'); return undefined; }
    let raf = 0;
    let timer = 0;
    let stopped = false;
    const hook = { phase: 'preparing', share: 0, made: 0, total: 0, speed: 1 };
    if (typeof window !== 'undefined') window.__parallangPull = hook; // for the check script and the console

    function begin() {
      const [width, height] = [Math.max(1, root.clientWidth), Math.max(1, root.clientHeight)];
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
      const columns = Math.min(PULL_EVENT.columns.most, Math.max(PULL_EVENT.columns.least, Math.round(width / PULL_EVENT.columns.pixels)));
      // The journey as the server keeps it; without it, the sites the pulls name, in their order.
      const ids = walk?.length ? walk : [...(road.pulled ?? []).flatMap((entry) => entry.sites), ...pull.sites];
      const event = createPullEvent({ seed: road.seed, pulled: road.pulled ?? [], pull, walk: ids, at: road.at, aspect: height / width, columns });
      const { view, prepared, wave } = event;
      Object.assign(picture, { width: prepared.width, height: prepared.height });
      Object.assign(overlay, { width: Math.round(width * ratio), height: Math.round(height * ratio) });
      const image = paint.createImageData(prepared.width, prepared.height);
      const show = (share) => { paintMap(prepared, share, image); paint.putImageData(image, 0, 0); };
      show(0);
      // Where a point of the world is on the overlay: the view's own projection, as plain numbers.
      const [origin, east, south, up] = [view.place(0, 0, 0), view.place(1, 0, 0), view.place(0, 1, 0), view.place(0, 0, 1)];
      const [kx, ky] = [overlay.width / view.width, overlay.height / view.height];
      let share = 0;
      const px = (p) => (origin[0] + p[0] * (east[0] - origin[0]) + p[1] * (south[0] - origin[0])) * kx;
      const py = (p) => (origin[1] + p[0] * (east[1] - origin[1]) + p[1] * (south[1] - origin[1]) + (p[2] + share * p[3]) * (up[1] - origin[1])) * ky;
      // The web's sheet: what is whole and will not move.
      const sheet = Object.assign(document.createElement('canvas'), { width: overlay.width, height: overlay.height });
      const settled = context2d(sheet);
      const line = Math.max(1, 1.05 * ratio);
      const dot = 1.5 * ratio;
      const trace = (target, points, upTo = 1) => {
        const last = (points.length - 1) * Math.min(1, upTo);
        if (points.length < 2 || last <= 0) return;
        target.moveTo(px(points[0]), py(points[0]));
        for (let n = 1; n <= Math.floor(last); n += 1) target.lineTo(px(points[n]), py(points[n]));
        const part = last - Math.floor(last);
        if (part > 0) {
          const [a, b] = [points[Math.floor(last)], points[Math.floor(last) + 1]];
          target.lineTo(px(a) + (px(b) - px(a)) * part, py(a) + (py(b) - py(a)) * part);
        }
      };
      // A path stroked as the web is: the grey thread on its darker, wider, fainter one.
      const thread = (target) => {
        target.lineCap = 'round';
        target.lineJoin = 'round';
        target.strokeStyle = PULL_EVENT.under;
        target.lineWidth = line * 2.6;
        target.stroke();
        target.strokeStyle = PULL_EVENT.grey;
        target.lineWidth = line;
        target.stroke();
      };
      const speck = (target, point, radius) => {
        target.beginPath();
        target.arc(px(point), py(point), radius * 1.7, 0, Math.PI * 2);
        target.fillStyle = PULL_EVENT.under;
        target.fill();
        target.beginPath();
        target.arc(px(point), py(point), radius, 0, Math.PI * 2);
        target.fillStyle = PULL_EVENT.grey;
        target.fill();
      };
      const whole = (target, items) => {
        target.beginPath();
        for (const item of items) for (const way of item.ways) trace(target, way.points);
        thread(target);
        for (const item of items) if (item.site) speck(target, item.site.point, dot);
      };
      const { web } = PULL_EVENT;
      const triedSeconds = web.tried * 10;
      const grownAfter = triedSeconds + Math.max(web.fadeOut, web.way + web.grow);
      let growing = []; // the web's items still appearing: { ...item, born, moves }
      const moving = []; // whole, and sinking with the land
      const hops = event.journey;
      const hopTime = hopSeconds(hops.length);
      const journeySeconds = hops.length ? hops.length * hopTime : 0.8;
      let phase = 'dark';
      let since = 0; // seconds into the phase
      let clock = 0;
      let walked = 0; // seconds of the journey drawn
      hook.total = wave.total;
      const enter = (next) => { phase = next; since = 0; hook.phase = next; };
      enter('dark');

      function drawWeb() {
        draw.drawImage(sheet, 0, 0);
        if (moving.length) whole(draw, moving);
        if (!growing.length) return;
        for (const item of growing) {
          const age = clock - item.born;
          // The points tried, one after another; the one chosen stays.
          item.tried.forEach((point, k) => {
            const shown = age - k * web.tried;
            if (shown <= 0) return;
            const chosen = k === item.chosen;
            const alpha = chosen ? Math.min(1, shown / 0.2) : Math.min(1, shown / 0.12) * (1 - smooth((age - triedSeconds) / web.fadeOut)) * 0.75;
            if (alpha <= 0.01) return;
            draw.globalAlpha = alpha;
            speck(draw, point, chosen ? dot : dot * 0.62);
          });
          for (const way of item.ways) {
            const grown = (age - web.way) / web.grow;
            if (grown <= 0) continue;
            draw.globalAlpha = Math.min(1, 0.35 + grown);
            draw.beginPath();
            trace(draw, way.points, smooth(grown));
            thread(draw);
          }
        }
        draw.globalAlpha = 1;
      }

      function drawJourney() {
        if (phase === 'dark' || phase === 'fade' || phase === 'still' || phase === 'web' || phase === 'rest') return;
        const done = hopTime > 0 ? Math.min(hops.length, walked / hopTime) : 0;
        const full = Math.floor(done);
        draw.strokeStyle = PULL_EVENT.black;
        draw.fillStyle = PULL_EVENT.black;
        draw.lineWidth = 2.5 * ratio;
        draw.lineCap = 'round';
        draw.lineJoin = 'round';
        draw.beginPath();
        for (let n = 0; n < full; n += 1) trace(draw, hops[n].points);
        if (full < hops.length) trace(draw, hops[full].points, done - full);
        draw.stroke();
        // A mark at each site walked to, the start first.
        const marks = [hops.length ? hops[0].points[0] : event.here, ...hops.slice(0, full).map((hop) => hop.points.at(-1))];
        draw.beginPath();
        for (const mark of marks) { draw.moveTo(px(mark) + 2.6 * ratio, py(mark)); draw.arc(px(mark), py(mark), 2.6 * ratio, 0, Math.PI * 2); }
        draw.fill();
        // Where the player stands, once the journey has come to it.
        if (full >= hops.length) {
          draw.lineWidth = 1.6 * ratio;
          draw.beginPath();
          draw.arc(px(event.here), py(event.here), 6.5 * ratio, 0, Math.PI * 2);
          draw.stroke();
        }
      }

      function step(dt) {
        clock += dt;
        since += dt;
        if (phase === 'dark' && since >= PULL_EVENT.dark) enter('fade');
        else if (phase === 'fade') { picture.style.opacity = String(smooth(since / PULL_EVENT.fade)); if (since >= PULL_EVENT.fade) enter('still'); }
        else if (phase === 'still' && since >= PULL_EVENT.still) enter('web');
        else if (phase === 'web') {
          // The wave: as far as its time allows, and no further than the browser generates in a frame's share.
          const radius = wave.reach * (since / web.seconds) + 60;
          const deadline = performance.now() + web.budget;
          for (const item of wave.advance(radius, { until: () => performance.now() > deadline })) {
            const moves = [item.site?.point, ...item.ways.flatMap((way) => way.points)].some((point) => point && point[3] !== 0);
            growing.push({ ...item, born: clock, moves });
          }
          hook.made = wave.made;
          // What has finished appearing goes to the sheet, or, if it will sink, to the list drawn each frame.
          const finished = growing.filter((item) => clock - item.born >= grownAfter);
          if (finished.length) {
            growing = growing.filter((item) => clock - item.born < grownAfter);
            whole(settled, finished.filter((item) => !item.moves));
            moving.push(...finished.filter((item) => item.moves));
          }
          if (wave.done && !growing.length) enter('rest');
        } else if (phase === 'rest' && since >= PULL_EVENT.rest) enter('journey');
        else if (phase === 'journey') { walked = since; if (since >= journeySeconds) { walked = journeySeconds; enter('breath'); } }
        else if (phase === 'breath' && since >= PULL_EVENT.breath) enter('buckle');
        else if (phase === 'buckle') {
          share = since >= PULL_EVENT.buckle ? 1 : buckleShare(since);
          show(share);
          if (since >= PULL_EVENT.buckle) enter('after');
        } else if (phase === 'after' && since >= PULL_EVENT.after) { enter('done'); setStage('done'); }
        hook.share = share;
        draw.clearRect(0, 0, overlay.width, overlay.height);
        drawWeb();
        drawJourney();
      }

      let last = null;
      const frame = (now) => {
        if (stopped) return;
        raf = requestAnimationFrame(frame);
        const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1) * (Number(hook.speed) > 0 ? Number(hook.speed) : 1);
        last = now;
        // At a high speed (the check script's) a frame is taken in steps, so no phase is jumped over.
        for (let left = dt; left > 0 && phase !== 'done'; left -= 0.1) step(Math.min(0.1, left));
        if (dt === 0 && phase !== 'done') step(0);
      };
      raf = requestAnimationFrame(frame);
    }

    // The screen goes dark first; the land is worked out behind it.
    timer = setTimeout(() => { if (!stopped) begin(); }, 80);
    return () => {
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      if (typeof window !== 'undefined' && window.__parallangPull === hook) delete window.__parallangPull;
    };
    // The event is one pull of one land: it is not begun again while it plays.
  }, [number, road?.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // The way on: the screen goes dark, then the road is told the event was watched.
  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onDone?.(), 650);
  };

  return (
    <div ref={rootRef} className={`pull-event${leaving ? ' leaving' : ''}`} role="dialog" aria-modal="true" aria-label="The land is pulled">
      <canvas ref={pictureRef} className="pull-picture" aria-hidden="true" />
      <canvas ref={overlayRef} className="pull-overlay" aria-hidden="true" />
      <p className="sr-only" role="status">
        {stage === 'done'
          ? 'The land has sunk at every site of your journey.'
          : 'The map draws back. Every way of the land shows itself in grey, spreading outward from where you stand; your journey is drawn over it in black; then the land sinks along it.'}
      </p>
      {stage === 'done' && <button type="button" className="primary-button big-button pull-continue" onClick={leave} disabled={leaving} autoFocus>Continue</button>}
    </div>
  );
}
