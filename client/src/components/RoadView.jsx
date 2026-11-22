import { useEffect, useRef, useState } from 'react';

// Round 144: the endless level behind The Journey 2. The three.js host (src/scene/roadView.js) loads as its own
// chunk, as the dungeon's does. Without WebGL (an old browser, the jsdom tests) a still backdrop stands in and the
// camera "arrives" at once, so the road stays playable.
const hasWebGL = () => typeof window !== 'undefined' && Boolean(window.WebGL2RenderingContext || window.WebGLRenderingContext);
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

export default function RoadView({ road, shown, arrival, from, talking, insets, onArrive, onThunder = null, closed = 0, resolved = false, beat = null }) {
  const canvasRef = useRef(null);
  const viewRef = useRef(null);
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  const thunderRef = useRef(onThunder);
  thunderRef.current = onThunder;
  const seed = road?.seed ?? null;
  const [status, setStatus] = useState(() => (hasWebGL() ? 'loading' : 'unavailable'));

  // One view per landscape: a new road (another seed) is another level, on a new canvas.
  useEffect(() => {
    if (!hasWebGL() || seed === null) return undefined;
    let cancelled = false;
    let view = null;
    setStatus('loading');
    import('../scene/roadView.js').then(({ createRoadView }) => {
      if (cancelled) return;
      view = createRoadView(canvasRef.current, { seed, reducedMotion: prefersReducedMotion(), onArrive: (mode) => arriveRef.current?.(mode), onThunder: () => thunderRef.current?.() });
      viewRef.current = view;
      if (typeof window !== 'undefined') window.__parallangRoad = view; // for the screenshot script and the console
      setStatus('ready');
    }).catch((error) => {
      console.warn('The 3D road could not start:', error);
      if (!cancelled) setStatus('unavailable');
    });
    return () => {
      cancelled = true;
      viewRef.current = null;
      view?.dispose();
    };
  }, [seed]);

  // The markers follow the server's view of the road.
  useEffect(() => { if (status === 'ready' && road) viewRef.current?.setRoad(road); }, [status, road]);
  // Each camera move the store asks for is taken once (`shown` counts them).
  useEffect(() => {
    if (!road) return;
    if (status === 'ready') viewRef.current?.show({ at: road.at, from, mode: arrival });
    else if (status === 'unavailable') arriveRef.current?.(arrival);
  }, [status, shown, seed]);
  useEffect(() => { if (status === 'ready') viewRef.current?.setTalking(talking); }, [status, talking]);
  useEffect(() => {
    if (status === 'ready' && talking) viewRef.current?.setEncounter({ closed, resolved, beatId: beat?.id ?? null, beatKind: beat?.kind ?? null });
  }, [status, talking, closed, resolved, beat]);
  useEffect(() => { if (status === 'ready' && insets) viewRef.current?.setInsets(insets); }, [status, insets]);

  return (
    <div className={`level level-${status}`} aria-hidden="true">
      <canvas key={seed ?? 'none'} ref={canvasRef} className="level-canvas" />
      {status === 'unavailable' && <div className="level-backdrop road-backdrop" />}
    </div>
  );
}
