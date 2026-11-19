// Round 125: tilt to look in a real browser. Loads the built client in headless Chromium (Playwright, software
// WebGL), puts the camera at a site, switches the setting on and sends synthetic `deviceorientation` events. It
// checks that the rendered camera turns by the tilt's gain inside its range and that its position is left alone, and
// takes pictures. No server runs: the page is served from client/dist by request interception and /api is refused.
// Headless Chromium has no motion sensor, so this says nothing about a real phone.
//
//   npm run build -w client
//   node client/scripts/tilt-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '125', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const SITE = 1; // The Coffee Cart's site: Gerald
const DEG = Math.PI / 180;
// The baseline follows the phone with a time constant of 30 s (tilt.js), so a tilt held for `ms` has faded to this share.
const faded = (ms) => Math.exp(-ms / 30000);

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const page = await context.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE_PATH) || url.pathname.includes('/api/')) return route.fulfill({ status: 503, body: 'no server in this check' });
  const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
  try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
});
await page.goto(`${ORIGIN}${BASE_PATH}`);
await page.waitForFunction(() => Boolean(window.__parallangLevel) && Boolean(document.querySelector('.level-ready')), null, { timeout: 60000 });
await page.waitForTimeout(300); // the screen has sent the level its first phase

// The camera at the site, as in a conversation, and the setting on.
await page.evaluate((site) => {
  const level = window.__parallangLevel;
  level.setPhase({ phase: 'approach', siteIndex: site });
  level.director.skip();
  window.__parallang.store.getState().setTiltLook(true);
}, SITE);
await page.waitForTimeout(600);

// Sends the orientation for `ms` at about 60 events a second, then reads the camera.
const hold = (angles, ms) => page.evaluate(async ([a, duration]) => {
  const until = performance.now() + duration;
  while (performance.now() < until) {
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', a));
    await new Promise((done) => requestAnimationFrame(done));
  }
  const level = window.__parallangLevel;
  const direction = level.camera.getWorldDirection(level.camera.position.clone()).toArray();
  const pose = level.director.pose;
  const plain = [pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]];
  return { direction, position: level.camera.position.toArray(), sight: plain, looked: level.director.looked, stage: level.director.stage };
}, [angles, ms]);
const angles = ([x, y, z]) => ({ yaw: Math.atan2(x, z), pitch: Math.asin(y / Math.hypot(x, y, z)) });
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });

const HELD = { alpha: 0, beta: 50, gamma: 0 };
const rest = await hold(HELD, 1500);
check(rest.stage === 'hold', `the camera holds at the site (${rest.stage})`);
check(Math.abs(rest.looked.yaw) < 1e-3 && Math.abs(rest.looked.pitch) < 1e-3, `a still phone: no turn (${JSON.stringify(rest.looked)})`);
await shot('01-straight');

const left = await hold({ ...HELD, gamma: 15 }, 1200);
const turnedLeft = wrap(angles(left.direction).yaw - angles(rest.direction).yaw) / DEG;
const leftWanted = 9 * faded(1200);
check(Math.abs(left.looked.yaw / DEG - leftWanted) < 0.5, `right edge down 15 degrees for 1.2 s: the director's look is ${leftWanted.toFixed(1)} degrees to the left (${(left.looked.yaw / DEG).toFixed(2)})`);
check(Math.abs(turnedLeft - leftWanted) < 2.5, `the rendered camera has turned about as far to the left (${turnedLeft.toFixed(2)}; the hold's drift is in it)`);
check(Math.abs(wrap(angles(left.direction).yaw - angles(left.sight).yaw)) < 1e-3, 'the camera looks where the director says');
await shot('02-left');

const up = await hold({ ...HELD, beta: 30 }, 1500);
check(up.looked.pitch / DEG <= 8 && up.looked.pitch / DEG > 8 * faded(1500) - 0.5, `top away 20 degrees for 1.5 s: the look is up, within the range of 8 degrees (${(up.looked.pitch / DEG).toFixed(2)})`);
check(Math.abs(up.looked.yaw / DEG) < 1, `and no longer sideways (${(up.looked.yaw / DEG).toFixed(2)})`);
await shot('03-up');

const far = await hold({ ...HELD, gamma: -70 }, 1200);
check(far.looked.yaw / DEG >= -12 && far.looked.yaw / DEG < -12 * faded(1200) + 0.5, `left edge down 70 degrees for 1.2 s: the look stops within 12 degrees to the right (${(far.looked.yaw / DEG).toFixed(2)})`);
const moved = Math.hypot(...far.position.map((v, i) => v - rest.position[i]));
check(moved < 1, `the camera has not left its place (${moved.toFixed(2)} m in ${((1200 + 1500 + 1200) / 1000).toFixed(1)} s, the hold's drift)`);
await shot('04-right');

// The setting off: the look eases back to the site.
await page.evaluate(() => window.__parallang.store.getState().setTiltLook(false));
const off = await hold({ ...HELD, gamma: -70 }, 1000);
check(Math.abs(off.looked.yaw) < 1e-3, `switched off, the look is back (${(off.looked.yaw / DEG).toFixed(3)})`);

// The box in Settings.
await page.getByRole('button', { name: 'Settings' }).click();
const box = page.getByLabel('Tilt to look');
check(await box.isVisible() && !(await box.isChecked()), 'Settings shows the box, unticked');
await box.tap();
check(await box.isChecked() && await page.evaluate(() => window.__parallang.store.getState().display.tiltLook === true && JSON.parse(localStorage.getItem('parallang.display')).tiltLook === true), 'a tap ticks it and the choice is stored');
check(await page.getByText(/refused access|no motion sensor/).count() === 0, 'and no warning: this browser answers neither yes nor no');
await shot('05-settings');

await browser.close();
console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
process.exit(problems.length ? 1 : 0);
