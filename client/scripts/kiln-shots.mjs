// Round 132: opens the built web client in headless Chromium, goes from the title to the world map, into The Kiln,
// down to its first site and on to the second, then back out and into Ta Prohm, and takes the round's pictures
// (docs/rounds/132/shots/). It fails if The Kiln does not open its own level, or if the level does not change back.
//
//   npm run build -w client
//   node client/scripts/kiln-shots.mjs [outDir]
//
// What runs: an in-process server with the passing provider of the server's tests (no model is called), bound to
// 127.0.0.1 behind a random access token, and Chromium with software WebGL (SwiftShader). The page is served from
// client/dist by request interception under a subpath, as on GitHub Pages. Needs Playwright with Chromium
// (dungeon-shots.mjs, the full playthrough, uses puppeteer-core).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime, passingAnswers } from '../../server/test/helpers.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '132', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { return require(join(process.env.PLAYWRIGHT_DIR ?? '/usr/lib/node_modules', 'playwright')); }
}

const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });
const problems = [];

try {
  for (const size of SIZES) {
    const { name, ...options } = size;
    const context = await browser.newContext(options);
    await context.addInitScript((settings) => { localStorage.setItem('parallang.settings', settings); }, JSON.stringify({ serverUrl: ORIGIN, token: runtime.token }));
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push(`${name}: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') problems.push(`${name}: ${message.text()}`); });
    await page.route(`${ORIGIN}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = Object.fromEntries(Object.entries(request.headers()).filter(([key]) => ['content-type', 'x-learner-id', 'x-parallang-token'].includes(key)));
        const reply = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers, body: request.postData() ?? undefined });
        return route.fulfill({ status: reply.status, contentType: 'application/json', body: await reply.text() });
      }
      if (!url.pathname.startsWith(BASE_PATH)) return route.fulfill({ status: 404, body: 'not found' });
      const file = url.pathname === BASE_PATH ? 'index.html' : url.pathname.slice(BASE_PATH.length);
      try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); }
      catch { return route.fulfill({ status: 404, body: 'not found' }); }
    });

    const shot = async (label) => { await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, `${label}-${name}.jpg`), type: 'jpeg', quality: 85 }); console.log('wrote', `${label}-${name}.jpg`); };
    const level = () => page.evaluate(() => ({ name: window.__parallangLevel?.world?.name ?? null, preset: window.__parallangLevel?.world?.preset ?? null, mode: window.__parallangLevel?.director?.mode ?? null, arrived: window.__parallangLevel?.director?.arrived ?? null }));
    const levelIs = async (expected) => { await page.waitForFunction((wanted) => window.__parallangLevel?.world?.name === wanted, expected, { timeout: 30000 }); };
    const arrived = async (mode) => { await page.waitForFunction((wanted) => window.__parallangLevel?.director?.mode === wanted && window.__parallangLevel?.director?.arrived, mode, { timeout: 60000 }); };
    const click = (label) => page.getByRole('button', { name: label, exact: true }).click();

    await page.goto(`${ORIGIN}${BASE_PATH}`);
    await levelIs('ta-prohm');
    await page.getByText(/answer in Italian/).waitFor();
    await click('Enter');
    await page.getByRole('region', { name: 'The world map' }).waitFor();
    await page.getByText('0 of 7 cleared').nth(1).waitFor(); // both open places have their count
    await shot('01-world-map');

    // Into The Kiln: another level under the same screen.
    await click('Enter The Kiln');
    await page.getByRole('heading', { name: 'The Kiln' }).waitFor();
    await levelIs('the-kiln');
    assert.deepEqual(await level().then(({ name: n, preset }) => [n, preset]), ['the-kiln', 'ember']);
    await arrived('overview');
    // The level, the markers and the seven figures together stay inside the style's budget, as in Ta Prohm.
    const triangles = await page.evaluate(() => window.__parallangLevel.sceneTriangles);
    assert.ok(triangles.total <= 64000, `the scene holds ${JSON.stringify(triangles)} triangles`);
    console.log('triangles', JSON.stringify(triangles));
    await page.waitForTimeout(1500);
    await shot('02-kiln-map');

    // Down to The Ash Gate, where Portia stands.
    await click('Start');
    await page.getByRole('textbox', { name: 'Your response' }).waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    await shot('03-ash-gate');
    for (const answer of passingAnswers(content, 'market_entrance_tutorial')) {
      await page.getByRole('textbox', { name: 'Your response' }).fill(answer);
      await click('Send');
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 });
      await page.waitForTimeout(600);
    }
    // On through the gopura to The Charred Buttress.
    const onward = page.getByRole('button', { name: /^Walk to The Charred Buttress/ });
    await onward.waitFor({ timeout: 30000 });
    await onward.click();
    await page.waitForTimeout(5000);
    await shot('04-walk');
    await page.getByRole('textbox', { name: 'Your response' }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(1200);
    await shot('05-charred-buttress');

    // A reload opens the place last entered.
    await page.reload();
    await levelIs('the-kiln');
    await page.getByRole('textbox', { name: 'Your response' }).waitFor({ timeout: 90000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('parallang.placeId')), 'the_kiln');

    // Out to the world and into Ta Prohm: the jungle is back, with its own run.
    await click('Leave');
    await click('Map');
    await click('World map');
    await page.getByText('1 of 7 cleared').waitFor();
    await shot('06-world-map-from-kiln');
    await click('Enter Ta Prohm');
    await page.getByRole('heading', { name: 'Ta Prohm' }).waitFor();
    await levelIs('ta-prohm');
    assert.deepEqual(await level().then(({ name: n, preset }) => [n, preset]), ['ta-prohm', 'jungle']);
    await arrived('overview');
    await page.getByLabel('0 of 7 sites cleared').waitFor();
    await page.waitForTimeout(1500);
    await shot('07-ta-prohm-map');
    await context.close();
  }
} finally {
  await browser.close();
  await runtime.close();
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('The Kiln opens, plays and gives way to Ta Prohm again at both sizes.');
