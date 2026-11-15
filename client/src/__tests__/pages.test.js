// @vitest-environment node
// Round 114: the GitHub Pages build. A relative base (the site lives under /ParaLLang/), a version.json, and a manifest
// whose icons exist, linked from index.html by relative paths.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { searchForWorkspaceRoot } from 'vite';
import viteConfig, { versionFile, yamlData } from '../../vite.config.js';

const CLIENT_DIR = resolve(import.meta.dirname, '..', '..');

test('the build uses a relative base and writes version.json', () => {
  expect(viteConfig({ command: 'build', mode: 'production', isPreview: false }).base).toBe('./');
  const emitFile = vi.fn();
  const plugin = versionFile('0.1.0+test');
  expect(plugin.apply).toBe('build');
  plugin.generateBundle.call({ emitFile });
  const [asset] = emitFile.mock.calls[0];
  expect(asset.fileName).toBe('version.json');
  expect(JSON.parse(asset.source)).toEqual({ version: '0.1.0', build: '0.1.0+test' });
});

test('the manifest installs to the home screen with icons that exist', () => {
  const manifest = JSON.parse(readFileSync(resolve(CLIENT_DIR, 'public/manifest.webmanifest'), 'utf8'));
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect(existsSync(resolve(CLIENT_DIR, 'public', icon.src)), icon.src).toBe(true);
  const html = readFileSync(resolve(CLIENT_DIR, 'index.html'), 'utf8');
  for (const href of ['./manifest.webmanifest', './parallang-icon.svg', './parallang-icon-apple-touch.png']) expect(html).toContain(`href="${href}"`);
  expect(existsSync(resolve(CLIENT_DIR, 'public/parallang-icon-apple-touch.png'))).toBe(true);
  expect(html).toContain('viewport-fit=cover');
});

// Round 115: src/dungeon.js imports content/world/dungeons/ta_prohm.yaml, which lies outside client/.
test('a content YAML file is imported as data, and the dev server may read the repository root', () => {
  const plugin = yamlData();
  expect(plugin.transform('id: ta_prohm\nroute:\n  - [0, 96]\n', '/repo/content/world/dungeons/ta_prohm.yaml').code).toBe('export default {"id":"ta_prohm","route":[[0,96]]};');
  expect(plugin.transform('a: 1', '/repo/content/x.yml?import').code).toBe('export default {"a":1};');
  expect(plugin.transform('export default 1', '/repo/client/src/dungeon.js')).toBeNull();
  // Vite's dev server serves files under the workspace root it finds from client/ (server.fs.allow's default).
  const root = resolve(CLIENT_DIR, '..');
  expect(searchForWorkspaceRoot(CLIENT_DIR)).toBe(root);
  expect(existsSync(resolve(root, 'content/world/dungeons/ta_prohm.yaml'))).toBe(true);
});

// Round 115 (review 1, R1.1): the Dockerfile copied aesthetic/package.json while .dockerignore kept all of aesthetic/
// out of the build context, which fails every image build. Each COPY source must reach the context.
test('everything the Dockerfile copies is in the Docker build context', () => {
  const root = resolve(CLIENT_DIR, '..');
  const rules = readFileSync(resolve(root, '.dockerignore'), 'utf8').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  // Enough of .dockerignore for this file's rules: a name or path, `dir/*`, a leading `**/`, and `!` exceptions; the last match wins.
  const matches = (pattern, path) => {
    if (pattern.startsWith('**/')) return path.split('/').includes(pattern.slice(3));
    if (pattern.endsWith('/*')) return path.startsWith(pattern.slice(0, -1)) && path.length > pattern.length - 1;
    if (pattern.startsWith('*.')) return path.endsWith(pattern.slice(1));
    return path === pattern || path.startsWith(`${pattern}/`);
  };
  const ignored = (path) => rules.reduce((out, rule) => (rule.startsWith('!') ? (matches(rule.slice(1), path) ? false : out) : (matches(rule, path) ? true : out)), false);
  const sources = readFileSync(resolve(root, 'Dockerfile'), 'utf8').split('\n').filter((line) => line.startsWith('COPY ')).flatMap((line) => line.split(/\s+/).slice(1, -1));
  expect(sources).toContain('aesthetic/package.json');
  for (const source of sources) {
    expect(existsSync(resolve(root, source)), source).toBe(true);
    expect(ignored(source), `${source} is excluded by .dockerignore`).toBe(false);
  }
  expect(ignored('aesthetic/src/index.js')).toBe(true);
  expect(ignored('client/src/App.jsx')).toBe(true);
  expect(ignored('server/node_modules/express/index.js')).toBe(true);
});

// Round 117: opened from the home screen on iOS, `position: fixed; inset: 0` ends above the screen's bottom edge.
test('the installed page sizes the shell and the settings backdrop by the viewport unit', () => {
  const css = readFileSync(resolve(CLIENT_DIR, 'src/index.css'), 'utf8');
  const rule = css.match(/@media \(display-mode: standalone\)[^{]*\{\s*([^{]+)\{([^}]+)\}/);
  expect(rule, 'a display-mode: standalone rule').not.toBeNull();
  expect(rule[1]).toContain('.app-shell');
  expect(rule[1]).toContain('.sheet-backdrop');
  expect(rule[2]).toMatch(/bottom:\s*auto/);
  expect(rule[2]).toMatch(/height:\s*100vh/);
  // It must come after both base rules, whose `inset: 0` would otherwise put `bottom` back.
  for (const base of ['.app-shell { position: fixed; inset: 0;', '.sheet-backdrop { position: fixed; inset: 0;']) {
    expect(css.indexOf(base), base).toBeGreaterThan(-1);
    expect(css.indexOf(rule[0])).toBeGreaterThan(css.indexOf(base));
  }
});
