// Round 115: plays the built web client through the whole Ta Prohm dungeon in headless Chromium and captures each
// camera state at a phone and a desktop size. It is the round's end-to-end check and the source of
// docs/rounds/115/shots/.
//
//   npm run build -w client
//   CHROME_PATH=/path/to/chrome PUPPETEER_CORE=/path/to/node_modules/puppeteer-core node client/scripts/dungeon-shots.mjs [outDir]
//
// What runs: an in-process server with the fixture provider of the server's tests (no model is called), bound to
// 127.0.0.1 behind a random access token, and Chromium with software WebGL (SwiftShader). The page is served from
// client/dist by request interception under https://parallang.test, and its /api requests are passed to the server
// with the token the client sends from its settings. The server listens on a port: on the real-itu cluster run this
// inside a Slurm job, never on the login node. puppeteer-core is not a dependency of the repo.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime, passingAnswers } from '../../server/test/helpers.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '115', 'shots'));
const ORIGIN = 'https://parallang.test';
const SIZES = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

async function loadPuppeteer() {
  const from = process.env.PUPPETEER_CORE;
  if (!from) return (await import('puppeteer-core')).default;
  const entry = createRequire(join(resolve(from), 'package.json')).resolve(resolve(from));
  const loaded = await import(pathToFileURL(entry).href);
  const module = loaded.default ?? loaded;
  return typeof module.launch === 'function' ? module : module.default;
}

// The fixture provider narrates every encounter as Gerald, in Spanish. For the pictures each character gets a line
// of their own in the Italian pack's mix. These lines are stand-ins written for this script: no model wrote them.
const LINES = {
  Portia: {
    greeting: ['The archway unrolls a form longer than she is tall.', 'Benvenuto al mercato! State your greeting for the record, per favore.', 'Welcome to the market! State your greeting for the record, please.'],
    reply: ['A stamp falls somewhere inside the stonework.', 'Bene. The form approves. Piacere!', 'Good. The form approves. Pleased to meet you!'],
  },
  Gerald: {
    greeting: ['A tiny barista glares over a cup with union-approved suspicion.', 'Vuoi un caffè? Senza latte is the only civilised option.', 'Do you want a coffee? Without milk is the only civilised option.'],
    reply: ['Gerald consults an imaginary tasting chart and issues a verdict.', 'Bene. Your caffè will be taken seriously.', 'Good. Your coffee will be taken seriously.'],
  },
  Bambieshart: {
    greeting: ['A wanderer presses a folded brocade into your hands with great ceremony.', 'Tarnished! Ecco, a brocade for you. Bello, no?', 'Tarnished! Here, a brocade for you. Beautiful, no?'],
    reply: ['Bambieshart nods as if a prophecy had just been filed correctly.', 'Bene, bene. The road is long, amico.', 'Good, good. The road is long, friend.'],
  },
};

class ShotsProvider extends PassingProvider {
  narrate(messages) {
    const prompt = messages.at(-1).content;
    const name = Object.keys(LINES).find((candidate) => prompt.includes(`introduce ${candidate} at`) || prompt.includes(`React as ${candidate} to`)) ?? 'Gerald';
    const [narrative, native, translation] = LINES[name][prompt.includes('introduce ') ? 'greeting' : 'reply'];
    return { ...super.narrate(messages), narrative, dialogue: { speaker: name, native, translation, words: [] } };
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function serveDist(page, runtime) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN) return void request.abort();
      if (url.pathname.startsWith('/api/')) {
        const headers = { ...request.headers() };
        for (const name of ['host', 'origin', 'referer', 'content-length']) delete headers[name];
        const reply = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers, body: request.postData() });
        return void request.respond({ status: reply.status, contentType: 'application/json', body: await reply.text() });
      }
      const file = join(DIST, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
      if (!file.startsWith(DIST)) return void request.respond({ status: 403, body: '' });
      const body = await readFile(file).catch(() => null);
      if (!body) return void request.respond({ status: 404, body: '' });
      return void request.respond({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body });
    } catch (error) {
      console.error('request failed', request.url(), error.message);
      request.abort().catch(() => {});
    }
  });
}

const state = (page) => page.evaluate(() => {
  const s = window.__parallang.store.getState();
  const level = window.__parallangLevel;
  return {
    phase: s.phase, siteIndex: s.siteIndex, connection: s.connection, isLoading: s.isLoading, error: s.error, siteError: s.siteError,
    encounter: s.encounter && { id: s.encounter.encounterId, state: s.encounter.state, version: s.encounter.version },
    camera: level && { mode: level.director.mode, stage: level.director.stage, arrival: level.director.arrival, position: level.director.pose.position.map((v) => Math.round(v * 10) / 10) },
  };
});
const waitFor = (page, test, arg, timeout = 90000) => page.waitForFunction(test, { timeout, polling: 100 }, arg);
const waitPhase = (page, phase) => waitFor(page, (wanted) => window.__parallang.store.getState().phase === wanted, phase);
const waitArrived = (page, mode) => waitFor(page, (wanted) => window.__parallangLevel?.director.mode === wanted && window.__parallangLevel.director.arrived, mode);

