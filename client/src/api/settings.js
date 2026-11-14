// Round 114: where the web client finds its server. The Pages build takes a default server URL from VITE_API_BASE at
// build time; the settings sheet can override it and holds the access token (PARALLANG_TOKEN on the server), both in
// localStorage. An empty URL means the page's own origin (`/api`), which is what the Vite dev proxy serves; the proxy
// adds the token itself (round 105), so local development needs no settings.
export const SETTINGS_KEY = 'parallang.settings';
export const TOKEN_HEADER = 'X-ParaLLang-Token';

// Vite replaces these in the build and in tests; plain Node (the server's contract test) has no import.meta.env.
export const DEFAULT_SERVER_URL = String(import.meta.env?.VITE_API_BASE ?? '').trim();
// A production build with no server URL has no `/api` of its own (GitHub Pages serves files only). The dev server,
// the tests and plain Node use this origin's `/api`.
export const SAME_ORIGIN_API = import.meta.env?.PROD !== true;

export function browserStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function normalizeServerUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

export function loadSettings(storage = browserStorage()) {
  let stored = null;
  try { stored = JSON.parse(storage?.getItem?.(SETTINGS_KEY) ?? 'null'); } catch { stored = null; }
  const serverUrl = typeof stored?.serverUrl === 'string' ? stored.serverUrl : DEFAULT_SERVER_URL;
  const token = typeof stored?.token === 'string' ? stored.token : '';
  return { serverUrl: normalizeServerUrl(serverUrl), token: token.trim() };
}

export function saveSettings(settings, storage = browserStorage()) {
  const value = { serverUrl: normalizeServerUrl(settings.serverUrl), token: String(settings.token ?? '').trim() };
  try { storage?.setItem?.(SETTINGS_KEY, JSON.stringify(value)); } catch { /* private mode: kept for this page only */ }
  return value;
}

/** Why no request can be made with these settings, or null. */
export function settingsProblem({ serverUrl }, { sameOrigin = SAME_ORIGIN_API } = {}) {
  if (!serverUrl && !sameOrigin) return 'No server is set. Open Settings and enter the server URL and access token.';
  if (serverUrl && !/^https?:\/\/[^\s/]+/i.test(serverUrl)) return 'The server URL must start with https:// (or http:// for a local server).';
  return null;
}
