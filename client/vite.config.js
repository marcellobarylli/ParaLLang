import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devProxy } from './proxy.config.js';

// Round 105: only the dev server gets the proxy (review 1.3): a bad token in the environment must not stop
// `vite build` or the client's tests (vitest runs in mode "test").
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: command === 'serve' && mode !== 'test' ? { proxy: devProxy() } : {},
}));
