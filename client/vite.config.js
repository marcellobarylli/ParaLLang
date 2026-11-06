import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devProxy } from './proxy.config.js';

// Round 105: only the dev server gets the proxy (review 1.3): a bad token in the environment must not stop
// `vite build` or the client's tests (vitest runs in mode "test"). Round 108 (review R1.1): `vite preview` also
// resolves with command "serve" and falls back to `server.proxy`, so it is excluded by `isPreview`. Whoever can reach
// the dev server reaches the API with the token's access: keep it on localhost (Vite's default, no `--host`).
export default defineConfig(({ command, mode, isPreview }) => ({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: command === 'serve' && !isPreview && mode !== 'test' ? { proxy: devProxy() } : {},
}));