async function clickButton(page, name) {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((element) => element.textContent.trim().startsWith(label) && !element.disabled);
    button?.click();
    return Boolean(button);
  }, name);
  if (!clicked) throw new Error(`No enabled button "${name}"`);
}

async function run(browser, runtime, size, log) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(size);
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('error', (error) => console.error('page crashed:', error.message));
  page.on('close', () => console.error('page closed'));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  await serveDist(page, runtime);
  await page.evaluateOnNewDocument((settings) => { localStorage.setItem('parallang.settings', settings); }, JSON.stringify({ serverUrl: ORIGIN, token: runtime.token }));

  const shot = async (name, { settle = 900 } = {}) => {
    await sleep(settle);
    const file = join(OUT, `${name}-${size.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    const now = await state(page);
    log.push({ shot: `${name}-${size.name}.jpg`, ...now });
    console.log('shot', `${name}-${size.name}`, JSON.stringify(now.camera), now.phase);
  };
  const answerSite = async () => {
    const { encounter } = await state(page);
    for (const answer of passingAnswers(runtime.content, encounter.id)) {
      await page.type('#player-response', answer);
      const before = (await state(page)).encounter.version;
      await clickButton(page, 'Send');
      await waitFor(page, (version) => { const s = window.__parallang.store.getState(); return !s.isLoading && (s.encounter?.version !== version || s.error); }, before);
      const after = await state(page);
      if (after.error) throw new Error(`Send failed: ${after.error}`);
    }
    if ((await state(page)).encounter.state !== 'resolved') throw new Error(`${encounter.id} did not resolve`);
  };
  const walk = async (label, name, fractions) => {
    await clickButton(page, label);
    await waitFor(page, () => window.__parallangLevel.director.mode === 'walk');
    const { camera } = await state(page);
    let waited = 0;
    for (const [index, fraction] of fractions.entries()) {
      const at = camera.arrival * fraction * 1000;
      await sleep(Math.max(0, at - waited));
      waited = at;
      await shot(`${name}${fractions.length > 1 ? `-${index + 1}` : ''}`, { settle: 0 });
    }
    await waitPhase(page, 'encounter');
  };

  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().connection === 'ready');
  await shot('1-attract', { settle: 3000 });

  await clickButton(page, 'Enter');
  await waitArrived(page, 'overview');
  await shot('2-overview', { settle: 2600 }); // the site labels fade in after the camera settles

  await clickButton(page, 'Start');
  await waitPhase(page, 'encounter');
  await shot('3-approach', { settle: 1800 }); // the sheet is up and the camera has slid to the free area
  await answerSite();
  await shot('3-approach-resolved');

  await walk('Walk on to', '4-walk', [0.3, 0.62, 0.86]);
  await shot('5-site-2', { settle: 1800 });
  await answerSite();
  await walk('Walk on to', '6-walk-2', [0.6]);
  await shot('7-site-3', { settle: 1800 });
  await answerSite();

  await clickButton(page, 'Leave the temple');
  await waitArrived(page, 'victory');
  await shot('8-victory', { settle: 1500 });

  // A reload on a finished run stays on the victory screen; a new run returns to the route.
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().phase === 'victory');
  await clickButton(page, 'Play again');
  await waitPhase(page, 'overview');

  // Not part of a normal run: where a reload in the middle of a run lands (an approach to sites 2 and 3).
  for (const index of [1, 2]) {
    await page.evaluate((site) => { const level = window.__parallangLevel; level.setPhase({ phase: 'approach', siteIndex: site }); level.director.skip(); }, index);
    await shot(`9-resume-site-${index + 1}`, { settle: 1200 });
  }
  await context.close();
  return problems;
}

const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new ShotsProvider(content) });
const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  dumpio: process.env.SHOTS_DEBUG === '1',
  // In a batch job the login session's D-Bus address is stale, and Chromium aborts when that bus drops.
  env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' },
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
let failed = false;
try {
  await mkdir(OUT, { recursive: true });
  const log = [];
  for (const size of SIZES) {
    const started = Date.now();
    const problems = await run(browser, runtime, size, log);
    console.log(`${size.name}: played the dungeon in ${((Date.now() - started) / 1000).toFixed(1)} s, ${problems.length} page problems`);
    for (const problem of problems) console.error(' ', problem);
    failed ||= problems.length > 0;
  }
  await writeFile(join(OUT, 'shots.json'), `${JSON.stringify(log, null, 1)}\n`);
} catch (error) {
  failed = true;
  console.error('FAILED', error);
} finally {
  await browser.close();
  await runtime.close();
}
process.exit(failed ? 1 : 0);
