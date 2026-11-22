// Round 144: plays the built web client along The Long Way Home in headless Chromium and takes the round's pictures.
// It is the round's end-to-end check: the world map, the road from the sky, the hub, a conversation, the glide to
// the next site on rails, the map, a choice off the rails, the curriculum, and the save put back on a server that
// lost it. It fails if the road does not play.
//
//   npm run build -w client
//   node client/scripts/road-shots.mjs [outDir]
//
// What runs: an in-process server with a scripted provider (no model is called) behind a random access token, and
// Chromium with software WebGL. The page is served from client/dist by request interception under
// https://parallang.test/ParaLLang/ (a subpath, as on GitHub Pages), and its /api requests are passed to the server.
// Playwright is not a dependency of the repo; the cloud session's container has it.
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { createRuntime } from '../../server/test/helpers.js';
import { RoadProvider } from '../../server/test/road-helpers.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '148', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const SEED = Number(process.env.ROAD_SEED ?? 4242);
const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node-tools/node_modules/playwright'); } })();

// The scripted provider's narration: a line in the character's name that uses the lesson's own words, as a model
// following the teaching note would. Stand-ins written for this script: no model wrote them.
class ShotsProvider extends RoadProvider {
  narrate(messages) {
    const system = messages[0].content;
    const name = /Speak as ([^,]+),/.exec(system)?.[1] ?? 'Somebody';
    const data = JSON.parse(system.slice(system.indexOf('ACTIVE LEARNING DATA: ') + 22).split('\n')[0] || '[]');
    const words = data.flatMap((objective) => objective.targets.slice(0, 1)).slice(0, 3);
    const greeting = messages.at(-1).content.includes('"task":"greeting"');
    const first = name.split(' ')[0];
    // Round 148: asked for the language only (the slider at 100 %, the page's default), the scripted character
    // speaks Italian only. These lines are the script's own, written for the pictures: no model wrote them.
    const full = /Dialogue is entirely in /.test(system);
    this.fullLines = (this.fullLines ?? 0) + (full ? 1 : 0);
    const said = words.map((word) => `${word.target.charAt(0).toUpperCase()}${word.target.slice(1)}!`).join(' ');
    const native = greeting
      ? `${said} ${full ? 'Così si fa qui, e non lo direi se la gilda non avesse controllato. E tu, viaggiatore, che cosa dici?' : 'That is how it is done here, and I would not say so if the guild had not checked. And you, traveller, what do you say?'}`
      : full ? `Bene, bene. ${first} l'ha scritto nel registro. La strada continua, e anche tu, mi dicono.` : `Bene, bene. ${first} has written that down. The road goes on, and so, I am told, must you.`;
    const translation = greeting
      ? `${words.map((word) => `${word.meanings[0].charAt(0).toUpperCase()}${word.meanings[0].slice(1)}!`).join(' ')} That is how it is done here, and I would not say so if the guild had not checked. And you, traveller, what do you say?`
      : full ? `Good, good. ${first} has written it in the ledger. The road goes on, and so must you, I am told.` : `Good, good. ${first} has written that down. The road goes on, and so, I am told, must you.`;
    return {
      narrative: greeting ? `${first} looks up from a ledger that has clearly been waiting for you, and clears a throat with some ceremony.` : `${first} makes a mark in the ledger, blows on the ink and looks very nearly pleased.`,
      dialogue: { speaker: name, native, translation, words: [] },
      must_translate: false, difficulty: 1, hints_available: false, encounter_state: 'ongoing',
    };
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const fail = (message) => { throw new Error(message); };

async function serve(page, runtime) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    try {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        const headers = { ...request.headers() };
        for (const name of ['host', 'origin', 'referer', 'content-length']) delete headers[name];
        const reply = await fetch(`${runtime().baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers, body: request.postData() ?? undefined });
        return route.fulfill({ status: reply.status, contentType: 'application/json', body: await reply.text() });
      }
      if (!url.pathname.startsWith(BASE_PATH)) return route.fulfill({ status: 404, body: '' });
      const file = join(DIST, decodeURIComponent(url.pathname.slice(BASE_PATH.length)) || 'index.html');
      if (!file.startsWith(DIST)) return route.fulfill({ status: 403, body: '' });
      const body = await readFile(file).catch(() => null);
      if (!body) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body });
    } catch (error) {
      console.error('request failed', request.url(), error.message);
      return route.abort().catch(() => {});
    }
  });
}

const state = (page) => page.evaluate(() => {
  const s = window.__parallang.store.getState();
  const view = window.__parallangRoad;
  return {
    mode: s.mode, phase: s.phase, roadPhase: s.roadPhase, arrived: s.roadArrived, loading: s.roadLoading || s.encounterLoading || s.isLoading || s.roadTravelling,
    error: s.error, roadError: s.roadError, at: s.road?.at ?? null, step: s.road?.step ?? null, rails: s.road?.rails ?? null, current: s.road?.current?.title ?? null,
    frontier: (s.road?.frontier ?? []).map((site) => [site.id, site.offer.kind, site.recommended]), encounter: s.encounter?.state ?? null, result: s.roadResult,
    totals: s.curriculum?.totals ?? null, position: s.curriculum?.position?.unitId ?? null, savedAt: s.savedAt, connection: s.connection,
    scene: view ? { ...view.stats, camera: view.director.pose.position.map((v) => Math.round(v * 10) / 10) } : null,
  };
});

async function until(page, test, what, timeout = 40_000) {
  const started = Date.now();
  for (;;) {
    const s = await state(page);
    if (test(s)) return s;
    if (Date.now() - started > timeout) fail(`timed out waiting for ${what}: ${JSON.stringify(s)}`);
    await sleep(150);
  }
}

async function run(browser, size, content) {
  let runtime = await createRuntime({ language: 'it', content, provider: new ShotsProvider(content), serviceOptions: { seedSource: () => SEED }, saves: () => ({ kind: 'disk' }) });
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor, isMobile: size.isMobile ?? false, hasTouch: size.hasTouch ?? false });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(`[${size.name}] page error:`, error.message));
  await serve(page, () => runtime);
  await page.addInitScript(([key, token]) => { localStorage.setItem(key, JSON.stringify({ serverUrl: 'https://parallang.test', token })); }, ['parallang.settings', runtime.token]);
  const shot = async (name) => { await sleep(350); await page.screenshot({ path: join(OUT, `${name}-${size.name}.jpg`), type: 'jpeg', quality: 86 }); console.log(`  ${name}-${size.name}.jpg`); };
  // The conversation's text stays where the player scrolled it (round 140), so the script scrolls as a player does:
  // a wheel event first, which the sheet takes for the player's own scrolling.
  const toEnd = () => page.locator('.sheet-scroll').evaluate((element) => { element.dispatchEvent(new WheelEvent('wheel', { bubbles: true })); element.scrollTop = element.scrollHeight; });
  const click = async (name, role = 'button') => {
    if (await page.locator('.sheet-scroll').count()) await toEnd();
    await page.getByRole(role, { name }).first().click();
  };
  const report = [];
  try {
    await page.goto(`${ORIGIN}${BASE_PATH}`);
    await until(page, (s) => s.connection === 'ready', 'the server');
    await click('Enter');
    await shot('01-world-map');
    await click(/Set out on The Long Way Home/);
    let s = await until(page, (v) => v.mode === 'road' && v.at && !v.loading && v.scene?.chunks >= 81, 'the road and its ground');
    await until(page, (v) => v.arrived, 'the camera at the first site');
    report.push(`start ${s.at}, ${s.frontier.length} sites ahead, ${s.scene.chunks} chunks, ${s.scene.triangles} triangles`);
    if (s.scene.triangles > 64_000) fail(`${s.scene.triangles} triangles`);
    // Round 146: the weather follows the clock. The pictures hold it still: a clear late morning, unless they are
    // of the weather itself.
    const pin = async (values) => { await page.evaluate((v) => window.__parallangRoad.pinWeather(v), values); await sleep(700); };
    const sky = () => page.evaluate(() => ({ label: window.__parallangRoad.weather.label, ...window.__parallangRoad.effects }));
    await pin({ phase: 0.2 });
    await shot('02-hub');
    if (!/Morning · clear/.test(await page.locator('.weather-line').textContent())) fail('the hub does not show the weather of the level');
    // Round 147: sunrise and sunset are looked at: the camera is put with its back to the site's far side, so the
    // sun stands behind whoever waits there.
    const faceSun = () => page.evaluate(() => {
      const road = window.__parallangRoad;
      const site = road.graph.node(window.__parallang.store.getState().road.at);
      // A little to one side, so the sun stands beside the figure and not behind it.
      const [x, z] = [Math.cos(road.weather.azimuth + 0.3), -Math.sin(road.weather.azimuth + 0.3) * 0.8 + 0.25];
      road.director.stand(site, [site.x - x * 10, site.z - z * 10]);
    });
    for (const [name, values, check, toSun] of [
      ['11-golden-hour', { phase: 0.52 }, (w) => w.clouds > 5, true],
      ['12-sunset', { phase: 0.555 }, (w) => w.label.startsWith('Dusk') && w.clouds > 5, true],
      ['13-afterglow', { phase: 0.575 }, (w) => w.clouds > 5, true],
      ['14-night', { phase: 0.78 }, (w) => w.stars > 0.5 && w.fireflies > 0.5],
      ['15-before-dawn', { phase: 0.985 }, (w) => w.label.startsWith('Dawn'), true],
      ['16-sunrise', { phase: 0.005 }, (w) => w.label.startsWith('Dawn') && w.clouds > 5, true],
      ['17-cloudy-noon', { phase: 0.28, cloud: 0.6 }, (w) => w.clouds > 25],
      ['18-rain', { phase: 0.3, rain: 0.6 }, (w) => w.rain > 0.5 && w.stars === 0],
      ['19-storm-at-night', { phase: 0.8, rain: 0.95 }, (w) => w.rain > 0.9],
    ]) {
      await pin(values);
      if (toSun) { await faceSun(); await sleep(500); }
      const now = await sky();
      if (!check(now)) fail(`${name}: ${JSON.stringify(now)}`);
      await shot(name);
    }
    report.push('weather: golden hour, sunset, afterglow, night, before dawn, sunrise, a cloudy noon, rain and a storm at night shown');
    await pin({ phase: 0.2 });
    // Round 148: the slider for how much Italian the characters speak, at 100 % unless moved.
    await page.getByRole('button', { name: 'Settings' }).click();
    const slider = page.getByLabel('How much Italian the characters speak');
    if (await slider.inputValue() !== '100') fail(`the language slider starts at ${await slider.inputValue()}`);
    await slider.scrollIntoViewIfNeeded();
    await shot('21-language-slider');
    report.push('the language slider is in Settings, at 100 %');
    // The guide to the GitHub save, in Settings beside "Your save".
    await page.getByRole('button', { name: 'Guide: keep the saves on GitHub' }).click();
    await page.getByRole('region', { name: 'How to keep the saves on GitHub' }).scrollIntoViewIfNeeded();
    const store = await page.locator('.store-line').textContent();
    if (!/disk only/.test(store)) fail(`the guide does not say where the saves are: ${store}`);
    await shot('20-save-guide');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    report.push('the save guide opens in Settings and reads the server\'s save store');

    // A conversation, answered with each objective's first example, as the scripted grader passes them.
    const converse = async (label) => {
      await until(page, (v) => v.roadPhase === 'encounter' && v.encounter === 'ongoing' && !v.loading, `the conversation (${label})`);
      const answer = runtime.service.definition(runtime.service.encounters.get(await page.evaluate(() => window.__parallang.store.getState().learnerId))).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' ');
      if (label === 'first') {
        // Round 148: the line is in Italian only and its translation is under it without a hint asked for.
        if (!runtime.provider.fullLines) fail('the narrator was not asked for Italian only');
        if (!(await page.locator('.bilingual-text .translation').last().isVisible())) fail('the translation does not show with the line');
        if (await page.getByRole('button', { name: 'Translate sentence' }).count()) fail('the translation is still behind a hint');
        await shot('03-conversation');
      }
      await page.getByRole('textbox').first().fill(answer);
      if (label === 'first') await shot('04-answer');
      await page.getByRole('button', { name: /^Send/ }).first().click();
      return until(page, (v) => v.encounter === 'resolved' && !v.loading && v.current === null, `the resolve (${label})`);
    };
    await click(/^Talk to /);
    s = await converse('first');
    if (s.step !== 1 || s.result?.score !== 1) fail(`the first conversation was not recorded: ${JSON.stringify(s)}`);
    await toEnd();
    await shot('05-resolved');

    // On rails: Continue glides to the pacing's site and the next conversation opens there.
    const before = s.at;
    await click('Continue');
    await until(page, (v) => v.roadPhase === 'travel' || v.roadPhase === 'encounter', 'the glide');
    await sleep(1400);
    await shot('06-glide');
    s = await converse('second');
    if (s.at === before || s.step !== 2) fail(`the rails did not move on: ${JSON.stringify(s)}`);
    for (let n = 0; n < 2; n += 1) { await click('Continue'); s = await converse(`rails ${n + 3}`); }
    report.push(`on rails to step ${s.step}: ${JSON.stringify(s.totals)}`);

    // Off the rails: the map, a site of the player's own choosing.
    await toEnd();
    await click('Map');
    await until(page, () => true, 'the map');
    await page.waitForSelector('.road-map svg');
    await shot('07-map');
    const other = s.frontier.find(([, , recommended]) => !recommended) ?? s.frontier[0];
    await page.locator('.map-ahead').nth(s.frontier.findIndex(([id]) => id === other[0])).click();
    await shot('08-map-choice');
    await click('Walk here');
    s = await converse('chosen');
    if (s.at !== other[0]) fail(`the walk went to ${s.at}, not to ${other[0]}`);
    report.push(`off the rails to ${s.at} (${other[1]})`);
    for (let n = 0; n < 2; n += 1) { await click('Continue'); s = await converse(`more ${n}`); }

    await toEnd();
    await click('Curriculum');
    await page.waitForSelector('.curriculum-panel');
    await shot('09-curriculum');
    await click('Back to the road');
    await until(page, (v) => Boolean(v.savedAt), 'the copy of the save in the browser');

    // The server loses everything (a redeploy on the free plan). The page puts the save back from its copy.
    const lost = s;
    const old = runtime;
    runtime = await createRuntime({ language: 'it', content, provider: new ShotsProvider(content), serviceOptions: { seedSource: () => 999 }, saves: () => ({ kind: 'disk' }) });
    await old.close();
    await page.addInitScript(([key, token]) => { localStorage.setItem(key, JSON.stringify({ serverUrl: 'https://parallang.test', token })); }, ['parallang.settings', runtime.token]);
    await page.reload();
    await until(page, (v) => v.connection === 'ready', 'the new server');
    const note = await page.evaluate(() => window.__parallang.store.getState().error);
    if (!/put back from the copy/.test(note ?? '')) fail(`the save was not put back: ${note}`);
    await click('Enter');
    await click(/Set out on The Long Way Home/);
    s = await until(page, (v) => v.mode === 'road' && v.at && !v.loading, 'the road again');
    if (s.step !== lost.step || s.at !== lost.at || JSON.stringify(s.totals) !== JSON.stringify(lost.totals)) fail(`the restored road differs: ${JSON.stringify([s, lost])}`);
    await until(page, (v) => v.arrived && v.scene?.chunks >= 81, 'the ground again');
    await page.evaluate(() => window.__parallangRoad.pinWeather({ phase: 0.2 }));
    await shot('10-restored');
    report.push(`save put back after a server restart: step ${s.step}, ${JSON.stringify(s.totals)}`);
  } finally {
    await context.close();
    await runtime.close();
  }
  return report;
}

await mkdir(OUT, { recursive: true });
const content = loadGameContent({ language: 'it' });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = false;
try {
  for (const size of SIZES.filter((candidate) => !process.env.ROAD_SIZE || candidate.name === process.env.ROAD_SIZE)) {
    console.log(`${size.name}:`);
    try { for (const line of await run(browser, size, content)) console.log(`  ${line}`); }
    catch (error) { failed = true; console.error(`  FAILED: ${error.message}`); }
  }
} finally { await browser.close(); }
process.exit(failed ? 1 : 0);
