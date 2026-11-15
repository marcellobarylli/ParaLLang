import { useEffect, useRef, useState } from 'react';

// Round 115: the level behind the dungeon screen. The three.js host (src/scene/levelView.js) loads as its own chunk
// after the first paint. Without WebGL (an old browser, the jsdom tests) a still backdrop stands in, and the camera
// "arrives" at once, so the game stays playable.
// Round 119: the labels are the numbers of the sites out of the fog; the current site also shows its name.
const MOVING = new Set(['approach', 'walk']);
const hasWebGL = () => typeof window !== 'undefined' && Boolean(window.WebGL2RenderingContext || window.WebGLRenderingContext);
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

export default function DungeonView({ dungeon, phase, siteIndex, walkFrom, sites = {}, insets, onArrive, closed = 0, resolved = false, beat = null }) {
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
