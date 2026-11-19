import { useEffect, useRef, useState } from 'react';
import { createTilt, requestTiltPermission, screenAngle, tiltNeedsAsking } from '../scene/tilt.js';

// Round 115: the level behind the dungeon screen. The three.js host (src/scene/levelView.js) loads as its own chunk
// after the first paint. Without WebGL (an old browser, the jsdom tests) a still backdrop stands in, and the camera
// "arrives" at once, so the game stays playable.
// Round 125: with `tilt` on, the phone's orientation turns the camera's look at a site (scene/tilt.js).
// Round 119: the labels are the numbers of the sites out of the fog; the current site also shows its name.
const MOVING = new Set(['approach', 'walk']);
const hasWebGL = () => typeof window !== 'undefined' && Boolean(window.WebGL2RenderingContext || window.WebGLRenderingContext);
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

export default function DungeonView({ dungeon, phase, siteIndex, walkFrom, sites = {}, insets, onArrive, closed = 0, resolved = false, beat = null, tilt = false }) {
  const canvasRef = useRef(null);
  const viewRef = useRef(null);
  const labelRefs = useRef([]);
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  const [status, setStatus] = useState(() => (hasWebGL() ? 'loading' : 'unavailable'));

  useEffect(() => {
    if (!hasWebGL()) return undefined;
    let cancelled = false;
    let view = null;
    import('../scene/levelView.js').then(({ createLevelView }) => {
      if (cancelled) return;
      view = createLevelView(canvasRef.current, { dungeon, reducedMotion: prefersReducedMotion(), onArrive: (mode) => arriveRef.current?.(mode) });
      view.setLabels(labelRefs.current);
      viewRef.current = view;
      if (typeof window !== 'undefined') window.__parallangLevel = view; // for the screenshot script and the console
      setStatus('ready');
    }).catch((error) => {
      console.warn('The 3D level could not start:', error);
      if (!cancelled) setStatus('unavailable');
    });
    return () => {
      cancelled = true;
      viewRef.current = null;
      view?.dispose();
    };
  }, [dungeon.id, dungeon.level]);

  useEffect(() => {
    if (status === 'ready') viewRef.current?.setPhase({ phase, siteIndex, walkFrom });
    else if (status === 'unavailable' && MOVING.has(phase)) arriveRef.current?.(phase);
  }, [status, phase, siteIndex, walkFrom]);

  // Round 116: the conversation moves the camera at its site. After the phase effect, so a new site starts unshaped.
  useEffect(() => {
    if (status === 'ready' && phase === 'encounter') viewRef.current?.setEncounter({ closed, resolved, beatId: beat?.id ?? null, beatKind: beat?.kind ?? null });
  }, [status, phase, siteIndex, closed, resolved, beat]);

  // Round 125: tilt to look. iOS Safari sends orientation events only after the page has asked from inside a tap:
  // Settings asks when the box is ticked, and on a later visit the first click anywhere asks.
  useEffect(() => {
    if (status !== 'ready' || !tilt || typeof window === 'undefined') return undefined;
    const source = createTilt();
    const onOrientation = (event) => source.orient(event, screenAngle(window), event.timeStamp / 1000);
    const listen = () => { window.removeEventListener('deviceorientation', onOrientation); window.addEventListener('deviceorientation', onOrientation); };
    const ask = () => { requestTiltPermission(window).then((answer) => { if (answer === 'granted') listen(); }); };
    listen();
    if (tiltNeedsAsking(window)) window.addEventListener('click', ask, { once: true, capture: true });
    viewRef.current?.setLook(source);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('click', ask, { capture: true });
      viewRef.current?.setLook(null);
    };
  }, [status, tilt]);

  useEffect(() => { if (status === 'ready' && insets) viewRef.current?.setInsets(insets); }, [status, insets]);
  // Round 119: the fog. A hidden site has a dark patch over it, no ribbon and no label.
  useEffect(() => { if (status === 'ready') viewRef.current?.setProgress(sites); }, [status, sites]);

  return (
    <div className={`level level-${status}`} aria-hidden="true">
      <canvas ref={canvasRef} className="level-canvas" />
      {status === 'unavailable' && <div className="level-backdrop" />}
      {status === 'ready' && (
        <div className={`site-labels${phase === 'overview' ? ' shown' : ''}`}>
          {dungeon.sites.map((site, index) => {
            const state = sites[site.id]?.state ?? 'hidden';
            return (
              <div className={`site-label site-${state}${sites[site.id]?.cleared ? ' cleared' : ''}`} key={site.id} hidden={state === 'hidden'} ref={(element) => { labelRefs.current[index] = element; }}>
                <span className="site-number">{index + 1}</span>
                {state === 'current' && <span className="site-name">{site.name}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
