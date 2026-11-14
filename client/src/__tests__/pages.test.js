// @vitest-environment node
// Round 114: the GitHub Pages build. A relative base (the site lives under /ParaLLang/), a version.json, and a manifest
// whose icons exist, linked from index.html by relative paths.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import viteConfig, { versionFile } from '../../vite.config.js';

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
