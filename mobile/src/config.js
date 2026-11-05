// The Simulator shares the Mac's network, so the local server is reachable at 127.0.0.1.
// Expo inlines EXPO_PUBLIC_* variables at bundle time; restart `expo start` after changing it.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
// Round 040: the server's optional PARALLANG_TOKEN, sent as X-ParaLLang-Token when set. EXPO_PUBLIC_ values are
// bundled into the app: fine for a local Simulator session, not a secret in a shipped build. Keep the exact
// `process.env.EXPO_PUBLIC_PARALLANG_TOKEN` form: Expo inlines only that (critique 1.6). Ends are trimmed on both
// sides (critique 1.2); a value that is not a valid header value is reported by the API, never shown (critique 1.1).
export const API_TOKEN = (process.env.EXPO_PUBLIC_PARALLANG_TOKEN || '').trim() || null;
export const validToken = (token) => /^[\x21-\x7e]+$/.test(token);
