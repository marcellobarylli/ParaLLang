// Round 132: the conversation panel's layout in a real browser, at the iPhone's size with touch (headless Chromium,
// Playwright, software WebGL), against the real server code with the tests' fixture provider (no model is called).
// Checks that Settings scrolls, that the objective box follows the opening line and folds into a bar when scrolled
// past, and that the panel drags between the top bar and nothing. Takes pictures.
//
//   npm run build -w client
//   node client/scripts/layout-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime } from '../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '132', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const SCREEN = { width: 393, height: 852 }; // the owner's iPhone, from his Settings screenshot

// A long narration and line, so the text is taller than the panel as the model's is.
class LongProvider extends PassingProvider {
  narrate(messages) {
    const base = super.narrate(messages);
    return { ...base, narrative: `${base.narrative} The archway has stood at the edge of the market for longer than the market has existed, which it considers a matter of principle. A little dust falls from the keystone whenever it disapproves, and today the dust is steady.`, dialogue: { ...base.dialogue, native: `${base.dialogue.native} Nobody passes beneath me until they have greeted me properly and said who they are, because I keep a book for it. So, how do you greet an archway, and whom am I writing down today? Also, what do you make of a sign that changes its mind every morning?` } };
  }
}

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };
const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new LongProvider(content) });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: SCREEN, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const page = await context.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
await page.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== ORIGIN) return route.fulfill({ status: 503, body: '' });
  if (url.pathname.startsWith('/api/')) {
    const answer = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
    return route.fulfill({ status: answer.status, contentType: answer.headers.get('content-type') ?? 'application/json', body: await answer.text() });
  }
  const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
  try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
});
await page.addInitScript(([settings]) => {
  localStorage.setItem('parallang.settings', settings);
  localStorage.setItem('parallang.display', JSON.stringify({ music: false, voices: false }));
}, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token })]);
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });
const box = (selector) => page.locator(selector).first().evaluate((element) => { const r = element.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) }; });
// A drag of the handle by `dy` pixels (up is negative), as a finger would: touch pointer events through CDP.
const client = await context.newCDPSession(page);
const drag = async (dy) => {
  const handle = await page.locator('.sheet-handle').boundingBox();
  const [x, y] = [handle.x + handle.width / 2, handle.y + handle.height / 2];
  const touch = (type, at) => client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: at }] });
  await touch('touchStart', y);
  for (let i = 1; i <= 8; i++) await touch('touchMove', y + (dy * i) / 8);
  await touch('touchEnd', y + dy);
  await page.waitForTimeout(250);
};

