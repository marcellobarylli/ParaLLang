// @vitest-environment node
// Round 105: the dev proxy adds PARALLANG_TOKEN server-side; the page and the client's code never hold it.
import { createServer as createHttpServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import { EventEmitter } from 'node:events';
import { createServer, loadConfigFromFile } from 'vite';
import { devProxy, proxyFor, ROOT_DIR, serverEnv } from '../../proxy.config.js';

const CLIENT_DIR = resolve(ROOT_DIR, 'client');
const saved = { PARALLANG_TOKEN: process.env.PARALLANG_TOKEN, PORT: process.env.PORT };
const cleanups = [];
afterEach(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  while (cleanups.length) await cleanups.pop()();
});

function sentBy(entry) {
  const proxy = new EventEmitter();
  entry.configure?.(proxy, entry);
  const headers = {};
  proxy.emit('proxyReq', { setHeader: (name, value) => { headers[name] = value; } });
  return headers;
}

test('proxyFor: default target, PORT, trimmed token, blank means none, bad values are not shown', () => {
  expect(proxyFor({})).toEqual({ '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } });
  expect(proxyFor({ PORT: '4100' })['/api'].target).toBe('http://127.0.0.1:4100');
  expect(sentBy(proxyFor({ PARALLANG_TOKEN: '  abc  ' })['/api'])).toEqual({ 'X-ParaLLang-Token': 'abc' });
  expect(sentBy(proxyFor({ PARALLANG_TOKEN: '   ' })['/api'])).toEqual({});
  expect(() => proxyFor({ PARALLANG_TOKEN: 'two words' })).toThrow(/cannot carry/);
  expect(() => proxyFor({ PARALLANG_TOKEN: 'two words' })).not.toThrow(/two words/);
  for (const port of ['3001; rm', '0', '65536', '99999']) expect(() => proxyFor({ PORT: port })).toThrow(/1 to 65535/);
  expect(proxyFor({ PORT: '65535' })['/api'].target).toBe('http://127.0.0.1:65535');
});

test('serverEnv reads the root .env as the server does: no $ expansion, no .env.<mode>, the environment wins', () => {
  const dir = mkdtempSync(join(tmpdir(), 'parallang-env-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, '.env'), 'PARALLANG_TOKEN=ab$cd\nPORT=4200\n');
  writeFileSync(join(dir, '.env.development'), 'PARALLANG_TOKEN=other\n');
  const path = join(dir, '.env');
  expect(serverEnv({ env: {}, path })).toMatchObject({ PARALLANG_TOKEN: 'ab$cd', PORT: '4200' });
  expect(sentBy(devProxy({ env: {}, path })['/api'])).toEqual({ 'X-ParaLLang-Token': 'ab$cd' });
  expect(devProxy({ env: { PARALLANG_TOKEN: 'from-env' }, path })['/api'].target).toBe('http://127.0.0.1:4200');
  expect(sentBy(devProxy({ env: { PARALLANG_TOKEN: 'from-env' }, path })['/api'])).toEqual({ 'X-ParaLLang-Token': 'from-env' });
  // Set but empty wins over the file, as for the server.
  expect(sentBy(devProxy({ env: { PARALLANG_TOKEN: '' }, path })['/api'])).toEqual({});
});

test('a bad token stops only the dev server: build and test modes load the config', async () => {
  process.env.PARALLANG_TOKEN = 'two words';
  const configFile = resolve(CLIENT_DIR, 'vite.config.js');
  for (const [command, mode] of [['build', 'production'], ['serve', 'test']]) {
    const loaded = await loadConfigFromFile({ command, mode }, configFile, CLIENT_DIR, 'silent');
    expect(loaded.config.server).toEqual({});
  }
  await expect(loadConfigFromFile({ command: 'serve', mode: 'development' }, configFile, CLIENT_DIR, 'silent')).rejects.toThrow(/cannot carry/);
});

async function listen(server) {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  cleanups.push(() => new Promise((done) => { server.close(done); server.closeAllConnections(); }));
  return server.address().port;
}

async function viteInFront(token) {
  const seen = [];
  const upstream = createHttpServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, token: req.headers['x-parallang-token'], body });
      res.setHeader('Content-Type', 'application/json');
      res.end('{"status":"ok"}');
    });
  });
  process.env.PORT = String(await listen(upstream));
  // Review 1.4: empty, not deleted, so a developer's root .env cannot put a token back.
  process.env.PARALLANG_TOKEN = token || '';
  const vite = await createServer({
    root: CLIENT_DIR,
    configFile: resolve(CLIENT_DIR, 'vite.config.js'),
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, watch: null },
  });
  await vite.listen();
  cleanups.push(async () => { vite.httpServer.closeAllConnections(); await vite.close(); });
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  return { seen, base };
}

test('a real Vite dev server sends the token upstream and keeps it out of the page and the client code', async () => {
  const token = randomBytes(16).toString('hex');
  const { seen, base } = await viteInFront(token);
  const reply = await fetch(`${base}/api/health`);
  expect(await reply.json()).toEqual({ status: 'ok' });
  await fetch(`${base}/api/world`, { headers: { 'X-ParaLLang-Token': 'from-the-browser' } });
  await fetch(`${base}/api/encounter/dialogue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":"ciao"}' });
  expect(seen).toEqual([
    { method: 'GET', url: '/api/health', token, body: '' },
    { method: 'GET', url: '/api/world', token, body: '' },
    { method: 'POST', url: '/api/encounter/dialogue', token, body: '{"text":"ciao"}' },
  ]);
  for (const path of ['/', '/src/api/learning.js', '/src/stores/gameStore.js', '/@vite/env']) {
    const body = await (await fetch(`${base}${path}`)).text();
    expect(body.length).toBeGreaterThan(0);
    expect(body).not.toContain(token);
  }
}, 30000);

test('without a token the proxy sends no header', async () => {
  const { seen, base } = await viteInFront(null);
  await fetch(`${base}/api/world`);
  expect(seen).toEqual([{ method: 'GET', url: '/api/world', token: undefined, body: '' }]);
}, 30000);
