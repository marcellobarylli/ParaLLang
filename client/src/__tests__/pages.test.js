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
  for (const href of ['./manifest.webmanifest', './parallang-icon-64.png', './parallang-icon-apple-touch.png']) expect(html).toContain(`href="${href}"`);
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

// Rounds 117 and 118: opened from the home screen on iOS, the layout area ends above the screen's bottom edge and a
// fixed element is clipped to it. The document is made `100vh` high without a clip, and the panels pad by the gap.
test('the installed page is a 100vh document that does not clip, and the panels keep out of the gap', () => {
  const css = readFileSync(resolve(CLIENT_DIR, 'src/index.css'), 'utf8');
  const start = css.indexOf('@media (display-mode: standalone), (display-mode: fullscreen) {');
  expect(start).toBeGreaterThan(-1);
  const block = css.slice(start);
  expect(block).toMatch(/html, body, #root \{ height: 100vh; overflow: visible; \}/);
  expect(block).toMatch(/\.app-shell \{ position: absolute; inset: 0 0 auto 0; height: 100vh; \}/);
  // Round 117's rule (a fixed shell of 100vh) cut the bottom of the screen on the phone.
  expect(css).not.toMatch(/\.app-shell, \.sheet-backdrop \{ bottom: auto; height: 100vh; \}/);
  expect(css).toMatch(/\.sheet-backdrop \{ position: absolute; inset: 0;/);
  // The installed rules come last, after the base rules they override.
  for (const base of ['.app-shell { position: fixed; inset: 0;', 'body { margin: 0;']) expect(start).toBeGreaterThan(css.indexOf(base));
  for (const selector of ['.card {', '.caption {', '.sheet {', '.overlay {', '.settings-sheet {']) {
    const rule = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
    expect(rule, selector).toContain('var(--bottom-gap, 0px)');
  }
});

test('the build id is compiled into the page', async () => {
  const config = await import('../../vite.config.js');
  const resolved = config.default({ command: 'build', mode: 'production', isPreview: false });
  expect(JSON.parse(resolved.define.__PARALLANG_BUILD__)).toBe(config.BUILD_ID);
  const { BUILD_ID } = await import('../build.js');
  // Vitest loaded the config on its own, a moment earlier; the built page is compared with version.json in the playthrough.
  expect(BUILD_ID).toMatch(/^\d+\.\d+\.\d+\+[a-z0-9]+$/);
});

// Round 117: the PS1 menu look. Hard corners everywhere; the panels take their opacity from the player's setting.
test('the stylesheet has no rounded corner, and the panel background follows --panel-alpha', () => {
  const css = readFileSync(resolve(CLIENT_DIR, 'src/index.css'), 'utf8');
  const radii = [...css.matchAll(/border-radius:\s*([^;}]+)/g)].map((match) => match[1].trim());
  expect(radii.filter((value) => value !== '0')).toEqual([]);
  expect(css).toMatch(/--panel:[^;]*var\(--panel-alpha\)/);
  for (const selector of ['.card {', '.sheet {', '.settings-sheet {']) {
    const rule = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
    expect(rule, selector).toMatch(/background: var\(--panel/);
  }
  expect(css).toMatch(/\.settings-open \.dock \{ visibility: hidden; \}/);
  expect(css).not.toMatch(/#0d0d1a|#12111f|#19182a|#2a2940|#4a4863/i);
});

// Round 150: the icons are a snapshot of the road's map with a walk on it, written by scripts/make-icons.mjs.
// Round 164: the walk is the whole journey of 120 walks on rails, as "Show Journey so far" paints it.
test('the icon is the map with the whole journey on it, which a round mask does not cut, and every file has its size', async () => {
  const { ICON, ICON_FILES, iconScene, iconPixels, png } = await import('../../scripts/make-icons.mjs');
  const scene = iconScene();
  expect(scene.walk).toHaveLength(ICON.hops + 1);
  expect(scene.walk[0]).toBe('0,0');
  expect(scene.line).toHaveLength(ICON.hops + 1);
  // Every site of the journey is inside the picture.
  for (const [x, y] of scene.line) expect(x > 0 && x < ICON.frame && y > 0 && y < ICON.frame).toBe(true);
  // A maskable icon is safe inside a circle of 80 % of its side; the flag stands 7.6 units over the last site.
  // Round 164, amended: every icon has the maskable icon's view from further off (the owner's pick).
  expect(ICON.margin).toEqual(ICON.maskable);
  const masked = iconScene({ margin: ICON.maskable });
  const [last] = masked.line.slice(-1);
  for (const [x, y] of [...masked.line, [last[0] - 1.2, last[1] - 7.6], [last[0] + 1.2, last[1] - 7.6]]) expect(Math.hypot(x - ICON.frame / 2, y - ICON.frame / 2)).toBeLessThan(ICON.frame * 0.4);
  // The journey's line is on the picture: some of its pixels have the line's own gold, nothing mixed in.
  const pixels = iconPixels(scene, 192);
  let way = 0;
  for (let n = 0; n < pixels.length; n += 3) if (pixels[n] === 228 && pixels[n + 1] === 184 && pixels[n + 2] === 71) way += 1;
  expect(way).toBeGreaterThan(80);
  expect(png(192, pixels).readUInt32BE(16)).toBe(192);
  for (const [folder, name, size] of ICON_FILES) {
    const file = readFileSync(new URL(name, folder));
    expect([name, file.readUInt32BE(16), file.readUInt32BE(20), file[25]]).toEqual([name, size, size, 2]);
  }
});
