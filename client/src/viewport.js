// Round 118: the page opened from the iPhone's home screen. There iOS lays the page out in an area that is short of
// the screen by the status bar's inset, while `100vh` is the whole screen. The stylesheet makes the document `100vh`
// high in that mode; this module measures the difference and hands it to the stylesheet as --bottom-gap, which the
// panels add to their bottom padding. So content stays inside the area that is known to be visible.
import { BUILD_ID } from './build.js';

/** How far `100vh` reaches below the layout area, in px. 0 in a browser tab and where the numbers make no sense. */
export function bottomGap({ unitHeight, layoutHeight, installed }) {
  if (!installed || !(unitHeight > 0) || !(layoutHeight > 0)) return 0;
  const gap = Math.round(unitHeight - layoutHeight);
  return gap > 0 && gap <= unitHeight * 0.2 ? gap : 0;
}

export function isInstalled(win = globalThis.window) {
  if (!win) return false;
  try {
    if (win.navigator?.standalone === true) return true;
    return ['standalone', 'fullscreen'].some((mode) => win.matchMedia?.(`(display-mode: ${mode})`)?.matches === true);
  } catch { return false; }
}

/** What the browser reports about its viewport. Settings shows it, so a screenshot carries it. */
export function measureViewport(win = globalThis.window) {
  const doc = win?.document;
  if (!doc?.documentElement) return { installed: false, window: [0, 0], layoutHeight: 0, unitHeight: 0, screen: [0, 0], gap: 0 };
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none';
  doc.documentElement.append(probe);
  const unitHeight = probe.getBoundingClientRect().height;
  probe.remove();
  const installed = isInstalled(win);
  const layoutHeight = doc.documentElement.clientHeight || win.innerHeight || 0;
  return {
    installed, window: [win.innerWidth ?? 0, win.innerHeight ?? 0], layoutHeight, unitHeight: Math.round(unitHeight),
    screen: [win.screen?.width ?? 0, win.screen?.height ?? 0], gap: bottomGap({ unitHeight, layoutHeight, installed }),
  };
}

export function describeViewport(view, build = BUILD_ID) {
  return `Build ${build} · ${view.installed ? 'installed' : 'browser tab'} · window ${view.window.join('×')} · layout ${view.layoutHeight} · 100vh ${view.unitHeight} · screen ${view.screen.join('×')} · gap ${view.gap}`;
}

/** Keeps --bottom-gap on the root element current. Returns a function that stops it. */
export function watchBottomGap(win = globalThis.window) {
  if (!win?.document?.documentElement) return () => {};
  const apply = () => win.document.documentElement.style.setProperty('--bottom-gap', `${measureViewport(win).gap}px`);
  apply();
  win.addEventListener('resize', apply);
  win.addEventListener('orientationchange', apply);
  return () => { win.removeEventListener('resize', apply); win.removeEventListener('orientationchange', apply); };
}

/** The build the site serves now, or null when that cannot be read (development, offline). */
export async function latestBuild(win = globalThis.window, fetchImpl = globalThis.fetch) {
  if (import.meta.env?.PROD !== true || !win?.document || typeof fetchImpl !== 'function') return null;
  try {
    const url = new URL('version.json', win.document.baseURI);
    url.searchParams.set('t', Date.now().toString(36));
    const response = await fetchImpl(url, { cache: 'no-store' });
    const data = response.ok ? await response.json() : null;
    return typeof data?.build === 'string' ? data.build : null;
  } catch { return null; }
}

/** Loads the page again past the browser's cache. The storage is per origin, so the settings stay. */
export function reloadPage(win = globalThis.window) {
  const url = new URL(win.location.href);
  url.searchParams.set('reload', Date.now().toString(36));
  win.location.replace(url.toString());
}
