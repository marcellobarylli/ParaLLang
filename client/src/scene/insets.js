// Round 115: which part of the screen the interface covers, so the camera frames the rest. Pure.
//
// The dock is the panel of the current phase: a bottom sheet on a phone, a side panel on a wide screen, a small
// caption while the camera travels. A panel as tall as the screen covers its side; any other covers the bottom.

/** The dock's rectangle (as getBoundingClientRect gives it) as insets of a `width` x `height` screen. */
export function dockInsets(rect, width, height, top = 0) {
  const insets = { top, right: 0, bottom: 0, left: 0 };
  if (!rect || rect.width <= 0 || rect.height <= 0 || width <= 0 || height <= 0) return insets;
  const fullHeight = rect.height >= height * 0.9;
  if (fullHeight && rect.width < width * 0.75) {
    if (rect.left + rect.width / 2 > width / 2) insets.right = Math.max(0, width - rect.left);
    else insets.left = Math.max(0, rect.right);
  } else if (!fullHeight) {
    insets.bottom = Math.max(0, height - rect.top);
  }
  return insets;
}

/** The free area inside the insets, never less than 30% of the screen either way. */
export function freeRect(insets, width, height) {
  const freeWidth = Math.max(width * 0.3, width - insets.left - insets.right);
  const freeHeight = Math.max(height * 0.3, height - insets.top - insets.bottom);
  const left = Math.min(insets.left, width - freeWidth);
  const top = Math.min(insets.top, height - freeHeight);
  return { width: freeWidth, height: freeHeight, centreX: left + freeWidth / 2, centreY: top + freeHeight / 2 };
}
