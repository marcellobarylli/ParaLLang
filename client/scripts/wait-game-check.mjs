// Round 203, changed in round 227: the waiting game in a real browser. Plays the built client's first conversation in
// headless Chromium (Playwright, software WebGL) against the real server code with a scripted grader (no model is
// called); the server's reply to an answer is held back for some seconds, as a model's would be. Three runs, each a
// new player: the default (the meditation) and the "While you wait" dropdown in Settings, Space Invaders chosen and
// played, and Space Invaders lost (one life). Checks the screen and takes pictures.
//
//   npm run build -w client
//   node client/scripts/wait-game-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime } from '../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '227', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ANSWER = 'Buongiorno! Mi chiamo Luigione. Come ti chiami?';

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const content = loadGameContent({ language: 'it' });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

/** One new player up to the first conversation, an answer sent, and `during(page, reply)` while the reply is held back. */
async function play(name, { display, delay }, during) {
  const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`${name}: page error: ${error.message}`));
  const reply = { arrived: false };
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 503, body: '' });
    if (url.pathname.startsWith('/api/')) {
      const answer = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
      const body = await answer.text();
      if (url.pathname === '/api/encounter/dialogue') { await sleep(delay); reply.arrived = true; }
      return route.fulfill({ status: answer.status, contentType: answer.headers.get('content-type') ?? 'application/json', body });
    }
    const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
    try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await page.addInitScript(([settings, shown]) => {
    localStorage.setItem('parallang.settings', settings);
    if (!localStorage.getItem('parallang.welcomed')) localStorage.setItem('parallang.welcomed', '1');
    if (!localStorage.getItem('parallang.display')) localStorage.setItem('parallang.display', shown);
  }, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token }), JSON.stringify({ music: false, voices: false, strict: true, ...display })]);
  const shot = (label) => page.screenshot({ path: join(OUT, `${name}-${label}.jpg`), type: 'jpeg', quality: 82 });
  try {
    await page.goto(`${ORIGIN}${BASE_PATH}`);
    await page.getByRole('button', { name: /^Menu/ }).tap({ timeout: 60000 }); // round 175: the other places are in the title's menu
    await page.getByRole('button', { name: /^Other places/ }).tap();
    await page.getByRole('button', { name: 'Enter Ta Prohm' }).tap();
    await page.getByRole('button', { name: 'Start', exact: true }).tap();
    await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
    await page.getByRole('textbox', { name: 'Your response' }).fill(ANSWER);
    await page.getByRole('button', { name: 'Send' }).tap();
    await during(page, reply, shot);
  } catch (error) {
    problems.push(`${name}: the check stopped: ${error.message}`);
    console.error(error);
    await shot('x-stopped').catch(() => {});
  } finally {
    await context.close();
    await runtime.close();
  }
}

const verdict = (page) => page.locator('.assessment-banner');
const game = (page) => page.getByRole('group', { name: 'Waiting game' });
const opacity = (page) => game(page).evaluate((node) => Number(getComputedStyle(node).opacity));
const panelAlpha = (page) => page.locator('.app-shell').evaluate((node) => getComputedStyle(node).getPropertyValue('--panel-alpha').trim());
/** The thumb across the game, as a touch: down at the first x, then along the others. */
async function drag(page, xs, y, pause = 60) {
  const session = await page.context().newCDPSession(page);
  const touch = (type, x) => session.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', xs[0]);
  for (const x of xs.slice(1)) { await sleep(pause); await touch('touchMove', x); }
  await touch('touchEnd');
  await session.detach();
}

const breathing = (page) => page.getByRole('group', { name: 'Breathing' });
const openWaitSetting = async (page) => {
  await page.getByRole('button', { name: /^Menu/ }).tap();
  await page.getByRole('navigation', { name: 'Game menu' }).getByRole('button', { name: 'Settings' }).tap();
  await page.getByText('Display and controls', { exact: true }).tap();
  const select = page.getByLabel('While you wait');
  await select.scrollIntoViewIfNeeded();
  return select;
};

