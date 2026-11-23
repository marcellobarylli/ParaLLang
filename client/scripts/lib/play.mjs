// Round 154: what the headless checks of rounds 154 on share. Opens the built client in headless Chromium
// (Playwright, software WebGL) against the real server code with a scripted provider: no model is called.
//
//   const game = await openGame({ provider: (content) => new SomeProvider(content), out: 'docs/rounds/NNN/shots' });
//   await game.page...; game.check(ok, 'what was checked'); await game.shot('01-name'); await game.done();
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../../server/src/content-loader.js';
import { createRuntime } from '../../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

export const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };
export const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

export async function openGame({ provider, out, language = 'it', display = {}, device = PHONE, serviceOptions = {}, before = null }) {
  const problems = [];
  const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };
  const content = loadGameContent({ language });
  const runtime = await createRuntime({ language, content, provider: provider(content), serviceOptions });
  // `before(runtime, content)` may play on the server first; a learner id it returns is the browser's learner.
  const learnerId = before ? await before(runtime, content) : null;
  const outDir = resolve(ROOT, out);
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ ...device, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  const sent = []; // every POST body, with its path
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 503, body: '' });
    if (url.pathname.startsWith('/api/')) {
      if (request.method() === 'POST') sent.push({ path: url.pathname, body: JSON.parse(request.postData() ?? '{}') });
      const answer = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
      return route.fulfill({ status: answer.status, contentType: answer.headers.get('content-type') ?? 'application/json', body: await answer.text() });
    }
    const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
    try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
  });
  // The server's address and token; no music and no voices unless the check asks for them.
  await page.addInitScript(([settings, shown, learner]) => {
    localStorage.setItem('parallang.settings', settings);
    if (!localStorage.getItem('parallang.display')) localStorage.setItem('parallang.display', shown);
    if (learner && !localStorage.getItem('parallang.learnerId')) localStorage.setItem('parallang.learnerId', learner);
  }, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token }), JSON.stringify({ music: false, voices: false, ...display }), learnerId]);
  const tap = (locator, options) => (device.hasTouch ? locator.tap(options) : locator.click(options));
  const game = {
    page, runtime, content, sent, check, problems, tap,
    dialogues: () => sent.filter((entry) => entry.path === '/api/encounter/dialogue').map((entry) => entry.body),
    shot: (name) => page.screenshot({ path: join(outDir, `${name}.jpg`), type: 'jpeg', quality: 82 }),
    open: () => page.goto(`${ORIGIN}${BASE_PATH}`),
    // From the title to the first conversation of Ta Prohm (Portia).
    async toPortia() {
      await game.open();
      // Round 173: the title is the road's; the other places are in its menu.
      await tap(page.getByRole('button', { name: /^Menu/ }), { timeout: 60000 });
      await tap(page.getByRole('button', { name: /^Other places/ }));
      await tap(page.getByRole('button', { name: 'Enter Ta Prohm' }));
      await tap(page.getByRole('button', { name: 'Start', exact: true }));
      await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
    },
    // From the title to the first site of the road.
    async toRoad() {
      await game.open();
      await tap(page.getByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }), { timeout: 60000 }); // round 173
      await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 60000 });
    },
    // Brings a thing in the conversation's text into view as the player's own scrolling would (the sheet puts any
    // other scroll back, round 140).
    async reveal(locator) {
      await locator.evaluate((element) => {
        const scroll = element.closest('.sheet-scroll');
        scroll?.dispatchEvent(new Event('wheel'));
        if (scroll) scroll.scrollTop += element.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 48;
        scroll?.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(150);
    },
    async say(text) {
      await page.getByRole('textbox', { name: 'Your response' }).fill(text);
      await tap(page.getByRole('button', { name: 'Send' }));
    },
    // Runs the check's steps; whatever happens, the browser and the server are closed and the result is the exit code.
    async run(steps) {
      try { await steps(game); }
      catch (error) {
        problems.push(`the check stopped: ${error.message}`);
        console.error(error);
        await game.shot('x-stopped').catch(() => {});
      } finally {
        await browser.close();
        await runtime.close();
      }
      for (const problem of problems) console.error('problem:', problem);
      console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
      process.exit(problems.length ? 1 : 0);
    },
  };
  return game;
}
