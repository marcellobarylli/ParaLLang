// Round 115: plays the built web client through the whole Ta Prohm dungeon in headless Chromium and captures each
// camera state at a phone and a desktop size. It is the round's end-to-end check and the source of
// docs/rounds/115/shots/ and docs/rounds/116/shots/. Round 116: it also asserts that the gameplay and the camera move
// together (no dialogue while the camera travels, a step in for each closed objective, a turn to the way on at a
// resolve), and fails if they do not.
//
//   npm run build -w client
//   CHROME_PATH=/path/to/chrome PUPPETEER_CORE=/path/to/node_modules/puppeteer-core node client/scripts/dungeon-shots.mjs [outDir]
//
// What runs: an in-process server with the fixture provider of the server's tests (no model is called), bound to
// 127.0.0.1 behind a random access token, and Chromium with software WebGL (SwiftShader). The page is served from
// client/dist by request interception under https://parallang.test/ParaLLang/ (a subpath, as on GitHub Pages), and
// its /api requests are passed to the server
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
const BASE_PATH = '/ParaLLang/'; // the page is served under a subpath, as on GitHub Pages
const EXTRA = process.env.SHOTS_EXTRA === '1'; // also the in-between and debugging pictures
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
      if (!url.pathname.startsWith(BASE_PATH)) return void request.respond({ status: 404, body: '' });
      const relative = decodeURIComponent(url.pathname.slice(BASE_PATH.length)) || 'index.html';
      const file = join(DIST, relative);
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
    closedObjectives: s.closedObjectives, beat: s.beat, sheet: Boolean(document.querySelector('.sheet')), caption: document.querySelector('.caption')?.textContent ?? null,
    camera: level && (() => {
      const { director } = level;
      const pose = director.pose;
      const site = s.dungeon.sites[s.siteIndex].at;
      const round = (v) => Math.round(v * 100) / 100;
      return {
        mode: director.mode, stage: director.stage, site: director.site, arrival: director.arrival, position: pose.position.map(round), target: pose.target.map(round),
        toSite: round(Math.hypot(pose.position[0] - site[0], pose.position[2] - site[1])), targetToSite: round(Math.hypot(pose.target[0] - site[0], pose.target[2] - site[1])),
      };
    })(),
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
    await page.screenshot({ path: file, type: 'jpeg', quality: 72 });
    const now = await state(page);
    log.push({ shot: `${name}-${size.name}.jpg`, ...now });
    console.log('shot', `${name}-${size.name}`, JSON.stringify(now.camera), now.phase);
  };
  // Round 116: the coupling of gameplay and camera, asserted in the real browser.
  const check = (ok, message) => { if (!ok) { problems.push(`coupling: ${message}`); console.error('COUPLING FAILED:', message); } };
  // The dialogue is open at site `index`: the camera must be holding there, looking at the site.
  const arrivedAt = async (index) => {
    const now = await state(page);
    check(now.sheet, `site ${index + 1}: the dialogue sheet is open`);
    check(now.camera.stage === 'hold' && now.camera.site === index, `site ${index + 1}: the camera holds at the site (${now.camera.mode}/${now.camera.stage}, site ${now.camera.site})`);
    check(now.camera.toSite < (index === 0 ? 10.5 : 4.5), `site ${index + 1}: the camera stands by the site (${now.camera.toSite} m)`);
    check(now.camera.targetToSite < 0.5, `site ${index + 1}: the camera looks at the site (${now.camera.targetToSite} m off)`);
    check(now.closedObjectives === 0, `site ${index + 1}: the conversation starts with nothing closed`);
  };
  const answerSite = async () => {
    const start = await state(page);
    const index = start.siteIndex;
    let previous = start;
    for (const answer of passingAnswers(runtime.content, start.encounter.id)) {
      await page.type('#player-response', answer);
      await clickButton(page, 'Send');
      await waitFor(page, (version) => { const s = window.__parallang.store.getState(); return !s.isLoading && (s.encounter?.version !== version || s.error); }, previous.encounter.version);
      await sleep(2600); // the step in eases over about two seconds
      const after = await state(page);
      if (after.error) throw new Error(`Send failed: ${after.error}`);
      check(after.beat?.id === (previous.beat?.id ?? 0) + 1, `site ${index + 1}: the verdict is numbered (${JSON.stringify(after.beat)})`);
      if (after.closedObjectives > previous.closedObjectives) check(after.camera.toSite < previous.camera.toSite - 0.2, `site ${index + 1}: a closed objective steps the camera in (${previous.camera.toSite} to ${after.camera.toSite} m)`);
      previous = after;
    }
    const end = await state(page);
    if (end.encounter.state !== 'resolved') throw new Error(`${start.encounter.id} did not resolve`);
    check(end.camera.toSite < start.camera.toSite * 0.8 && end.camera.toSite > 2, `site ${index + 1}: resolved, the camera has stepped in (${start.camera.toSite} to ${end.camera.toSite} m)`);
    check(end.camera.targetToSite > 3, `site ${index + 1}: resolved, the camera has turned to the way on (${end.camera.targetToSite} m off the site)`);
    check(end.camera.mode !== 'victory' && end.phase === 'encounter', `site ${index + 1}: the walk waits for the player`);
  };
  const walk = async (label, name, fractions) => {
    const before = await state(page);
    await clickButton(page, label);
    await waitFor(page, () => window.__parallangLevel.director.mode === 'walk');
    const { camera, sheet } = await state(page);
    check(!sheet, 'the dialogue sheet closes when the walk starts');
    check(Math.hypot(...camera.position.map((v, i) => v - before.camera.position[i])) < 1.5, `the walk starts where the camera stood (${before.camera.position} to ${camera.position})`);
    let waited = 0;
    for (const [index, fraction] of fractions.entries()) {
      const at = camera.arrival * fraction * 1000;
      await sleep(Math.max(0, at - waited));
      waited = at;
      const now = await state(page);
      check(now.phase === 'walk' && !now.sheet && /^Walking to /.test(now.caption ?? ''), `no dialogue while the camera walks (${now.phase}, sheet ${now.sheet}, caption ${now.caption})`);
      await shot(`${name}${fractions.length > 1 ? `-${index + 1}` : ''}`, { settle: 0 });
    }
    await waitPhase(page, 'encounter');
  };

  await page.goto(`${ORIGIN}${BASE_PATH}`, { waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().connection === 'ready');
  await shot('1-attract', { settle: 3000 });

  await clickButton(page, 'Enter');
  await waitArrived(page, 'overview');
  await shot('2-overview', { settle: 2600 }); // the site labels fade in after the camera settles
  // Round 117: the installed page (display-mode: standalone) fills the window, and the dock sits on its bottom edge.
  // Chrome 131 cannot emulate display-mode, so the built stylesheet's installed rule is applied without its condition.
  if (size.name === 'phone') {
    const layout = await page.evaluate(() => {
      const media = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).find((rule) => rule instanceof CSSMediaRule && rule.conditionText.includes('display-mode: standalone'));
      const style = document.createElement('style');
      style.textContent = media ? [...media.cssRules].map((rule) => rule.cssText).join('\n') : '';
      document.head.append(style);
      const rect = (selector) => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, height: r.height } : null; };
      const shell = getComputedStyle(document.querySelector('.app-shell'));
      const result = { rule: style.textContent, bottom: shell.bottom, shell: rect('.app-shell'), dock: rect('.dock'), window: innerHeight };
      style.remove();
      return result;
    });
    console.log('installed layout', JSON.stringify(layout));
    check(/\.app-shell/.test(layout.rule) && /height: 100vh/.test(layout.rule), `the built stylesheet has the installed rule (${layout.rule})`);
    check(layout.shell && Math.abs(layout.shell.top) < 0.5 && Math.abs(layout.shell.height - layout.window) < 0.5, `installed: the shell fills the window (${JSON.stringify(layout.shell)} of ${layout.window})`);
    check(layout.dock && Math.abs(layout.dock.bottom - layout.window) < 0.5, `installed: the dock sits on the bottom edge (${JSON.stringify(layout.dock)} of ${layout.window})`);
  }

  await clickButton(page, 'Start');
  await waitFor(page, () => window.__parallangLevel.director.mode === 'approach');
  const descending = await state(page);
  check(!descending.sheet && descending.camera.stage === 'transition', `no dialogue while the camera comes down (${descending.camera.stage}, sheet ${descending.sheet})`);
  await waitPhase(page, 'encounter');
  await arrivedAt(0);
  await shot('3-approach', { settle: 1800 }); // the sheet is up and the camera has slid to the free area
  await answerSite();
  await shot('3-resolved', { settle: 600 }); // stepped in, turned to the gate, the beacon released

  await walk('Walk on to', '4-walk', EXTRA ? [0.3, 0.62, 0.86] : [0.3, 0.62]); // through the gopura, then the gate tree
  await arrivedAt(1);
  await shot('5-site-2', { settle: 1800 });
  await answerSite();
  await walk('Walk on to', 'x-walk-to-site-3', EXTRA ? [0.6] : []);
  await arrivedAt(2);
  await shot('6-site-3', { settle: 1800 });
  await answerSite();
  await shot('6-resolved', { settle: 600 }); // turned up to the sanctuary

  await clickButton(page, 'Leave the temple');
  await waitArrived(page, 'victory');
  await shot('7-victory', { settle: 1500 });

  // A reload on a finished run stays on the victory screen; a new run returns to the route.
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().phase === 'victory');
  await clickButton(page, 'Play again');
  await waitPhase(page, 'overview');

  // Not part of a normal run: where a reload in the middle of a run lands (an approach to sites 2 and 3).
  for (const index of EXTRA ? [1, 2] : []) {
    await page.evaluate((site) => { const level = window.__parallangLevel; level.setPhase({ phase: 'approach', siteIndex: site }); level.director.skip(); }, index);
    await shot(`x-resume-site-${index + 1}`, { settle: 1200 });
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