try {
  await page.goto(`${ORIGIN}${BASE_PATH}`);
  await page.getByRole('button', { name: 'Enter', exact: true }).tap({ timeout: 60000 });

  // Settings scrolls.
  await page.getByRole('button', { name: 'Settings' }).tap();
  const sheet = page.locator('.settings-sheet');
  const fits = await sheet.evaluate((element) => ({ top: Math.round(element.getBoundingClientRect().top), scroll: element.scrollHeight, client: element.clientHeight, overflow: getComputedStyle(element).overflowY }));
  check(fits.top >= 0, `the Settings sheet starts inside the screen (top ${fits.top})`);
  check(fits.scroll > fits.client && fits.overflow === 'auto', `it is taller than the screen and scrolls inside (${fits.scroll} in ${fits.client})`);
  await shot('01-settings-top');
  const first = await box('.settings-sheet h2');
  check(first.top >= 0 && first.bottom <= SCREEN.height, `its heading is on the screen (${first.top})`);
  await sheet.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const last = await page.getByRole('button', { name: 'Reload the page' }).boundingBox();
  check(last.y + last.height <= SCREEN.height + 1, `scrolled down, its last button is on the screen (${Math.round(last.y + last.height)} of ${SCREEN.height})`);
  await shot('02-settings-bottom');
  await sheet.evaluate((element) => { element.scrollTop = 0; });
  await page.getByRole('button', { name: 'Close' }).tap();

  // The conversation: narration, line, then the objective box.
  await page.getByRole('button', { name: 'Enter Ta Prohm' }).tap();
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  const order = await page.locator('main.dialogue-panel').evaluate((main) => [...main.children].map((child) => child.className.split(' ')[0]));
  check(JSON.stringify(order.slice(0, 4)) === JSON.stringify(['objective-pin', 'npc-message', 'objective-card', 'briefing-card']), `the opening line comes before the objective box, then the briefing (${order.join(', ')})`);
  const start = await page.locator('.sheet-scroll').evaluate((scroll) => ({ top: scroll.scrollTop, position: getComputedStyle(scroll.querySelector('section.objective-card')).position }));
  check(start.top === 0 && start.position !== 'sticky', `the conversation opens at its top and the box is not pinned (${start.top}, ${start.position})`);
  const narration = await box('p.narrative');
  const scrollArea = await box('.sheet-scroll');
  check(narration.top >= scrollArea.top - 1, 'the narration is the first thing in the text');
  check(await page.locator('.objective-toggle').count() === 0, 'no bar while the box has not been passed');
  await shot('03-opening');

  // Scrolled past the box: the bar, folded and unfolded.
  await page.locator('.sheet-scroll').evaluate((scroll) => { scroll.scrollTop = scroll.scrollHeight; });
  await page.locator('.objective-toggle').waitFor({ timeout: 5000 });
  const bar = await box('.objective-toggle');
  const area = await box('.sheet-scroll');
  check(Math.abs(bar.top - area.top) <= 6 && bar.height <= 48, `scrolled past it, a one-line bar is pinned at the top of the text (${bar.height} px high)`);
  check((await page.locator('.objective-toggle').textContent()).includes('3 to do'), 'the bar says how many are still to do');
  await shot('04-bar');
  const before = await page.locator('.sheet-scroll').evaluate((scroll) => scroll.scrollTop);
  await page.locator('.objective-toggle').tap();
  check(await page.locator('.objective-unfolded').isVisible() && (await page.locator('.objective-unfolded').textContent()).includes('Greet Portia in Italian.'), 'a tap unfolds the objectives');
  const moved = Math.abs(await page.locator('.sheet-scroll').evaluate((scroll) => scroll.scrollTop) - before);
  check(moved <= 8, `unfolding leaves the text where it is (${moved} px)`);
  await shot('05-bar-unfolded');
  await page.locator('.objective-toggle').tap();
  check(await page.locator('.objective-unfolded').count() === 0, 'another tap folds them');
  await page.locator('.sheet-scroll').evaluate((scroll) => { scroll.scrollTop = 0; });
  await page.locator('.objective-toggle').waitFor({ state: 'detached', timeout: 5000 });
  check(true, 'scrolled back to the box, the bar goes');

  // The handle.
  const hud = await box('.hud');
  const usual = await box('.sheet');
  check(Math.abs(usual.height - Math.round(SCREEN.height * 0.62)) <= 2, `the panel starts at 62% of the screen (${usual.height})`);
  await drag(-150);
  const taller = await box('.sheet');
  check(Math.abs(taller.height - (usual.height + 150)) <= 3, `dragged up 150, it is 150 taller (${usual.height} to ${taller.height})`);
  await drag(-700);
  const full = await box('.sheet');
  check(Math.abs(full.top - hud.bottom) <= 2 && full.bottom === SCREEN.height, `dragged all the way up, it reaches the top bar's edge (top ${full.top}, bar ends ${hud.bottom})`);
  check(await page.getByRole('button', { name: 'Settings' }).isVisible(), 'the top bar is still in reach');
  await shot('06-full');
  await drag(900);
  const down = await box('.sheet');
  check(down.height <= 32 && down.bottom === SCREEN.height, `dragged all the way down, only the grip is left (${down.height} px)`);
  check(!(await page.getByRole('textbox', { name: 'Your response' }).isVisible().catch(() => false)) || (await page.getByRole('textbox', { name: 'Your response' }).boundingBox()).y >= SCREEN.height - 2, 'the reply box is out of the way');
  await page.waitForTimeout(900); // the camera frames the uncovered temple
  await shot('07-down');
  await page.locator('.sheet-handle').tap();
  await page.waitForTimeout(250);
  const back = await box('.sheet');
  check(Math.abs(back.height - usual.height) <= 2, `a tap on the grip brings the panel back (${back.height})`);
  const reply = await page.getByRole('textbox', { name: 'Your response' }).boundingBox();
  check(reply.y + reply.height <= SCREEN.height, 'and the reply box is on the screen again');
  // The text still scrolls by touch under the handle.
  const scrollBox = await page.locator('.sheet-scroll').boundingBox();
  const swipe = (type, y) => client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: scrollBox.x + 150, y }] });
  await swipe('touchStart', scrollBox.y + scrollBox.height - 40);
  for (let i = 1; i <= 8; i++) await swipe('touchMove', scrollBox.y + scrollBox.height - 40 - i * 30);
  await swipe('touchEnd', 0);
  await page.waitForTimeout(400);
  check(await page.locator('.sheet-scroll').evaluate((scroll) => scroll.scrollTop) > 50, 'a swipe on the text scrolls it');
} catch (error) {
  problems.push(`the check stopped: ${error.message}`);
  console.error(error);
  await shot('x-stopped').catch(() => {});
} finally {
  await browser.close();
  await runtime.close();
}
for (const problem of problems) console.error('problem:', problem);
console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
process.exit(problems.length ? 1 : 0);