// 1. The default is the meditation; Settings has the dropdown, and Space Invaders can be chosen there.
await play('default', { display: { breathing: true }, delay: 4000 }, async (page, reply, shot) => {
  await page.getByRole('button', { name: 'Begin' }).tap({ timeout: 8000 }); // the first time, a few words come first (round 214)
  await breathing(page).waitFor({ timeout: 5000 });
  check(await game(page).count() === 0, 'default: the meditation is played, not the game');
  await shot('01-meditation');
  await verdict(page).waitFor({ timeout: 60000 }); // at least three breaths
  const select = await openWaitSetting(page);
  check(await select.evaluate((node) => node.value) === 'meditation', 'Settings: "While you wait" reads Meditation');
  check(JSON.stringify(await select.evaluate((node) => [...node.options].map((option) => option.textContent))) === JSON.stringify(['Meditation', 'Space Invaders', 'Nothing']), 'the dropdown offers Meditation and Space Invaders (and Nothing)');
  await shot('02-settings');
  await select.selectOption('invaders');
  check(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('display')).some((key) => JSON.parse(localStorage.getItem(key)).waitMode === 'invaders')), 'choosing Space Invaders is kept in this browser');
});

// 2. Space Invaders, and played: the thumb sweeps the field.
await play('invaders', { display: { waitMode: 'invaders' }, delay: 7000 }, async (page, reply, shot) => {
  await game(page).waitFor({ timeout: 5000 });
  await sleep(700);
  check(await breathing(page).count() === 0, 'invaders: no meditation');
  check(await opacity(page) === 1, 'invaders: the game covers the panel, opaque, as soon as the answer is sent');
  const alpha = await panelAlpha(page);
  const box = await game(page).boundingBox();
  const y = box.y + box.height * 0.7;
  check((await page.getByRole('status').filter({ hasText: 'Waiting for Portia' }).count()) === 1, 'it says whom it is waiting for');
  check(await game(page).getByText('♥').count() === 0, 'no hearts');
  const sweep = [];
  for (let i = 0; i <= 40; i += 1) sweep.push(box.x + box.width * (0.5 + 0.45 * Math.sin(i / 3)));
  await drag(page, sweep, y);
  await shot('01-playing');
  check(await game(page).evaluate((node) => node.querySelector('canvas').width > 0), 'the field is drawn on a canvas the size of the panel');
  for (let i = 0; !reply.arrived; i += 3) await drag(page, [0, 1, 2].map((k) => sweep[(i + k) % sweep.length]), y, 30);
  check(await game(page).count() === 1, 'the reply has come and the game is still on: the last ones come down');
  check(await verdict(page).count() === 1 && await opacity(page) === 1, 'the reply is under the game, not shown yet');
  await shot('02-reply-here');
  const until = Date.now() + 20000;
  while (await game(page).count() > 0 && Date.now() < until) await drag(page, sweep, y, 40).catch(() => {});
  check(await game(page).count() === 0, 'the game goes when the last of them is dealt with (or it was lost and the reply was ready)');
  check(await verdict(page).isVisible(), 'the reply shows');
  check(await panelAlpha(page) === alpha, `the panel is back at its own opacity (${alpha})`);
  await shot('03-back');
});

// 3. Space Invaders, lost: the figure stands in a corner and the first invader that gets past ends it.
await play('lost', { display: { waitMode: 'invaders' }, delay: 26000 }, async (page, reply, shot) => {
  await game(page).waitFor({ timeout: 5000 });
  const box = await game(page).boundingBox();
  await drag(page, [box.x + 2, box.x + 1], box.y + box.height * 0.7);
  await page.getByText('One got through. Nothing for it but to wait for Portia.').waitFor({ timeout: 24000 });
  check(!reply.arrived, 'lost: one got past before the reply, and that is the game');
  await shot('01-lost');
  await sleep(1500);
  check(await game(page).count() === 1 && !reply.arrived, 'the lost game stays until the reply is ready');
  await game(page).waitFor({ state: 'detached', timeout: 30000 });
  check(reply.arrived, 'it goes when the reply is ready');
  check(await verdict(page).isVisible(), 'the reply shows');
  await shot('02-back');
});

await browser.close();
for (const problem of problems) console.error('problem:', problem);
console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
process.exit(problems.length ? 1 : 0);
