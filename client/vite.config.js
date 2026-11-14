import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devProxy } from './proxy.config.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Round 114: unique per build; written to version.json so a deploy can be identified from the site.
export const BUILD_ID = `${pkg.version}+${Date.now().toString(36)}`;

export function versionFile(build = BUILD_ID) {
  return {
    name: 'parallang-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, build }) });
    },
  };
}

// Round 105: only the dev server gets the proxy (review 1.3): a bad token in the environment must not stop
// `vite build` or the client's tests (vitest runs in mode "test"). Round 108 (review R1.1): `vite preview` also
// resolves with command "serve" and falls back to `server.proxy`, so it is excluded by `isPreview`. Whoever can reach
// the dev server reaches the API with the token's access: keep it on localhost (Vite's default, no `--host`).
// Round 114: a relative base, so the build works on GitHub Pages (/ParaLLang/) and any other host (DJ_Graphyla's setup).
export default defineConfig(({ command, mode, isPreview }) => ({
  base: './',
  plugins: [react(), versionFile()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: command === 'serve' && !isPreview && mode !== 'test' ? { proxy: devProxy() } : {},
}));
