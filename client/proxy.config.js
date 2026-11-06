// Round 105: the dev proxy to the ParaLLang server. It runs in Node, so it can add the server's optional
// PARALLANG_TOKEN as X-ParaLLang-Token without the token ever reaching the browser or the client's code.
// The environment is read as the server reads it (review 1.1-1.2): the process environment first, then the root
// .env through plain dotenv (no `$` expansion, no .env.<mode> files). The value follows the app's rules (round 040):
// trimmed, blank means none, and one outside \x21-\x7e stops Vite with a message that never shows it. The target
// follows PORT, as server/server.js does.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_ENV_PATH = resolve(ROOT_DIR, '.env');
export const TOKEN_HEADER = 'X-ParaLLang-Token';

export function proxyFor(env = {}) {
  const token = String(env.PARALLANG_TOKEN ?? '').trim();
  if (token && !/^[\x21-\x7e]+$/.test(token)) {
    throw new Error('PARALLANG_TOKEN holds characters a header cannot carry (spaces or control characters); the web client\'s proxy cannot send it.');
  }
  const port = String(env.PORT ?? '').trim() || '3001';
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(`PORT must be a port number from 1 to 65535 for the web client's proxy (got "${port}").`);
  }
  return {
    '/api': {
      target: `http://127.0.0.1:${port}`,
      changeOrigin: true,
      // Review 1.8: set, not added, so a header the browser might send never doubles the proxy's.
      ...(token ? { configure: (proxy) => proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader(TOKEN_HEADER, token)) } : {}),
    },
  };
}

export function serverEnv({ env = process.env, path = ROOT_ENV_PATH } = {}) {
  const merged = { ...env };
  dotenv.config({ path, processEnv: merged, override: false, quiet: true });
  return merged;
}

export function devProxy(options) {
  return proxyFor(serverEnv(options));
}
