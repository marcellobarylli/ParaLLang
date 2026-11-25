import { useLayoutEffect, useRef } from 'react';

// Round 132: the grip at the top of the conversation panel. Dragged up, the panel grows to the bottom edge of the
// top bar; dragged down, only this strip is left and the temple is uncovered. `height` is the panel's height in
// pixels, or null for its own; `onHeight` takes the new one.
// Round 186: its own is the whole screen under the top bar (the owner: the text should cover the character until the
// player drags it down), kept in `--sheet-full` and measured again when the window changes size.
export const SHEET_SNAP = 28; // pixels: this near to an end, the panel goes to it
export const SHEET_STEP = 60; // pixels for an arrow key

/** The least and most the panel may be: the strip alone, and from the top bar's bottom edge to the bottom. */
export function sheetLimits(handle) {
  const sheet = handle?.closest?.('.sheet');
  const shell = handle?.closest?.('.app-shell');
  const shellRect = shell?.getBoundingClientRect?.();
  const hudBottom = shell?.querySelector?.('.hud')?.getBoundingClientRect?.().bottom ?? 0;
  const gap = sheet ? parseFloat(getComputedStyle(sheet).paddingBottom) || 0 : 0;
  const min = Math.round((handle?.getBoundingClientRect?.().height || 30) + gap);
  const screen = shellRect?.height > 0 ? shellRect.height : (typeof window !== 'undefined' ? window.innerHeight : 800);
  return { min, max: Math.max(min, Math.round(screen - Math.max(0, hudBottom - (shellRect?.top ?? 0)))) };
}

/** `wanted` inside the limits, going to an end when it is within the snap of it. */
export function settleHeight(wanted, { min, max }, snap = SHEET_SNAP) {
  if (wanted <= min + snap) return min;
  if (wanted >= max - snap) return max;
  return Math.round(wanted);
}

export default function SheetHandle({ height, onHeight }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const current = () => ref.current?.closest?.('.sheet')?.getBoundingClientRect?.().height ?? height ?? 0;
  const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));
  useLayoutEffect(() => {
    const sheet = ref.current?.closest?.('.sheet');
    if (height !== null || !sheet || typeof window === 'undefined') return undefined;
    const fit = () => sheet.style.setProperty('--sheet-full', `${sheetLimits(ref.current).max}px`);
    fit();
    window.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); sheet.style.removeProperty('--sheet-full'); };
  }, [height]);
  const down = (event) => {
    if (event.button > 0) return;
    drag.current = { y: event.clientY, from: current(), moved: false, limits: sheetLimits(ref.current) };
    ref.current?.setPointerCapture?.(event.pointerId);
  };
  const move = (event) => {
    const d = drag.current;
    if (!d) return;
    const delta = d.y - event.clientY;
    if (Math.abs(delta) > 4) d.moved = true;
    if (d.moved) onHeight(Math.round(clamp(d.from + delta, d.limits)));
  };
  const up = (event) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    ref.current?.releasePointerCapture?.(event.pointerId);
    if (d.moved) onHeight(settleHeight(clamp(d.from + (d.y - event.clientY), d.limits), d.limits));
    // A tap on the strip of a panel that is down brings the panel back.
    else if (d.from <= d.limits.min + 1) onHeight(null);
  };
  const key = (event) => {
    const limits = sheetLimits(ref.current);
    const now = current();
    const to = { ArrowUp: now + SHEET_STEP, ArrowDown: now - SHEET_STEP, Home: limits.max, End: limits.min }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    onHeight(settleHeight(clamp(to, limits), limits, 0));
  };
  return (
    <button type="button" className="sheet-handle" ref={ref} aria-label="Drag to resize the conversation. Arrow keys move it."
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <span className="sheet-grip" aria-hidden="true" />
    </button>
  );
}
